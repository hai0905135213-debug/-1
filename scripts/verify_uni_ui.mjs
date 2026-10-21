// 验证的是正式uni-app源码的H5渲染与真实接口，不是preview-static，也不冒充微信真机。
import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import assert from "node:assert/strict";
const dataDir = mkdtempSync(join(tmpdir(), "fanfan-uni-db-")),
  screenshots = join(tmpdir(), "fanfan-uni-ui");
await mkdir(screenshots, { recursive: true });
const backend = spawn(process.execPath, ["平台代码/backend/src/server.js"], {
  env: {
    ...process.env,
    DATA_DIR: dataDir,
    PORT: "0",
    ENABLE_DEV_LOGIN: "true",
    ADMIN_USER_IDS: "1",
    SEED_DEMO: "false",
  },
});
let browser;
const checks = [];
const pass = (x) => {
  checks.push(x);
  console.log(x);
};
try {
  const base = await new Promise((resolve, reject) => {
    let output = "";
    const timer = setTimeout(
      () => reject(new Error(output || "后端未启动")),
      15000,
    );
    backend.stdout.on("data", (s) => {
      output += s;
      const m = output.match(/http:\/\/127\.0\.0\.1:\d+/);
      if (m) {
        clearTimeout(timer);
        resolve(m[0] + "/api");
      }
    });
    backend.stderr.on("data", (s) => (output += s));
    backend.once("error", reject);
  });
  const api = async (path, method = "GET", token, data) => {
    const r = await fetch(base + path, {
      method,
      headers: {
        "content-type": "application/json",
        ...(token ? { authorization: "Bearer " + token } : {}),
      },
      body: data === undefined ? undefined : JSON.stringify(data),
    });
    const result = await r.json();
    assert.ok(r.ok, JSON.stringify(result));
    return result;
  };
  const policy = await api("/policies");
  const login = async (name) => {
    const s = await api("/auth/login", "POST", null, { nickname: name });
    await api("/account/onboarding", "POST", s.token, {
      nickname: name,
      campus: "cufe_shahe",
      tasteTags: ["湘菜"],
      policyVersion: policy.version,
      accepted: true,
    });
    s.user = (await api("/auth/me", "GET", s.token)).user;
    return s;
  };
  const host = await login("移植验收发起人"),
    member = await login("移植验收申请者");
  await api("/admin/users/" + member.user.id + "/access", "POST", host.token, {
    status: "approved",
  });
  const restaurant = (await api("/restaurants?pageSize=1")).items[0];
  const meal = (
    await api("/meals", "POST", host.token, {
      title: "原版移植预约验收",
      restaurantId: restaurant.id,
      poiId: restaurant.selectedCandidate?.poiId,
      campus: "cufe_shahe",
      maxPeople: 2,
      budgetMin: 20,
      budgetMax: 40,
      mealTime: new Date(Date.now() + 86400000).toISOString(),
      meetingNote: "窗边集合",
    })
  ).meal;
  await api("/posts", "POST", host.token, {
    mealId: meal.id,
    category: "约饭",
    content: "原版设计移植后的真实找人帖子",
  });
  browser = await chromium.launch({
    headless: true,
    executablePath:
      process.env.CHROME_EXECUTABLE ||
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    timezoneId: "Asia/Shanghai",
  });
  const errors = [];
  await context.route("http://127.0.0.1:3001/api/**", async (route) => {
    const req = route.request();
    const response = await context.request.fetch(
      req.url().replace("http://127.0.0.1:3001/api", base),
      {
        method: req.method(),
        headers: req.headers(),
        data: req.postData() || undefined,
      },
    );
    await route.fulfill({ response });
  });
  const page = await context.newPage();
  // H5开发服务按需编译页面；首次编译不能按生产版的加载时间判断。
  page.setDefaultTimeout(45000);
  page.on("pageerror", (e) => errors.push(e.message));
  const web = process.env.UNI_H5_URL || "http://127.0.0.1:5180/";
  await page.goto(web, { waitUntil: "domcontentloaded" });
  await page.locator(".restaurant").first().waitFor();
  assert.equal(await page.locator(".album").count(), 3);
  assert.equal(await page.locator(".app-tabbar .app-tab").count(), 5);
  assert.equal(await page.locator(".restaurant").count(), 6);
  await page.screenshot({ path: join(screenshots, "home.png") });
  pass("同一套小程序源码：首页专辑、六家餐厅、图标底栏");
  await page.locator(".home-search input").fill("不会存在的店名");
  await page.locator(".empty-title").filter({ hasText: "没找到" }).waitFor();
  await page.getByText("清空搜索与筛选", { exact: true }).click();
  await page.locator(".restaurant").first().waitFor();
  assert.equal(await page.locator(".home-search input").inputValue(), "");
  pass("首页搜索与无结果恢复");
  let failPage2 = true;
  const failedPage = async (route) => {
    if (
      failPage2 &&
      new URL(route.request().url()).searchParams.get("page") === "2"
    ) {
      failPage2 = false;
      return route.abort();
    }
    return route.fallback();
  };
  await context.route("**/api/restaurants?**", failedPage);
  // 模拟页面触底调用；直接点击会先滚动触底、再点到“重试”，造成连续两次请求。
  await page.evaluate(()=>getCurrentPages().at(-1).$vm.$refs.browser.loadMore());
  await page.locator(".footer").filter({ hasText: "加载失败" }).waitFor();
  assert.equal(await page.locator(".restaurant").count(), 6);
  await page.locator(".footer").click();
  await page.waitForFunction(
    () => document.querySelectorAll(".restaurant").length >= 12,
  );
  await context.unroute("**/api/restaurants?**", failedPage);
  pass("小程序源码分页失败保留列表，手动重试可恢复");
  await page.locator(".filters .chip").nth(1).click();
  await page.locator(".filter-panel").waitFor();
  await page.getByText("重置筛选", { exact: true }).click();
  await page.locator(".restaurant").first().click();
  await page.locator(".restaurant-panel .heading").first().waitFor();
  await page.screenshot({ path: join(screenshots, "restaurant.png") });
  pass("筛选、餐厅分店详情与双校区信息");
  await page.evaluate((s) => {
    uni.setStorageSync("authToken", s.token);
    uni.setStorageSync("currentUser", s.user);
    uni.setStorageSync("currentProfile", s.user.profile);
  }, host);
  await page.getByText("＋ 在此店发起饭局", { exact: true }).click();
  await page.locator(".publish-form").waitFor();
  assert.ok(
    (await page.locator(".publish-form input").first().inputValue()).includes(
      restaurant.name,
    ),
  );
  await page.screenshot({ path: join(screenshots, "publish.png") });
  pass("餐厅固定分店带入新版发布表单");
  await page.locator(".app-tabbar .app-tab").nth(1).click();
  await page.locator(".meal-card").first().waitFor();
  await page.screenshot({ path: join(screenshots, "find.png") });
  await page.getByText("找人帖子", { exact: true }).click();
  await page
    .getByText("原版设计移植后的真实找人帖子", { exact: true })
    .waitFor();
  pass("底栏切换、真实饭局和找人帖子");
  await page.locator(".app-tabbar .app-tab").nth(3).click();
  await page.locator(".post-card").first().waitFor();
  await page.screenshot({ path: join(screenshots, "feed.png") });
  pass("动态使用真实帖子，保留原版卡片层级");
  await page.locator(".app-tabbar .app-tab").nth(4).click();
  await page
    .locator(".profile-greeting")
    .filter({ hasText: host.user.nickname })
    .waitFor();
  await page.locator(".meal-preview").first().waitFor();
  await page.screenshot({ path: join(screenshots, "profile.png") });
  await page.locator(".record-tab").filter({ hasText: "动态" }).click();
  await page
    .getByText("原版设计移植后的真实找人帖子", { exact: true })
    .waitFor();
  pass("原版个人页头图、真实统计与本人动态");
  await page.evaluate((s) => {
    uni.setStorageSync("authToken", s.token);
    uni.setStorageSync("currentUser", s.user);
  }, member);
  await page.evaluate(
    (id) => uni.navigateTo({ url: "/pages/meal-detail/index?id=" + id }),
    meal.id,
  );
  await page.locator(".meal-body .heading").waitFor();
  await page.locator(".actions textarea").first().fill("清淡口味，想安静吃饭");
  await page.getByText("申请加入", { exact: true }).click();
  await page.getByText("撤回申请", { exact: true }).waitFor();
  const application = (
    await api("/meals/" + meal.id + "/applications", "GET", host.token)
  ).items.find((a) => a.user_id === member.user.id);
  assert.equal(application.note, "清淡口味，想安静吃饭");
  await page.screenshot({ path: join(screenshots, "meal.png") });
  pass("移植保留报名说明、审批语义和截止提示");
  await page.evaluate(
    (s) => {
      uni.setStorageSync("authToken", s.token);
      uni.setStorageSync("currentUser", s.user);
      uni.navigateTo({ url: "/pages/team-applications/index?id=" + s.mealId });
    },
    { ...host, mealId: meal.id },
  );
  await page.getByText("清淡口味，想安静吃饭", { exact: true }).waitFor();
  await page.getByText("通过", { exact: true }).click();
  await page.getByText("已经满员，暂不接收新申请", { exact: true }).waitFor();
  assert.equal(
    (await api("/meals/" + meal.id, "GET", host.token)).meal.status,
    "matched",
  );
  pass("真实申请审批与满员状态仍然可用");
  assert.deepEqual(errors, []);
  pass("页面无未捕获脚本异常");
  console.log(JSON.stringify({ ok: true, checks, screenshots }, null, 2));
} finally {
  if (browser) await browser.close();
  backend.kill("SIGTERM");
}
