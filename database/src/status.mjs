import { openDatabase } from "./lib.mjs";

const db = await openDatabase();
const total = db.prepare("SELECT COUNT(*) AS count FROM restaurants").get().count;
const byStatus = db.prepare("SELECT poi_status AS status, COUNT(*) AS count FROM restaurants GROUP BY poi_status ORDER BY count DESC").all();
const recentLog = db.prepare("SELECT event_type, created_at, summary FROM sync_log ORDER BY id DESC LIMIT 5").all();
db.close();
console.log(JSON.stringify({ database: "database/data/restaurants.db", totalRestaurants: total, byPoiStatus: byStatus, recentLog }, null, 2));
