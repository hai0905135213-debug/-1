// 试运行收尾：账号、反馈、内容处置和餐厅纠错。权限与数据删除由服务端执行。
import { existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import {
  db,
  getProfile,
  upsertProfile,
  getRestaurantCatalogItem,
} from "./db.js";
import { sessionUser } from "./teams.js";
import "./discovery.js";
export const POLICY_VERSION = "2026-10-21-v1";
const now = () => new Date().toISOString();
const ensure = (value, message, status = 400, code = "PRODUCT_VALIDATION") => {
  if (!value) {
    const error = new Error(message);
    Object.assign(error, { status, code });
    throw error;
  }
};
if (!db.prepare("SELECT version FROM app_migrations WHERE version=5").get()) {
  if (db.name && existsSync(db.name)) {
    mkdirSync(join(dirname(db.name), "backups"), { recursive: true });
    await db.backup(
      join(dirname(db.name), "backups", `before-product-${Date.now()}.db`),
    );
  }
  db.transaction(() => {
    db.exec(`ALTER TABLE users ADD COLUMN deleted_at TEXT;
   ALTER TABLE users ADD COLUMN onboarding_completed INTEGER NOT NULL DEFAULT 0;
   ALTER TABLE users ADD COLUMN consent_version TEXT;
   ALTER TABLE users ADD COLUMN consent_at TEXT;
   ALTER TABLE meals ADD COLUMN hidden_at TEXT;
   ALTER TABLE meals ADD COLUMN moderation_reason TEXT DEFAULT '';
   ALTER TABLE posts ADD COLUMN hidden_at TEXT;
   ALTER TABLE team_messages ADD COLUMN hidden_at TEXT;
   ALTER TABLE reports ADD COLUMN resolution_note TEXT DEFAULT '';
   ALTER TABLE reports ADD COLUMN resolved_at TEXT;
   CREATE TABLE feedbacks(id INTEGER PRIMARY KEY,user_id INTEGER NOT NULL REFERENCES users(id),category TEXT NOT NULL,restaurant_id TEXT,content TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'pending',reply TEXT DEFAULT '',created_at TEXT NOT NULL,updated_at TEXT NOT NULL);
   CREATE TABLE moderation_log(id INTEGER PRIMARY KEY,actor_id INTEGER NOT NULL REFERENCES users(id),entity_type TEXT NOT NULL,entity_id INTEGER NOT NULL,action TEXT NOT NULL,reason TEXT NOT NULL,created_at TEXT NOT NULL);
   CREATE TABLE restaurant_adjustments(restaurant_id TEXT NOT NULL,poi_id TEXT NOT NULL,address TEXT NOT NULL,source_url TEXT NOT NULL,note TEXT NOT NULL,updated_at TEXT NOT NULL,PRIMARY KEY(restaurant_id,poi_id));`);
    db.prepare("INSERT INTO app_migrations VALUES(5,?)").run(now());
  })();
}
function requireUser(req, admin = false) {
  const user = sessionUser(req);
  ensure(user, "请先登录", 401, "UNAUTHORIZED");
  if (admin)
    ensure(
      user.is_admin === 1 && user.access_status !== "blocked",
      "仅管理员可操作",
      403,
      "FORBIDDEN",
    );
  return user;
}
const notify = (id, content, mealId = null) =>
  db
    .prepare(
      "INSERT INTO notifications(user_id,meal_id,kind,content,created_at) VALUES(?,?,?,?,?)",
    )
    .run(id, mealId, "service", content, now());
const text = (value, max, label) => {
  ensure(
    typeof value === "string" && value.trim().length > 0 && value.length <= max,
    `${label}需为1–${max}字`,
  );
  return value.trim();
};
const limits = new Map();
function throttle(key, max) {
  const minute = Math.floor(Date.now() / 60000);
  const old = limits.get(key);
  const entry = old?.minute === minute ? old : { minute, count: 0 };
  entry.count++;
  limits.set(key, entry);
  if (limits.size > 5000)
    for (const [k, v] of limits) if (v.minute !== minute) limits.delete(k);
  ensure(entry.count <= max, "操作过于频繁，请稍后重试", 429, "RATE_LIMITED");
}
export const policy = () => ({
  version: POLICY_VERSION,
  operator: process.env.PUBLIC_OPERATOR_NAME || "饭饭之交试运行团队",
  support:
    process.env.PUBLIC_SUPPORT_CONTACT ||
    "请通过试运行组织者联系管理员；对外发放前需配置运营联系方式",
  documents: {
    terms: [
      "本服务提供餐厅信息、预约组队与队内沟通，不代订餐、不代收餐费，不保证组队成功、商家营业或优惠持续有效。",
      "仅在本人愿意的前提下参加线下活动。请选择公开场所，核实地点与同行人，不向陌生人转账或公开身份证件、教务账号密码。",
      "白名单仅表示获得体验资格，不代表平台完成学籍核验或对用户身份作担保。",
      "发布者对自己发布的内容负责；禁止骚扰、诈骗及违法有害内容。举报由管理员核验处理，不凭单方举报自动扣分。对处理结果有异议可在反馈中心申诉。",
      "饭局发布后关键条件不可修改，需要更改请取消并重新发布。到期、满员、退出和取消以服务端状态为准。",
      "到场自报不是独立核验，规则匹配分不是成功概率；餐厅时间估算不含真实路线、排队与出餐。",
    ],
    privacy: [
      "登录使用微信返回的身份标识或仅在开发环境使用的测试昵称，服务端保存可撤销会话；不向前端提供AppSecret。",
      "昵称、校区、口味、预算与本次话题用于资料展示和规则推荐。基本公开资料可由饭局发起人和其他用户查看；不要求真实姓名、学号或教务密码。",
      "经本人导入并确认的课程用于本人空闲计算及推荐，不向其他同学公开完整课表。文字PDF仅作解析，不保存原件；清空课表会删除当前课程与时间设置。",
      "饭局公开标题、时间、人数与餐厅。集合说明和队内留言仅正式成员可见；退出后不能访问。管理员可为处理举报查看相关内容，处置操作留有日志。",
      "反馈及餐厅纠错内容对本人和管理员可见，请勿填写身份证件、密码或不必要的私人联系方式。已核验的餐厅纠错说明可公开展示。",
      "可以查看本人数据、清空课表、退出登录或注销账号。注销前须处理未结束饭局；注销撤销所有会话，删除资料、课表、收藏及本人留言等当前数据，历史组队关联以匿名用户保留。",
      "注销不等于历史备份即时物理抹除。备份仅供运营恢复，不对普通用户开放；本试运行版本尚需运营明确备份保留期限及按期清理办法后对外使用。",
      "本服务不接在线支付、自动教务同步或后台定位。地图跳转及微信接口由相应平台提供，具体授权以设备提示为准。",
    ],
  },
});
export async function handleProduct(req, url, readBody) {
  const path = url.pathname,
    method = req.method;
  if (path === "/api/policies" && method === "GET") return policy();
  if (path === "/api/account/onboarding" && method === "POST") {
    const user = requireUser(req),
      data = await readBody(req);
    ensure(
      data.accepted === true && data.policyVersion === POLICY_VERSION,
      "请阅读并同意当前版本服务说明和隐私说明",
    );
    const nickname = text(data.nickname, 32, "昵称");
    ensure(["cufe_shahe", "cufe_nanlu"].includes(data.campus), "请选择校区");
    const tags = Array.isArray(data.tasteTags) ? data.tasteTags : [];
    ensure(
      tags.length <= 10 &&
        tags.every((t) => typeof t === "string" && t.length <= 30),
      "口味标签最多10个，每个30字",
    );
    const budget = String(data.budgetPreference || "").trim();
    ensure(budget.length <= 30, "预算偏好过长");
    db.transaction(() => {
      db.prepare(
        "UPDATE users SET nickname=?,onboarding_completed=1,consent_version=?,consent_at=? WHERE id=?",
      ).run(nickname, POLICY_VERSION, now(), user.id);
      upsertProfile(user.id, {
        campus: data.campus,
        tasteTags: tags,
        budgetPreference: budget,
      });
    }).immediate();
    return { ok: true, profile: getProfile(user.id) };
  }
  if (path === "/api/account/data" && method === "GET") {
    const user = requireUser(req);
    return {
      profile: getProfile(user.id),
      user: {
        id: user.id,
        nickname: user.nickname,
        consentVersion: user.consent_version,
        consentAt: user.consent_at,
      },
      timetable:
        db
          .prepare(
            "SELECT courses_json,updated_at FROM user_timetables WHERE user_id=?",
          )
          .get(user.id) || null,
      counts: {
        meals: db
          .prepare(
            "SELECT COUNT(DISTINCT meal_id) n FROM meal_participants WHERE user_id=?",
          )
          .get(user.id).n,
        messages: db
          .prepare("SELECT COUNT(*) n FROM team_messages WHERE user_id=?")
          .get(user.id).n,
      },
      note: "历史组队及履约记录可在我的饭局/履约页面查看，注销说明见隐私说明",
    };
  }
  if (path === "/api/account/timetable" && method === "DELETE") {
    const user = requireUser(req);
    db.transaction(() => {
      db.prepare("DELETE FROM user_timetables WHERE user_id=?").run(user.id);
      db.prepare("DELETE FROM schedule_settings WHERE user_id=?").run(user.id);
    }).immediate();
    return { ok: true };
  }
  if (path === "/api/account" && method === "DELETE") {
    const user = requireUser(req),
      data = await readBody(req);
    ensure(data.confirmation === "注销账号", "请明确输入“注销账号”确认");
    ensure(
      !user.is_admin ||
        db
          .prepare(
            "SELECT COUNT(*) n FROM users WHERE is_admin=1 AND deleted_at IS NULL",
          )
          .get().n > 1,
      "最后一名管理员请先由运营配置接任管理员再注销",
      409,
    );
    db.transaction(() => {
      const active = db
        .prepare(
          "SELECT DISTINCT m.id FROM meals m JOIN meal_participants p ON p.meal_id=m.id WHERE p.user_id=? AND p.status='joined' AND m.status IN ('open','matched')",
        )
        .all(user.id);
      ensure(
        !active.length,
        "请先取消本人发起或退出已加入的未结束饭局",
        409,
        "ACTIVE_MEALS_EXIST",
      );
      for (const table of [
        "sessions",
        "profiles",
        "user_timetables",
        "schedule_settings",
        "wishlist_restaurants",
        "visited_restaurants",
        "saved_meals",
        "team_messages",
        "notifications",
        "self_checkins",
      ])
        db.prepare(`DELETE FROM ${table} WHERE user_id=?`).run(user.id);
      db.prepare(
        "DELETE FROM post_participants WHERE user_id=? OR post_id IN (SELECT id FROM posts WHERE author_id=?)",
      ).run(user.id, user.id);
      db.prepare("DELETE FROM posts WHERE author_id=?").run(user.id);
      db.prepare("DELETE FROM user_moments WHERE user_id=?").run(user.id);
      db.prepare(
        "DELETE FROM reviews WHERE reviewer_id=? OR target_user_id=?",
      ).run(user.id, user.id);
      db.prepare(
        "UPDATE applications SET note='',status=CASE WHEN status='pending' THEN 'closed' ELSE status END WHERE user_id=?",
      ).run(user.id);
      db.prepare(
        "UPDATE feedbacks SET content='账号注销，原反馈内容已清除',reply='',updated_at=? WHERE user_id=?",
      ).run(now(), user.id);
      db.prepare(
        "UPDATE reports SET reason='已注销账号的历史举报',detail='' WHERE reporter_user_id=?",
      ).run(user.id);
      db.prepare(
        "UPDATE meals SET title='已注销用户的历史饭局',description='',place='历史地点已清除',meeting_note='',venue_snapshot='{}',topic_tags='[]' WHERE creator_id=?",
      ).run(user.id);
      db.prepare(
        "UPDATE users SET nickname=?,student_no='',school='',openid=NULL,access_status='blocked',is_admin=0,deleted_at=?,consent_version=NULL,consent_at=NULL,onboarding_completed=0 WHERE id=?",
      ).run(`已注销用户${user.id}`, now(), user.id);
    }).immediate();
    return {
      ok: true,
      note: "当前账号已匿名化并撤销会话；历史备份处理方式见隐私说明",
    };
  }
  if (path === "/api/notifications/unread" && method === "GET") {
    const user = requireUser(req);
    return {
      unread: db
        .prepare(
          "SELECT COUNT(*) n FROM notifications WHERE user_id=? AND read_at IS NULL",
        )
        .get(user.id).n,
    };
  }
  if (path === "/api/feedback") {
    const user = requireUser(req);
    if (method === "GET") {
      const before =
        Number(url.searchParams.get("before")) || Number.MAX_SAFE_INTEGER;
      const rows = db
        .prepare(
          "SELECT * FROM feedbacks WHERE user_id=? AND id<? ORDER BY id DESC LIMIT 21",
        )
        .all(user.id, before);
      return {
        items: rows.slice(0, 20),
        hasMore: rows.length > 20,
        nextCursor: rows.slice(0, 20).at(-1)?.id || null,
      };
    }
    if (method === "POST") {
      throttle("feedback:" + user.id, 10);
      const data = await readBody(req);
      ensure(
        ["issue", "restaurant", "appeal"].includes(data.category),
        "反馈类型无效",
      );
      const content = text(data.content, 1000, "反馈内容");
      const restaurantId = data.restaurantId ? String(data.restaurantId) : null;
      if (restaurantId)
        ensure(getRestaurantCatalogItem(restaurantId), "餐厅不存在");
      const r = db
        .prepare(
          "INSERT INTO feedbacks(user_id,category,restaurant_id,content,created_at,updated_at) VALUES(?,?,?,?,?,?)",
        )
        .run(user.id, data.category, restaurantId, content, now(), now());
      return { id: Number(r.lastInsertRowid) };
    }
  }
  if (path === "/api/my-reports" && method === "GET") {
    const user = requireUser(req);
    return {
      items: db
        .prepare(
          "SELECT id,meal_id,reason,status,resolution_note,resolved_at,created_at FROM reports WHERE reporter_user_id=? ORDER BY id DESC LIMIT 100",
        )
        .all(user.id),
    };
  }
  if (path === "/api/admin/feedback" && method === "GET") {
    requireUser(req, true);
    return {
      items: db
        .prepare(
          "SELECT f.*,u.nickname FROM feedbacks f JOIN users u ON f.user_id=u.id ORDER BY f.id DESC LIMIT 100",
        )
        .all(),
    };
  }
  const feedback = path.match(/^\/api\/admin\/feedback\/(\d+)$/);
  if (feedback && method === "POST") {
    requireUser(req, true);
    const data = await readBody(req);
    ensure(
      ["processing", "resolved", "rejected"].includes(data.status),
      "反馈状态无效",
    );
    const reply = text(data.reply, 1000, "处理说明");
    db.transaction(() => {
      const row = db
        .prepare("SELECT * FROM feedbacks WHERE id=?")
        .get(feedback[1]);
      ensure(row, "反馈不存在", 404);
      db.prepare(
        "UPDATE feedbacks SET status=?,reply=?,updated_at=? WHERE id=?",
      ).run(data.status, reply, now(), row.id);
      notify(row.user_id, "你的反馈已有回复，请到反馈中心查看");
    }).immediate();
    return { ok: true };
  }
  const report = path.match(/^\/api\/admin\/reports\/(\d+)$/);
  if (report && method === "POST") {
    const user = requireUser(req, true),
      data = await readBody(req);
    ensure(["resolved", "dismissed"].includes(data.status), "举报状态无效");
    const reason = text(data.reason, 500, "处理说明");
    db.transaction(() => {
      const row = db.prepare("SELECT * FROM reports WHERE id=?").get(report[1]);
      ensure(row, "举报不存在", 404);
      db.prepare(
        "UPDATE reports SET status=?,resolution_note=?,resolved_at=? WHERE id=?",
      ).run(data.status, reason, now(), row.id);
      db.prepare(
        "INSERT INTO moderation_log(actor_id,entity_type,entity_id,action,reason,created_at) VALUES(?,?,?,?,?,?)",
      ).run(user.id, "report", row.id, data.status, reason, now());
      notify(
        row.reporter_user_id,
        "你的举报已有处理结果，请到反馈中心查看",
        row.meal_id,
      );
    }).immediate();
    return { ok: true };
  }
  if (path === "/api/admin/content" && method === "GET") {
    requireUser(req, true);
    const type = url.searchParams.get("type") || "meal";
    ensure(["meal", "post", "message"].includes(type), "内容类型无效");
    const table = { meal: "meals", post: "posts", message: "team_messages" }[
      type
    ];
    const id = Number(url.searchParams.get("id"));
    return {
      items: db
        .prepare(
          `SELECT * FROM ${table}${id ? " WHERE id=?" : ""} ORDER BY id DESC LIMIT 100`,
        )
        .all(...(id ? [id] : [])),
    };
  }
  if (path === "/api/admin/moderation" && method === "POST") {
    const user = requireUser(req, true),
      data = await readBody(req),
      type = data.type;
    ensure(
      ["meal", "post", "message"].includes(type) &&
        Number.isInteger(data.id) &&
        data.id > 0,
      "内容类型或编号无效",
    );
    ensure(typeof data.hidden === "boolean", "处置状态无效");
    const reason = text(data.reason, 500, "处置原因");
    const table = { meal: "meals", post: "posts", message: "team_messages" }[
      type
    ];
    db.transaction(() => {
      const row = db.prepare(`SELECT * FROM ${table} WHERE id=?`).get(data.id);
      ensure(row, "内容不存在", 404);
      db.prepare(`UPDATE ${table} SET hidden_at=? WHERE id=?`).run(
        data.hidden ? now() : null,
        row.id,
      );
      if (type === "meal") {
        db.prepare("UPDATE meals SET moderation_reason=? WHERE id=?").run(
          reason,
          row.id,
        );
        if (data.hidden) {
          const pending = db
            .prepare(
              "SELECT user_id FROM applications WHERE meal_id=? AND status='pending'",
            )
            .all(row.id);
          db.prepare(
            "UPDATE applications SET status='closed',updated_at=? WHERE meal_id=? AND status='pending'",
          ).run(now(), row.id);
          if (["open", "matched"].includes(row.status))
            db.prepare(
              "UPDATE meals SET status='cancelled',updated_at=? WHERE id=?",
            ).run(now(), row.id);
          db.prepare("UPDATE posts SET hidden_at=? WHERE meal_id=?").run(
            now(),
            row.id,
          );
          const members = db
            .prepare(
              "SELECT user_id FROM meal_participants WHERE meal_id=? AND status='joined'",
            )
            .all(row.id);
          for (const id of new Set(
            [...pending, ...members].map((x) => x.user_id),
          ))
            notify(id, "饭局已由管理员关闭：" + reason, row.id);
        }
      }
      const owner =
        type === "meal"
          ? row.creator_id
          : type === "post"
            ? row.author_id
            : row.user_id;
      notify(
        owner,
        (data.hidden ? "内容已隐藏：" : "内容已恢复展示：") + reason,
        type === "meal" ? row.id : row.meal_id || null,
      );
      db.prepare(
        "INSERT INTO moderation_log(actor_id,entity_type,entity_id,action,reason,created_at) VALUES(?,?,?,?,?,?)",
      ).run(
        user.id,
        type,
        row.id,
        data.hidden ? "hide" : "restore",
        reason,
        now(),
      );
    }).immediate();
    return { ok: true, note: "恢复展示不会自动重新开放已取消饭局或关联帖子" };
  }
  const adjustment = path.match(/^\/api\/admin\/catalog\/(.+)$/);
  if (adjustment && method === "PUT") {
    requireUser(req, true);
    const data = await readBody(req),
      id = decodeURIComponent(adjustment[1]),
      poiId = String(data.poiId || ""),
      item = getRestaurantCatalogItem(id, undefined, poiId || undefined);
    ensure(item, "餐厅不存在", 404);
    ensure(
      !poiId || item.candidates.some((x) => x.poiId === poiId),
      "分店不存在",
    );
    ensure(poiId || !item.candidates.length, "请选择具体分店");
    const address = text(data.address, 500, "核实地址"),
      note = text(data.note, 500, "公开核验说明");
    let source;
    try {
      source = new URL(data.sourceUrl);
    } catch {}
    ensure(
      source?.protocol === "https:" && !source.username && !source.password && String(data.sourceUrl).length <= 1000,
      "来源需为HTTPS链接",
    );
    ensure(
      data.confirmed === true,
      "请确认已核验地址，地址修改会清除旧距离和坐标，待重新补全",
    );
    db.prepare(
      "INSERT INTO restaurant_adjustments VALUES(?,?,?,?,?,?) ON CONFLICT(restaurant_id,poi_id) DO UPDATE SET address=excluded.address,source_url=excluded.source_url,note=excluded.note,updated_at=excluded.updated_at",
    ).run(id, poiId, address, source.href, note, now());
    return {
      ok: true,
      note: "地址已更新；旧坐标和距离已停用，不影响既有饭局地点快照",
    };
  }
  // 为旧帖子详情补隐藏检查，列表在teams中统一过滤。
  const post = path.match(/^\/api\/posts\/(\d+)$/);
  if (post && method === "GET") {
    const row = db
      .prepare("SELECT hidden_at FROM posts WHERE id=?")
      .get(post[1]);
    ensure(!row?.hidden_at, "帖子已被管理员隐藏", 404);
  }
  // 基础防重复滥发；不把它当作生产级防攻击服务。
  if (["POST", "PUT", "DELETE"].includes(method)) {
    const user = sessionUser(req);
    if (user) {
      throttle("writes:" + user.id, 90);
      if (!path.startsWith("/api/auth/") && !path.startsWith("/api/account/")) {
        ensure(
          user.access_status !== "blocked",
          "账号已停用，可通过反馈中心申诉",
          403,
          "ACCOUNT_BLOCKED",
        );
        if (path !== "/api/profile")
          ensure(
            user.onboarding_completed === 1,
            "请先完善资料并确认服务与隐私说明",
            409,
            "ONBOARDING_REQUIRED",
          );
      }
    }
  }
  return undefined;
}
