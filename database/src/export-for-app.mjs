import fs from "node:fs/promises";
import path from "node:path";
import { openDatabase } from "./lib.mjs";

const db = await openDatabase();
const restaurants = db.prepare(`SELECT
  id, name, cuisine, location_hint AS locationHint, recommended_dishes AS recommendedDishes,
  optional_dishes AS optionalDishes, party_size AS partySize, booking_note AS bookingNote,
  mention_count AS mentionCount, positive_count AS positiveCount, caution_count AS cautionCount,
  sentiment, intake_status AS intakeStatus, full_address AS fullAddress, district, longitude, latitude,
  telephone, opening_hours AS openingHours, amap_category AS amapCategory, photo_url AS photoUrl,
  amap_poi_id AS amapPoiId, poi_match_score AS poiMatchScore, poi_status AS poiStatus, updated_at AS updatedAt
  FROM restaurants WHERE poi_status = '已匹配' ORDER BY mention_count DESC, name COLLATE NOCASE`).all();
const pending = db.prepare(`SELECT id, name, location_hint AS locationHint, poi_status AS poiStatus, poi_match_score AS poiMatchScore
  FROM restaurants WHERE poi_status <> '已匹配' ORDER BY updated_at DESC`).all();
// 读取“群聊中的餐厅 → 高德候选分店”的完整关系。
// 不只导出自动匹配的门店，避免把同名、多分店的地址信息丢掉。
const candidateRows = db.prepare(`SELECT
  c.id AS candidateId, r.id AS restaurantId, r.name AS restaurantName, r.location_hint AS locationHint, r.cuisine,
  r.poi_status AS poiStatus, c.rank, c.score, c.poi_id AS poiId, c.name, c.address, c.district,
  c.location, c.category, c.telephone, c.raw_json AS rawJson
  FROM poi_candidates c
  JOIN restaurants r ON r.id = c.restaurant_id
  ORDER BY r.mention_count DESC, r.name COLLATE NOCASE, c.rank ASC`).all();
// 读取刚算好的两校区距离，随后合并进每一个候选门店。
const distanceRows = db.prepare(`SELECT poi_candidate_id AS candidateId, campus_code AS campusCode, distance_meters AS distanceMeters
  FROM candidate_distances`).all();
db.close();
const distanceByCandidate = new Map();
for (const row of distanceRows) {
  if (!distanceByCandidate.has(row.candidateId)) distanceByCandidate.set(row.candidateId, {});
  // 数据库原单位是米；导出给界面时改成 km，并保留三位小数。
  distanceByCandidate.get(row.candidateId)[row.campusCode] = Math.round(row.distanceMeters) / 1000;
}
const candidateMap = new Map();
for (const row of candidateRows) {
  if (!candidateMap.has(row.restaurantId)) {
    candidateMap.set(row.restaurantId, {
      restaurantId: row.restaurantId, restaurantName: row.restaurantName, locationHint: row.locationHint,
      cuisine: row.cuisine, poiStatus: row.poiStatus, candidates: [],
    });
  }
  const raw = JSON.parse(row.rawJson);
  const photo = Array.isArray(raw.photos) ? raw.photos[0] : null;
  candidateMap.get(row.restaurantId).candidates.push({
    rank: row.rank, score: row.score, poiId: row.poiId, name: row.name, address: row.address, district: row.district,
    location: row.location, category: row.category, telephone: row.telephone,
    openingHours: raw.business?.opentime_today || raw.business?.opentime_week || null,
    photoUrl: photo?.url || photo?.photo_url || null,
    distanceKm: distanceByCandidate.get(row.candidateId) || {},
  });
}
const outputDir = path.resolve("database/data");
await fs.mkdir(outputDir, { recursive: true });
await fs.writeFile(path.join(outputDir, "restaurants-public.json"), JSON.stringify({ generatedAt: new Date().toISOString(), restaurants }, null, 2));
await fs.writeFile(path.join(outputDir, "poi-review-queue.json"), JSON.stringify({ generatedAt: new Date().toISOString(), restaurants: pending }, null, 2));
// 对每家餐厅，分别找“离沙河最近”和“离学院南路最近”的候选分店。
// 注意：这是帮界面预先算好的快捷结果；候选分店列表仍会完整保留。
const candidateRestaurants = [...candidateMap.values()].map((restaurant) => ({
  ...restaurant,
  nearestCandidateByCampus: Object.fromEntries(["cufe_shahe", "cufe_nanlu"].map((campusCode) => {
    const candidatesWithDistance = restaurant.candidates.filter((candidate) => Number.isFinite(candidate.distanceKm[campusCode]));
    const nearest = candidatesWithDistance.sort((a, b) => a.distanceKm[campusCode] - b.distanceKm[campusCode])[0] || null;
    return [campusCode, nearest ? { poiId: nearest.poiId, name: nearest.name, distanceKm: nearest.distanceKm[campusCode] } : null];
  })),
}));
await fs.writeFile(path.join(outputDir, "poi-candidates.json"), JSON.stringify({ generatedAt: new Date().toISOString(), restaurants: candidateRestaurants }, null, 2));
console.log(JSON.stringify({ ok: true, exported: restaurants.length, reviewQueue: pending.length, candidateSets: candidateMap.size }, null, 2));
