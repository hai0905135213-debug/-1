import http from "node:http";
import { URL } from "node:url";

const PORT = Number(process.env.PORT || 3001);
const HOST = process.env.HOST || "127.0.0.1";

const users = new Map();
const profiles = new Map();
const meals = new Map();
const participants = new Map();
const reviews = new Map();

let nextUserId = 3;
let nextMealId = 4;
let nextReviewId = 1;

seedData();

const server = http.createServer(async (req, res) => {
  const requestUrl = new URL(req.url, `http://${req.headers.host}`);
  const path = requestUrl.pathname;
  const method = req.method || "GET";

  if (method === "OPTIONS") {
    return sendNoContent(res);
  }

  try {
    if (method === "GET" && path === "/api/health") {
      return sendJson(res, 200, {
        ok: true,
        service: "fanfan-backend",
        version: "0.1.0",
        timestamp: new Date().toISOString()
      });
    }

    if (method === "POST" && path === "/api/auth/login") {
      return handleLogin(req, res);
    }

    if (method === "GET" && path === "/api/profile") {
      return handleGetProfile(req, res);
    }

    if (method === "PUT" && path === "/api/profile") {
      return handleUpdateProfile(req, res);
    }

    if (method === "GET" && path === "/api/meals/mine") {
      return handleMyMeals(req, res);
    }

    if (method === "GET" && path === "/api/meals") {
      return handleMealList(requestUrl, res);
    }

    if (method === "POST" && path === "/api/meals") {
      return handleCreateMeal(req, res);
    }

    const mealMatch = path.match(/^\/api\/meals\/([^/]+)$/);
    if (method === "GET" && mealMatch) {
      return handleMealDetail(mealMatch[1], res);
    }

    const joinMatch = path.match(/^\/api\/meals\/([^/]+)\/join$/);
    if (method === "POST" && joinMatch) {
      return handleJoinMeal(req, res, joinMatch[1]);
    }

    const leaveMatch = path.match(/^\/api\/meals\/([^/]+)\/leave$/);
    if (method === "POST" && leaveMatch) {
      return handleLeaveMeal(req, res, leaveMatch[1]);
    }

    const reviewMatch = path.match(/^\/api\/meals\/([^/]+)\/reviews$/);
    if (method === "POST" && reviewMatch) {
      return handleCreateReview(req, res, reviewMatch[1]);
    }

    return sendError(res, 404, "NOT_FOUND", "接口不存在");
  } catch (error) {
    console.error(error);
    return sendError(res, 500, "INTERNAL_ERROR", "服务器内部错误");
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Fanfan backend is running at http://${HOST}:${PORT}`);
});

// 功能：用户登录。MVP 阶段用昵称/学号创建或复用用户，返回前端调接口所需 token。
async function handleLogin(req, res) {
  const body = await readBody(req);
  const nickname = String(body.nickname || "").trim();
  const studentNo = String(body.studentNo || "").trim();
  const school = String(body.school || "示例大学").trim();

  if (!nickname) {
    return sendError(res, 400, "NICKNAME_REQUIRED", "昵称不能为空");
  }

  const existing = [...users.values()].find((user) => {
    return studentNo ? user.studentNo === studentNo : user.nickname === nickname;
  });

  const user = existing || createUser({ nickname, studentNo, school });
  return sendJson(res, existing ? 200 : 201, {
    token: `dev-token-${user.id}`,
    user,
    profile: profiles.get(user.id)
  });
}

// 功能：读取当前用户资料，前端进入“我的资料页”时使用。
function handleGetProfile(req, res) {
  const user = requireUser(req, res);
  if (!user) return;

  return sendJson(res, 200, {
    user,
    profile: profiles.get(user.id)
  });
}

// 功能：更新资料。包含口味偏好、性格标签、信用展示等字段。
async function handleUpdateProfile(req, res) {
  const user = requireUser(req, res);
  if (!user) return;

  const body = await readBody(req);
  const current = profiles.get(user.id);
  const nextProfile = {
    ...current,
    avatarUrl: body.avatarUrl ?? current.avatarUrl,
    gender: body.gender ?? current.gender,
    campus: body.campus ?? current.campus,
    tasteTags: Array.isArray(body.tasteTags) ? body.tasteTags : current.tasteTags,
    personalityTags: Array.isArray(body.personalityTags)
      ? body.personalityTags
      : current.personalityTags,
    budgetPreference: body.budgetPreference ?? current.budgetPreference,
    updatedAt: new Date().toISOString()
  };

  profiles.set(user.id, nextProfile);
  return sendJson(res, 200, { user, profile: nextProfile });
}

// 功能：饭局列表。支持首页筛选、搜索，只返回前端展示所需摘要。
function handleMealList(requestUrl, res) {
  const keyword = String(requestUrl.searchParams.get("keyword") || "").trim();
  const status = requestUrl.searchParams.get("status");
  const campus = requestUrl.searchParams.get("campus");
  const onlyAvailable = requestUrl.searchParams.get("onlyAvailable") === "true";

  let list = [...meals.values()];
  if (status) list = list.filter((meal) => meal.status === status);
  if (campus) list = list.filter((meal) => meal.campus === campus);
  if (onlyAvailable) {
    list = list.filter((meal) => {
      const count = getMealParticipants(meal.id).length;
      return meal.status === "open" && count < meal.maxPeople;
    });
  }
  if (keyword) {
    list = list.filter((meal) => {
      return [meal.title, meal.foodType, meal.place, meal.description]
        .join(" ")
        .toLowerCase()
        .includes(keyword.toLowerCase());
    });
  }

  list.sort((a, b) => new Date(a.mealTime) - new Date(b.mealTime));
  return sendJson(res, 200, { items: list.map(toMealSummary) });
}

// 功能：发布饭局。前端发起饭局页提交后调用。
async function handleCreateMeal(req, res) {
  const user = requireUser(req, res);
  if (!user) return;

  const body = await readBody(req);
  const requiredFields = ["title", "mealTime", "place", "maxPeople"];
  const missingField = requiredFields.find((field) => body[field] === undefined || body[field] === "");
  if (missingField) {
    return sendError(res, 400, "FIELD_REQUIRED", `${missingField} 不能为空`);
  }

  const maxPeople = Number(body.maxPeople);
  if (!Number.isInteger(maxPeople) || maxPeople < 2 || maxPeople > 12) {
    return sendError(res, 400, "INVALID_MAX_PEOPLE", "饭局人数需在 2 到 12 人之间");
  }

  const mealTime = new Date(body.mealTime);
  if (Number.isNaN(mealTime.getTime())) {
    return sendError(res, 400, "INVALID_MEAL_TIME", "mealTime 必须是合法时间");
  }

  const now = new Date().toISOString();
  const meal = {
    id: String(nextMealId++),
    title: String(body.title).trim(),
    foodType: String(body.foodType || "不限").trim(),
    mealTime: mealTime.toISOString(),
    place: String(body.place).trim(),
    campus: String(body.campus || profiles.get(user.id).campus || "主校区").trim(),
    maxPeople,
    budgetMin: Number(body.budgetMin || 0),
    budgetMax: Number(body.budgetMax || 0),
    chatMode: String(body.chatMode || "quiet").trim(),
    description: String(body.description || "").trim(),
    status: "open",
    creatorId: user.id,
    createdAt: now,
    updatedAt: now
  };

  meals.set(meal.id, meal);
  participants.set(meal.id, [
    {
      userId: user.id,
      role: "creator",
      status: "joined",
      joinedAt: now
    }
  ]);

  return sendJson(res, 201, { meal: toMealDetail(meal) });
}

// 功能：饭局详情。前端详情页展示发起人、参与者、是否已满等信息。
function handleMealDetail(mealId, res) {
  const meal = meals.get(mealId);
  if (!meal) {
    return sendError(res, 404, "MEAL_NOT_FOUND", "饭局不存在");
  }

  return sendJson(res, 200, { meal: toMealDetail(meal) });
}

// 功能：加入饭局。会校验饭局状态、人数上限、重复加入。
async function handleJoinMeal(req, res, mealId) {
  const user = requireUser(req, res);
  if (!user) return;

  const meal = meals.get(mealId);
  if (!meal) return sendError(res, 404, "MEAL_NOT_FOUND", "饭局不存在");
  if (meal.status !== "open") return sendError(res, 409, "MEAL_CLOSED", "饭局已不可加入");

  const currentParticipants = participants.get(mealId) || [];
  if (currentParticipants.some((item) => item.userId === user.id && item.status === "joined")) {
    return sendError(res, 409, "ALREADY_JOINED", "你已经加入该饭局");
  }
  if (currentParticipants.filter((item) => item.status === "joined").length >= meal.maxPeople) {
    return sendError(res, 409, "MEAL_FULL", "饭局人数已满");
  }

  currentParticipants.push({
    userId: user.id,
    role: "member",
    status: "joined",
    joinedAt: new Date().toISOString()
  });
  participants.set(mealId, currentParticipants);
  refreshMealStatus(meal);

  return sendJson(res, 200, { meal: toMealDetail(meal) });
}

// 功能：退出饭局。发起人不能直接退出，普通成员可退出未完成饭局。
function handleLeaveMeal(req, res, mealId) {
  const user = requireUser(req, res);
  if (!user) return;

  const meal = meals.get(mealId);
  if (!meal) return sendError(res, 404, "MEAL_NOT_FOUND", "饭局不存在");
  if (meal.creatorId === user.id) {
    return sendError(res, 409, "CREATOR_CANNOT_LEAVE", "发起人暂不能退出自己创建的饭局");
  }

  const currentParticipants = participants.get(mealId) || [];
  const target = currentParticipants.find((item) => item.userId === user.id && item.status === "joined");
  if (!target) return sendError(res, 404, "PARTICIPANT_NOT_FOUND", "你还没有加入该饭局");

  target.status = "left";
  target.leftAt = new Date().toISOString();
  meal.status = "open";
  meal.updatedAt = new Date().toISOString();

  return sendJson(res, 200, { meal: toMealDetail(meal) });
}

// 功能：我的饭局。按“我发起的”和“我加入的”分组，方便前端我的饭局页直接渲染。
function handleMyMeals(req, res) {
  const user = requireUser(req, res);
  if (!user) return;

  const created = [...meals.values()].filter((meal) => meal.creatorId === user.id);
  const joined = [...meals.values()].filter((meal) => {
    return getMealParticipants(meal.id).some((item) => item.user.id === user.id && item.role !== "creator");
  });

  return sendJson(res, 200, {
    created: created.map(toMealSummary),
    joined: joined.map(toMealSummary)
  });
}

// 功能：饭后评价。MVP 阶段先记录评分和文字，后续可接入信用分算法。
async function handleCreateReview(req, res, mealId) {
  const user = requireUser(req, res);
  if (!user) return;

  const meal = meals.get(mealId);
  if (!meal) return sendError(res, 404, "MEAL_NOT_FOUND", "饭局不存在");
  if (!getMealParticipants(mealId).some((item) => item.user.id === user.id)) {
    return sendError(res, 403, "NOT_MEAL_MEMBER", "只有饭局参与者可以评价");
  }

  const body = await readBody(req);
  const targetUserId = String(body.targetUserId || "").trim();
  const rating = Number(body.rating);
  if (!users.has(targetUserId)) return sendError(res, 404, "TARGET_USER_NOT_FOUND", "评价对象不存在");
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return sendError(res, 400, "INVALID_RATING", "评分必须是 1 到 5 的整数");
  }

  const review = {
    id: String(nextReviewId++),
    mealId,
    reviewerId: user.id,
    targetUserId,
    rating,
    content: String(body.content || "").trim(),
    createdAt: new Date().toISOString()
  };
  reviews.set(review.id, review);

  return sendJson(res, 201, { review });
}

