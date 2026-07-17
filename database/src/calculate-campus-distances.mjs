import { haversineMeters, nowIso, openDatabase, parseLocation } from "./lib.mjs";

const db = await openDatabase();
// 从数据库读取两个校区的经纬度。若还没运行校区同步脚本，会直接提示而不是算错。
const campuses = db.prepare("SELECT code, name, longitude, latitude FROM campuses ORDER BY code").all();
if (campuses.length < 2) throw new Error("缺少校区坐标：请先运行 node database/src/sync-campus-locations.mjs");
// 每一条候选门店都有高德返回的坐标；同一家餐厅可能有多个候选分店。
const candidates = db.prepare("SELECT id, location FROM poi_candidates WHERE location IS NOT NULL AND location <> ''").all();
// 同一“候选门店 + 校区”只保留一条距离记录；重新运行时会更新数值，不会重复增加数据。
const upsert = db.prepare(`INSERT INTO candidate_distances(poi_candidate_id, campus_code, distance_meters, calculated_at)
  VALUES (?, ?, ?, ?)
  ON CONFLICT(poi_candidate_id, campus_code) DO UPDATE SET distance_meters=excluded.distance_meters, calculated_at=excluded.calculated_at`);
let calculated = 0;
db.exec("BEGIN");
try {
  for (const candidate of candidates) {
    const { longitude, latitude } = parseLocation(candidate.location);
    if (longitude === null) continue;
    for (const campus of campuses) {
      // haversineMeters 是直线距离公式，结果单位是米。
      // 这里不是驾车/步行路线距离；后续如需路线距离，再接地图路线规划 API。
      upsert.run(candidate.id, campus.code, haversineMeters(campus.longitude, campus.latitude, longitude, latitude), nowIso());
      calculated += 1;
    }
  }
  db.prepare("INSERT INTO sync_log(event_type, created_at, summary) VALUES (?, ?, ?)")
    .run("campus_distance_calculation", nowIso(), JSON.stringify({ candidates: candidates.length, campuses: campuses.length, calculated }));
  db.exec("COMMIT");
  console.log(JSON.stringify({ ok: true, candidates: candidates.length, campuses: campuses.map((campus) => campus.code), calculated }, null, 2));
} catch (error) {
  db.exec("ROLLBACK");
  throw error;
} finally {
  db.close();
}
