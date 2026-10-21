import { existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import {
  db,
  getProfile,
  getUserTimetable,
  listRestaurantCatalog,
  getRestaurantCatalogItem,
} from "./db.js";
import { sessionUser, handleTeams } from "./teams.js";
import {
  availability,
  courseIntervals,
  dateInChina,
  minuteOfDay,
  normalizeCampus,
  budgetRange,
  rankMeal,
  overlap,
} from "./recommendation-rules.js";

const fail = (condition, message, status = 400) => {
  if (!condition) {
    const error = new Error(message);
    Object.assign(error, { status, code: "DISCOVERY_VALIDATION" });
    throw error;
  }
};
const stamp = () => new Date().toISOString();
if (!db.prepare("SELECT version FROM app_migrations WHERE version=4").get()) {
  if (db.name && existsSync(db.name)) {
    mkdirSync(join(dirname(db.name), "backups"), { recursive: true });
    await db.backup(
      join(dirname(db.name), "backups", `before-discovery-${Date.now()}.db`),
    );
  }
  db.transaction(() => {
    db.exec(`ALTER TABLE meals ADD COLUMN recruit_mode TEXT NOT NULL DEFAULT 'appointment';
      CREATE TABLE schedule_settings(user_id INTEGER PRIMARY KEY REFERENCES users(id),term_start_date TEXT NOT NULL,periods_json TEXT NOT NULL,confirmed INTEGER NOT NULL,updated_at TEXT NOT NULL);
      CREATE TABLE self_checkins(meal_id INTEGER NOT NULL REFERENCES meals(id),user_id INTEGER NOT NULL REFERENCES users(id),created_at TEXT NOT NULL,PRIMARY KEY(meal_id,user_id));
      CREATE TABLE merchant_offers(id INTEGER PRIMARY KEY,restaurant_id TEXT NOT NULL,title TEXT NOT NULL,description TEXT NOT NULL,source_url TEXT NOT NULL,verification_note TEXT NOT NULL,valid_from TEXT NOT NULL,valid_until TEXT NOT NULL,status TEXT NOT NULL,created_by INTEGER NOT NULL REFERENCES users(id),updated_at TEXT NOT NULL);
      CREATE INDEX active_offers ON merchant_offers(status,valid_until);`);
    db.prepare("INSERT INTO app_migrations VALUES(4,?)").run(stamp());
  })();
}
function userFor(req, admin = false) {
  const user = sessionUser(req);
  fail(user, "请先登录", 401);
  if (admin)
    fail(
      user.is_admin === 1 && user.access_status !== "blocked",
      "仅管理员可操作",
      403,
    );
  return user;
}
function settingsFor(id) {
  const row = db
    .prepare("SELECT * FROM schedule_settings WHERE user_id=?")
    .get(id);
  return row
    ? {
        termStartDate: row.term_start_date,
        periods: JSON.parse(row.periods_json),
        confirmed: Boolean(row.confirmed),
        updatedAt: row.updated_at,
      }
    : null;
}
export function invalidateSchedule(userId) {
  db.prepare(
    "UPDATE schedule_settings SET confirmed=0,updated_at=? WHERE user_id=?",
  ).run(stamp(), userId);
}
function catalogue() {
  const first = listRestaurantCatalog({ pageSize: 30 }),
    items = [...first.items];
  for (let page = 2; page <= Math.ceil(first.total / 30); page++)
    items.push(...listRestaurantCatalog({ page, pageSize: 30 }).items);
  return items;
}
function checkTime(value) {
  const d = new Date(value);
  fail(Number.isFinite(d.getTime()), "时间格式无效");
  return d.toISOString();
}
const recordNames = {
  finished: "已完成组队（不等于独立核验到场）",
  cancelled: "发起人取消",
  left: "本人退出",
  upcoming: "已加入待就餐",
};
export async function handleDiscovery(req, url, readBody) {
  const path = url.pathname,
    method = req.method,
    q = url.searchParams;
  if (path === "/api/schedule/settings") {
    const user = userFor(req);
    if (method === "GET") return { settings: settingsFor(user.id) };
    if (method === "PUT") {
      const data = await readBody(req),
        start = String(data.termStartDate || "");
      fail(
        /^\d{4}-\d{2}-\d{2}$/.test(start) &&
          Number.isFinite(Date.parse(start + "T00:00:00Z")),
        "填写有效学期第一周周一日期",
      );
      fail(
        new Date(start + "T00:00:00Z").toISOString().slice(0, 10) === start,
        "学期日期无效",
      );
      fail(
        new Date(start + "T00:00:00Z").getUTCDay() === 1,
        "学期起始日必须是第一周周一",
      );
      const periods = data.periods;
      fail(
        Array.isArray(periods) && periods.length >= 1 && periods.length <= 16,
        "需配置1–16节课时间",
      );
      let previous = 0;
      for (const p of periods) {
        fail(Array.isArray(p) && p.length === 2, "节次格式错误");
        const a = minuteOfDay(p[0]),
          b = minuteOfDay(p[1]);
        fail(
          Number.isFinite(a) && Number.isFinite(b) && a < b && a >= previous,
          "节次需为递增且不重叠的HH:MM区间",
        );
        previous = b;
      }
      fail(
        getUserTimetable(user.id).courses.every(
          (c) => Number(c.endPeriod) <= periods.length,
        ),
        "节次时间必须覆盖已导入课程的全部节次",
      );
      fail(data.confirmed === true, "请核对课程、周次和节次后确认");
      db.prepare(
        `INSERT INTO schedule_settings VALUES(?,?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET term_start_date=excluded.term_start_date,periods_json=excluded.periods_json,confirmed=excluded.confirmed,updated_at=excluded.updated_at`,
      ).run(user.id, start, JSON.stringify(periods), 1, stamp());
      return { settings: settingsFor(user.id) };
    }
  }
  if (path === "/api/discovery/recommendations" && method === "GET") {
    const user = userFor(req),
      profile = getProfile(user.id) || {},
      courses = getUserTimetable(user.id).courses,
      settings = settingsFor(user.id);
    const now = q.has("at") ? Date.parse(q.get("at")) : Date.now();
    fail(
      Number.isFinite(now) && Math.abs(now - Date.now()) <= 14 * 86400000,
      "推荐时间限前后14天",
    );
    let manual;
    if (q.has("freeMinutes")) {
      manual = Number(q.get("freeMinutes"));
      fail(
        Number.isInteger(manual) && manual >= 1 && manual <= 240,
        "空闲时间需为1–240分钟",
      );
    }
    const slot = availability(courses, settings, now, manual),
      campus = normalizeCampus(q.get("campus") || profile.campus);
    fail(!q.get("campus") || campus, "请选择有效校区");
    const duration = Number(q.get("duration") || 60);
    fail(
      Number.isInteger(duration) && duration >= 20 && duration <= 180,
      "预计就餐时间需20–180分钟",
    );
    const topics = (q.get("topics") || "")
      .split(/[、,，]/)
      .map((x) => x.trim())
      .filter(Boolean);
    fail(
      topics.length <= 5 && topics.every((x) => x.length <= 20),
      "话题最多5个，每个20字",
    );
    const chatMode = q.get("chatMode") || "";
    fail(
      !chatMode || ["quiet", "balanced", "chatty"].includes(chatMode),
      "聊天模式无效",
    );
    const tastes = (profile.tasteTags || []).filter(
        (x) => typeof x === "string",
      ),
      budget = budgetRange(profile.budgetPreference);
    const result = await handleTeams(
      req,
      new URL("/api/meals?onlyAvailable=true", url),
      readBody,
    );
    const own = db
      .prepare(
        "SELECT m.meal_time FROM meals m JOIN meal_participants p ON p.meal_id=m.id WHERE p.user_id=? AND p.status='joined' AND m.status IN ('open','matched')",
      )
      .all(user.id);
    let excluded = 0;
    const meals = result.items
      .filter((m) => {
        const start = Date.parse(m.mealTime),
          end = start + duration * 60000;
        const conflicts =
          settings?.confirmed && courses.length
            ? [...new Set([dateInChina(start), dateInChina(end)])]
                .flatMap((date) => courseIntervals(courses, settings, date))
                .some((c) => overlap(start, end, c.start, c.end))
            : false;
        const reject =
          m.creatorId === user.id ||
          m.joined ||
          m.applicationStatus === "rejected" ||
          (campus && m.campus !== campus) ||
          conflicts ||
          own.some((x) =>
            overlap(
              start,
              end,
              Date.parse(x.meal_time),
              Date.parse(x.meal_time) + duration * 60000,
            ),
          );
        if (reject) excluded++;
        return !reject;
      })
      .map((m) =>
        rankMeal(m, {
          campus,
          budget,
          tastes,
          topics,
          chatMode,
          scheduleKnown:
            availability(courses, settings, Date.parse(m.mealTime)).source ===
            "timetable",
        }),
      )
      .sort(
        (a, b) =>
          b.matchScore - a.matchScore ||
          Date.parse(a.mealTime) - Date.parse(b.mealTime),
      )
      .slice(0, 12);
    const wishes = new Set(
      db
        .prepare(
          "SELECT catalog_restaurant_id FROM wishlist_restaurants WHERE user_id=?",
        )
        .all(user.id)
        .map((x) => x.catalog_restaurant_id),
    );
    const visited = new Set(
      db
        .prepare(
          "SELECT catalog_restaurant_id FROM visited_restaurants WHERE user_id=?",
        )
        .all(user.id)
        .map((x) => x.catalog_restaurant_id),
    );
    const restaurants = catalogue()
      .flatMap((r) => {
        // 直线距离仅用于粗略筛选，不伪装成导航耗时；缺少距离时不作时间保证。
        const distances = Object.values(r.distanceKm || {}).filter(
            Number.isFinite,
          ),
          distance = campus
            ? r.distanceKm?.[campus]
            : distances.length
              ? Math.min(...distances)
              : null;
        const reasons = [],
          warnings = [];
        let score = 10;
        const assumedDining = 30,
          buffer = 15,
          roughMinutes = Number.isFinite(distance)
            ? Math.ceil((distance / 4) * 60) * 2 + assumedDining + buffer
            : null;
        if (
          slot.minutes !== null &&
          (slot.inClass || roughMinutes === null || roughMinutes > slot.minutes)
        )
          return [];
        if (Number.isFinite(distance)) {
          score += Math.max(0, 25 - Math.round(distance * 2));
          reasons.push(
            `距${campus ? "所选" : "最近"}校区直线${distance.toFixed(1)}公里`,
          );
        } else warnings.push("距离缺失，无法按空闲时长判断");
        const matched = tastes.filter((t) =>
          `${r.name} ${r.cuisine} ${r.recommendedDishes}`.includes(t),
        );
        if (matched.length) {
          score += 25;
          reasons.push("符合口味偏好：" + matched.slice(0, 3).join("、"));
        }
        if (wishes.has(String(r.id))) {
          score += 20;
          reasons.push("你收藏在想去清单中");
        }
        if (visited.has(String(r.id))) {
          score -= 15;
          reasons.push("已记录去过，降低重复推荐优先级");
        }
        if (slot.minutes !== null)
          reasons.push(
            `按往返步行4km/h＋用餐30分钟＋缓冲15分钟粗估需${roughMinutes}分钟`,
          );
        warnings.push("不含实际路线、排队和出餐数据；请自行预留时间");
        return [
          { ...r, recommendationScore: score, reasons, warnings, roughMinutes },
        ];
      })
      .sort(
        (a, b) =>
          b.recommendationScore - a.recommendationScore ||
          b.mentionCount - a.mentionCount,
      )
      .slice(0, 6);
    return {
      availability: slot,
      meals,
      restaurants,
      excludedMeals: excluded,
      method: "规则加权排序，不是成功概率，不自动派单",
      assumptions: {
        duration,
        timezone: "Asia/Shanghai",
        speedKmh: 4,
        diningMinutes: 30,
        bufferMinutes: 15,
      },
    };
  }
  if (path === "/api/profile/fulfillment" && method === "GET") {
    const user = userFor(req),
      before = Number(q.get("before")) || Number.MAX_SAFE_INTEGER;
    const rows = db
      .prepare(
        `SELECT m.id,m.title,m.meal_time,m.status,m.creator_id,p.status AS member_status,c.created_at AS checked_at FROM meals m JOIN meal_participants p ON p.meal_id=m.id LEFT JOIN self_checkins c ON c.meal_id=m.id AND c.user_id=p.user_id WHERE p.user_id=? ORDER BY m.id DESC`,
      )
      .all(user.id);
    const items = rows
      .filter((r) => r.id < before)
      .slice(0, 20)
      .map((r) => ({
        ...r,
        record:
          r.member_status === "left"
            ? "left"
            : r.status === "finished"
              ? "finished"
              : r.status === "cancelled"
                ? "cancelled"
                : "upcoming",
        attendanceLabel: r.checked_at
          ? "本人自报到场，未经独立核验"
          : "无到场自报记录",
      }));
    const reviews = db
      .prepare(
        "SELECT COUNT(*) count,AVG(rating) average FROM reviews WHERE target_user_id=?",
      )
      .get(user.id);
    return {
      items: items.map((r) => ({ ...r, recordLabel: recordNames[r.record] })),
      hasMore: rows.filter((r) => r.id < before).length > 20,
      nextCursor: items.at(-1)?.id || null,
      summary: {
        completed: rows.filter(
          (r) => r.status === "finished" && r.member_status === "joined",
        ).length,
        left: rows.filter((r) => r.member_status === "left").length,
        hostCancelled: rows.filter(
          (r) => r.status === "cancelled" && r.creator_id === user.id,
        ).length,
        selfReportedAttendance: rows.filter((r) => r.checked_at).length,
        receivedReviews: reviews.count,
        averageRating: reviews.average,
      },
      policy: "仅记录事实与自报，不计算信用分，不凭单方举报扣分",
    };
  }
  const checkin = path.match(/^\/api\/meals\/(\d+)\/check-in$/);
  if (checkin && method === "POST") {
    const user = userFor(req);
    fail(user.access_status === "approved", "需通过体验资格", 403);
    db.transaction(() => {
      const meal = db.prepare("SELECT * FROM meals WHERE id=?").get(checkin[1]);
      fail(meal, "饭局不存在", 404);
      fail(
        ["open", "matched", "finished"].includes(meal.status),
        "取消的饭局不能报到",
        409,
      );
      fail(
        db
          .prepare(
            "SELECT 1 FROM meal_participants WHERE meal_id=? AND user_id=? AND status='joined'",
          )
          .get(meal.id, user.id),
        "仅正式队员可自报到场",
        403,
      );
      const diff = Date.now() - Date.parse(meal.meal_time);
      fail(
        diff >= -30 * 60000 && diff <= 4 * 3600000,
        "仅就餐前30分钟至开始后4小时可自报到场",
        409,
      );
      db.prepare("INSERT OR IGNORE INTO self_checkins VALUES(?,?,?)").run(
        meal.id,
        user.id,
        stamp(),
      );
    }).immediate();
    return { ok: true, label: "已本人自报到场，不作为独立履约核验" };
  }
  if (path === "/api/offers" && method === "GET") {
    let items = db
      .prepare(
        "SELECT * FROM merchant_offers WHERE status='published' AND julianday(valid_from)<=julianday('now') AND julianday(valid_until)>julianday('now') ORDER BY id DESC",
      )
      .all();
    if (q.get("restaurantId"))
      items = items.filter((x) => x.restaurant_id === q.get("restaurantId"));
    return {
      items: items.map((x) => ({
        ...x,
        restaurantName:
          getRestaurantCatalogItem(x.restaurant_id)?.name || "餐厅",
      })),
      disclaimer:
        "仅展示经管理员核对的信息；无在线支付、核销或平台补贴，请以商家实际确认为准",
    };
  }
  if (path === "/api/admin/offers") {
    const user = userFor(req, true);
    if (method === "GET")
      return {
        items: db
          .prepare("SELECT * FROM merchant_offers ORDER BY id DESC")
          .all(),
      };
    if (method === "POST") {
      const d = await readBody(req),
        id = String(d.restaurantId || "");
      fail(getRestaurantCatalogItem(id), "请选择餐厅仓中的餐厅");
      for (const [field, max] of [
        ["title", 100],
        ["description", 1000],
        ["verificationNote", 500],
      ])
        fail(
          typeof d[field] === "string" &&
            d[field].trim().length > 0 &&
            d[field].length <= max,
          "标题、说明和核验备注需填写且不能超长",
        );
      let source;
      try {
        source = new URL(d.sourceUrl);
      } catch {}
      fail(
        source?.protocol === "https:" &&
          !source.username &&
          !source.password &&
          String(d.sourceUrl).length <= 1000,
        "来源需为有效HTTPS链接",
      );
      const start = checkTime(d.validFrom),
        end = checkTime(d.validUntil);
      fail(
        Date.parse(end) > Date.parse(start) && Date.parse(end) > Date.now(),
        "有效期无效",
      );
      fail(["draft", "published"].includes(d.status), "状态无效");
      fail(
        d.status !== "published" || d.confirmed === true,
        "发布前必须确认已向来源核验",
      );
      const r = db
        .prepare(
          "INSERT INTO merchant_offers(restaurant_id,title,description,source_url,verification_note,valid_from,valid_until,status,created_by,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?)",
        )
        .run(
          id,
          d.title.trim(),
          d.description.trim(),
          source.href,
          d.verificationNote.trim(),
          start,
          end,
          d.status,
          user.id,
          stamp(),
        );
      return { id: Number(r.lastInsertRowid) };
    }
  }
  const offer = path.match(/^\/api\/admin\/offers\/(\d+)\/archive$/);
  if (offer && method === "POST") {
    userFor(req, true);
    const result = db
      .prepare(
        "UPDATE merchant_offers SET status='archived',updated_at=? WHERE id=?",
      )
      .run(stamp(), offer[1]);
    fail(result.changes, "优惠不存在", 404);
    return { ok: true };
  }
  return undefined;
}
