import { nowIso, openDatabase, parseLocation, readEnvFile } from "./lib.mjs";

// 从 database/.env 读取高德 Key；Key 不写死在代码里。
const env = { ...await readEnvFile(), ...process.env };
const apiKey = env.AMAP_KEY;
if (!apiKey || apiKey === "replace_with_your_amap_web_service_key") {
  throw new Error("缺少 AMAP_KEY：请先在 database/.env 配置高德 Web 服务 Key。");
}

// 这是前端要使用的两个“地区代码”。
// 之后用户选择沙河校区，就用 cufe_shahe；选择学院南路校区，就用 cufe_nanlu。
const campuses = [
  { code: "cufe_shahe", name: "中央财经大学沙河校区", query: "中央财经大学沙河校区" },
  { code: "cufe_nanlu", name: "中央财经大学学院南路校区", query: "中央财经大学学院南路校区" },
];
const db = await openDatabase();
// 如果以后重新核验校区坐标，ON CONFLICT 会覆盖旧坐标，而不会插入重复校区。
const upsert = db.prepare(`INSERT INTO campuses(code, name, address, longitude, latitude, amap_poi_id, last_verified_at)
  VALUES (?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(code) DO UPDATE SET name=excluded.name, address=excluded.address, longitude=excluded.longitude,
  latitude=excluded.latitude, amap_poi_id=excluded.amap_poi_id, last_verified_at=excluded.last_verified_at`);
const resolved = [];
try {
  for (const campus of campuses) {
    // 用校区全称向高德查询，避免手工填写坐标时写错。
    const url = new URL("https://restapi.amap.com/v5/place/text");
    url.search = new URLSearchParams({ key: apiKey, keywords: campus.query, region: "北京", city_limit: "true", page_size: "5" });
    const response = await fetch(url);
    if (!response.ok) throw new Error(`${campus.name}：高德返回 HTTP ${response.status}`);
    const payload = await response.json();
    const poi = payload.pois?.[0];
    if (!poi?.location) throw new Error(`${campus.name}：未找到可用坐标`);
    // 高德的 location 是 "经度,纬度" 文本，这里拆成两个可计算的数字。
    const { longitude, latitude } = parseLocation(poi.location);
    if (longitude === null) throw new Error(`${campus.name}：坐标格式异常`);
    upsert.run(campus.code, campus.name, poi.address || null, longitude, latitude, poi.id || null, nowIso());
    resolved.push({ code: campus.code, name: campus.name, address: poi.address || null, longitude, latitude });
  }
  db.prepare("INSERT INTO sync_log(event_type, created_at, summary) VALUES (?, ?, ?)")
    .run("campus_location_sync", nowIso(), JSON.stringify({ campuses: resolved }));
  console.log(JSON.stringify({ ok: true, campuses: resolved }, null, 2));
} finally {
  db.close();
}
