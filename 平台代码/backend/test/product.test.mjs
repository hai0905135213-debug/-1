import test from "node:test";
import { recruitmentHint } from "../../frontend/services/meal-state.mjs";
test("报名提示边界：截止、满员、取消及名额不为负", () => {
  const now = Date.parse("2026-10-21T10:00:00Z"),
    meal = {
      status: "open",
      deadline: "2026-10-21T10:01:00Z",
      maxPeople: 3,
      currentPeople: 1,
    };
  assert.match(recruitmentHint(meal, now), /1分钟.*2个正式名额/);
  assert.match(recruitmentHint(meal, now + 60000), /报名已截止/);
  assert.match(recruitmentHint({ ...meal, status: "matched" }, now), /满员/);
  assert.match(recruitmentHint({ ...meal, status: "cancelled" }, now), /取消/);
  assert.match(
    recruitmentHint({ ...meal, currentPeople: 4 }, now),
    /0个正式名额/,
  );
  assert.match(
    recruitmentHint({ ...meal, deadline: "invalid" }, now),
    /待刷新/,
  );
});
import assert from "node:assert/strict";
import { mkdtempSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
process.env.DATA_DIR = mkdtempSync(join(tmpdir(), "fanfan-product-"));
process.env.ENABLE_DEV_LOGIN = "true";
process.env.ADMIN_USER_IDS = "1";
process.env.SEED_DEMO = "false";
const { handleProduct, policy } = await import("../src/product.js");
const { handleTeams } = await import("../src/teams.js");
const { handleDiscovery } = await import("../src/discovery.js");
const { db, listRestaurantCatalog, saveUserTimetable } = await import(
  "../src/db.js"
);
const call = async (method, path, token, data = {}) => {
  const req = {
      method,
      headers: token ? { authorization: "Bearer " + token } : {},
    },
    url = new URL(path, "http://local"),
    read = async () => data;
  return (
    (await handleProduct(req, url, read)) ??
    (await handleTeams(req, url, read)) ??
    (await handleDiscovery(req, url, read))
  );
};
const rejects = (p, status) => assert.rejects(p, (e) => e.status === status);
const future = () => new Date(Date.now() + 86400000).toISOString();
const complete = async (s) =>
  call("POST", "/api/account/onboarding", s.token, {
    nickname: s.user.nickname,
    campus: "cufe_shahe",
    accepted: true,
    policyVersion: policy().version,
    tasteTags: ["川菜"],
  });
test("普通用户试运行与运营收尾", async (t) => {
  const host = await call("POST", "/api/auth/login", null, {
      nickname: "产品测试管理员",
    }),
    user = await call("POST", "/api/auth/login", null, {
      nickname: "产品测试同学",
    });
  await t.test("首次引导需明确同意，不冒充身份认证", async () => {
    assert.equal(host.user.onboardingRequired, true);
    await rejects(
      call("POST", "/api/account/onboarding", host.token, {
        nickname: "未同意",
      }),
      400,
    );
    await complete(host);
    await complete(user);
    assert.equal(
      (await call("GET", "/api/auth/me", user.token)).user.onboardingRequired,
      false,
    );
    await call("POST", `/api/admin/users/${user.user.id}/access`, host.token, {
      status: "approved",
    });
    assert.equal(
      db
        .prepare("SELECT consent_version FROM users WHERE id=?")
        .get(user.user.id).consent_version,
      policy().version,
    );
  });
  await t.test("停用撤销旧会话且保护最后一名管理员", async () => {
    const disabled = await call("POST", "/api/auth/login", null, {
      nickname: "停用测试用户",
    });
    await call(
      "POST",
      `/api/admin/users/${disabled.user.id}/access`,
      host.token,
      { status: "blocked" },
    );
    await rejects(call("GET", "/api/auth/me", disabled.token), 401);
    await rejects(
      call("POST", `/api/admin/users/${host.user.id}/access`, host.token, {
        status: "blocked",
      }),
      409,
    );
  });
  const create = (extra) =>
    call("POST", "/api/meals", host.token, {
      title: "运营测试饭局",
      place: "公开集合处",
      campus: "cufe_shahe",
      maxPeople: 3,
      mealTime: future(),
      ...extra,
    });
  await t.test("反馈私有、回复通知、游客及普通人无管理权限", async () => {
    await rejects(call("GET", "/api/feedback"), 401);
    await rejects(call("GET", "/api/admin/feedback", user.token), 403);
    const f = await call("POST", "/api/feedback", user.token, {
      category: "issue",
      content: "测试界面反馈",
    });
    assert.equal(
      (await call("GET", "/api/feedback", host.token)).items.length,
      0,
    );
    await rejects(
      call("POST", `/api/admin/feedback/${f.id}`, host.token, {
        status: "resolved",
        reply: "",
      }),
      400,
    );
    await call("POST", `/api/admin/feedback/${f.id}`, host.token, {
      status: "resolved",
      reply: "已核实修正",
    });
    assert.equal(
      (await call("GET", "/api/feedback", user.token)).items[0].reply,
      "已核实修正",
    );
    assert.ok(
      (await call("GET", "/api/notifications/unread", user.token)).unread > 0,
    );
  });
  await t.test("内容隐藏、关闭申请、留痕通知和不可自动重开", async () => {
    const meal = (await create({ description: "需处理的内容" })).meal;
    await call("POST", `/api/meals/${meal.id}/apply`, user.token);
    await call("POST", `/api/meals/${meal.id}/messages`, host.token, {
      content: "核验用消息",
    });
    const message = db
      .prepare("SELECT id FROM team_messages WHERE meal_id=?")
      .get(meal.id);
    await rejects(
      call("POST", "/api/admin/moderation", user.token, {
        type: "message",
        id: message.id,
        hidden: true,
        reason: "越权",
      }),
      403,
    );
    await call("POST", "/api/admin/moderation", host.token, {
      type: "message",
      id: message.id,
      hidden: true,
      reason: "核验后隐藏",
    });
    assert.equal(
      (await call("GET", `/api/meals/${meal.id}/messages`, host.token)).items
        .length,
      0,
    );
    await call("POST", "/api/posts", host.token, {
      mealId: meal.id,
      content: "关联找人",
    });
    await call("POST", "/api/admin/moderation", host.token, {
      type: "meal",
      id: meal.id,
      hidden: true,
      reason: "管理员核验不适宜内容",
    });
    assert.ok(
      !(await call("GET", "/api/meals", user.token)).items.some(
        (x) => x.id === meal.id,
      ),
    );
    const detail = (await call("GET", `/api/meals/${meal.id}`, user.token))
      .meal;
    assert.equal(detail.status, "cancelled");
    assert.equal(detail.applicationStatus, "closed");
    assert.equal(detail.description, "");
    assert.deepEqual(detail.venue, {});
    assert.equal((await call("GET", "/api/posts", user.token)).items.length, 0);
    await call("POST", "/api/admin/moderation", host.token, {
      type: "meal",
      id: meal.id,
      hidden: false,
      reason: "已处理恢复展示",
    });
    assert.equal(
      (await call("GET", `/api/meals/${meal.id}`, host.token)).meal.status,
      "cancelled",
    );
    assert.ok(db.prepare("SELECT COUNT(*) n FROM moderation_log").get().n >= 3);
  });
  await t.test("餐厅纠错停用旧坐标距离，旧饭局快照不漂移", async () => {
    const r = listRestaurantCatalog({ pageSize: 10 }).items.find(
      (x) => x.selectedCandidate,
    );
    const meal = (
      await create({ restaurantId: r.id, poiId: r.selectedCandidate.poiId })
    ).meal;
    const data = {
      poiId: r.selectedCandidate.poiId,
      address: "测试核验地址，不写入真实库",
      sourceUrl: "https://example.com/verified",
      note: "临时库测试核验",
      confirmed: true,
    };
    await rejects(
      call("PUT", "/api/admin/catalog/" + r.id, user.token, data),
      403,
    );
    await call("PUT", "/api/admin/catalog/" + r.id, host.token, data);
    const result = listRestaurantCatalog({
      restaurantId: r.id,
      poiId: r.selectedCandidate.poiId,
    }).items[0];
    assert.equal(result.fullAddress, data.address);
    assert.deepEqual(result.distanceKm, {});
    assert.equal(result.selectedCandidate.location, null);
    assert.equal(
      (await call("GET", `/api/meals/${meal.id}`, host.token)).meal.venue
        .address,
      meal.venue.address,
    );
    await call("POST", `/api/meals/${meal.id}/cancel`, host.token);
  });
  await t.test(
    "当前课表可清空，账号删除先处理未结束饭局并撤销所有会话",
    async () => {
      saveUserTimetable(user.user.id, [
        { courseName: "测试", dayOfWeek: 1, startPeriod: 1, endPeriod: 2 },
      ]);
      await call("DELETE", "/api/account/timetable", user.token);
      assert.equal(
        db
          .prepare("SELECT COUNT(*) n FROM user_timetables WHERE user_id=?")
          .get(user.user.id).n,
        0,
      );
      const m = (
        await call("POST", "/api/meals", user.token, {
          title: "注销前需处理",
          place: "测试点",
          campus: "cufe_shahe",
          maxPeople: 2,
          mealTime: future(),
        })
      ).meal;
      await rejects(
        call("DELETE", "/api/account", user.token, {
          confirmation: "注销账号",
        }),
        409,
      );
      await call("POST", `/api/meals/${m.id}/cancel`, user.token);
      const second = (
        await call("POST", "/api/auth/login", null, {
          nickname: "产品测试同学",
        })
      ).token;
      await rejects(
        call("DELETE", "/api/account", user.token, { confirmation: "随便" }),
        400,
      );
      await call("DELETE", "/api/account", user.token, {
        confirmation: "注销账号",
      });
      await rejects(call("GET", "/api/auth/me", user.token), 401);
      await rejects(call("GET", "/api/auth/me", second), 401);
      const row = db
        .prepare("SELECT * FROM users WHERE id=?")
        .get(user.user.id);
      assert.ok(row.deleted_at);
      assert.equal(row.openid, null);
      assert.equal(row.student_no, "");
      assert.equal(
        db
          .prepare("SELECT COUNT(*) n FROM profiles WHERE user_id=?")
          .get(user.user.id).n,
        0,
      );
      await rejects(
        call("DELETE", "/api/account", host.token, {
          confirmation: "注销账号",
        }),
        409,
      );
    },
  );
  await t.test("迁移有备份且不生成虚构价格或运营联系方式", () => {
    assert.ok(
      readdirSync(join(process.env.DATA_DIR, "backups")).some((x) =>
        x.startsWith("before-product-"),
      ),
    );
    assert.equal(policy().version, "2026-10-21-v1");
    assert.ok(policy().support.includes("配置"));
  });
});
