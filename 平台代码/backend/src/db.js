import Database from "better-sqlite3";
import { existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "..", "data");

if (!existsSync(DATA_DIR)) {
  mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = join(DATA_DIR, "fanfan.db");

// 功能：初始化 SQLite 数据库连接，开启 WAL 模式提升并发读性能
const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// 功能：建表（如果表不存在则创建），后续切 MySQL 时只需替换建表语句和驱动
function initTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nickname TEXT NOT NULL,
      student_no TEXT DEFAULT '',
      school TEXT DEFAULT '示例大学',
      credit_score INTEGER DEFAULT 100,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS profiles (
      user_id INTEGER PRIMARY KEY REFERENCES users(id),
      avatar_url TEXT DEFAULT '',
      gender TEXT DEFAULT 'unknown',
      campus TEXT DEFAULT '主校区',
      taste_tags TEXT DEFAULT '[]',
      personality_tags TEXT DEFAULT '[]',
      budget_preference TEXT DEFAULT '20-40',
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS meals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      food_type TEXT DEFAULT '不限',
      meal_time TEXT NOT NULL,
      place TEXT NOT NULL,
      campus TEXT DEFAULT '主校区',
      max_people INTEGER NOT NULL,
      budget_min INTEGER DEFAULT 0,
      budget_max INTEGER DEFAULT 0,
      chat_mode TEXT DEFAULT 'quiet',
      description TEXT DEFAULT '',
      status TEXT DEFAULT 'open',
      creator_id INTEGER NOT NULL REFERENCES users(id),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS meal_participants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      meal_id INTEGER NOT NULL REFERENCES meals(id),
      user_id INTEGER NOT NULL REFERENCES users(id),
      role TEXT DEFAULT 'member',
      status TEXT DEFAULT 'joined',
      joined_at TEXT NOT NULL,
      left_at TEXT
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      meal_id INTEGER NOT NULL REFERENCES meals(id),
      reviewer_id INTEGER NOT NULL REFERENCES users(id),
      target_user_id INTEGER NOT NULL REFERENCES users(id),
      rating INTEGER NOT NULL,
      content TEXT DEFAULT '',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS restaurants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      food_type TEXT DEFAULT '',
      campus TEXT DEFAULT '主校区',
      location TEXT DEFAULT '',
      avg_price INTEGER DEFAULT 0,
      rating REAL DEFAULT 0,
      tags TEXT DEFAULT '[]',
      description TEXT DEFAULT '',
      status TEXT DEFAULT 'open',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      meal_id INTEGER NOT NULL REFERENCES meals(id),
      reporter_user_id INTEGER NOT NULL REFERENCES users(id),
      target_user_id INTEGER NOT NULL REFERENCES users(id),
      reason TEXT NOT NULL,
      detail TEXT DEFAULT '',
      status TEXT DEFAULT 'pending',
      created_at TEXT NOT NULL
    );
  `);
}

initTables();

// ========== 数据规范化 ==========

function normalizeUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    nickname: row.nickname,
    studentNo: row.student_no,
    school: row.school,
    creditScore: row.credit_score,
    createdAt: row.created_at
  };
}

function normalizeMeal(row) {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    foodType: row.food_type,
    mealTime: row.meal_time,
    place: row.place,
    campus: row.campus,
    maxPeople: row.max_people,
    budgetMin: row.budget_min,
    budgetMax: row.budget_max,
    chatMode: row.chat_mode,
    description: row.description,
    status: row.status,
    creatorId: row.creator_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function normalizeParticipant(row) {
  if (!row) return null;
  return {
    userId: row.user_id,
    role: row.role,
    status: row.status,
    joinedAt: row.joined_at,
    leftAt: row.left_at,
    user: row.nickname ? {
      id: row.user_id,
      nickname: row.nickname,
      school: row.school,
      creditScore: row.credit_score,
      profile: {
        userId: row.user_id,
        avatarUrl: row.avatar_url || "",
        gender: row.gender || "unknown",
        campus: row.campus || "主校区",
        tasteTags: JSON.parse(row.taste_tags || "[]"),
        personalityTags: JSON.parse(row.personality_tags || "[]"),
        budgetPreference: row.budget_preference || "20-40",
        updatedAt: row.updated_at || ""
      }
    } : null
  };
}

function normalizeReview(row) {
  if (!row) return null;
  return {
    id: row.id,
    mealId: row.meal_id,
    reviewerId: row.reviewer_id,
    targetUserId: row.target_user_id,
    rating: row.rating,
    content: row.content,
    createdAt: row.created_at
  };
}

function normalizeRestaurant(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    foodType: row.food_type,
    campus: row.campus,
    location: row.location,
    avgPrice: row.avg_price,
    rating: row.rating,
    tags: JSON.parse(row.tags || "[]"),
    description: row.description,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function normalizeReport(row) {
  if (!row) return null;
  return {
    id: row.id,
    mealId: row.meal_id,
    reporterUserId: row.reporter_user_id,
    targetUserId: row.target_user_id,
    reason: row.reason,
    detail: row.detail,
    status: row.status,
    createdAt: row.created_at
  };
}

// ========== 用户 ==========

// 功能：按 ID 查用户，兼容字符串和数字类型
export function getUser(id) {
  const row = db.prepare("SELECT * FROM users WHERE id = ?").get(Number(id));
  return normalizeUser(row);
}

// 功能：按学号查用户
export function getUserByStudentNo(studentNo) {
  if (!studentNo) return null;
  const row = db.prepare("SELECT * FROM users WHERE student_no = ?").get(studentNo);
  return normalizeUser(row);
}

// 功能：按昵称查用户
export function getUserByNickname(nickname) {
  const row = db.prepare("SELECT * FROM users WHERE nickname = ?").get(nickname);
  return normalizeUser(row);
}

// 功能：创建用户并同步创建默认资料
export function createUser({ nickname, studentNo, school }) {
  const now = new Date().toISOString();
  const result = db.prepare(`
    INSERT INTO users (nickname, student_no, school, credit_score, created_at)
    VALUES (?, ?, ?, 100, ?)
  `).run(nickname, studentNo || "", school || "示例大学", now);

  const userId = result.lastInsertRowid;

  db.prepare(`
    INSERT INTO profiles (user_id, avatar_url, gender, campus, taste_tags, personality_tags, budget_preference, updated_at)
    VALUES (?, '', 'unknown', '主校区', '[]', '[]', '20-40', ?)
  `).run(userId, now);

  return getUser(userId);
}

// ========== 资料 ==========

// 功能：读取用户资料，taste_tags 和 personality_tags 以 JSON 数组返回
export function getProfile(userId) {
  const row = db.prepare("SELECT * FROM profiles WHERE user_id = ?").get(Number(userId));
  if (!row) return null;
  return {
    userId: row.user_id,
    avatarUrl: row.avatar_url,
    gender: row.gender,
    campus: row.campus,
    tasteTags: JSON.parse(row.taste_tags || "[]"),
    personalityTags: JSON.parse(row.personality_tags || "[]"),
    budgetPreference: row.budget_preference,
    updatedAt: row.updated_at
  };
}

// 功能：更新或插入用户资料
export function upsertProfile(userId, data) {
  const now = new Date().toISOString();
  const existing = getProfile(userId);

  const avatarUrl = data.avatarUrl ?? existing?.avatarUrl ?? "";
  const gender = data.gender ?? existing?.gender ?? "unknown";
  const campus = data.campus ?? existing?.campus ?? "主校区";
  const tasteTags = JSON.stringify(Array.isArray(data.tasteTags) ? data.tasteTags : (existing?.tasteTags || []));
  const personalityTags = JSON.stringify(Array.isArray(data.personalityTags) ? data.personalityTags : (existing?.personalityTags || []));
  const budgetPreference = data.budgetPreference ?? existing?.budgetPreference ?? "20-40";

  db.prepare(`
    INSERT INTO profiles (user_id, avatar_url, gender, campus, taste_tags, personality_tags, budget_preference, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET
      avatar_url = excluded.avatar_url,
      gender = excluded.gender,
      campus = excluded.campus,
      taste_tags = excluded.taste_tags,
      personality_tags = excluded.personality_tags,
      budget_preference = excluded.budget_preference,
      updated_at = excluded.updated_at
  `).run(Number(userId), avatarUrl, gender, campus, tasteTags, personalityTags, budgetPreference, now);

  return getProfile(userId);
}

// ========== 饭局 ==========

// 功能：按 ID 查饭局
export function getMeal(id) {
  const row = db.prepare("SELECT * FROM meals WHERE id = ?").get(Number(id));
  return normalizeMeal(row);
}

// 功能：创建饭局，自动加入创建者为参与者
export function createMeal(data) {
  const now = new Date().toISOString();
  const result = db.prepare(`
    INSERT INTO meals (title, food_type, meal_time, place, campus, max_people, budget_min, budget_max, chat_mode, description, status, creator_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', ?, ?, ?)
  `).run(
    data.title, data.foodType || "不限", data.mealTime, data.place,
    data.campus || "主校区", data.maxPeople, data.budgetMin || 0, data.budgetMax || 0,
    data.chatMode || "quiet", data.description || "", data.creatorId, now, now
  );

  const mealId = result.lastInsertRowid;

  // 创建者自动加入
  db.prepare(`
    INSERT INTO meal_participants (meal_id, user_id, role, status, joined_at)
    VALUES (?, ?, 'creator', 'joined', ?)
  `).run(mealId, data.creatorId, now);

  return getMeal(mealId);
}

// 功能：饭局列表查询，支持状态、校区、关键词筛选
export function listMeals({ status, campus, keyword } = {}) {
  let sql = "SELECT * FROM meals WHERE 1=1";
  const params = [];

  if (status) {
    sql += " AND status = ?";
    params.push(status);
  }
  if (campus) {
    sql += " AND campus = ?";
    params.push(campus);
  }
  if (keyword) {
    sql += " AND (title LIKE ? OR food_type LIKE ? OR place LIKE ? OR description LIKE ?)";
    const kw = `%${keyword}%`;
    params.push(kw, kw, kw, kw);
  }

  sql += " ORDER BY meal_time ASC";
  return db.prepare(sql).all(...params).map(normalizeMeal);
}

// 功能：按创建者查饭局
export function listMealsByCreator(userId) {
  return db.prepare("SELECT * FROM meals WHERE creator_id = ? ORDER BY meal_time ASC")
    .all(Number(userId))
    .map(normalizeMeal);
}

// 功能：更新饭局字段（field keys 需为 snake_case 数据库列名）
export function updateMeal(id, fields) {
  const sets = [];
  const params = [];
  for (const [key, value] of Object.entries(fields)) {
    sets.push(`${key} = ?`);
    params.push(value);
  }
  params.push(Number(id));
  db.prepare(`UPDATE meals SET ${sets.join(", ")} WHERE id = ?`).run(...params);
  return getMeal(id);
}

// ========== 参与者 ==========

// 功能：获取饭局参与者列表（status='joined' 的），含用户公开信息
export function getParticipants(mealId) {
  return db.prepare(`
    SELECT mp.meal_id, mp.user_id, mp.role, mp.status, mp.joined_at, mp.left_at,
           u.nickname, u.school, u.credit_score,
           p.avatar_url, p.gender, p.campus, p.taste_tags, p.personality_tags,
           p.budget_preference, p.updated_at
    FROM meal_participants mp
    JOIN users u ON u.id = mp.user_id
    LEFT JOIN profiles p ON p.user_id = u.id
    WHERE mp.meal_id = ? AND mp.status = 'joined'
  `).all(Number(mealId)).map(normalizeParticipant);
}

// 功能：获取饭局参与者人数
export function getParticipantCount(mealId) {
  const row = db.prepare(
    "SELECT COUNT(*) as cnt FROM meal_participants WHERE meal_id = ? AND status = 'joined'"
  ).get(Number(mealId));
  return row ? row.cnt : 0;
}

// 功能：获取饭局的所有参与者记录（含已退出的）
export function getAllParticipantRecords(mealId) {
  return db.prepare("SELECT * FROM meal_participants WHERE meal_id = ?").all(Number(mealId));
}

// 功能：检查用户是否已加入某饭局
export function isUserJoined(mealId, userId) {
  const row = db.prepare(
    "SELECT 1 FROM meal_participants WHERE meal_id = ? AND user_id = ? AND status = 'joined'"
  ).get(Number(mealId), Number(userId));
  return !!row;
}

// 功能：加入饭局
export function addParticipant(mealId, userId, role = "member") {
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO meal_participants (meal_id, user_id, role, status, joined_at)
    VALUES (?, ?, ?, 'joined', ?)
  `).run(Number(mealId), Number(userId), role, now);
}

// 功能：标记参与者退出
export function markParticipantLeft(mealId, userId) {
  const now = new Date().toISOString();
  db.prepare(`
    UPDATE meal_participants SET status = 'left', left_at = ?
    WHERE meal_id = ? AND user_id = ? AND status = 'joined'
  `).run(now, Number(mealId), Number(userId));
}

// 功能：刷新饭局状态（人数满 → matched，未满 → open）
export function refreshMealStatus(mealId) {
  const count = getParticipantCount(mealId);
  const meal = getMeal(mealId);
  if (!meal) return;
  const newStatus = count >= meal.maxPeople ? "matched" : "open";
  const now = new Date().toISOString();
  db.prepare("UPDATE meals SET status = ?, updated_at = ? WHERE id = ?")
    .run(newStatus, now, Number(mealId));
  return newStatus;
}

// ========== 评价 ==========

// 功能：获取饭局的所有评价
export function getReviews(mealId) {
  return db.prepare("SELECT * FROM reviews WHERE meal_id = ?")
    .all(Number(mealId))
    .map(normalizeReview);
}

// 功能：创建评价
export function createReview({ mealId, reviewerId, targetUserId, rating, content }) {
  const now = new Date().toISOString();
  const result = db.prepare(`
    INSERT INTO reviews (meal_id, reviewer_id, target_user_id, rating, content, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(Number(mealId), Number(reviewerId), Number(targetUserId), rating, content || "", now);

  const row = db.prepare("SELECT * FROM reviews WHERE id = ?").get(result.lastInsertRowid);
  return normalizeReview(row);
}

// 功能：检查用户是否曾参与某饭局（含已退出的）
export function hasUserInMeal(mealId, userId) {
  const row = db.prepare(
    "SELECT 1 FROM meal_participants WHERE meal_id = ? AND user_id = ?"
  ).get(Number(mealId), Number(userId));
  return !!row;
}

// ========== 餐厅 ==========

// 功能：按 ID 查餐厅
export function getRestaurant(id) {
  const row = db.prepare("SELECT * FROM restaurants WHERE id = ?").get(Number(id));
  return normalizeRestaurant(row);
}

// 功能：餐厅列表，支持 campus / foodType / keyword 筛选
export function listRestaurants({ campus, foodType, keyword } = {}) {
  let sql = "SELECT * FROM restaurants WHERE 1=1";
  const params = [];

  if (campus) {
    sql += " AND campus = ?";
    params.push(campus);
  }
  if (foodType) {
    sql += " AND food_type = ?";
    params.push(foodType);
  }
  if (keyword) {
    sql += " AND (name LIKE ? OR food_type LIKE ? OR location LIKE ? OR description LIKE ?)";
    const kw = `%${keyword}%`;
    params.push(kw, kw, kw, kw);
  }

  sql += " ORDER BY rating DESC, name ASC";
  return db.prepare(sql).all(...params).map(normalizeRestaurant);
}

// 功能：新增餐厅
export function createRestaurant(data) {
  const now = new Date().toISOString();
  const tags = JSON.stringify(Array.isArray(data.tags) ? data.tags : []);
  const result = db.prepare(`
    INSERT INTO restaurants (name, food_type, campus, location, avg_price, rating, tags, description, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'open', ?, ?)
  `).run(
    data.name, data.foodType || "", data.campus || "主校区",
    data.location || "", data.avgPrice || 0, data.rating || 0,
    tags, data.description || "", now, now
  );

  return getRestaurant(result.lastInsertRowid);
}

// 功能：更新餐厅字段（field keys 需为 snake_case 数据库列名）
export function updateRestaurant(id, fields) {
  const sets = [];
  const params = [];
  for (const [key, value] of Object.entries(fields)) {
    sets.push(`${key} = ?`);
    // tags 如果是数组则序列化
    params.push(key === "tags" && Array.isArray(value) ? JSON.stringify(value) : value);
  }
  params.push(Number(id));
  db.prepare(`UPDATE restaurants SET ${sets.join(", ")} WHERE id = ?`).run(...params);
  return getRestaurant(id);
}

// ========== 举报 ==========

// 功能：按 ID 查举报记录
export function getReport(id) {
  const row = db.prepare("SELECT * FROM reports WHERE id = ?").get(Number(id));
  return normalizeReport(row);
}

// 功能：创建举报记录
export function createReport({ mealId, reporterUserId, targetUserId, reason, detail }) {
  const now = new Date().toISOString();
  const result = db.prepare(`
    INSERT INTO reports (meal_id, reporter_user_id, target_user_id, reason, detail, status, created_at)
    VALUES (?, ?, ?, ?, ?, 'pending', ?)
  `).run(Number(mealId), Number(reporterUserId), Number(targetUserId), reason, detail || "", now);

  return getReport(result.lastInsertRowid);
}

// 功能：举报列表，支持按饭局、被举报人筛选
export function listReports({ mealId, targetUserId } = {}) {
  let sql = "SELECT * FROM reports WHERE 1=1";
  const params = [];

  if (mealId) {
    sql += " AND meal_id = ?";
    params.push(Number(mealId));
  }
  if (targetUserId) {
    sql += " AND target_user_id = ?";
    params.push(Number(targetUserId));
  }

  sql += " ORDER BY created_at DESC";
  return db.prepare(sql).all(...params).map(normalizeReport);
}

// ========== 辅助 ==========

// 功能：获取用户参与的饭局 ID 列表（不含自己是创建者的）
export function getUserJoinedMealIds(userId) {
  const rows = db.prepare(`
    SELECT DISTINCT mp.meal_id FROM meal_participants mp
    JOIN meals m ON m.id = mp.meal_id
    WHERE mp.user_id = ? AND mp.status = 'joined' AND m.creator_id != ?
  `).all(Number(userId), Number(userId));
  return rows.map(r => r.meal_id);
}

// ========== 种子数据 ==========

// 功能：首次启动时写入示例数据，如果已有数据则跳过
export function seedIfEmpty() {
  const count = db.prepare("SELECT COUNT(*) as cnt FROM users").get();
  if (count.cnt > 0) return;

  const now = new Date().toISOString();

  db.prepare(`INSERT INTO users (id, nickname, student_no, school, credit_score, created_at) VALUES (1, '小林', '2026001', '示例大学', 98, ?)`).run(now);
  db.prepare(`INSERT INTO users (id, nickname, student_no, school, credit_score, created_at) VALUES (2, '阿晴', '2026002', '示例大学', 96, ?)`).run(now);

  db.prepare(`INSERT INTO profiles (user_id, taste_tags, personality_tags, budget_preference, updated_at) VALUES (1, '["川菜","不吃香菜"]', '["慢热","安静吃饭"]', '20-40', ?)`).run(now);
  db.prepare(`INSERT INTO profiles (user_id, taste_tags, personality_tags, budget_preference, updated_at) VALUES (2, '["面食","甜品"]', '["外向","可聊天"]', '15-30', ?)`).run(now);

  db.prepare(`INSERT INTO meals (id, title, food_type, meal_time, place, campus, max_people, budget_min, budget_max, chat_mode, description, status, creator_id, created_at, updated_at)
    VALUES (1, '二食堂麻辣香锅拼一桌', '麻辣香锅', '2026-07-09T11:30:00.000Z', '二食堂一楼', '主校区', 4, 20, 35, 'talkative', '想找两三个人一起点，口味中辣。', 'open', 1, ?, ?)`).run(now, now);
  db.prepare(`INSERT INTO meals (id, title, food_type, meal_time, place, campus, max_people, budget_min, budget_max, chat_mode, description, status, creator_id, created_at, updated_at)
    VALUES (2, '下课后去校门口吃米线', '米线', '2026-07-09T10:45:00.000Z', '东门米线店', '主校区', 2, 15, 25, 'quiet', '简单吃饭，不尬聊也可以。', 'matched', 2, ?, ?)`).run(now, now);
  db.prepare(`INSERT INTO meals (id, title, food_type, meal_time, place, campus, max_people, budget_min, budget_max, chat_mode, description, status, creator_id, created_at, updated_at)
    VALUES (3, '晚饭想吃轻食', '轻食', '2026-07-09T17:30:00.000Z', '三食堂轻食窗口', '主校区', 3, 18, 30, 'balanced', '希望找作息健康一点的同学一起吃。', 'open', 1, ?, ?)`).run(now, now);

  db.prepare(`INSERT INTO meal_participants (meal_id, user_id, role, status, joined_at) VALUES (1, 1, 'creator', 'joined', ?)`).run(now);
  db.prepare(`INSERT INTO meal_participants (meal_id, user_id, role, status, joined_at) VALUES (2, 2, 'creator', 'joined', ?)`).run(now);
  db.prepare(`INSERT INTO meal_participants (meal_id, user_id, role, status, joined_at) VALUES (2, 1, 'member', 'joined', ?)`).run(now);
  db.prepare(`INSERT INTO meal_participants (meal_id, user_id, role, status, joined_at) VALUES (3, 1, 'creator', 'joined', ?)`).run(now);

  // 种子餐厅数据
  db.prepare(`INSERT INTO restaurants (id, name, food_type, campus, location, avg_price, rating, tags, description, status, created_at, updated_at)
    VALUES (1, '二食堂麻辣香锅', '麻辣香锅', '主校区', '二食堂一楼', 2800, 4.5, '["川味","重口味","适合拼桌"]', '现选现炒，荤素搭配，人均二十到三十元。', 'open', ?, ?)`).run(now, now);
  db.prepare(`INSERT INTO restaurants (id, name, food_type, campus, location, avg_price, rating, tags, description, status, created_at, updated_at)
    VALUES (2, '东门米线店', '米线', '主校区', '东门外步行街', 1800, 4.2, '["快餐","一人食","翻台快"]', '过桥米线和小锅米线都有，出餐快。', 'open', ?, ?)`).run(now, now);
  db.prepare(`INSERT INTO restaurants (id, name, food_type, campus, location, avg_price, rating, tags, description, status, created_at, updated_at)
    VALUES (3, '三食堂轻食窗口', '轻食', '主校区', '三食堂二楼', 2200, 4.0, '["健康","减脂","清淡"]', '沙拉、鸡胸肉、糙米饭，适合健身党。', 'open', ?, ?)`).run(now, now);
  db.prepare(`INSERT INTO restaurants (id, name, food_type, campus, location, avg_price, rating, tags, description, status, created_at, updated_at)
    VALUES (4, '一食堂火锅', '火锅', '主校区', '一食堂三楼', 4500, 4.3, '["聚餐","热闹","需提前约"]', '小锅火锅，按人头收费，适合三五好友。', 'open', ?, ?)`).run(now, now);
  db.prepare(`INSERT INTO restaurants (id, name, food_type, campus, location, avg_price, rating, tags, description, status, created_at, updated_at)
    VALUES (5, '教工食堂牛肉面', '面食', '主校区', '教工食堂一楼', 1500, 4.6, '["面食","排队王","性价比高"]', '手工拉面，牛肉给得多，饭点经常排队。', 'open', ?, ?)`).run(now, now);
  db.prepare(`INSERT INTO restaurants (id, name, food_type, campus, location, avg_price, rating, tags, description, status, created_at, updated_at)
    VALUES (6, '南门小吃街烧烤', '烧烤', '主校区', '南门外小吃街', 3500, 3.9, '["夜宵","露天","社交"]', '晚上才出摊，适合宵夜局。', 'open', ?, ?)`).run(now, now);

  console.log("[db] 已写入种子数据");
}

export default db;
