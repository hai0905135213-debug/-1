import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

test("真实HTTP路由与重启持久化", async () => {
  const dataDir = mkdtempSync(join(tmpdir(), "fanfan-http-"));
  let service;
  const start = () =>
    new Promise((resolve, reject) => {
      service = spawn(
        process.execPath,
        [fileURLToPath(new URL("../src/server.js", import.meta.url))],
        {
          env: {
            ...process.env,
            DATA_DIR: dataDir,
            PORT: "0",
            ENABLE_DEV_LOGIN: "true",
            ADMIN_USER_IDS: "1",
            SEED_DEMO: "false",
          },
        },
      );
      let out = "";
      const timeout = setTimeout(() => {
        service.kill();
        reject(new Error("启动超时: " + out));
      }, 15000);
      service.stdout.on("data", (chunk) => {
        out += chunk;
        const address = out.match(/http:\/\/127\.0\.0\.1:\d+/);
        if (address) {
          clearTimeout(timeout);
          resolve(address[0] + "/api");
        }
      });
      service.stderr.on("data", (chunk) => (out += chunk));
      service.once("error", reject);
      service.once("exit", (code) => {
        clearTimeout(timeout);
        if (code) reject(new Error(out));
      });
    });
  const stop = () =>
    new Promise((resolve) => {
      if (!service || service.exitCode !== null) return resolve();
      service.once("exit", resolve);
      service.kill("SIGTERM");
    });
  let base;
  const api = async (path, method = "GET", token, data) => {
    const response = await fetch(base + path, {
      method,
      headers: {
        "content-type": "application/json",
        ...(token ? { authorization: "Bearer " + token } : {}),
      },
      body: data === undefined ? undefined : JSON.stringify(data),
    });
    return { status: response.status, data: await response.json() };
  };
  try {
    base = await start();
    const host = (
      await api("/auth/login", "POST", null, { nickname: "HTTP发起人" })
    ).data;
    const guest = (
      await api("/auth/login", "POST", null, { nickname: "HTTP队员" })
    ).data;
    assert.ok(host.token);
    assert.equal((await api("/meals", "POST", guest.token, {})).status, 403);
    await api(`/admin/users/${guest.user.id}/access`, "POST", host.token, {
      status: "approved",
    });
    const restaurants = (await api("/restaurants?pageSize=6&campus=cufe_shahe"))
      .data;
    assert.ok(restaurants.total >= 100);
    assert.equal(restaurants.items.length, 6);
    assert.ok((await api("/restaurants/facets")).data.cuisines.length);
    const restaurant = restaurants.items.find((x) => x.selectedCandidate);
    const created = await api("/meals", "POST", host.token, {
      title: "HTTP完整流程",
      restaurantId: restaurant.id,
      poiId: restaurant.selectedCandidate.poiId,
      campus: "cufe_shahe",
      maxPeople: 2,
      mealTime: new Date(Date.now() + 86400000).toISOString(),
    });
    assert.equal(created.status, 200, JSON.stringify(created));
    const mealId = created.data.meal.id;
    await api(`/meals/${mealId}/join`, "POST", guest.token, {});
    assert.equal(
      (await api(`/meals/${mealId}/messages`, "GET", guest.token)).status,
      403,
    );
    const application = (
      await api(`/meals/${mealId}/applications`, "GET", host.token)
    ).data.items[0];
    assert.equal(
      (
        await api(
          `/meals/${mealId}/applications/${application.id}/approve`,
          "POST",
          host.token,
          {},
        )
      ).status,
      200,
    );
    await api(`/meals/${mealId}/messages`, "POST", guest.token, {
      content: "HTTP测试留言",
    });
    const post = await api("/posts", "POST", host.token, {
      mealId,
      content: "一起吃饭",
    });
    assert.equal(post.data.post.mealId, mealId);
    assert.ok(
      (await api("/posts")).data.items.some((x) => x.mealId === mealId),
    );
    await api("/profile/wishlist", "POST", guest.token, {
      restaurantId: restaurant.id,
    });
    const record = (await api("/profile/wishlist", "GET", guest.token)).data
      .items[0];
    assert.equal(record.restaurantId, restaurant.id);
    await stop();
    base = await start();
    assert.equal((await api("/auth/me", "GET", guest.token)).status, 200);
    assert.equal(
      (await api(`/meals/${mealId}`, "GET", guest.token)).data.meal.status,
      "matched",
    );
    assert.equal(
      (await api(`/meals/${mealId}/messages`, "GET", guest.token)).data.items[0]
        .content,
      "HTTP测试留言",
    );
    assert.equal(
      (await api("/profile/wishlist", "GET", guest.token)).data.items[0]
        .restaurantId,
      restaurant.id,
    );
    assert.equal((await api("/auth/me", "GET", "dev-token-1")).status, 401);
    assert.equal(
      (await api("/timetable/captcha", "GET", host.token)).status,
      503,
    );
  } finally {
    await stop();
  }
});