function createUser({ nickname, studentNo, school }) {
  const now = new Date().toISOString();
  const user = {
    id: String(nextUserId++),
    nickname,
    studentNo,
    school,
    creditScore: 100,
    createdAt: now
  };
  users.set(user.id, user);
  profiles.set(user.id, {
    userId: user.id,
    avatarUrl: "",
    gender: "unknown",
    campus: "主校区",
    tasteTags: [],
    personalityTags: [],
    budgetPreference: "20-40",
    updatedAt: now
  });
  return user;
}

function requireUser(req, res) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  const tokenUserId = token?.replace(/^dev-token-/, "");
  const userId = req.headers["x-user-id"] || tokenUserId;
  const user = users.get(String(userId || ""));

  if (!user) {
    sendError(res, 401, "UNAUTHORIZED", "请先登录，并携带 Authorization: Bearer <token>");
    return null;
  }
  return user;
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return {};

  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function sendJson(res, statusCode, data) {
  const payload = JSON.stringify(data, null, 2);
  res.writeHead(statusCode, {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-User-Id",
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(payload)
  });
  res.end(payload);
}

function sendNoContent(res) {
  res.writeHead(204, {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-User-Id"
  });
  res.end();
}

function sendError(res, statusCode, code, message) {
  return sendJson(res, statusCode, { error: { code, message } });
}

