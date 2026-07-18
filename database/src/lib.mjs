import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";

export const DATABASE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const DATABASE_PATH = path.join(DATABASE_ROOT, "data", "restaurants.db");
export const DATABASE_SOURCE_DIR = path.join(DATABASE_ROOT, "source");
export const DATABASE_DATA_DIR = path.join(DATABASE_ROOT, "data");

export async function ensureDatabaseDirectory() {
  await fs.mkdir(path.dirname(DATABASE_PATH), { recursive: true });
}

export async function openDatabase() {
  await ensureDatabaseDirectory();
  const db = new DatabaseSync(DATABASE_PATH);
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA foreign_keys = ON;");
  createSchema(db);
  return db;
}

export function createSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS restaurants (
      id TEXT PRIMARY KEY,
      source_id TEXT,
      name TEXT NOT NULL,
      normalized_name TEXT NOT NULL,
      cuisine TEXT DEFAULT '',
      location_hint TEXT DEFAULT '',
      recommended_dishes TEXT DEFAULT '',
      optional_dishes TEXT DEFAULT '',
      party_size TEXT DEFAULT '',
      booking_note TEXT DEFAULT '',
      mention_count INTEGER DEFAULT 0,
      positive_count INTEGER DEFAULT 0,
      caution_count INTEGER DEFAULT 0,
      sentiment TEXT DEFAULT '',
      intake_status TEXT DEFAULT '',
      source_batches TEXT DEFAULT '',
      cleaning_note TEXT DEFAULT '',
      raw_messages TEXT DEFAULT '',
      amap_poi_id TEXT,
      amap_name TEXT,
      full_address TEXT,
      district TEXT,
      longitude REAL,
      latitude REAL,
      telephone TEXT,
      opening_hours TEXT,
      amap_category TEXT,
      photo_url TEXT,
      poi_match_score INTEGER,
      poi_status TEXT NOT NULL DEFAULT '待补全',
      last_poi_lookup_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_restaurants_name_hint
      ON restaurants(normalized_name, location_hint);
    CREATE INDEX IF NOT EXISTS idx_restaurants_poi_status
      ON restaurants(poi_status);
    CREATE TABLE IF NOT EXISTS poi_candidates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      restaurant_id TEXT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
      queried_at TEXT NOT NULL,
      rank INTEGER NOT NULL,
      score INTEGER NOT NULL,
      poi_id TEXT,
      name TEXT,
      address TEXT,
      district TEXT,
      location TEXT,
      category TEXT,
      telephone TEXT,
      raw_json TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_poi_candidates_restaurant
      ON poi_candidates(restaurant_id, queried_at DESC);
    CREATE TABLE IF NOT EXISTS campuses (
      code TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      address TEXT,
      longitude REAL NOT NULL,
      latitude REAL NOT NULL,
      amap_poi_id TEXT,
      last_verified_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS candidate_distances (
      poi_candidate_id INTEGER NOT NULL REFERENCES poi_candidates(id) ON DELETE CASCADE,
      campus_code TEXT NOT NULL REFERENCES campuses(code) ON DELETE CASCADE,
      distance_meters REAL NOT NULL,
      calculated_at TEXT NOT NULL,
      PRIMARY KEY (poi_candidate_id, campus_code)
    );
    CREATE INDEX IF NOT EXISTS idx_candidate_distances_campus
      ON candidate_distances(campus_code, distance_meters);
    CREATE TABLE IF NOT EXISTS sync_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_type TEXT NOT NULL,
      created_at TEXT NOT NULL,
      summary TEXT NOT NULL
    );
  `);
  const columns = db.prepare("PRAGMA table_info(restaurants)").all().map((column) => column.name);
  if (!columns.includes("source_id")) db.exec("ALTER TABLE restaurants ADD COLUMN source_id TEXT");
  db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_restaurants_canonical_name ON restaurants(normalized_name)");
}

export function nowIso() {
  return new Date().toISOString();
}

export function normalizeName(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[（(].*?[）)]/g, "")
    .replace(/[·・•、，,。.!！?？:：;；'"“”‘’\-—_\s]/g, "")
    .replace(/(餐厅|餐馆|小馆|饭店|饭馆|总店|分店|店)$/g, "")
    .trim();
}

export function stableRestaurantId(name) {
  const digest = createHash("sha256").update(normalizeName(name), "utf8").digest("hex").slice(0, 12).toUpperCase();
  return `R_${digest}`;
}

export function parseLocation(value) {
  const [longitudeText, latitudeText] = String(value ?? "").split(",");
  const longitude = Number(longitudeText);
  const latitude = Number(latitudeText);
  return Number.isFinite(longitude) && Number.isFinite(latitude) ? { longitude, latitude } : { longitude: null, latitude: null };
}

export function haversineMeters(longitudeA, latitudeA, longitudeB, latitudeB) {
  // Haversine（半正矢）公式：根据两组经纬度计算地球表面的直线距离，单位是米。
  // 它适合“离哪个校区更近”的筛选；不等于实际步行、骑车或开车距离。
  const radius = 6371000;
  const radians = (value) => value * Math.PI / 180;
  const deltaLatitude = radians(latitudeB - latitudeA);
  const deltaLongitude = radians(longitudeB - longitudeA);
  const a = Math.sin(deltaLatitude / 2) ** 2
    + Math.cos(radians(latitudeA)) * Math.cos(radians(latitudeB)) * Math.sin(deltaLongitude / 2) ** 2;
  return radius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function readEnvFile(filePath = path.join(DATABASE_ROOT, ".env")) {
  return fs.readFile(filePath, "utf8")
    .then((text) => Object.fromEntries(text.split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const divider = line.indexOf("=");
        return [line.slice(0, divider).trim(), line.slice(divider + 1).trim().replace(/^['"]|['"]$/g, "")];
      })))
    .catch((error) => error.code === "ENOENT" ? {} : Promise.reject(error));
}

export function parseCliArgs(args) {
  const result = {};
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2);
    const next = args[index + 1];
    result[key] = next && !next.startsWith("--") ? (index += 1, next) : true;
  }
  return result;
}
