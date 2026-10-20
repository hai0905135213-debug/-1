import crypto from "node:crypto";
import { existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import {
  db,
  getUser,
  createUser,
  getProfile,
  getRestaurantCatalogItem,
  getRestaurant,
  listRestaurantCatalog,
} from "./db.js";

// 所有新功能沿用业务数据库；迁移前保存快照，不修改独立餐厅仓。
const stamp = () => new Date().toISOString();
const fail = (status, code, message) => {
  const error = new Error(message);
  Object.assign(error, { status, code });
  throw error;
};
const requireValue = (condition, code, message, status = 400) => {
  if (!condition) fail(status, code, message);
};
const columns = (table) =>
  db
    .prepare(`PRAGMA table_info(${table})`)
    .all()
    .map((row) => row.name);
const hasMigrations = db
  .prepare("SELECT name FROM sqlite_master WHERE name='app_migrations'")
  .get();
if (
  !hasMigrations ||
  !db.prepare("SELECT version FROM app_migrations WHERE version=3").get()
) {
  const filename = db.name;
  if (filename && filename !== ":memory:" && existsSync(filename)) {
    mkdirSync(join(dirname(filename), "backups"), { recursive: true });
    // SQLite在线备份同时覆盖WAL中的已提交数据，避免只复制主文件漏掉最近记录。
    await db.backup(join(dirname(filename), "backups", `before-teams-${Date.now()}.db`));
  }
}
db.exec(
  "CREATE TABLE IF NOT EXISTS app_migrations(version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL)",
);
if (!db.prepare("SELECT version FROM app_migrations WHERE version=1").get()) {
  db.transaction(() => {
    const additions = {
      users: {
        openid: "TEXT",
        access_status: "TEXT NOT NULL DEFAULT 'pending'",
        is_admin: "INTEGER NOT NULL DEFAULT 0",
      },
      meals: {
        catalog_restaurant_id: "TEXT",
        poi_id: "TEXT",
        venue_snapshot: "TEXT DEFAULT '{}'",
        deadline: "TEXT",
        meeting_note: "TEXT DEFAULT ''",
        topic_tags: "TEXT DEFAULT '[]'",
      },
      posts: { meal_id: "INTEGER REFERENCES meals(id)" },
    };
    for (const [table, fields] of Object.entries(additions)) {
      for (const [name, type] of Object.entries(fields))
        if (!columns(table).includes(name))
          db.exec(`ALTER TABLE ${table} ADD COLUMN ${name} ${type}`);
    }
    db.exec(`
      CREATE UNIQUE INDEX IF NOT EXISTS user_openid ON users(openid) WHERE openid IS NOT NULL;
      CREATE TABLE sessions(token_hash TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id), expires_at TEXT NOT NULL);
      CREATE TABLE applications(id INTEGER PRIMARY KEY, meal_id INTEGER NOT NULL REFERENCES meals(id), user_id INTEGER NOT NULL REFERENCES users(id), status TEXT NOT NULL, note TEXT NOT NULL DEFAULT '', updated_at TEXT NOT NULL, UNIQUE(meal_id,user_id));
      CREATE TABLE team_messages(id INTEGER PRIMARY KEY, meal_id INTEGER NOT NULL REFERENCES meals(id), user_id INTEGER NOT NULL REFERENCES users(id), content TEXT NOT NULL, created_at TEXT NOT NULL);
      CREATE INDEX messages_cursor ON team_messages(meal_id,id);
      CREATE TABLE notifications(id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id), meal_id INTEGER, kind TEXT NOT NULL, content TEXT NOT NULL, read_at TEXT, created_at TEXT NOT NULL);
      CREATE INDEX notifications_user ON notifications(user_id,id);
      UPDATE meals SET deadline=meal_time WHERE deadline IS NULL;
    `);
    db.prepare("INSERT INTO app_migrations VALUES(1,?)").run(stamp());
  })();
}
// 管理员只能由服务端配置指定，客户端不能注册或提升自己的权限。
if (process.env.ADMIN_USER_IDS) {
  const makeAdmin = db.prepare(
    "UPDATE users SET is_admin=1,access_status='approved' WHERE id=?",
  );
  for (const value of process.env.ADMIN_USER_IDS.split(","))
    if (/^\d+$/.test(value.trim())) makeAdmin.run(Number(value));
}
if (!db.prepare("SELECT version FROM app_migrations WHERE version=2").get()) {
  db.transaction(() => {
    for (const table of ["visited_restaurants", "wishlist_restaurants"]) {
      if (!columns(table).includes("catalog_restaurant_id"))
        db.exec(`ALTER TABLE ${table} ADD COLUMN catalog_restaurant_id TEXT`);
    }
    db.prepare("INSERT INTO app_migrations VALUES(2,?)").run(stamp());
  })();
}
if (!db.prepare("SELECT version FROM app_migrations WHERE version=3").get()) {
  db.transaction(() => {
    if (!columns("meals").includes("budget_unit"))
      db.exec(
        "ALTER TABLE meals ADD COLUMN budget_unit TEXT NOT NULL DEFAULT 'cent'",
      );
    // 旧版记录只有名称时，仅精确匹配补回ID，避免把相似店名合并成一家。
    const first=listRestaurantCatalog({pageSize:30}),catalog=[...first.items];
    for(let page=2;page<=Math.ceil(first.total/30);page++)catalog.push(...listRestaurantCatalog({page,pageSize:30}).items);
    const idsByName=new Map(catalog.map(item=>[item.name,String(item.id)]));
    for(const table of ['visited_restaurants','wishlist_restaurants']){
      for(const record of db.prepare(`SELECT id,restaurant_name FROM ${table} WHERE catalog_restaurant_id IS NULL AND restaurant_id IS NULL`).all()){
        const catalogId=idsByName.get(record.restaurant_name);
        if(catalogId)db.prepare(`UPDATE ${table} SET catalog_restaurant_id=? WHERE id=?`).run(catalogId,record.id);
      }
    }
    db.prepare("INSERT INTO app_migrations VALUES(3,?)").run(stamp());
  })();
}

const hash = (token) => crypto.createHash("sha256").update(token).digest("hex");
export function sessionUser(req) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, "") || "";
  if (!token) return null;
  return (
    db
      .prepare(
        `SELECT u.* FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>?`,
      )
      .get(hash(token), stamp()) || null
  );
}
function requireSession(req, team = false, admin = false) {
  const user = sessionUser(req);
  requireValue(user, "UNAUTHORIZED", "请先登录", 401);
  if (team)
    requireValue(
      user.access_status === "approved",
      "ACCESS_PENDING",
      "请等待管理员通过体验资格",
      403,
    );
  if (admin)
    requireValue(user.is_admin === 1, "FORBIDDEN", "仅管理员可操作", 403);
  return user;
}
function publicUser(user) {
  return {
    id: user.id,
    nickname: user.nickname,
    school: user.school,
    profile: publicProfile(user.id),
    accessStatus: user.access_status,
    isAdmin: Boolean(user.is_admin),
  };
}
function publicProfile(id) {
  const profile=getProfile(id);
  if(!profile)return null;
  const campuses={cufe_shahe:'沙河校区',cufe_nanlu:'学院南路校区','沙河校区':'沙河校区','学院南路校区':'学院南路校区'};
  return {...profile,campus:campuses[profile.campus]||''};
}
function loginResult(user) {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 86400000).toISOString();
  db.prepare("INSERT INTO sessions VALUES(?,?,?)").run(
    hash(token),
    user.id,
    expiresAt,
  );
  return {
    token,
    expiresAt,
    user: publicUser(user),
    profile: getProfile(user.id),
  };
}
function notify(userId, mealId, kind, content) {
  db.prepare(
    "INSERT INTO notifications(user_id,meal_id,kind,content,created_at) VALUES(?,?,?,?,?)",
  ).run(userId, mealId, kind, content, stamp());
}
const joined = (mealId, userId) =>
  Boolean(
    db
      .prepare(
        "SELECT 1 FROM meal_participants WHERE meal_id=? AND user_id=? AND status='joined'",
      )
      .get(mealId, userId),
  );
