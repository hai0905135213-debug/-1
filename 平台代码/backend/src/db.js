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
// 餐厅清洗库独立维护，不和用户、饭局等业务数据混在一起。
// 后端只读它；聊天清洗和高德补全仍在项目根目录的 database/ 下完成。
const RESTAURANT_WAREHOUSE_PATH = join(__dirname, "..", "..", "..", "database", "data", "restaurants.db");

// 功能：初始化 SQLite 数据库连接，开启 WAL 模式提升并发读性能
const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// 第一次部署若尚未生成餐厅仓，旧的演示餐厅接口仍可正常工作。
// 有仓库文件时，/api/restaurants 会优先读取这里的真实清洗数据。
const restaurantWarehouse = existsSync(RESTAURANT_WAREHOUSE_PATH)
  ? new Database(RESTAURANT_WAREHOUSE_PATH, { readonly: true, fileMustExist: true })
  : null;

function isNumericRestaurantId(value) {
  return value !== undefined && value !== null && value !== "" && Number.isInteger(Number(value));
}

function getRestaurantNameForStorage(restaurantId, restaurantName = "") {
  if (restaurantName) return restaurantName;
  if (!restaurantId) return "";
  const catalogItem = getRestaurantCatalogItem(restaurantId);
  if (catalogItem?.name) return catalogItem.name;
  const legacyItem = isNumericRestaurantId(restaurantId) ? getRestaurant(restaurantId) : null;
  return legacyItem?.name || String(restaurantId);
}

function getRestaurantKeywordTerms(keyword) {
  const raw = String(keyword || "").trim();
  if (!raw) return [];
  const terms = raw
    .split(/[\s,，、/|]+/)
    .map((term) => term.trim())
    .filter(Boolean);
  terms.push(raw);
  for (const term of [...terms]) {
    const nearbyTerm = term.replace(/^(附近|近|离)/, "").trim();
    if (nearbyTerm && nearbyTerm !== term) terms.push(nearbyTerm);
  }
  return [...new Set(terms)];
}

function compactRestaurantTag(value) {
  return String(value || "")
    .replace(/[（(].*?[）)]/g, "")
    .replace(/需确认|待核验|推测|依据上下文/g, "")
    .trim();
}

function splitRestaurantTags(...values) {
  return values
    .flatMap((value) => String(value || "").split(/[、,，/｜|;；\s]+/))
    .map(compactRestaurantTag)
    .filter(Boolean);
}

function buildRestaurantTags(row, selectedCandidate) {
  const tags = splitRestaurantTags(row.cuisine, row.recommended_dishes, row.optional_dishes, row.amap_category, selectedCandidate?.category);
  if (/沙河/.test(`${row.location_hint || ""} ${row.full_address || ""} ${selectedCandidate?.address || ""}`)) tags.push("近沙河");
  if (/学院南路|南路/.test(`${row.location_hint || ""} ${row.full_address || ""} ${selectedCandidate?.address || ""}`)) tags.push("近学院南路");
  if (/聚|约|多人|团建|宴请/.test(`${row.party_size || ""} ${row.booking_note || ""}`)) tags.push("适合聚餐");
  if (/清真/.test(`${row.cuisine || ""} ${row.name || ""} ${row.raw_messages || ""}`)) tags.push("清真");
  if (row.sentiment === "positive" || Number(row.positive_count) > Number(row.caution_count || 0)) tags.push("群友推荐");
  return [...new Set(tags)].slice(0, 8);
}

