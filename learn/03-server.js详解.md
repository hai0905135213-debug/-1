---
aliases: [server.js, 路由层, 业务逻辑]
tags: [server, routing, api]
created: 2026-07-09
---

# server.js 路由与业务逻辑详解

> 读完这篇你就能理解：每个接口的代码在哪个函数、请求怎么被校验、handler 函数的通用写法、如何新加一个接口。

## 1. 文件结构

[server.js](backend/src/server.js) 分三个区域：

```
1. 启动区      — import、配置、启动 HTTP 服务、路由分发
2. 业务处理区  — 14 个 handler 函数
3. 辅助函数区  — readBody / sendJson / sendError / requireUser / toMealSummary 等
```

## 2. 启动流程

```javascript
import { ... } from "./db.js";   // 引入所有数据库函数

seedIfEmpty();                    // 首次启动写入种子数据

const server = http.createServer(async (req, res) => {
  // 每个请求都进这个回调
  const requestUrl = new URL(req.url, `http://${req.headers.host}`);
  const path = requestUrl.pathname;
  const method = req.method || "GET";

  if (method === "OPTIONS") return sendNoContent(res);  // CORS 预检
  // ... 路由匹配 ...
});

server.listen(PORT, HOST, () => {
  console.log(`running at http://${HOST}:${PORT}`);
});
```

关键点：
- `async` 回调：因为 handler 里有 `await readBody(req)`，所以回调必须是 async
- `new URL(req.url, base)`：Node.js 原生 URL 解析，比手写正则更可靠
- OPTIONS 提前返回：浏览器在跨域 POST/PUT 请求前会先发 OPTIONS 预检，直接返回 204 + CORS 头即可

## 3. 路由分发规则（重要！）

```javascript
// ✅ 固定路径 → 用 ===
if (method === "GET" && path === "/api/meals") { ... }

// ✅ 带参数路径 → 用正则
const mealMatch = path.match(/^\/api\/meals\/([^/]+)$/);
if (method === "GET" && mealMatch) { ... }

// ✅ 更深的嵌套路径 → 正则加更多段
const reviewMatch = path.match(/^\/api\/meals\/([^/]+)\/reviews$/);
if (method === "POST" && reviewMatch) { ... }
```

> [!warning] 路由顺序陷阱
> `/api/meals/mine` 必须放在 `/api/meals` **之后**、带参数路由 **之前**。
> 如果放在带参数路由后面不碍事（因为 `mine` 不含数字特征），但放在 `/api/meals` 之前反而是错的——`/api/meals` 的精确匹配优先级高于正则。
>
> 当前实际顺序：
> ```
> /api/meals/mine  → handleMyMeals()
> /api/meals       → handleMealList()
> /api/meals/:id   → handleMealDetail()   正则匹配
> ```

## 4. 每个 Handler 的通用模板

几乎所有 handler 都遵循这个结构：

```javascript
async function handleXxx(req, res) {
  // 第1步：身份校验（需要登录的接口）
  const user = requireUser(req, res);
  if (!user) return;  // requireUser 内部已经 sendError，这里只 return

  // 第2步：读请求体（POST/PUT 接口）
  const body = await readBody(req);

  // 第3步：参数校验
  if (!body.title) {
    return sendError(res, 400, "FIELD_REQUIRED", "title 不能为空");
  }

  // 第4步：业务逻辑（调用 db.js）
  const result = createMeal({ ...body, creatorId: user.id });

  // 第5步：返回结果
  return sendJson(res, 201, { meal: toMealDetail(result) });
}
```

## 5. 核心函数逐个解读

### requireUser — 身份校验

```javascript
function requireUser(req, res) {
  // 方式1：从 Authorization header 取
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  const tokenUserId = token?.replace(/^dev-token-/, "");

  // 方式2：从 X-User-Id header 直接取（联调快捷方式）
  const userId = req.headers["x-user-id"] || tokenUserId;

  const user = getUser(userId);
  if (!user) {
    sendError(res, 401, "UNAUTHORIZED", "请先登录...");
    return null;
  }
  return user;
}
```

> [!tip] 两种认证方式
> 联调时可以直接用 `X-User-Id: 1` 跳过登录接口。正式上线后删掉这个 header 检查即可。

### readBody — 读 JSON 请求体

```javascript
async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  // ↑ Node.js HTTP 请求体是流式的，要用 for await 收集
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return {};
  try { return JSON.parse(raw); }
  catch { return {}; }  // 非 JSON 请求体返回空对象，不抛错
}
```

### sendJson — 统一 JSON 响应

```javascript
function sendJson(res, statusCode, data) {
  const payload = JSON.stringify(data, null, 2);  // 缩进2空格，方便调试
  res.writeHead(statusCode, {
    "Access-Control-Allow-Origin": "*",      // 允许任何前端域名
    "Access-Control-Allow-Methods": "...",
    "Access-Control-Allow-Headers": "...",
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(payload)  // 字节长度，不是字符数
  });
  res.end(payload);
}
```

> [!note] Content-Length 用 Buffer.byteLength
> `payload.length` 是字符数，中文 1 个字符 = 3 字节。`Buffer.byteLength` 才是正确的 HTTP Content-Length。

### sendError — 统一错误响应

```javascript
function sendError(res, statusCode, code, message) {
  return sendJson(res, statusCode, { error: { code, message } });
}
// 返回格式：{ "error": { "code": "MEAL_NOT_FOUND", "message": "饭局不存在" } }
```

所有错误用统一的 `{ error: { code, message } }` 格式，前端可以用 `code` 做 i18n 或特殊处理。

### toMealSummary / toMealDetail — 数据组装

```javascript
// 摘要版（列表用）：基础信息 + 人数 + 创建者名片
function toMealSummary(meal) {
  const joinedCount = getParticipantCount(meal.id);
  return {
    ...meal,                                    // 展开饭局所有字段
    joinedCount,                                // 覆盖为实时参与人数
    availableSeats: Math.max(meal.maxPeople - joinedCount, 0),
    creator: toPublicUser(getUser(meal.creatorId))  // 查创建者公开信息
  };
}