const count = (mealId) =>
  db
    .prepare(
      "SELECT COUNT(DISTINCT user_id) AS n FROM meal_participants WHERE meal_id=? AND status='joined'",
    )
    .get(mealId).n;
function mealRow(id) {
  const row = db.prepare("SELECT * FROM meals WHERE id=?").get(id);
  requireValue(row, "MEAL_NOT_FOUND", "饭局不存在", 404);
  return row;
}
function active(row) {
  requireValue(
    ["open", "matched"].includes(row.status),
    "MEAL_CLOSED",
    "饭局已结束",
    409,
  );
}
function recruiting(row) {
  active(row);
  requireValue(
    row.status === "open" && count(row.id) < row.max_people,
    "MEAL_FULL",
    "饭局已满",
    409,
  );
  requireValue(
    Date.parse(row.deadline || row.meal_time) > Date.now(),
    "DEADLINE_PASSED",
    "报名已截止",
    409,
  );
}
function closeApplications(row, reason) {
  for (const entry of db
    .prepare("SELECT * FROM applications WHERE meal_id=? AND status='pending'")
    .all(row.id)) {
    db.prepare(
      "UPDATE applications SET status='closed',updated_at=? WHERE id=?",
    ).run(stamp(), entry.id);
    notify(entry.user_id, row.id, "closed", reason);
  }
}
function serializeMeal(row, viewer) {
  const members = db
    .prepare(
      "SELECT DISTINCT u.id,u.nickname FROM meal_participants p JOIN users u ON u.id=p.user_id WHERE p.meal_id=? AND p.status='joined'",
    )
    .all(row.id);
  const isMember = members.some((member) => member.id === viewer?.id);
  const application = viewer
    ? db
        .prepare("SELECT * FROM applications WHERE meal_id=? AND user_id=?")
        .get(row.id, viewer.id)
    : null;
  return {
    id: row.id,
    title: row.title,
    foodType: row.food_type,
    mealTime: row.meal_time,
    deadline: row.deadline || row.meal_time,
    place: row.place,
    campus: row.campus,
    maxPeople: row.max_people,
    currentPeople: members.length,
    joinedCount: members.length,
    budgetMin:
      row.budget_unit === "yuan" ? row.budget_min : row.budget_min / 100,
    budgetMax:
      row.budget_unit === "yuan" ? row.budget_max : row.budget_max / 100,
    description: row.description,
    chatMode: row.chat_mode,
    topicTags: JSON.parse(row.topic_tags || "[]"),
    status: row.status,
    creatorId: row.creator_id,
    creator: {
      id: row.creator_id,
      nickname: getUser(row.creator_id)?.nickname || "同学",
    },
    restaurantId:
      row.catalog_restaurant_id ||
      (row.restaurant_id == null ? null : String(row.restaurant_id)),
    poiId: row.poi_id,
    venue: JSON.parse(row.venue_snapshot || "{}"),
    participants: members,
    joined: isMember,
    applicationStatus: application?.status || null,
    applicationId: application?.id || null,
    meetingNote: isMember ? row.meeting_note : null,
    pendingCount:
      viewer?.id === row.creator_id
        ? db
            .prepare(
              "SELECT COUNT(*) n FROM applications WHERE meal_id=? AND status='pending'",
            )
            .get(row.id).n
        : 0,
  };
}
const transaction = (fn) => db.transaction(fn).immediate();

