import { normalizeName, nowIso, openDatabase, parseCliArgs, parseLocation, readEnvFile } from "./lib.mjs";

const args = parseCliArgs(process.argv.slice(2));
const env = { ...await readEnvFile(), ...process.env };
const apiKey = env.AMAP_KEY;
if (!apiKey || apiKey === "replace_with_your_amap_web_service_key") {
  throw new Error("缺少 AMAP_KEY：请复制 database/.env.example 为 database/.env，再填入高德 Web 服务 Key。");
}
const region = env.AMAP_REGION || "北京";
const limit = Math.max(1, Number(args.limit) || 50);
const retry = Boolean(args.retry);
const refreshDays = Number(args["refresh-days"] || 0);
const db = await openDatabase();

let query = "SELECT * FROM restaurants WHERE poi_status = '待补全'";
// 已有候选项不重复查：候选详情已保存在 poi_candidates，可直接用于后续距离计算。
if (retry) query = "SELECT * FROM restaurants WHERE poi_status IN ('待补全', '未找到', '请求异常')";
if (refreshDays > 0) {
  const before = new Date(Date.now() - refreshDays * 86400000).toISOString();
  query = "SELECT * FROM restaurants WHERE poi_status = '已匹配' AND (last_poi_lookup_at IS NULL OR last_poi_lookup_at < ?)";
  const restaurants = db.prepare(`${query} LIMIT ?`).all(before, limit);
  await enrichAll(restaurants);
} else {
  const restaurants = db.prepare(`${query} LIMIT ?`).all(limit);
  await enrichAll(restaurants);
}

async function enrichAll(restaurants) {
  const result = { checked: restaurants.length, matched: 0, review: 0, notFound: 0, failed: 0 };
  for (const restaurant of restaurants) {
    try {
      const pois = await searchPoi(restaurant);
      const ranked = pois.map((poi) => ({ poi, score: scorePoi(restaurant, poi) })).sort((a, b) => b.score - a.score);
      saveCandidates(restaurant.id, ranked);
      const top = ranked[0];
      const runnerUp = ranked[1];
      const isSafeMatch = top && top.score >= 88 && (!runnerUp || top.score - runnerUp.score >= 8);
      if (isSafeMatch) {
        saveMatchedPoi(restaurant.id, top.poi, top.score);
        result.matched += 1;
      } else if (top) {
        setPoiStatus(restaurant.id, "人工确认", top.score);
        result.review += 1;
      } else {
        setPoiStatus(restaurant.id, "未找到", null);
        result.notFound += 1;
      }
    } catch (error) {
      setPoiStatus(restaurant.id, "请求异常", null);
      result.failed += 1;
      console.error(`查询失败：${restaurant.name}：${error.message}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 160));
  }
  db.prepare("INSERT INTO sync_log(event_type, created_at, summary) VALUES (?, ?, ?)")
    .run("amap_enrichment", nowIso(), JSON.stringify(result));
  db.close();
  console.log(JSON.stringify({ ok: true, ...result }, null, 2));
}

async function searchPoi(restaurant) {
  const keywords = [restaurant.name, restaurant.location_hint].filter(Boolean).join(" ");
  const url = new URL("https://restapi.amap.com/v5/place/text");
  url.search = new URLSearchParams({ key: apiKey, keywords, region, city_limit: "true", page_size: "10", show_fields: "business,photos" });
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`高德返回 HTTP ${response.status}`);
  const payload = await response.json();
  if (payload.status && payload.status !== "1") throw new Error(payload.info || payload.infocode || "高德返回错误");
  return Array.isArray(payload.pois) ? payload.pois : [];
}

function scorePoi(restaurant, poi) {
  const expected = normalizeName(restaurant.name);
  const actual = normalizeName(poi.name);
  let score = expected === actual ? 85 : actual.includes(expected) || expected.includes(actual) ? 68 : 0;
  const searchable = `${poi.name || ""} ${poi.address || ""} ${poi.district || ""} ${poi.adname || ""}`.toLowerCase();
  const hints = String(restaurant.location_hint || "").split(/[；;，,、\s]+/).filter((hint) => hint.length >= 2);
  if (hints.some((hint) => searchable.includes(hint.toLowerCase()))) score += 12;
  if (String(poi.cityname || "").includes("北京") || String(poi.pname || "").includes("北京")) score += 3;
  if (restaurant.cuisine && `${poi.type || ""} ${poi.typecode || ""}`.includes(restaurant.cuisine)) score += 2;
  return Math.min(100, score);
}

function saveCandidates(restaurantId, ranked) {
  const queriedAt = nowIso();
  db.prepare("DELETE FROM poi_candidates WHERE restaurant_id = ?").run(restaurantId);
  const insert = db.prepare(`INSERT INTO poi_candidates(
    restaurant_id, queried_at, rank, score, poi_id, name, address, district, location, category, telephone, raw_json
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  ranked.slice(0, 5).forEach(({ poi, score }, index) => insert.run(restaurantId, queriedAt, index + 1, score,
    poi.id || "", poi.name || "", poi.address || "", poi.district || poi.adname || "", poi.location || "",
    poi.type || "", poi.tel || "", JSON.stringify(poi)));
}

function saveMatchedPoi(restaurantId, poi, score) {
  const { longitude, latitude } = parseLocation(poi.location);
  const photo = Array.isArray(poi.photos) ? poi.photos[0] : null;
  const photoUrl = photo?.url || photo?.photo_url || null;
  db.prepare(`UPDATE restaurants SET
    amap_poi_id=?, amap_name=?, full_address=?, district=?, longitude=?, latitude=?, telephone=?, opening_hours=?,
    amap_category=?, photo_url=?, poi_match_score=?, poi_status='已匹配', last_poi_lookup_at=?, updated_at=? WHERE id=?`
  ).run(poi.id || null, poi.name || null, poi.address || null, poi.district || poi.adname || null, longitude, latitude,
    poi.tel || null, poi.business?.opentime_today || poi.business?.opentime_week || null, poi.type || null, photoUrl,
    score, nowIso(), nowIso(), restaurantId);
}

function setPoiStatus(restaurantId, status, score) {
  db.prepare("UPDATE restaurants SET poi_status=?, poi_match_score=?, last_poi_lookup_at=?, updated_at=? WHERE id=?")
    .run(status, score, nowIso(), nowIso(), restaurantId);
}
