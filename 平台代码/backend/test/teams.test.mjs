import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, existsSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

// 所有测试在临时业务库运行，独立餐厅仓只读；不会修改用户已有饭局。
process.env.DATA_DIR = mkdtempSync(join(tmpdir(), "fanfan-acceptance-"));
process.env.ENABLE_DEV_LOGIN = "true";
process.env.ADMIN_USER_IDS = "1";
process.env.SEED_DEMO = "false";
const { handleTeams, sessionUser } = await import("../src/teams.js");
const { db, listRestaurantCatalog, getRestaurantCatalogItem, createRestaurant } = await import(
  "../src/db.js"
);
const run = (method, path, token, data = {}) =>
  handleTeams(
    { method, headers: token ? { authorization: `Bearer ${token}` } : {} },
    new URL(path, "http://local"),
    async () => data,
  );
const rejects = (promise, code) =>
  assert.rejects(promise, (error) => error.code === code);
const future = () => new Date(Date.now() + 86400000).toISOString();
const worker = fileURLToPath(new URL("./approval-worker.mjs", import.meta.url));

test("餐厅发现、审批组队和权限完整验收", async (t) => {
  const host = await run("POST", "/api/auth/login", null, {
    nickname: "发起人",
  });
  const a = await run("POST", "/api/auth/login", null, { nickname: "队员甲" });
  const b = await run("POST", "/api/auth/login", null, { nickname: "队员乙" });
  const outsider = await run("POST", "/api/auth/login", null, {
    nickname: "未邀请同学",
  });
  const create = (extra = {}) =>
    run("POST", "/api/meals", host.token, {
      title: "测试预约",
      place: "校门口",
      campus: "cufe_shahe",
      mealTime: future(),
      maxPeople: 2,
      budgetMin: 20,
      budgetMax: 50,
      ...extra,
    });
  await t.test("登录资格、伪造Token与生产开发登录限制", async () => {
    assert.equal(host.user.isAdmin, true);
    assert.equal(
      sessionUser({
        headers: { authorization: "Bearer dev-token-1", "x-user-id": "1" },
      }),
      null,
    );
    await rejects(
      run("POST", "/api/meals", outsider.token, {}),
      "ACCESS_PENDING",
    );
    await rejects(run("GET", "/api/admin/users", a.token), "FORBIDDEN");
    for (const user of [a, b])
      await run("POST", `/api/admin/users/${user.user.id}/access`, host.token, {
        status: "approved",
      });
    process.env.NODE_ENV = "production";
    await rejects(
      run("POST", "/api/auth/login", null, { nickname: "非法" }),
      "DEV_LOGIN_DISABLED",
    );
    delete process.env.NODE_ENV;
  });
  const meal = (await create({ meetingNote: "西门集合" })).meal;
  await t.test("发布限制与报名不占名额", async () => {
    await rejects(create({ maxPeople: 13 }), "INVALID_PEOPLE");
    await rejects(create({ mealTime: "2020-01-01" }), "INVALID_TIME");
    await run("POST", `/api/meals/${meal.id}/apply`, a.token);
    await run("POST", `/api/meals/${meal.id}/apply`, a.token);
    assert.equal(
      (await run("GET", `/api/meals/${meal.id}`, a.token)).meal.currentPeople,
      1,
    );
    assert.equal(
      (await run("GET", `/api/meals/${meal.id}`, a.token)).meal.meetingNote,
      null,
    );
    assert.equal(
      (await run("GET", `/api/meals/${meal.id}/applications`, host.token)).items
        .length,
      1,
    );
    await rejects(
      run("GET", `/api/meals/${meal.id}/messages`, a.token),
      "NOT_MEMBER",
    );
  });
  await t.test("两个进程并发审批最后一个名额只允许一人成功", async () => {
    await run("POST", `/api/meals/${meal.id}/apply`, b.token);
    const entries = (
      await run("GET", `/api/meals/${meal.id}/applications`, host.token)
    ).items;
    const approveInProcess = (entry) =>
      new Promise((resolve, reject) => {
        const child = spawn(
          process.execPath,
          [
            worker,
            `/api/meals/${meal.id}/applications/${entry.id}/approve`,
            host.token,
          ],
          { env: process.env },
        );
        let output = "",
          error = "";
        child.stdout.on("data", (x) => (output += x));
        child.stderr.on("data", (x) => (error += x));
        child.on("error", reject);
        child.on("close", (code) => resolve({ code, output, error }));
      });
    const results = await Promise.all(entries.map(approveInProcess));
    assert.equal(
      results.filter((x) => x.code === 0).length,
      1,
      JSON.stringify(results),
    );
    const data = (await run("GET", `/api/meals/${meal.id}`, host.token)).meal;
    assert.equal(data.status, "matched");
    assert.equal(data.currentPeople, 2);
    assert.equal(
      (
        await run("GET", `/api/meals/${meal.id}/applications`, host.token)
      ).items.filter((x) => x.status === "closed").length,
      1,
    );
  });
  let winner;
  await t.test("审批通过才能留言，退出撤销访问并重新招募", async () => {
    const data = (await run("GET", `/api/meals/${meal.id}`, host.token)).meal;
    winner = [a, b].find((x) =>
      data.participants.some((member) => member.id === x.user.id),
    );
    assert.equal(
      (await run("GET", `/api/meals/${meal.id}`, winner.token)).meal
        .meetingNote,
      "西门集合",
    );
    await run("POST", `/api/meals/${meal.id}/messages`, winner.token, {
      content: "我会准时到",
    });
    assert.equal(
      (await run("GET", `/api/meals/${meal.id}/messages`, host.token)).items
        .length,
      1,
    );
    await rejects(
      run("POST", `/api/meals/${meal.id}/messages`, winner.token, {
        content: "x".repeat(501),
      }),
      "INVALID_MESSAGE",
    );
    await run("POST", `/api/meals/${meal.id}/leave`, winner.token);
    await rejects(
      run("GET", `/api/meals/${meal.id}/messages`, winner.token),
      "NOT_MEMBER",
    );
    assert.equal(
      (await run("GET", `/api/meals/${meal.id}`, host.token)).meal.status,
      "open",
    );
    await run("POST", `/api/meals/${meal.id}/apply`, winner.token);
    const entry = (
      await run("GET", `/api/meals/${meal.id}/applications`, host.token)
    ).items.find((x) => x.user_id === winner.user.id);
    await run(
      "POST",
      `/api/meals/${meal.id}/applications/${entry.id}/approve`,
      host.token,
    );
  });
  await t.test("完成时间门槛、互评唯一性与关闭发言", async () => {
    await rejects(
      run("POST", `/api/meals/${meal.id}/finish`, host.token),
      "CANNOT_FINISH",
    );
    // 测试夹具推进就餐时间，避免测试等待一天。
    db.prepare("UPDATE meals SET meal_time=? WHERE id=?").run(
      new Date(Date.now() - 1000).toISOString(),
      meal.id,
    );
    await run("POST", `/api/meals/${meal.id}/finish`, host.token);
    await run("POST", `/api/meals/${meal.id}/reviews`, winner.token, {
      targetUserId: host.user.id,
      rating: 5,
      content: "准时",
    });
    await rejects(
      run("POST", `/api/meals/${meal.id}/reviews`, winner.token, {
        targetUserId: host.user.id,
        rating: 5,
      }),
      "ALREADY_REVIEWED",
    );
    await rejects(
      run("POST", `/api/meals/${meal.id}/reviews`, winner.token, {
        targetUserId: winner.user.id,
        rating: 5,
      }),
      "INVALID_TARGET",
    );
    await rejects(
      run("POST", `/api/meals/${meal.id}/messages`, host.token, {
        content: "结束后",
      }),
      "MEAL_CLOSED",
    );
    await rejects(
      run("POST", `/api/meals/${meal.id}/leave`, winner.token),
      "MEAL_CLOSED",
    );
  });
  await t.test("撤回、拒绝不可重报、截止和取消通知", async () => {
    const row = (await create({ maxPeople: 4 })).meal;
    await run("POST", `/api/meals/${row.id}/apply`, a.token);
    await run("POST", `/api/meals/${row.id}/withdraw`, a.token);
    await run("POST", `/api/meals/${row.id}/apply`, a.token);
    const entry = (
      await run("GET", `/api/meals/${row.id}/applications`, host.token)
    ).items[0];
    await run(
      "POST",
      `/api/meals/${row.id}/applications/${entry.id}/reject`,
      host.token,
    );
    await rejects(
      run("POST", `/api/meals/${row.id}/apply`, a.token),
      "APPLICATION_REJECTED",
    );
    await run("POST", `/api/meals/${row.id}/apply`, b.token);
    db.prepare("UPDATE meals SET deadline=? WHERE id=?").run(
      "2020-01-01T00:00:00Z",
      row.id,
    );
    const bEntry = (
      await run("GET", `/api/meals/${row.id}/applications`, host.token)
    ).items.find((x) => x.user_id === b.user.id);
    await rejects(
      run(
        "POST",
        `/api/meals/${row.id}/applications/${bEntry.id}/approve`,
        host.token,
      ),
      "DEADLINE_PASSED",
    );
    await rejects(
      run("POST", `/api/meals/${row.id}/cancel`, a.token),
      "FORBIDDEN",
    );
    await run("POST", `/api/meals/${row.id}/cancel`, host.token);
    assert.ok(
      (await run("GET", "/api/notifications", b.token)).items.some(
        (x) => x.meal_id === row.id,
      ),
    );
    await run("POST", "/api/notifications/read", b.token);
    assert.equal((await run("GET", "/api/notifications", b.token)).unread, 0);
  });
  await t.test("餐厅分页、筛选、具体分店快照及历史ID", async () => {
    const legacy=createRestaurant({name:'历史数字ID餐厅',location:'历史地址'});
    const legacyMeal=(await create({restaurantId:String(legacy.id)})).meal;
    assert.equal(legacyMeal.restaurantId,String(legacy.id));
    assert.equal(legacyMeal.venue.address,'历史地址');
    const first = listRestaurantCatalog({ pageSize: 6, campus: "cufe_shahe" }),
      second = listRestaurantCatalog({
        pageSize: 6,
        page: 2,
        campus: "cufe_shahe",
      });
    assert.ok(first.total >= 100);
    assert.equal(first.items.length, 6);
    assert.equal(
      new Set([...first.items, ...second.items].map((x) => x.id)).size,
      12,
    );
    assert.equal(getRestaurantCatalogItem("non-existing"), null);
    const restaurant = first.items.find((x) => x.selectedCandidate);
    assert.ok(restaurant);
    const filtered=listRestaurantCatalog({campus:'cufe_shahe',cuisines:[restaurant.cuisine],tags:restaurant.tags.slice(0,1),maxDistance:restaurant.distanceKm.cufe_shahe+1});
    assert.ok(filtered.items.some(item=>item.id===restaurant.id));
    assert.ok(filtered.items.every(item=>item.cuisine.includes(restaurant.cuisine)&&item.distanceKm.cufe_shahe<=restaurant.distanceKm.cufe_shahe+1));
    assert.equal('raw_messages' in restaurant,false);
    const byPoi = getRestaurantCatalogItem(
      restaurant.id,
      "cufe_nanlu",
      restaurant.selectedCandidate.poiId,
    );
    assert.equal(
      byPoi.selectedCandidate.poiId,
      restaurant.selectedCandidate.poiId,
    );
    const row = (
      await create({
        restaurantId: restaurant.id,
        poiId: restaurant.selectedCandidate.poiId,
      })
    ).meal;
    assert.equal(row.venue.poiId, restaurant.selectedCandidate.poiId);
    assert.equal(row.venue.address, restaurant.fullAddress);
    assert.equal(
      (await run("GET", `/api/meals/${row.id}`, host.token)).meal.place,
      row.place,
    );
    const facets = await run("GET", "/api/restaurants/facets");
    assert.ok(facets.cuisines.length);
  });
  await t.test("迁移备份存在、会话可撤销", async () => {
    const expired=await run('POST','/api/auth/login',null,{nickname:'过期会话测试'});
    db.prepare('UPDATE sessions SET expires_at=? WHERE user_id=?').run('2020-01-01T00:00:00Z',expired.user.id);
    await rejects(run('GET','/api/auth/me',expired.token),'UNAUTHORIZED');
    assert.ok(existsSync(join(process.env.DATA_DIR, "backups")));
    assert.ok(readdirSync(join(process.env.DATA_DIR, "backups")).length);
    await run("POST", "/api/auth/logout", outsider.token);
    await rejects(run("GET", "/api/auth/me", outsider.token), "UNAUTHORIZED");
  });
});