// 功能：建表（如果表不存在则创建），后续切 MySQL 时只需替换建表语句和驱动
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
      major TEXT DEFAULT '',
      grade TEXT DEFAULT '',
      hometown TEXT DEFAULT '',
      constellation TEXT DEFAULT '',
      description TEXT DEFAULT '',
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
      restaurant_id INTEGER REFERENCES restaurants(id),
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

    CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      author_id INTEGER NOT NULL REFERENCES users(id),
      category TEXT NOT NULL,
      content TEXT NOT NULL,
      restaurant_id INTEGER REFERENCES restaurants(id),
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS post_participants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id INTEGER NOT NULL REFERENCES posts(id),
      user_id INTEGER NOT NULL REFERENCES users(id),
      joined_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS visited_restaurants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      restaurant_id INTEGER REFERENCES restaurants(id),
      restaurant_name TEXT DEFAULT '',
      visited_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS wishlist_restaurants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      restaurant_id INTEGER REFERENCES restaurants(id),
      restaurant_name TEXT DEFAULT '',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS user_moments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      content TEXT NOT NULL,
      image_url TEXT DEFAULT '',
      likes_count INTEGER DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS saved_meals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      meal_id INTEGER NOT NULL REFERENCES meals(id),
      created_at TEXT NOT NULL
    );
  `);

  upgradeProfilesTable();
  upgradeMealsTable();
  seedNewTablesIfEmpty();
}

function upgradeProfilesTable() {
  const columns = db.pragma("table_info(profiles)").map(c => c.name);
  if (!columns.includes("major")) {
    db.exec("ALTER TABLE profiles ADD COLUMN major TEXT DEFAULT ''");
  }
  if (!columns.includes("grade")) {
    db.exec("ALTER TABLE profiles ADD COLUMN grade TEXT DEFAULT ''");
  }
  if (!columns.includes("hometown")) {
    db.exec("ALTER TABLE profiles ADD COLUMN hometown TEXT DEFAULT ''");
  }
  if (!columns.includes("constellation")) {
    db.exec("ALTER TABLE profiles ADD COLUMN constellation TEXT DEFAULT ''");
  }
  if (!columns.includes("description")) {
    db.exec("ALTER TABLE profiles ADD COLUMN description TEXT DEFAULT ''");
  }
}

function upgradeMealsTable() {
  const columns = db.pragma("table_info(meals)").map(c => c.name);
  if (!columns.includes("restaurant_id")) {
    db.exec("ALTER TABLE meals ADD COLUMN restaurant_id INTEGER REFERENCES restaurants(id)");
  }
  db.exec("UPDATE meals SET restaurant_id = 1 WHERE (place LIKE '%二食堂一楼%' OR place LIKE '%麻辣香锅%') AND restaurant_id IS NULL");
  db.exec("UPDATE meals SET restaurant_id = 2 WHERE place LIKE '%东门米线%' AND restaurant_id IS NULL");
  db.exec("UPDATE meals SET restaurant_id = 3 WHERE place LIKE '%三食堂%' AND restaurant_id IS NULL");
}

function seedNewTablesIfEmpty() {
  const now = new Date().toISOString();
  const userCount = db.prepare("SELECT COUNT(*) as cnt FROM users").get();
  if (userCount.cnt === 0) return;
  
  const visitedCount = db.pragma("table_info(visited_restaurants)");
  if (visitedCount.length > 0) {
    const rowCount = db.prepare("SELECT COUNT(*) as cnt FROM visited_restaurants").get();
    if (rowCount.cnt === 0) {
      db.prepare(`INSERT INTO visited_restaurants (user_id, restaurant_id, restaurant_name, visited_at) VALUES (1, NULL, '二食堂麻辣香锅', ?)`).run(now);
      db.prepare(`INSERT INTO visited_restaurants (user_id, restaurant_id, restaurant_name, visited_at) VALUES (1, NULL, '东门米线店', ?)`).run(now);
    }
  }
  
  const wishlistCount = db.pragma("table_info(wishlist_restaurants)");
  if (wishlistCount.length > 0) {
    const rowCount = db.prepare("SELECT COUNT(*) as cnt FROM wishlist_restaurants").get();
    if (rowCount.cnt === 0) {
      db.prepare(`INSERT INTO wishlist_restaurants (user_id, restaurant_id, restaurant_name, created_at) VALUES (1, NULL, '一食堂火锅', ?)`).run(now);
      db.prepare(`INSERT INTO wishlist_restaurants (user_id, restaurant_id, restaurant_name, created_at) VALUES (1, NULL, '教工食堂牛肉面', ?)`).run(now);
    }
  }

  const momentsCount = db.pragma("table_info(user_moments)");
  if (momentsCount.length > 0) {
    const rowCount = db.prepare("SELECT COUNT(*) as cnt FROM user_moments").get();
    if (rowCount.cnt === 0) {
      db.prepare(`INSERT INTO user_moments (user_id, content, image_url, likes_count, created_at) VALUES (3, '今天在二食堂二楼发现了一家新的拉面，味道绝了！推荐大家去尝尝。🍔', 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=400&q=80', 5, ?)`).run(now);
      db.prepare(`INSERT INTO user_moments (user_id, content, image_url, likes_count, created_at) VALUES (1, '吃饱喝足，准备回图书馆搬砖了🎒', '', 2, ?)`).run(now);
    }
  }

  const savedCount = db.pragma("table_info(saved_meals)");
  if (savedCount.length > 0) {
    const rowCount = db.prepare("SELECT COUNT(*) as cnt FROM saved_meals").get();
    if (rowCount.cnt === 0) {
      db.prepare(`INSERT INTO saved_meals (user_id, meal_id, created_at) VALUES (1, 1, ?)`).run(now);
      db.prepare(`INSERT INTO saved_meals (user_id, meal_id, created_at) VALUES (1, 2, ?)`).run(now);
    }
  }
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
    restaurantId: row.restaurant_id,
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
  let parsedTags = [];
  if (row.tags) {
    try {
      parsedTags = JSON.parse(row.tags);
      if (!Array.isArray(parsedTags)) {
        parsedTags = String(row.tags).split(',').map(t => t.trim()).filter(Boolean);
      }
    } catch (e) {
      parsedTags = String(row.tags).split(',').map(t => t.trim()).filter(Boolean);
    }
  }
  return {
    id: row.id,
    name: row.name,
    foodType: row.food_type,
    campus: row.campus,
    location: row.location,
    avgPrice: row.avg_price,
    rating: row.rating,
    tags: parsedTags,
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

function normalizePost(row) {
  if (!row) return null;
  return {
    id: row.id,
    authorId: row.author_id,
    category: row.category,
    content: row.content,
    restaurantId: row.restaurant_id,
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
    major: row.major || "",
    grade: row.grade || "",
    hometown: row.hometown || "",
    constellation: row.constellation || "",
    description: row.description || "",
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
  const major = data.major ?? existing?.major ?? "";
  const grade = data.grade ?? existing?.grade ?? "";
  const hometown = data.hometown ?? existing?.hometown ?? "";
  const constellation = data.constellation ?? existing?.constellation ?? "";
  const description = data.description ?? existing?.description ?? "";

  db.prepare(`
    INSERT INTO profiles (user_id, avatar_url, gender, campus, taste_tags, personality_tags, budget_preference, major, grade, hometown, constellation, description, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET
      avatar_url = excluded.avatar_url,
      gender = excluded.gender,
      campus = excluded.campus,
      taste_tags = excluded.taste_tags,
      personality_tags = excluded.personality_tags,
      budget_preference = excluded.budget_preference,
      major = excluded.major,
      grade = excluded.grade,
      hometown = excluded.hometown,
      constellation = excluded.constellation,
      description = excluded.description,
      updated_at = excluded.updated_at
  `).run(Number(userId), avatarUrl, gender, campus, tasteTags, personalityTags, budgetPreference, major, grade, hometown, constellation, description, now);

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
  
  let restaurantId = data.restaurantId || null;
  if (!restaurantId && data.place) {
    const match = findRestaurantByName(data.place);
    if (match && isNumericRestaurantId(match.id)) restaurantId = match.id;
  }
  const legacyRestaurantId = isNumericRestaurantId(restaurantId) ? Number(restaurantId) : null;

  const result = db.prepare(`
    INSERT INTO meals (title, food_type, meal_time, place, campus, max_people, budget_min, budget_max, chat_mode, description, status, creator_id, restaurant_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', ?, ?, ?, ?)
  `).run(
    data.title, data.foodType || "不限", data.mealTime, data.place,
    data.campus || "主校区", data.maxPeople, data.budgetMin || 0, data.budgetMax || 0,
    data.chatMode || "quiet", data.description || "", data.creatorId, legacyRestaurantId, now, now
  );

  const mealId = result.lastInsertRowid;

  // 创建者自动加入
  db.prepare(`
    INSERT INTO meal_participants (meal_id, user_id, role, status, joined_at)
    VALUES (?, ?, 'creator', 'joined', ?)
  `).run(mealId, data.creatorId, now);

  return getMeal(mealId);
}

// 功能：饭局列表查询，支持状态、校区、关键词筛选以及预算/人数/排序等高级筛选
export function listMeals({ status, campus, keyword, minBudget, maxBudget, minPeople, maxPeople, sortBy, restaurantId } = {}) {
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
  if (restaurantId) {
    if (isNumericRestaurantId(restaurantId)) {
      sql += " AND restaurant_id = ?";
      params.push(Number(restaurantId));
    } else {
      const catalogItem = getRestaurantCatalogItem(restaurantId);
      if (catalogItem?.name) {
        sql += " AND (place LIKE ? OR description LIKE ?)";
        params.push(`%${catalogItem.name}%`, `%${catalogItem.name}%`);
      }
    }
  }
  
  if (minBudget !== undefined && minBudget > 0) {
    sql += " AND budget_min >= ?";
    params.push(Number(minBudget));
  }
  if (maxBudget !== undefined && maxBudget > 0) {
    sql += " AND budget_max <= ?";
    params.push(Number(maxBudget));
  }
  
  if (minPeople !== undefined && minPeople > 0) {
    sql += " AND max_people >= ?";
    params.push(Number(minPeople));
  }
  if (maxPeople !== undefined && maxPeople > 0) {
    sql += " AND max_people <= ?";
    params.push(Number(maxPeople));
  }

  if (sortBy === 'budget-asc') {
    sql += " ORDER BY budget_min ASC";
  } else if (sortBy === 'people-desc') {
    sql += " ORDER BY max_people DESC";
  } else {
    sql += " ORDER BY meal_time ASC";
  }
  
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

// 功能：按名称模糊查询餐厅
export function findRestaurantByName(name) {
  const keyword = String(name || "").trim();
  if (!keyword) return null;

  const catalogResult = listRestaurantCatalog({ keyword, page: 1, pageSize: 1 });
  if (catalogResult.items.length > 0) return catalogResult.items[0];

  const row = db.prepare("SELECT * FROM restaurants WHERE name LIKE ?").get(`%${keyword}%`);
  return normalizeRestaurant(row);
}

// 功能：餐厅列表，支持 campus / foodType / keyword 筛选以及价格、排序
export function listRestaurants({ campus, foodType, keyword, minPrice, maxPrice, sortBy } = {}) {
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

  if (minPrice !== undefined && minPrice > 0) {
    sql += " AND avg_price >= ?";
    params.push(Number(minPrice) * 100);
  }
  if (maxPrice !== undefined && maxPrice > 0) {
    sql += " AND avg_price <= ?";
    params.push(Number(maxPrice) * 100);
  }

  if (sortBy === 'price-asc') {
    sql += " ORDER BY avg_price ASC";
  } else if (sortBy === 'rating-desc') {
    sql += " ORDER BY rating DESC";
  } else {
    sql += " ORDER BY rating DESC, name ASC";
  }

  return db.prepare(sql).all(...params).map(normalizeRestaurant);
}

// 功能：读取独立餐厅仓并转换为前端列表格式。
// campus 不是筛掉餐厅，而是选择按哪个校区的距离排序和展示。
// 目前餐厅数量较小（百级），在内存中先合并候选分店和距离数据可读性更好；后续数据很大时再改成 SQL 分页聚合。
export function listRestaurantCatalog({ campus, foodType, keyword, page = 1, pageSize = 12, restaurantId, sortBy } = {}) {
  if (!restaurantWarehouse) {
    const legacyItems = listRestaurants({ foodType, keyword });
    const safePage = Math.max(1, Number(page) || 1);
    const safePageSize = Math.min(30, Math.max(1, Number(pageSize) || 12));
    const start = (safePage - 1) * safePageSize;
    return {
      items: legacyItems.slice(start, start + safePageSize),
      total: legacyItems.length,
      hasMore: start + safePageSize < legacyItems.length,
      source: "legacy"
    };
  }

  let restaurantSql = "SELECT * FROM restaurants WHERE 1=1";
  const params = [];
  if (foodType) {
    restaurantSql += " AND cuisine LIKE ?";
    params.push(`%${foodType}%`);
  }
  if (restaurantId) {
    restaurantSql += " AND id = ?";
    params.push(String(restaurantId));
  }
  const restaurantRows = restaurantWarehouse.prepare(`${restaurantSql} ORDER BY mention_count DESC, name ASC`).all(...params);
  const candidateRows = restaurantWarehouse.prepare(`
    SELECT id, restaurant_id, rank, score, poi_id, name, address, district, location, category, telephone, raw_json
    FROM poi_candidates ORDER BY restaurant_id, rank ASC
  `).all();
  const distanceRows = restaurantWarehouse.prepare(`
    SELECT poi_candidate_id, campus_code, distance_meters FROM candidate_distances
  `).all();

  // 先把每个候选分店的两个校区距离整理成 { cufe_shahe: 1.9, cufe_nanlu: 24.3 }。
  const distanceByCandidateId = new Map();
  for (const row of distanceRows) {
    if (!distanceByCandidateId.has(row.poi_candidate_id)) distanceByCandidateId.set(row.poi_candidate_id, {});
    distanceByCandidateId.get(row.poi_candidate_id)[row.campus_code] = Math.round(row.distance_meters) / 1000;
  }

  const candidatesByRestaurantId = new Map();
  for (const row of candidateRows) {
    if (!candidatesByRestaurantId.has(row.restaurant_id)) candidatesByRestaurantId.set(row.restaurant_id, []);
    let raw = {};
    try { raw = JSON.parse(row.raw_json || "{}"); } catch { raw = {}; }
    const firstPhoto = Array.isArray(raw.photos) ? raw.photos[0] : null;
    candidatesByRestaurantId.get(row.restaurant_id).push({
      id: row.id,
      rank: row.rank,
      score: row.score,
      poiId: row.poi_id,
      name: row.name,
      address: row.address,
      district: row.district,
      location: row.location,
      category: row.category,
      telephone: row.telephone,
      photoUrl: firstPhoto?.url || firstPhoto?.photo_url || null,
      distanceKm: distanceByCandidateId.get(row.id) || {}
    });
  }

  const items = restaurantRows.map((row) => {
    const candidates = candidatesByRestaurantId.get(row.id) || [];
    // 用户选校区时优先展示离该校区近的分店；没有选择时优先高德匹配分较高的候选。
    const orderedCandidates = [...candidates].sort((a, b) => {
      if (campus && Number.isFinite(a.distanceKm[campus]) && Number.isFinite(b.distanceKm[campus])) {
        return a.distanceKm[campus] - b.distanceKm[campus];
      }
      return b.score - a.score || a.rank - b.rank;
    });
    const selected = orderedCandidates[0] || null;
    const tags = buildRestaurantTags(row, selected);
    return {
      id: row.id,
      name: row.name,
      cuisine: row.cuisine,
      fullAddress: selected?.address || row.full_address || row.location_hint || "",
      district: selected?.district || row.district || "",
      recommendedDishes: row.recommended_dishes,
      optionalDishes: row.optional_dishes,
      partySize: row.party_size,
      bookingNote: row.booking_note,
      mentionCount: row.mention_count,
      sentiment: row.sentiment,
      tags,
      photoUrl: selected?.photoUrl || row.photo_url || null,
      distanceKm: selected?.distanceKm || {},
      poiStatus: row.poi_status,
      candidateCount: candidates.length,
      selectedCandidate: selected,
      _searchText: [
        row.name,
        row.cuisine,
        row.recommended_dishes,
        row.optional_dishes,
        row.full_address,
        row.location_hint,
        row.party_size,
        row.booking_note,
        row.sentiment,
        row.cleaning_note,
        row.raw_messages,
        row.amap_category,
        selected?.name,
        selected?.address,
        selected?.category,
        ...tags
      ].filter(Boolean).join(" ")
    };
  });

  // 如果已选校区，距离未知的餐厅放列表末尾；否则按群内提及次数排序。
  const keywordTerms = getRestaurantKeywordTerms(keyword);
  const filteredItems = keywordTerms.length > 0
    ? items.filter((item) => keywordTerms.some((term) => item._searchText.includes(term)))
    : items;

  filteredItems.sort((a, b) => {
    // 首页点到“群内最热”时，按群聊提及次数排序；其他情况优先按所选校区距离。
    if (sortBy === "mention-desc") return b.mentionCount - a.mentionCount || a.name.localeCompare(b.name, "zh-CN");
    if (campus) {
      const distanceA = a.distanceKm[campus];
      const distanceB = b.distanceKm[campus];
      if (Number.isFinite(distanceA) && Number.isFinite(distanceB)) return distanceA - distanceB;
      if (Number.isFinite(distanceA)) return -1;
      if (Number.isFinite(distanceB)) return 1;
    }
    return b.mentionCount - a.mentionCount || a.name.localeCompare(b.name, "zh-CN");
  });

  const safePage = Math.max(1, Number(page) || 1);
  const safePageSize = Math.min(30, Math.max(1, Number(pageSize) || 12));
  const start = (safePage - 1) * safePageSize;
  const pageItems = filteredItems.slice(start, start + safePageSize).map(({ _searchText, ...item }) => item);
  return {
    items: pageItems,
    total: filteredItems.length,
    hasMore: start + safePageSize < filteredItems.length,
    source: "restaurant_warehouse"
  };
}

// 功能：餐厅详情页使用。这里查的是独立餐厅仓的字符串 ID（例如 M001），
// 和旧演示库使用的数字 ID 不冲突。
export function getRestaurantCatalogItem(id, campus) {
  const result = listRestaurantCatalog({ restaurantId: id, campus, page: 1, pageSize: 1 });
  return result.items[0] || null;
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

// ========== 找人帖 ==========

// 功能：根据 ID 获取找人帖
export function getPost(id) {
  const row = db.prepare("SELECT * FROM posts WHERE id = ?").get(Number(id));
  return normalizePost(row);
}

// 功能：获取找人帖列表，支持按 category 筛选
export function listPosts({ category } = {}) {
  let sql = "SELECT * FROM posts WHERE 1=1";
  const params = [];

  if (category && category !== "全部") {
    sql += " AND category = ?";
    params.push(category);
  }

  sql += " ORDER BY created_at DESC";
  return db.prepare(sql).all(...params).map(normalizePost);
}

// 功能：创建找人帖
export function createPost({ authorId, category, content, restaurantId }) {
  const now = new Date().toISOString();
  const legacyRestaurantId = isNumericRestaurantId(restaurantId) ? Number(restaurantId) : null;
  const result = db.prepare(`
    INSERT INTO posts (author_id, category, content, restaurant_id, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(Number(authorId), category, content, legacyRestaurantId, now);

  return getPost(result.lastInsertRowid);
}

// 功能：获取帖子的参与者 ID 列表
export function getPostParticipantUserIds(postId) {
  const rows = db.prepare("SELECT user_id FROM post_participants WHERE post_id = ?").all(Number(postId));
  return rows.map(r => r.user_id);
}

// 功能：获取帖子的参与者头像列表
export function getPostParticipantAvatars(postId) {
  const rows = db.prepare(`
    SELECT p.avatar_url FROM post_participants pp
    JOIN profiles p ON p.user_id = pp.user_id
    WHERE pp.post_id = ?
    ORDER BY pp.joined_at ASC
  `).all(Number(postId));
  return rows.map(r => r.avatar_url || "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=240&q=80");
}

// 功能：检查用户是否已加入某个帖子
export function isUserJoinedPost(postId, userId) {
  const row = db.prepare(
    "SELECT 1 FROM post_participants WHERE post_id = ? AND user_id = ?"
  ).get(Number(postId), Number(userId));
  return !!row;
}

// 功能：加入帖子
export function addPostParticipant(postId, userId) {
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO post_participants (post_id, user_id, joined_at)
    VALUES (?, ?, ?)
  `).run(Number(postId), Number(userId), now);
}

// 功能：退出加入帖子
export function removePostParticipant(postId, userId) {
  db.prepare(`
    DELETE FROM post_participants
    WHERE post_id = ? AND user_id = ?
  `).run(Number(postId), Number(userId));
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

// 去过 (Visited Restaurants)
export function listVisitedRestaurants(userId) {
  return db.prepare(`
    SELECT vr.*, r.name as name, r.food_type as food_type, r.avg_price as avg_price, r.rating as rating, r.tags as tags
    FROM visited_restaurants vr
    LEFT JOIN restaurants r ON vr.restaurant_id = r.id
    WHERE vr.user_id = ?
    ORDER BY vr.visited_at DESC
  `).all(Number(userId)).map(row => ({
    id: row.id,
    userId: row.user_id,
    restaurantId: row.restaurant_id,
    restaurantName: row.restaurant_name || row.name || '未知餐厅',
    foodType: row.food_type || '',
    avgPrice: row.avg_price || 0,
    rating: row.rating || 0,
    tags: JSON.parse(row.tags || '[]'),
    visitedAt: row.visited_at
  }));
}

export function addVisitedRestaurant(userId, restaurantId, restaurantName) {
  const now = new Date().toISOString();
  const numericId = isNumericRestaurantId(restaurantId) ? Number(restaurantId) : null;
  const storedName = getRestaurantNameForStorage(restaurantId, restaurantName);
  db.prepare(`
    INSERT INTO visited_restaurants (user_id, restaurant_id, restaurant_name, visited_at)
    VALUES (?, ?, ?, ?)
  `).run(Number(userId), numericId, storedName, now);
}

// 想去 (Wishlist Restaurants)
export function listWishlistRestaurants(userId) {
  return db.prepare(`
    SELECT wr.*, r.name as name, r.food_type as food_type, r.avg_price as avg_price, r.rating as rating, r.tags as tags
    FROM wishlist_restaurants wr
    LEFT JOIN restaurants r ON wr.restaurant_id = r.id
    WHERE wr.user_id = ?
    ORDER BY wr.created_at DESC
  `).all(Number(userId)).map(row => ({
    id: row.id,
    userId: row.user_id,
    restaurantId: row.restaurant_id,
    restaurantName: row.restaurant_name || row.name || '未知餐厅',
    foodType: row.food_type || '',
    avgPrice: row.avg_price || 0,
    rating: row.rating || 0,
    tags: JSON.parse(row.tags || '[]'),
    createdAt: row.created_at
  }));
}

export function addWishlistRestaurant(userId, restaurantId, restaurantName) {
  const now = new Date().toISOString();
  const numericId = isNumericRestaurantId(restaurantId) ? Number(restaurantId) : null;
  const storedName = getRestaurantNameForStorage(restaurantId, restaurantName);
  db.prepare(`
    INSERT INTO wishlist_restaurants (user_id, restaurant_id, restaurant_name, created_at)
    VALUES (?, ?, ?, ?)
  `).run(Number(userId), numericId, storedName, now);
}

export function toggleWishlistRestaurant(userId, restaurantId, restaurantName) {
  let existing;
  const numericId = isNumericRestaurantId(restaurantId) ? Number(restaurantId) : null;
  const storedName = getRestaurantNameForStorage(restaurantId, restaurantName);
  if (numericId) {
    existing = db.prepare("SELECT id FROM wishlist_restaurants WHERE user_id = ? AND restaurant_id = ?")
      .get(Number(userId), numericId);
  } else {
    existing = db.prepare("SELECT id FROM wishlist_restaurants WHERE user_id = ? AND restaurant_name = ?")
      .get(Number(userId), storedName);
  }

  if (existing) {
    db.prepare("DELETE FROM wishlist_restaurants WHERE id = ?").run(existing.id);
    return false; // Removed
  } else {
    const now = new Date().toISOString();
    db.prepare("INSERT INTO wishlist_restaurants (user_id, restaurant_id, restaurant_name, created_at) VALUES (?, ?, ?, ?)")
      .run(Number(userId), numericId, storedName, now);
    return true; // Added
  }
}

// 动态 (Moments)
export function listMoments(userId) {
  const sql = userId 
    ? "SELECT um.*, u.nickname as author_name, p.avatar_url as author_avatar FROM user_moments um LEFT JOIN users u ON um.user_id = u.id LEFT JOIN profiles p ON um.user_id = p.user_id WHERE um.user_id = ? ORDER BY um.created_at DESC"
    : "SELECT um.*, u.nickname as author_name, p.avatar_url as author_avatar FROM user_moments um LEFT JOIN users u ON um.user_id = u.id LEFT JOIN profiles p ON um.user_id = p.user_id ORDER BY um.created_at DESC";
  
  const params = userId ? [Number(userId)] : [];
  return db.prepare(sql).all(...params).map(row => ({
    id: row.id,
    userId: row.user_id,
    authorName: row.author_name || '同学',
    authorAvatar: row.author_avatar || '',
    content: row.content,
    imageUrl: row.image_url || '',
    likesCount: row.likes_count || 0,
    createdAt: row.created_at
  }));
}

export function createMoment(userId, content, imageUrl) {
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO user_moments (user_id, content, image_url, likes_count, created_at)
    VALUES (?, ?, ?, 0, ?)
  `).run(Number(userId), content, imageUrl || '', now);
}

// 收藏 (Saved Meals)
export function listSavedMeals(userId) {
  return db.prepare(`
    SELECT sm.*, m.*, u.nickname as creator_name
    FROM saved_meals sm
    JOIN meals m ON sm.meal_id = m.id
    JOIN users u ON m.creator_id = u.id
    WHERE sm.user_id = ?
    ORDER BY sm.created_at DESC
  `).all(Number(userId)).map(row => ({
    id: row.id,
    userId: row.user_id,
    mealId: row.meal_id,
    meal: {
      id: row.meal_id,
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
      creatorName: row.creator_name
    },
    createdAt: row.created_at
  }));
}

export function toggleSaveMeal(userId, mealId) {
  const existing = db.prepare("SELECT id FROM saved_meals WHERE user_id = ? AND meal_id = ?").get(Number(userId), Number(mealId));
  if (existing) {
    db.prepare("DELETE FROM saved_meals WHERE id = ?").run(existing.id);
    return false; // un-saved
  } else {
    const now = new Date().toISOString();
    db.prepare("INSERT INTO saved_meals (user_id, meal_id, created_at) VALUES (?, ?, ?)")
      .run(Number(userId), Number(mealId), now);
    return true; // saved
  }
}

// ========== 种子数据 ==========

// 功能：首次启动时写入示例数据，如果已有数据则跳过
export function seedIfEmpty() {
  const count = db.prepare("SELECT COUNT(*) as cnt FROM users").get();
  if (count.cnt > 0) return;

  const now = new Date().toISOString();

  db.prepare(`INSERT INTO users (id, nickname, student_no, school, credit_score, created_at) VALUES (1, '小林', '2026001', '示例大学', 98, ?)`).run(now);
  db.prepare(`INSERT INTO users (id, nickname, student_no, school, credit_score, created_at) VALUES (2, '阿晴', '2026002', '示例大学', 96, ?)`).run(now);
  db.prepare(`INSERT INTO users (id, nickname, student_no, school, credit_score, created_at) VALUES (3, '米雪食记', '2026003', '示例大学', 98, ?)`).run(now);
  db.prepare(`INSERT INTO users (id, nickname, student_no, school, credit_score, created_at) VALUES (4, '怎么什么用户名都在', '2026004', '示例大学', 95, ?)`).run(now);
  db.prepare(`INSERT INTO users (id, nickname, student_no, school, credit_score, created_at) VALUES (5, '小马吃吃吃', '2026005', '示例大学', 92, ?)`).run(now);
  db.prepare(`INSERT INTO users (id, nickname, student_no, school, credit_score, created_at) VALUES (6, '清淡口同学', '2026006', '示例大学', 99, ?)`).run(now);
  db.prepare(`INSERT INTO users (id, nickname, student_no, school, credit_score, created_at) VALUES (7, 'amor27的饭路', '2026007', '示例大学', 96, ?)`).run(now);

  db.prepare(`INSERT INTO profiles (user_id, avatar_url, gender, campus, taste_tags, personality_tags, budget_preference, updated_at) VALUES (1, 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=240&q=80', 'male', '主校区', '["川菜","不吃香菜"]', '["慢热","安静吃饭"]', '20-40', ?)`).run(now);
  db.prepare(`INSERT INTO profiles (user_id, avatar_url, gender, campus, taste_tags, personality_tags, budget_preference, updated_at) VALUES (2, 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=240&q=80', 'female', '主校区', '["面食","甜品"]', '["外向","可聊天"]', '15-30', ?)`).run(now);
  db.prepare(`INSERT INTO profiles (user_id, avatar_url, gender, campus, taste_tags, personality_tags, budget_preference, updated_at) VALUES (3, 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=240&q=80', 'female', '主校区', '["川菜","火锅","麻辣"]', '["健谈","吃得快","准时不鸽"]', '20-40', ?)`).run(now);
  db.prepare(`INSERT INTO profiles (user_id, avatar_url, gender, campus, taste_tags, personality_tags, budget_preference, updated_at) VALUES (4, 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=240&q=80', 'unknown', '主校区', '["韩料","日料","探店"]', '["爱拍照","慢节奏","AA记账"]', '40-80', ?)`).run(now);
  db.prepare(`INSERT INTO profiles (user_id, avatar_url, gender, campus, taste_tags, personality_tags, budget_preference, updated_at) VALUES (5, 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=240&q=80', 'male', '东校区', '["烧烤","夜宵","啤酒"]', '["夜猫子","随性","不拘束"]', '20-50', ?)`).run(now);
  db.prepare(`INSERT INTO profiles (user_id, avatar_url, gender, campus, taste_tags, personality_tags, budget_preference, updated_at) VALUES (6, 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=240&q=80', 'unknown', '主校区', '["轻食","清淡","沙拉"]', '["社恐友好","安静吃饭","准时"]', '15-25', ?)`).run(now);
  db.prepare(`INSERT INTO profiles (user_id, avatar_url, gender, campus, taste_tags, personality_tags, budget_preference, updated_at) VALUES (7, 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=240&q=80', 'unknown', '主校区', '["酸菜鱼","火锅","湘菜"]', '["组织能手","AA精确到分","饭后逛街"]', '40-100', ?)`).run(now);

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

  db.prepare(`INSERT INTO posts (id, author_id, category, content, restaurant_id, created_at)
    VALUES (1, 3, '约饭', '蹲蹲今晚一食堂吃麻辣香锅的uu，本人女生～最好是口味偏辣的！大概7点左右去。', 1, ?)`).run(now);
  db.prepare(`INSERT INTO posts (id, author_id, category, content, restaurant_id, created_at)
    VALUES (2, 4, '探店', '有没有uu想一起去校门口新开的韩料店探店！本人喜欢拍照，最好是也爱拍照的姐妹～', 2, ?)`).run(now);
  db.prepare(`INSERT INTO posts (id, author_id, category, content, restaurant_id, created_at)
    VALUES (3, 5, '夜宵', '晚课结束后想吃夜宵，东门烧烤摊常驻选手，缺一个饭搭子！AA制，大概22点出发。', 6, ?)`).run(now);
  db.prepare(`INSERT INTO posts (id, author_id, category, content, restaurant_id, created_at)
    VALUES (4, 6, '拼桌', '三食堂轻食窗口长期拼桌，本人吃得很清淡，偏好安静吃饭不尬聊的氛围～', 3, ?)`).run(now);
  db.prepare(`INSERT INTO posts (id, author_id, category, content, restaurant_id, created_at)
    VALUES (5, 7, '约饭', '周末想去市区吃那家很火的酸菜鱼，有没有人一起！AA，大概人均60，吃完还可以逛逛。', null, ?)`).run(now);

  db.prepare(`INSERT INTO post_participants (post_id, user_id, joined_at) VALUES (1, 1, ?)`).run(now);
  db.prepare(`INSERT INTO post_participants (post_id, user_id, joined_at) VALUES (1, 6, ?)`).run(now);
  db.prepare(`INSERT INTO post_participants (post_id, user_id, joined_at) VALUES (2, 2, ?)`).run(now);
  db.prepare(`INSERT INTO post_participants (post_id, user_id, joined_at) VALUES (3, 1, ?)`).run(now);
  db.prepare(`INSERT INTO post_participants (post_id, user_id, joined_at) VALUES (3, 3, ?)`).run(now);
  db.prepare(`INSERT INTO post_participants (post_id, user_id, joined_at) VALUES (3, 6, ?)`).run(now);
  db.prepare(`INSERT INTO post_participants (post_id, user_id, joined_at) VALUES (5, 1, ?)`).run(now);
  db.prepare(`INSERT INTO post_participants (post_id, user_id, joined_at) VALUES (5, 2, ?)`).run(now);

  // 种子去过数据 (Visited)
  db.prepare(`INSERT INTO visited_restaurants (user_id, restaurant_id, restaurant_name, visited_at) VALUES (1, NULL, '二食堂麻辣香锅', ?)`).run(now);
  db.prepare(`INSERT INTO visited_restaurants (user_id, restaurant_id, restaurant_name, visited_at) VALUES (1, NULL, '东门米线店', ?)`).run(now);
  
  // 种子想去数据 (Wishlist)
  db.prepare(`INSERT INTO wishlist_restaurants (user_id, restaurant_id, restaurant_name, created_at) VALUES (1, NULL, '一食堂火锅', ?)`).run(now);
  db.prepare(`INSERT INTO wishlist_restaurants (user_id, restaurant_id, restaurant_name, created_at) VALUES (1, NULL, '教工食堂牛肉面', ?)`).run(now);

  // 种子动态数据 (Moments)
  db.prepare(`INSERT INTO user_moments (user_id, content, image_url, likes_count, created_at) VALUES (3, '今天在二食堂二楼发现了一家新的拉面，味道绝了！推荐大家去尝尝。🍔', 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=400&q=80', 5, ?)`).run(now);
  db.prepare(`INSERT INTO user_moments (user_id, content, image_url, likes_count, created_at) VALUES (1, '吃饱喝足，准备回图书馆搬砖了🎒', '', 2, ?)`).run(now);

  // 种子收藏数据 (Saved Meals)
  db.prepare(`INSERT INTO saved_meals (user_id, meal_id, created_at) VALUES (1, 1, ?)`).run(now);
  db.prepare(`INSERT INTO saved_meals (user_id, meal_id, created_at) VALUES (1, 2, ?)`).run(now);

  console.log("[db] 已写入种子数据");
}

export default db;