// 详情版（详情页用）：摘要 + 参与者列表 + 评价列表
function toMealDetail(meal) {
  return {
    ...toMealSummary(meal),
    participants: getParticipants(meal.id),  // 额外查参与者
    reviews: getReviews(meal.id)             // 额外查评价
  };
}
```

这两个函数的区别：列表不需要参与者详情和评价，只给摘要就行——减少不必要的数据库查询。

## 6. 各 Handler 业务逻辑速览

| Handler | 方法 | 核心逻辑 | 特殊校验 |
|---|---|---|---|
| `handleLogin` | POST | 查学号/昵称 → 找到返回，没找到创建 | nickname 必填 |
| `handleGetProfile` | GET | 直接返回 `getUser` + `getProfile` | — |
| `handleUpdateProfile` | PUT | `upsertProfile` 合并更新 | — |
| `handleMealList` | GET | 组装筛选条件 → `listMeals` | `onlyAvailable` 需额外过滤人数 |
| `handleCreateMeal` | POST | 校验时间/人数 → `createMeal` | maxPeople 2-12 |
| `handleMealDetail` | GET | `getMeal` → `toMealDetail` | — |
| `handleJoinMeal` | POST | 校验状态/重复/满员 → `addParticipant` | 多重 409 分支 |
| `handleLeaveMeal` | POST | 校验不能是发起人 → `markParticipantLeft` | creator 不能退 |
| `handleMyMeals` | GET | `listMealsByCreator` + 跨表查加入 | 分 created/joined 两组 |
| `handleCreateReview` | POST | 校验参与者身份 → `createReview` | rating 1-5 |
| `handleRestaurantList` | GET | 组装筛选 → `listRestaurants` | — |
| `handleRestaurantDetail` | GET | `getRestaurant` | — |
| `handleCreateRestaurant` | POST | 校验 name → `createRestaurant` | name 必填 |

## 7. 如何新增一个接口

假设要加 `POST /api/meals/:mealId/cancel`（取消饭局）：

**Step 1：路由注册**
```javascript
// 在 server.js 路由区加
const cancelMatch = path.match(/^\/api\/meals\/([^/]+)\/cancel$/);
if (method === "POST" && cancelMatch) {
  return handleCancelMeal(req, res, cancelMatch[1]);
}
```

**Step 2：Handler 函数**
```javascript
async function handleCancelMeal(req, res, mealId) {
  const user = requireUser(req, res);
  if (!user) return;

  const meal = getMeal(mealId);
  if (!meal) return sendError(res, 404, "MEAL_NOT_FOUND", "饭局不存在");
  if (meal.creatorId !== user.id) {
    return sendError(res, 403, "NOT_CREATOR", "只有发起人可以取消");
  }

  updateMeal(mealId, { status: "cancelled", updated_at: new Date().toISOString() });
  return sendJson(res, 200, { meal: toMealDetail(getMeal(mealId)) });
}
```

**Step 3：db.js 无需改动**（`updateMeal` 已是通用函数）

## 8. 错误码大全

| HTTP 状态码 | code | 使用场景 |
|---|---|---|
| 400 | `NICKNAME_REQUIRED` | 登录时昵称为空 |
| 400 | `FIELD_REQUIRED` | 必填字段缺失 |
| 400 | `INVALID_MAX_PEOPLE` | 人数不在 2-12 |
| 400 | `INVALID_MEAL_TIME` | 时间格式非法 |
| 400 | `INVALID_RATING` | 评分不在 1-5 |
| 400 | `NAME_REQUIRED` | 餐厅名称为空 |
| 401 | `UNAUTHORIZED` | 未登录 |
| 403 | `NOT_MEAL_MEMBER` | 不是参与者却想评价 |
| 404 | `NOT_FOUND` | 接口不存在 |
| 404 | `MEAL_NOT_FOUND` | 饭局不存在 |
| 404 | `PARTICIPANT_NOT_FOUND` | 没有加入该饭局 |
| 404 | `TARGET_USER_NOT_FOUND` | 评价对象不存在 |
| 404 | `RESTAURANT_NOT_FOUND` | 餐厅不存在 |
| 409 | `MEAL_CLOSED` | 饭局不再开放加入 |
| 409 | `MEAL_FULL` | 饭局已满 |
| 409 | `ALREADY_JOINED` | 重复加入 |
| 409 | `CREATOR_CANNOT_LEAVE` | 发起人不能退出 |
| 500 | `INTERNAL_ERROR` | 服务器异常 |

---

← 上一篇 [[02-数据库层详解]] | 下一篇 → [[04-项目约定与模式]]