function toMealSummary(meal) {
  const joinedCount = getMealParticipants(meal.id).filter((item) => item.status === "joined").length;
  return {
    ...meal,
    joinedCount,
    availableSeats: Math.max(meal.maxPeople - joinedCount, 0),
    creator: toPublicUser(users.get(meal.creatorId))
  };
}

function toMealDetail(meal) {
  return {
    ...toMealSummary(meal),
    participants: getMealParticipants(meal.id),
    reviews: [...reviews.values()].filter((review) => review.mealId === meal.id)
  };
}

function toPublicUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    nickname: user.nickname,
    school: user.school,
    creditScore: user.creditScore,
    profile: profiles.get(user.id)
  };
}

function getMealParticipants(mealId) {
  return (participants.get(mealId) || [])
    .filter((item) => item.status === "joined")
    .map((item) => ({
      ...item,
      user: toPublicUser(users.get(item.userId))
    }));
}

function refreshMealStatus(meal) {
  const joinedCount = getMealParticipants(meal.id).length;
  meal.status = joinedCount >= meal.maxPeople ? "matched" : "open";
  meal.updatedAt = new Date().toISOString();
}

function seedData() {
  users.set("1", {
    id: "1",
    nickname: "小林",
    studentNo: "2026001",
    school: "示例大学",
    creditScore: 98,
    createdAt: "2026-07-09T08:00:00.000Z"
  });
  users.set("2", {
    id: "2",
    nickname: "阿晴",
    studentNo: "2026002",
    school: "示例大学",
    creditScore: 96,
    createdAt: "2026-07-09T08:05:00.000Z"
  });

  profiles.set("1", {
    userId: "1",
    avatarUrl: "",
    gender: "unknown",
    campus: "主校区",
    tasteTags: ["川菜", "不吃香菜"],
    personalityTags: ["慢热", "安静吃饭"],
    budgetPreference: "20-40",
    updatedAt: "2026-07-09T08:00:00.000Z"
  });
  profiles.set("2", {
    userId: "2",
    avatarUrl: "",
    gender: "unknown",
    campus: "主校区",
    tasteTags: ["面食", "甜品"],
    personalityTags: ["外向", "可聊天"],
    budgetPreference: "15-30",
    updatedAt: "2026-07-09T08:05:00.000Z"
  });

  const seedMeals = [
    {
      id: "1",
      title: "二食堂麻辣香锅拼一桌",
      foodType: "麻辣香锅",
      mealTime: "2026-07-09T11:30:00.000Z",
      place: "二食堂一楼",
      campus: "主校区",
      maxPeople: 4,
      budgetMin: 20,
      budgetMax: 35,
      chatMode: "talkative",
      description: "想找两三个人一起点，口味中辣。",
      status: "open",
      creatorId: "1",
      createdAt: "2026-07-09T08:10:00.000Z",
      updatedAt: "2026-07-09T08:10:00.000Z"
    },
    {
      id: "2",
      title: "下课后去校门口吃米线",
      foodType: "米线",
      mealTime: "2026-07-09T10:45:00.000Z",
      place: "东门米线店",
      campus: "主校区",
      maxPeople: 2,
      budgetMin: 15,
      budgetMax: 25,
      chatMode: "quiet",
      description: "简单吃饭，不尬聊也可以。",
      status: "matched",
      creatorId: "2",
      createdAt: "2026-07-09T08:20:00.000Z",
      updatedAt: "2026-07-09T08:25:00.000Z"
    },
    {
      id: "3",
      title: "晚饭想吃轻食",
      foodType: "轻食",
      mealTime: "2026-07-09T17:30:00.000Z",
      place: "三食堂轻食窗口",
      campus: "主校区",
      maxPeople: 3,
      budgetMin: 18,
      budgetMax: 30,
      chatMode: "balanced",
      description: "希望找作息健康一点的同学一起吃。",
      status: "open",
      creatorId: "1",
      createdAt: "2026-07-09T08:30:00.000Z",
      updatedAt: "2026-07-09T08:30:00.000Z"
    }
  ];

  for (const meal of seedMeals) meals.set(meal.id, meal);
  participants.set("1", [{ userId: "1", role: "creator", status: "joined", joinedAt: "2026-07-09T08:10:00.000Z" }]);
  participants.set("2", [
    { userId: "2", role: "creator", status: "joined", joinedAt: "2026-07-09T08:20:00.000Z" },
    { userId: "1", role: "member", status: "joined", joinedAt: "2026-07-09T08:25:00.000Z" }
  ]);
  participants.set("3", [{ userId: "1", role: "creator", status: "joined", joinedAt: "2026-07-09T08:30:00.000Z" }]);
}
