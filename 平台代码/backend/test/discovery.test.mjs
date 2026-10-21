import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
process.env.DATA_DIR = mkdtempSync(join(tmpdir(), "fanfan-discovery-"));
process.env.ENABLE_DEV_LOGIN = "true";
process.env.ADMIN_USER_IDS = "1";
process.env.SEED_DEMO = "false";
const { handleTeams } = await import("../src/teams.js");
const { handleDiscovery, invalidateSchedule } = await import(
  "../src/discovery.js"
);
const { db, saveUserTimetable, upsertProfile, listRestaurantCatalog } =
  await import("../src/db.js");
const { courseIntervals, availability, validCourses, rankMeal } = await import(
  "../src/recommendation-rules.js"
);
const call = async (method, path, token, data = {}) => {
  const req = {
      method,
      headers: token ? { authorization: "Bearer " + token } : {},
    },
    url = new URL(path, "http://local"),
    read = async () => data;
  return (
    (await handleTeams(req, url, read)) ??
    (await handleDiscovery(req, url, read))
  );
};
const rejected = (promise, status) =>
  assert.rejects(promise, (e) => e.status === status);
const now = Date.now(),
  future = new Date(now + 86400000).toISOString();
test("新增推荐与试运行功能", async (t) => {
  const host = await call("POST", "/api/auth/login", null, {
      nickname: "规则测试发起人",
    }),
    user = await call("POST", "/api/auth/login", null, {
      nickname: "规则测试队员",
    }),
    other = await call("POST", "/api/auth/login", null, { nickname: "旁观者" });
  await call("POST", `/api/admin/users/${user.user.id}/access`, host.token, {
    status: "approved",
  });
  const create = (extra) =>
    call("POST", "/api/meals", host.token, {
      title: "川菜电影饭局",
      foodType: "川菜",
      place: "测试餐厅",
      campus: "cufe_shahe",
      maxPeople: 2,
      mealTime: future,
      budgetMin: 20,
      budgetMax: 40,
      topicTags: ["电影"],
      chatMode: "quiet",
      ...extra,
    });
  await t.test("周次单双周、星期日和节次边界", () => {
    const settings = {
      confirmed: true,
      termStartDate: "2026-10-19",
      periods: [
        ["08:00", "08:45"],
        ["08:55", "09:40"],
      ],
    };
    const course = {
      courseName: "数学",
      dayOfWeek: 1,
      startPeriod: 1,
      endPeriod: 2,
      weeks: [1, 2],
      weekType: "odd",
    };
    assert.equal(courseIntervals([course], settings, "2026-10-19").length, 1);
    assert.equal(courseIntervals([course], settings, "2026-10-26").length, 0);
    assert.equal(
      courseIntervals([{ ...course, dayOfWeek: 7 }], settings, "2026-10-25")
        .length,
      1,
    );
    assert.equal(
      availability([course], settings, Date.parse("2026-10-19T08:55:00+08:00"))
        .inClass,
      true,
    );
    assert.equal(
      availability([course], settings, Date.parse("2026-10-19T09:40:00+08:00"))
        .inClass,
      false,
    );
    assert.equal(availability([], settings, now).source, "unknown");
    assert.equal(validCourses([{ ...course, startPeriod: 0 }]), false);
  });
  await t.test("设置权限、周一验证、时间区间与导入后失效", async () => {
    await rejected(call("GET", "/api/schedule/settings", null), 401);
    await rejected(
      call("PUT", "/api/schedule/settings", user.token, {
        termStartDate: "2026-10-20",
        periods: [["08:00", "09:00"]],
        confirmed: true,
      }),
      400,
    );
    await rejected(
      call("PUT", "/api/schedule/settings", user.token, {
        termStartDate: "2026-10-19",
        periods: [["09:00", "08:00"]],
        confirmed: true,
      }),
      400,
    );
    await call("PUT", "/api/schedule/settings", user.token, {
      termStartDate: "2026-10-19",
      periods: [["08:00", "09:00"]],
      confirmed: true,
    });
    invalidateSchedule(user.user.id);
    assert.equal(
      (await call("GET", "/api/schedule/settings", user.token)).settings
        .confirmed,
      false,
    );
  });
  const meal = (await create({})).meal;
  await t.test("规则分有来源，不是匹配概率；偏好命中分数更高", async () => {
    upsertProfile(user.user.id, {
      campus: "cufe_shahe",
      tasteTags: ["川菜"],
      personalityTags: [],
      budgetPreference: "20-40",
    });
    const data = await call(
      "GET",
      "/api/discovery/recommendations?campus=cufe_shahe&topics=电影&chatMode=quiet&freeMinutes=240",
      user.token,
    );
    const matched = data.meals.find((x) => x.id === meal.id);
    assert.ok(matched);
    assert.ok(matched.reasons.some((x) => x.includes("预算")));
    assert.ok(matched.reasons.some((x) => x.includes("电影")));
    assert.equal(matched.matchScore, 90);
    assert.equal(data.availability.source, "manual");
    assert.ok(data.restaurants.every((x) => x.roughMinutes <= 240));
    assert.equal(
      (
        await call(
          "GET",
          "/api/discovery/recommendations?campus=cufe_nanlu",
          user.token,
        )
      ).meals.length,
      0,
    );
    await rejected(
      call("GET", "/api/discovery/recommendations?freeMinutes=-1", user.token),
      400,
    );
  });
  await t.test("课表冲突排除而非仅降低排名", async () => {
    const local = new Date(Date.parse(future) + 8 * 3600000),
      date = local.toISOString().slice(0, 10),
      day = local.getUTCDay() || 7;
    const monday = new Date(
      Date.parse(date + "T00:00:00Z") - (day - 1) * 86400000,
    )
      .toISOString()
      .slice(0, 10);
    saveUserTimetable(user.user.id, [
      {
        courseName: "全天测试课",
        dayOfWeek: day,
        startPeriod: 1,
        endPeriod: 1,
      },
    ]);
    await call("PUT", "/api/schedule/settings", user.token, {
      termStartDate: monday,
      periods: [["00:00", "23:59"]],
      confirmed: true,
    });
    assert.ok(
      !(
        await call("GET", "/api/discovery/recommendations", user.token)
      ).meals.some((x) => x.id === meal.id),
    );
  });
  await t.test("限时招募服务器强制15分钟、截止拒绝且关闭申请", async () => {
    const limited = (
      await create({
        recruitMode: "limited",
        deadline: new Date(now + 7 * 86400000).toISOString(),
      })
    ).meal;
    assert.equal(limited.recruitMode, "limited");
    assert.ok(Date.parse(limited.deadline) <= Date.now() + 15 * 60000);
    await call("POST", `/api/meals/${limited.id}/apply`, user.token, {});
    db.prepare("UPDATE meals SET deadline=? WHERE id=?").run(
      new Date(Date.now() - 1000).toISOString(),
      limited.id,
    );
    await rejected(
      call("POST", `/api/meals/${limited.id}/apply`, user.token, {}),
      409,
    );
    assert.equal(
      (await call("GET", `/api/meals/${limited.id}`, user.token)).meal
        .applicationStatus,
      "closed",
    );
  });
  await t.test("自报到场窗口、正式成员权限、幂等、不改变信用分", async () => {
    await call("POST", `/api/meals/${meal.id}/apply`, user.token, {});
    const apps = await call(
      "GET",
      `/api/meals/${meal.id}/applications`,
      host.token,
    );
    await call(
      "POST",
      `/api/meals/${meal.id}/applications/${apps.items[0].id}/approve`,
      host.token,
    );
    await rejected(
      call("POST", `/api/meals/${meal.id}/check-in`, user.token),
      409,
    );
    db.prepare("UPDATE meals SET meal_time=? WHERE id=?").run(
      new Date(Date.now() - 60000).toISOString(),
      meal.id,
    );
    const credit = db
      .prepare("SELECT credit_score FROM users WHERE id=?")
      .get(user.user.id).credit_score;
    await rejected(
      call("POST", `/api/meals/${meal.id}/check-in`, other.token),
      403,
    );
    await call("POST", `/api/meals/${meal.id}/check-in`, user.token);
    await call("POST", `/api/meals/${meal.id}/check-in`, user.token);
    assert.equal(
      db
        .prepare("SELECT COUNT(*) n FROM self_checkins WHERE user_id=?")
        .get(user.user.id).n,
      1,
    );
    await call("POST", `/api/meals/${meal.id}/finish`, host.token);
    const records = await call("GET", "/api/profile/fulfillment", user.token);
    assert.equal(records.summary.completed, 1);
    assert.equal(records.summary.selfReportedAttendance, 1);
    assert.ok(records.items[0].attendanceLabel.includes("未经独立核验"));
    assert.equal(
      db.prepare("SELECT credit_score FROM users WHERE id=?").get(user.user.id)
        .credit_score,
      credit,
    );
  });
  await t.test("真实来源优惠：权限、发布确认、有效期与下架", async () => {
    const r = listRestaurantCatalog({ pageSize: 1 }).items[0];
    const data = {
      restaurantId: r.id,
      title: "测试优惠（不是真实商家活动）",
      description: "仅在临时数据库验证",
      sourceUrl: "https://example.com/source",
      verificationNote: "测试用核验记录",
      validFrom: new Date(now - 1000).toISOString(),
      validUntil: future,
      status: "published",
      confirmed: true,
    };
    await rejected(call("POST", "/api/admin/offers", user.token, data), 403);
    await rejected(
      call("POST", "/api/admin/offers", host.token, {
        ...data,
        confirmed: false,
      }),
      400,
    );
    await rejected(
      call("POST", "/api/admin/offers", host.token, {
        ...data,
        sourceUrl: "javascript:alert(1)",
      }),
      400,
    );
    await call("POST", "/api/admin/offers", host.token, {
      ...data,
      status: "draft",
    });
    assert.equal((await call("GET", "/api/offers")).items.length, 0);
    const offer = await call("POST", "/api/admin/offers", host.token, data);
    assert.equal((await call("GET", "/api/offers")).items.length, 1);
    await call("POST", `/api/admin/offers/${offer.id}/archive`, host.token);
    assert.equal((await call("GET", "/api/offers")).items.length, 0);
  });
});