export async function handleTeams(req, url, readBody) {
  // 报名截止后按请求触发收尾：不依赖单机定时器，重启也不会丢失截止状态。
  transaction(()=>{
    const expired=db.prepare("SELECT a.* FROM applications a JOIN meals m ON m.id=a.meal_id WHERE a.status='pending' AND julianday(COALESCE(m.deadline,m.meal_time))<=julianday('now')").all();
    for(const entry of expired){db.prepare("UPDATE applications SET status='closed',updated_at=? WHERE id=?").run(stamp(),entry.id);notify(entry.user_id,entry.meal_id,'closed','报名已截止，本次申请已关闭');}
  });
  const path = url.pathname,
    method = req.method;
  const body =
    method === "POST" || method === "PUT" ? () => readBody(req) : null;
  if (path === "/api/restaurants/facets" && method === "GET") {
    const items = listRestaurantCatalog({ pageSize: 10000 }).items;
    // 仓库接口每页最多30条，因此逐页读取元信息，前端只收到分类集合。
    for (
      let page = 2;
      page <= Math.ceil(listRestaurantCatalog({ pageSize: 30 }).total / 30);
      page++
    )
      items.push(...listRestaurantCatalog({ page, pageSize: 30 }).items);
    const cuisines = [
      ...new Set(
        items
          .flatMap((x) => String(x.cuisine || "").split(/[;；、]/))
          .filter((x) => x && !/推测|待/.test(x)),
      ),
    ].sort();
    return {
      cuisines,
      tags: {
        cuisine: cuisines,
        taste: [],
        scene: [
          ...new Set(
            items
              .flatMap((x) => x.tags || [])
              .filter((x) =>
                ["适合聚餐", "群友推荐", "近沙河", "近学院南路"].includes(x),
              ),
          ),
        ],
      },
      distances: [1, 3, 5, 10, 20],
    };
  }
  if (path === "/api/auth/login" && method === "POST") {
    requireValue(
      process.env.ENABLE_DEV_LOGIN === "true" &&
        process.env.NODE_ENV !== "production",
      "DEV_LOGIN_DISABLED",
      "开发登录未开启",
      403,
    );
    const data = await body();
    const nickname = String(data.nickname || "").trim();
    requireValue(
      nickname.length > 0 && nickname.length <= 32,
      "INVALID_NICKNAME",
      "昵称需要1–32字",
    );
    let user = db
      .prepare("SELECT * FROM users WHERE nickname=? AND openid IS NULL")
      .get(nickname);
    if (!user)
      user = createUser({ nickname, studentNo: "", school: "中央财经大学" });
    if (
      process.env.ADMIN_USER_IDS?.split(",")
        .map((x) => x.trim())
        .includes(String(user.id))
    )
      db.prepare(
        "UPDATE users SET is_admin=1,access_status='approved' WHERE id=?",
      ).run(user.id);
    return loginResult(
      db.prepare("SELECT * FROM users WHERE id=?").get(user.id),
    );
  }
  if (path === "/api/auth/wechat" && method === "POST") {
    requireValue(
      process.env.WECHAT_APP_ID && process.env.WECHAT_APP_SECRET,
      "WECHAT_NOT_CONFIGURED",
      "微信登录尚未配置 AppID",
      503,
    );
    const data = await body();
    requireValue(
      typeof data.code === "string" && data.code.length > 0 && data.code.length < 512,
      "INVALID_CODE",
      "缺少微信登录凭证",
    );
    const endpoint = new URL("https://api.weixin.qq.com/sns/jscode2session");
    endpoint.search = new URLSearchParams({
      appid: process.env.WECHAT_APP_ID,
      secret: process.env.WECHAT_APP_SECRET,
      js_code: data.code,
      grant_type: "authorization_code",
    });
    let response, result;
    try {
      response = await fetch(endpoint, { signal: AbortSignal.timeout(10000) });
      result = await response.json();
    } catch {
      fail(502, "WECHAT_UNAVAILABLE", "微信登录服务暂不可用，请稍后重试");
    }
    requireValue(
      response.ok && result.openid && !result.errcode,
      "WECHAT_LOGIN_FAILED",
      "微信登录失败，请重试",
      401,
    );
    const user = transaction(() => {
      let user = db
        .prepare("SELECT * FROM users WHERE openid=?")
        .get(result.openid);
      if (!user) {
        user = createUser({
          nickname: "新同学",
          studentNo: "",
          school: "中央财经大学",
        });
        db.prepare("UPDATE users SET openid=? WHERE id=?").run(
          result.openid,
          user.id,
        );
      }
      return db.prepare("SELECT * FROM users WHERE id=?").get(user.id);
    });
    return loginResult(user);
  }
  if (path === "/api/auth/me" && method === "GET")
    return { user: publicUser(requireSession(req)) };
  if (path === "/api/profile" && method === "PUT") {
    const user = requireSession(req),
      data = await body();
    if (data.nickname !== undefined) {
      const nickname = String(data.nickname).trim();
      requireValue(
        nickname.length > 0 && nickname.length <= 32,
        "INVALID_NICKNAME",
        "昵称需要1–32字",
      );
      db.prepare("UPDATE users SET nickname=? WHERE id=?").run(
        nickname,
        user.id,
      );
    }
    const { upsertProfile } = await import("./db.js");
    requireValue(
      !data.campus ||
        ["cufe_shahe", "cufe_nanlu", "沙河校区", "学院南路校区"].includes(
          data.campus,
        ),
      "INVALID_CAMPUS",
      "请选择沙河或学院南路校区",
    );
    for (const key of ["tasteTags", "personalityTags"])
      if (data[key] !== undefined)
        requireValue(
          Array.isArray(data[key]) &&
            data[key].length <= 10 &&
            data[key].every((x) => typeof x === "string" && x.length <= 30),
          "INVALID_TAGS",
          "标签最多10个，每个30字",
        );
    return { profile: upsertProfile(user.id, data) };
  }
  if (["/api/profile/wishlist", "/api/profile/visited"].includes(path)) {
    const user = requireSession(req),
      table = path.endsWith("wishlist")
        ? "wishlist_restaurants"
        : "visited_restaurants",
      isWishlist = table === "wishlist_restaurants";
    if (method === "GET") {
      const rows = db
        .prepare(`SELECT * FROM ${table} WHERE user_id=? ORDER BY id DESC`)
        .all(user.id);
      return {
        items: rows.map((row) => ({
          id: row.id,
          restaurantId:
            row.catalog_restaurant_id ||
            (row.restaurant_id == null ? null : String(row.restaurant_id)),
          restaurantName:
            row.restaurant_name ||
            getRestaurant(row.restaurant_id)?.name ||
            "历史餐厅",
          createdAt: row.created_at || row.visited_at,
        })),
      };
    }
    if (method === "POST") {
      const data = await body(),
        restaurantId = String(data.restaurantId || "");
      const restaurant = restaurantId
        ? getRestaurantCatalogItem(restaurantId) ||
          (/^\d+$/.test(restaurantId) ? getRestaurant(restaurantId) : null)
        : null;
      requireValue(
        !restaurantId || restaurant,
        "RESTAURANT_NOT_FOUND",
        "餐厅不存在",
        404,
      );
      const name = restaurant?.name || String(data.restaurantName || "").trim();
      requireValue(
        name.length > 0 && name.length <= 150,
        "INVALID_RESTAURANT",
        "请选择餐厅",
      );
      const active = transaction(() => {
        const old = db
          .prepare(
            `SELECT * FROM ${table} WHERE user_id=? AND (catalog_restaurant_id=? OR restaurant_name=?)`,
          )
          .get(user.id, restaurantId, name);
        if (old) {
          if (isWishlist)
            db.prepare(`DELETE FROM ${table} WHERE id=?`).run(old.id);
          return !isWishlist;
        }
        const timestamp = isWishlist ? "created_at" : "visited_at";
        db.prepare(
          `INSERT INTO ${table}(user_id,restaurant_name,catalog_restaurant_id,${timestamp}) VALUES(?,?,?,?)`,
        ).run(user.id, name, restaurantId || null, stamp());
        return true;
      });
      return { ok: true, active };
    }
  }
  if (path === "/api/auth/logout" && method === "POST") {
    const token = req.headers.authorization?.replace(/^Bearer\s+/i, "") || "";
    db.prepare("DELETE FROM sessions WHERE token_hash=?").run(hash(token));
    return { ok: true };
  }
  if (path.startsWith("/api/admin/")) {
    requireSession(req, false, true);
    if (path === "/api/admin/users" && method === "GET")
      return {
        items: db
          .prepare(
            "SELECT id,nickname,school,access_status AS accessStatus FROM users ORDER BY id DESC",
          )
          .all(),
      };
    const userMatch = path.match(/^\/api\/admin\/users\/(\d+)\/access$/);
    if (userMatch && method === "POST") {
      const data = await body();
      requireValue(
        ["approved", "pending", "blocked"].includes(data.status),
        "INVALID_STATUS",
        "资格状态无效",
      );
      requireValue(
        getUser(Number(userMatch[1])),
        "USER_NOT_FOUND",
        "用户不存在",
        404,
      );
      db.prepare("UPDATE users SET access_status=? WHERE id=?").run(
        data.status,
        userMatch[1],
      );
      notify(
        Number(userMatch[1]),
        null,
        "access",
        data.status === "approved" ? "体验资格已通过" : "体验资格已更新",
      );
      return { ok: true };
    }
    if (path === "/api/admin/reports" && method === "GET")
      return {
        items: db
          .prepare("SELECT * FROM reports ORDER BY id DESC LIMIT 100")
          .all(),
      };
    const reportMatch = path.match(/^\/api\/admin\/reports\/(\d+)$/);
    if (reportMatch && method === "POST") {
      const data = await body();
      requireValue(
        ["resolved", "dismissed"].includes(data.status),
        "INVALID_STATUS",
        "处理状态无效",
      );
      db.prepare("UPDATE reports SET status=? WHERE id=?").run(
        data.status,
        reportMatch[1],
      );
      return { ok: true };
    }
    fail(404, "NOT_FOUND", "管理接口不存在");
  }
  if (path === "/api/notifications" && method === "GET") {
    const user = requireSession(req);
    const before =
      Number(url.searchParams.get("before")) || Number.MAX_SAFE_INTEGER;
    const items = db
      .prepare(
        "SELECT * FROM notifications WHERE user_id=? AND id<? ORDER BY id DESC LIMIT 30",
      )
      .all(user.id, before);
    return {
      items,
      nextCursor: items.at(-1)?.id || null,
      unread: db
        .prepare(
          "SELECT COUNT(*) n FROM notifications WHERE user_id=? AND read_at IS NULL",
        )
        .get(user.id).n,
    };
  }
  // 找人帖负责展示，报名始终落在关联饭局上，不能再独立累加另一套人数。
  if (path === "/api/posts" && method === "GET") {
    const viewer = sessionUser(req);
    const rows = db.prepare("SELECT * FROM posts ORDER BY id DESC").all();
    return {
      items: rows.map((row) => ({
        id: row.id,
        content: row.content,
        category: row.category,
        createdAt: row.created_at,
        author: publicUser(
          db.prepare("SELECT * FROM users WHERE id=?").get(row.author_id),
        ),
        mealId: row.meal_id,
        meal: row.meal_id ? serializeMeal(mealRow(row.meal_id), viewer) : null,
      })),
    };
  }
  if (path === "/api/posts" && method === "POST") {
    const user = requireSession(req, true),
      data = await body(),
      row = mealRow(Number(data.mealId));
    requireValue(
      row.creator_id === user.id,
      "FORBIDDEN",
      "只能发布自己组织的饭局",
      403,
    );
    active(row);
    const content = String(data.content || row.title).trim();
    requireValue(
      content.length > 0 && content.length <= 1000,
      "INVALID_CONTENT",
      "帖子内容需为1–1000字",
    );
    const existing = db
      .prepare("SELECT id FROM posts WHERE meal_id=? AND author_id=?")
      .get(row.id, user.id);
    if (existing) return { post: { id: existing.id, mealId: row.id } };
    const result = db
      .prepare(
        "INSERT INTO posts(author_id,category,content,created_at,meal_id) VALUES(?,?,?,?,?)",
      )
      .run(user.id, "约饭", content, stamp(), row.id);
    return { post: { id: Number(result.lastInsertRowid), mealId: row.id } };
  }
  const postJoin = path.match(/^\/api\/posts\/(\d+)\/(join|leave)$/);
  if (postJoin && method === "POST") {
    const post = db.prepare("SELECT * FROM posts WHERE id=?").get(postJoin[1]);
    requireValue(
      post?.meal_id,
      "MEAL_LINK_REQUIRED",
      "该历史帖子尚未关联饭局，请先发起正式饭局",
      409,
    );
    const rewritten = new URL(url);
    rewritten.pathname = `/api/meals/${post.meal_id}/${postJoin[2] === "join" ? "apply" : "withdraw"}`;
    return handleTeams(req, rewritten, readBody);
  }
  if (path === "/api/notifications/read" && method === "POST") {
    const user = requireSession(req);
    db.prepare(
      "UPDATE notifications SET read_at=? WHERE user_id=? AND read_at IS NULL",
    ).run(stamp(), user.id);
    return { ok: true };
  }
  if (path === "/api/meals/mine" && method === "GET") {
    const user = requireSession(req);
    const all = db
      .prepare(
        `SELECT DISTINCT m.* FROM meals m LEFT JOIN applications a ON a.meal_id=m.id LEFT JOIN meal_participants p ON p.meal_id=m.id WHERE m.creator_id=? OR a.user_id=? OR p.user_id=? ORDER BY m.meal_time DESC`,
      )
      .all(user.id, user.id, user.id)
      .map((row) => serializeMeal(row, user));
    return {
      created: all.filter((x) => x.creatorId === user.id),
      pending: all.filter(
        (x) =>
          x.applicationStatus === "pending" &&
          ["open", "matched"].includes(x.status),
      ),
      joined: all.filter(
        (x) =>
          x.joined &&
          x.creatorId !== user.id &&
          ["open", "matched"].includes(x.status),
      ),
      ended: all.filter((x) => ["finished", "cancelled"].includes(x.status)),
    };
  }
  if (path === "/api/meals" && method === "GET") {
    let rows = db.prepare("SELECT * FROM meals ORDER BY meal_time DESC").all();
    const user = sessionUser(req),
      campus = url.searchParams.get("campus"),
      restaurantId = url.searchParams.get("restaurantId");
    if (campus) rows = rows.filter((x) => x.campus === campus);
    if (restaurantId)
      rows = rows.filter(
        (x) =>
          String(x.catalog_restaurant_id || x.restaurant_id) === restaurantId,
      );
    const keyword = url.searchParams.get("keyword");
    if (keyword)
      rows = rows.filter((x) => `${x.title} ${x.place}`.includes(keyword));
    if (url.searchParams.get("onlyAvailable") === "true")
      rows = rows.filter(
        (x) =>
          x.status === "open" &&
          Date.parse(x.deadline || x.meal_time) > Date.now(),
      );
    return { items: rows.map((row) => serializeMeal(row, user)) };
  }
  if (path === "/api/meals" && method === "POST") {
    const user = requireSession(req, true),
      data = await body();
    const mealTime = new Date(data.mealTime),
      deadline = new Date(data.deadline || data.mealTime);
    requireValue(
      Number.isFinite(mealTime.getTime()) &&
        mealTime.getTime() > Date.now() &&
        Number.isFinite(deadline.getTime()) &&
        deadline.getTime() > Date.now() &&
        deadline <= mealTime,
      "INVALID_TIME",
      "就餐及截止时间需在未来，截止不能晚于就餐",
    );
    const total = Number(data.maxPeople);
    requireValue(
      Number.isInteger(total) && total >= 2 && total <= 12,
      "INVALID_PEOPLE",
      "总人数需为2–12人，包含发起人",
    );
    const title = String(data.title || "").trim();
    requireValue(
      title.length > 0 && title.length <= 100,
      "INVALID_TITLE",
      "标题需要1–100字",
    );
    requireValue(
      ["cufe_shahe", "cufe_nanlu"].includes(data.campus),
      "INVALID_CAMPUS",
      "请选择校区",
    );
    const min = Number(data.budgetMin || 0),
      max = Number(data.budgetMax || 0);
    requireValue(
      Number.isFinite(min) &&
        Number.isFinite(max) &&
        min >= 0 &&
        max >= min &&
        max <= 10000,
      "INVALID_BUDGET",
      "预算范围无效",
    );
    let venue = {},
      place = String(data.place || "").trim();
    if (data.restaurantId) {
      const restaurant =
        getRestaurantCatalogItem(
          String(data.restaurantId),
          data.campus,
          data.poiId,
        ) ||
        (/^[0-9]+$/.test(String(data.restaurantId))
          ? getRestaurant(data.restaurantId)
          : null);
      requireValue(restaurant, "RESTAURANT_NOT_FOUND", "餐厅不存在", 404);
      const selected = restaurant.selectedCandidate;
      if (data.poiId)
        requireValue(
          selected?.poiId === data.poiId,
          "POI_NOT_FOUND",
          "分店不存在",
        );
      venue = {
        restaurantId: String(data.restaurantId),
        name: restaurant.name,
        poiId: selected?.poiId || null,
        branchName: selected?.name || restaurant.name,
        address: restaurant.fullAddress || restaurant.location || "",
        location: selected?.location || null,
      };
      place = `${venue.branchName} ${venue.address}`.trim();
    }
    requireValue(place && place.length <= 500, "INVALID_PLACE", "请填写地点");
    const topics = Array.isArray(data.topicTags) ? data.topicTags : [];
    requireValue(
      topics.length <= 5 &&
        topics.every((x) => typeof x === "string" && x.length <= 20),
      "INVALID_TOPICS",
      "最多5个话题，每个20字以内",
    );
    requireValue(
      ["quiet", "balanced", "chatty"].includes(data.chatMode || "balanced"),
      "INVALID_CHAT_MODE",
      "聊天模式无效",
    );
    requireValue(
      String(data.meetingNote || "").length <= 500 &&
        String(data.description || "").length <= 1000,
      "TEXT_TOO_LONG",
      "说明过长",
    );
    const id = transaction(() => {
      const now = stamp();
      const result = db
        .prepare(
          `INSERT INTO meals(title,food_type,meal_time,place,campus,max_people,budget_min,budget_max,chat_mode,description,status,creator_id,created_at,updated_at,catalog_restaurant_id,poi_id,venue_snapshot,deadline,meeting_note,topic_tags) VALUES(?,?,?,?,?,?,?,?,?,?,'open',?,?,?,?,?,?,?,?,?)`,
        )
        .run(
          title,
          String(data.foodType || ""),
          mealTime.toISOString(),
          place,
          data.campus,
          total,
          min,
          max,
          data.chatMode || "balanced",
          String(data.description || ""),
          user.id,
          now,
          now,
          data.restaurantId ? String(data.restaurantId) : null,
          venue.poiId || null,
          JSON.stringify(venue),
          deadline.toISOString(),
          String(data.meetingNote || ""),
          JSON.stringify(topics),
        );
      const id = Number(result.lastInsertRowid);
      db.prepare("UPDATE meals SET budget_unit='yuan' WHERE id=?").run(id);
      db.prepare(
        "INSERT INTO meal_participants(meal_id,user_id,role,status,joined_at) VALUES(?,?,'host','joined',?)",
      ).run(id, user.id, now);
      return id;
    });
    return { meal: serializeMeal(mealRow(id), user) };
  }
  const match = path.match(/^\/api\/meals\/(\d+)(?:\/(.*))?$/);
  if (!match) return undefined;
  const id = Number(match[1]),
    action = match[2] || "",
    user = method === "GET" && !action ? sessionUser(req) : requireSession(req);
  if (!action && method === "GET")
    return { meal: serializeMeal(mealRow(id), user) };
  if (action === "applications" && method === "GET") {
    const row = mealRow(id);
    requireValue(
      row.creator_id === user.id,
      "FORBIDDEN",
      "仅发起人可查看申请",
      403,
    );
    return {
      items: db
        .prepare(
          "SELECT a.*,u.nickname FROM applications a JOIN users u ON u.id=a.user_id WHERE a.meal_id=? ORDER BY a.updated_at DESC",
        )
        .all(id)
        .map((a) => ({ ...a, profile: publicProfile(a.user_id) })),
    };
  }
  if (["apply", "join"].includes(action) && method === "POST") {
    requireSession(req, true);
    const data = await body();
    const note = String(data.note || "").trim();
    requireValue(note.length <= 200, "TEXT_TOO_LONG", "报名说明最多200字");
    transaction(() => {
      const row = mealRow(id);
      recruiting(row);
      requireValue(!joined(id, user.id), "ALREADY_JOINED", "已是队伍成员", 409);
      const existing = db
        .prepare("SELECT * FROM applications WHERE meal_id=? AND user_id=?")
        .get(id, user.id);
      requireValue(
        existing?.status !== "rejected",
        "APPLICATION_REJECTED",
        "本次申请已被拒绝",
        409,
      );
      if (existing?.status === "pending") return;
      db.prepare(
        "INSERT INTO applications(meal_id,user_id,status,note,updated_at) VALUES(?,?,'pending',?,?) ON CONFLICT(meal_id,user_id) DO UPDATE SET status='pending',note=excluded.note,updated_at=excluded.updated_at",
      ).run(id, user.id, note, stamp());
      notify(row.creator_id, id, "application", `${user.nickname}申请加入饭局`);
    });
    return { meal: serializeMeal(mealRow(id), user) };
  }
  const approval = action.match(/^applications\/(\d+)\/(approve|reject)$/);
  if (approval && method === "POST") {
    requireSession(req, true);
    transaction(() => {
      const row = mealRow(id);
      requireValue(
        row.creator_id === user.id,
        "FORBIDDEN",
        "仅发起人可审批",
        403,
      );
      const entry = db
        .prepare("SELECT * FROM applications WHERE id=? AND meal_id=?")
        .get(approval[1], id);
      requireValue(entry, "APPLICATION_NOT_FOUND", "申请不存在", 404);
      const targetStatus = approval[2] === "approve" ? "approved" : "rejected";
      if (entry.status === targetStatus) return;
      recruiting(row);
      requireValue(
        entry.status === "pending",
        "APPLICATION_CLOSED",
        "申请已处理",
        409,
      );
      if (targetStatus === "approved") {
        const target = db
          .prepare("SELECT access_status FROM users WHERE id=?")
          .get(entry.user_id);
        requireValue(
          target?.access_status === "approved",
          "ACCESS_PENDING",
          "该用户无体验资格",
          403,
        );
        if (!joined(id, entry.user_id))
          db.prepare(
            "INSERT INTO meal_participants(meal_id,user_id,role,status,joined_at) VALUES(?,?,'member','joined',?)",
          ).run(id, entry.user_id, stamp());
      }
      db.prepare(
        "UPDATE applications SET status=?,updated_at=? WHERE id=?",
      ).run(targetStatus, stamp(), entry.id);
      notify(
        entry.user_id,
        id,
        targetStatus,
        targetStatus === "approved" ? "报名已通过" : "报名未通过",
      );
      if (count(id) >= row.max_people) {
        db.prepare(
          "UPDATE meals SET status='matched',updated_at=? WHERE id=?",
        ).run(stamp(), id);
        closeApplications(row, "饭局已满，本次申请已关闭");
      }
    });
    return { meal: serializeMeal(mealRow(id), user) };
  }
  if (action === "withdraw" && method === "POST") {
    transaction(() => {
      const entry = db
        .prepare("SELECT * FROM applications WHERE meal_id=? AND user_id=?")
        .get(id, user.id);
      requireValue(
        entry?.status === "pending",
        "NO_PENDING_APPLICATION",
        "没有待审批申请",
        409,
      );
      db.prepare(
        "UPDATE applications SET status='withdrawn',updated_at=? WHERE id=?",
      ).run(stamp(), entry.id);
      notify(
        mealRow(id).creator_id,
        id,
        "withdrawn",
        `${user.nickname}撤回了申请`,
      );
    });
    return { ok: true };
  }
  if (action === "leave" && method === "POST") {
    transaction(() => {
      const row = mealRow(id);
      active(row);
      requireValue(
        row.creator_id !== user.id,
        "CREATOR_CANNOT_LEAVE",
        "发起人请取消饭局",
        409,
      );
      requireValue(
        Date.parse(row.meal_time) > Date.now(),
        "MEAL_STARTED",
        "就餐开始后不可退出",
        409,
      );
      requireValue(joined(id, user.id), "NOT_MEMBER", "你不是队员", 403);
      db.prepare(
        "UPDATE meal_participants SET status='left',left_at=? WHERE meal_id=? AND user_id=? AND status='joined'",
      ).run(stamp(), id, user.id);
      db.prepare(
        "UPDATE applications SET status='withdrawn',updated_at=? WHERE meal_id=? AND user_id=?",
      ).run(stamp(), id, user.id);
      db.prepare("UPDATE meals SET status='open',updated_at=? WHERE id=?").run(
        stamp(),
        id,
      );
      notify(row.creator_id, id, "left", `${user.nickname}退出了饭局`);
    });
    return { meal: serializeMeal(mealRow(id), user) };
  }
  if (["cancel", "finish"].includes(action) && method === "POST") {
    transaction(() => {
      const row = mealRow(id);
      requireValue(
        row.creator_id === user.id,
        "FORBIDDEN",
        "仅发起人可操作",
        403,
      );
      active(row);
      if (action === "finish")
        requireValue(
          Date.parse(row.meal_time) <= Date.now() && count(id) >= 2,
          "CANNOT_FINISH",
          "就餐开始且至少两名成员才可完成",
          409,
        );
      db.prepare("UPDATE meals SET status=?,updated_at=? WHERE id=?").run(
        action === "cancel" ? "cancelled" : "finished",
        stamp(),
        id,
      );
      closeApplications(row, "饭局已结束，申请已关闭");
      for (const member of db
        .prepare(
          "SELECT DISTINCT user_id FROM meal_participants WHERE meal_id=? AND status='joined'",
        )
        .all(id))
        notify(
          member.user_id,
          id,
          action,
          action === "cancel" ? "饭局已取消" : "饭局已完成，可以互相评价",
        );
    });
    return { meal: serializeMeal(mealRow(id), user) };
  }
  if (action === "messages") {
    const row = mealRow(id);
    requireValue(
      joined(id, user.id),
      "NOT_MEMBER",
      "仅正式队员可查看队内留言",
      403,
    );
    if (method === "GET") {
      const after = Number(url.searchParams.get("after")) || 0;
      const items = db
        .prepare(
          "SELECT m.*,u.nickname FROM team_messages m JOIN users u ON u.id=m.user_id WHERE m.meal_id=? AND m.id>? ORDER BY m.id LIMIT 30",
        )
        .all(id, after);
      return {
        items,
        nextCursor: items.at(-1)?.id || after,
        hasMore: items.length === 30,
      };
    }
    if (method === "POST") {
      requireSession(req, true);
      const data = await body(),
        content = String(data.content || "").trim();
      requireValue(
        content.length > 0 && content.length <= 500,
        "INVALID_MESSAGE",
        "留言需要1–500字",
      );
      transaction(() => {
        active(mealRow(id));
        requireValue(
          joined(id, user.id),
          "NOT_MEMBER",
          "仅正式队员可发言",
          403,
        );
        db.prepare(
          "INSERT INTO team_messages(meal_id,user_id,content,created_at) VALUES(?,?,?,?)",
        ).run(id, user.id, content, stamp());
      });
      return { ok: true };
    }
  }
  if (action === "reviews" && method === "POST") {
    const data = await body();
    transaction(() => {
      const row = mealRow(id),
        target = Number(data.targetUserId),
        rating = Number(data.rating);
      requireValue(
        row.status === "finished",
        "MEAL_NOT_FINISHED",
        "饭局完成后才能评价",
        409,
      );
      requireValue(
        joined(id, user.id) && joined(id, target) && target !== user.id,
        "INVALID_TARGET",
        "只能评价本场其他正式成员",
        403,
      );
      requireValue(
        Number.isInteger(rating) && rating >= 1 && rating <= 5,
        "INVALID_RATING",
        "评分为1–5",
      );
      requireValue(
        !db
          .prepare(
            "SELECT 1 FROM reviews WHERE meal_id=? AND reviewer_id=? AND target_user_id=?",
          )
          .get(id, user.id, target),
        "ALREADY_REVIEWED",
        "已经评价过该成员",
        409,
      );
      const content = String(data.content || "").trim();
      requireValue(content.length <= 500, "TEXT_TOO_LONG", "评价最多500字");
      db.prepare(
        "INSERT INTO reviews(meal_id,reviewer_id,target_user_id,rating,content,created_at) VALUES(?,?,?,?,?,?)",
      ).run(id, user.id, target, rating, content, stamp());
    });
    return { ok: true };
  }
  return undefined;
}
