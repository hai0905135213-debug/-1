import http from "node:http";
import { URL } from "node:url";
import {
  getUser,
  getUserByStudentNo,
  getUserByNickname,
  createUser,
  getProfile,
  upsertProfile,
  getMeal,
  createMeal,
  listMeals,
  listMealsByCreator,
  updateMeal,
  getParticipants,
  getParticipantCount,
  isUserJoined,
  addParticipant,
  markParticipantLeft,
  refreshMealStatus,
  getReviews,
  createReview,
  createReport,
  hasUserInMeal,
  getUserJoinedMealIds,
  getRestaurant,
  listRestaurants,
  listRestaurantCatalog,
  getRestaurantCatalogItem,
  createRestaurant,
  getPost,
  listPosts,
  createPost,
  getPostParticipantUserIds,
  getPostParticipantAvatars,
  isUserJoinedPost,
  addPostParticipant,
  removePostParticipant,
  listVisitedRestaurants,
  addVisitedRestaurant,
  listWishlistRestaurants,
  addWishlistRestaurant,
  toggleWishlistRestaurant,
  findRestaurantByName,
  listMoments,
  createMoment,
  listSavedMeals,
  toggleSaveMeal,
  saveUserTimetable,
  getUserTimetable,
  seedIfEmpty
} from "./db.js";

const PORT = Number(process.env.PORT || 3001);
const HOST = process.env.HOST || "127.0.0.1";

// 功能：首次启动写入种子数据，之后重启数据持久保留
seedIfEmpty();

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
        version: "0.2.0",
        storage: "sqlite",
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

    if (method === "POST" && path === "/api/timetable/import") {
      return handleImportTimetable(req, res);
    }

    if (method === "GET" && path === "/api/timetable/mine") {
      return handleGetMyTimetable(req, res);
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

    const cancelMatch = path.match(/^\/api\/meals\/([^/]+)\/cancel$/);
    if (method === "POST" && cancelMatch) {
      return handleCancelMeal(req, res, cancelMatch[1]);
    }

    const finishMatch = path.match(/^\/api\/meals\/([^/]+)\/finish$/);
    if (method === "POST" && finishMatch) {
      return handleFinishMeal(req, res, finishMatch[1]);
    }

    const reportMatch = path.match(/^\/api\/meals\/([^/]+)\/reports$/);
    if (method === "POST" && reportMatch) {
      return handleCreateReport(req, res, reportMatch[1]);
    }

    if (method === "GET" && path === "/api/restaurants") {
      return handleRestaurantList(requestUrl, res);
    }

    const restaurantMatch = path.match(/^\/api\/restaurants\/([^/]+)$/);
    if (method === "GET" && restaurantMatch) {
      return handleRestaurantDetail(restaurantMatch[1], requestUrl, res);
    }

    if (method === "POST" && path === "/api/restaurants") {
      return handleCreateRestaurant(req, res);
    }

    if (method === "GET" && path === "/api/posts") {
      return handlePostList(req, requestUrl, res);
    }

    if (method === "POST" && path === "/api/posts") {
      return handleCreatePost(req, res);
    }

    const postMatch = path.match(/^\/api\/posts\/([^/]+)$/);
    if (method === "GET" && postMatch) {
      return handlePostDetail(req, postMatch[1], res);
    }

    const postJoinMatch = path.match(/^\/api\/posts\/([^/]+)\/join$/);
    if (method === "POST" && postJoinMatch) {
      return handleJoinPost(req, res, postJoinMatch[1]);
    }
    const postLeaveMatch = path.match(/^\/api\/posts\/([^/]+)\/leave$/);
    if (method === "POST" && postLeaveMatch) {
      return handleLeavePost(req, res, postLeaveMatch[1]);
    }

    // --- 新增四个模块相关路由 ---
    if (method === "GET" && path === "/api/profile/visited") {
      return handleListVisited(req, res);
    }
    if (method === "POST" && path === "/api/profile/visited") {
      return handleAddVisited(req, res);
    }
    if (method === "GET" && path === "/api/profile/wishlist") {
      return handleListWishlist(req, res);
    }
    if (method === "POST" && path === "/api/profile/wishlist") {
      return handleAddWishlist(req, res);
    }
    if (method === "GET" && path === "/api/moments") {
      return handleListMoments(req, requestUrl, res);
    }
    if (method === "POST" && path === "/api/moments") {
      return handleCreateMoment(req, res);
    }
    if (method === "GET" && path === "/api/profile/saved") {
      return handleListSaved(req, res);
    }
    const saveMatch = path.match(/^\/api\/meals\/([^/]+)\/save$/);
    if (method === "POST" && saveMatch) {
      return handleToggleSaveMeal(req, res, saveMatch[1]);
    }

    return sendError(res, 404, "NOT_FOUND", "接口不存在");
  } catch (error) {
    console.error(error);
    return sendError(res, 500, "INTERNAL_ERROR", "服务器内部错误");
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Fanfan backend is running at http://${HOST}:${PORT}`);
  console.log(`Storage: SQLite (data/fanfan.db)`);
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

  const existing = studentNo
    ? getUserByStudentNo(studentNo)
    : getUserByNickname(nickname);

  const isNew = !existing;
  const user = existing || createUser({ nickname, studentNo, school });

  return sendJson(res, isNew ? 201 : 200, {
    token: `dev-token-${user.id}`,
    user,
    profile: getProfile(user.id)
  });
}

// 功能：读取当前用户资料，前端进入"我的资料页"时使用。
function handleGetProfile(req, res) {
  const user = requireUser(req, res);
  if (!user) return;

  return sendJson(res, 200, {
    user,
    profile: getProfile(user.id)
  });
}

// 功能：导入课表 JSON 并存储，自动返回分析结果。
async function handleImportTimetable(req, res) {
  const user = requireUser(req, res);
  if (!user) return;

  const body = await readBody(req);
  const courses = Array.isArray(body.courses) ? body.courses : [];

  const result = saveUserTimetable(user.id, courses);
  return sendJson(res, 200, result);
}

// 功能：读取当前用户的课表及无课时段分析。
function handleGetMyTimetable(req, res) {
  const user = requireUser(req, res);
  if (!user) return;

  const timetable = getUserTimetable(user.id);
  return sendJson(res, 200, timetable);
}

// 功能：更新资料。包含口味偏好、性格标签、信用展示等字段。
async function handleUpdateProfile(req, res) {
  const user = requireUser(req, res);
  if (!user) return;

  const body = await readBody(req);
  const profile = upsertProfile(user.id, body);

  return sendJson(res, 200, { user, profile });
}

// 功能：饭局列表。支持首页筛选、搜索，以及预算/人数/排序等高级筛选，只返回前端展示所需摘要。
function handleMealList(requestUrl, res) {
  const keyword = String(requestUrl.searchParams.get("keyword") || "").trim();
  const status = requestUrl.searchParams.get("status");
  const campus = requestUrl.searchParams.get("campus");
  const onlyAvailable = requestUrl.searchParams.get("onlyAvailable") === "true";

  const minBudget = requestUrl.searchParams.get("minBudget");
  const maxBudget = requestUrl.searchParams.get("maxBudget");
  const minPeople = requestUrl.searchParams.get("minPeople");
  const maxPeople = requestUrl.searchParams.get("maxPeople");
  const sortBy = requestUrl.searchParams.get("sortBy");
  const restaurantId = requestUrl.searchParams.get("restaurantId");

  let list = listMeals({
    status,
    campus,
    keyword: keyword || undefined,
    minBudget: minBudget ? Number(minBudget) : undefined,
    maxBudget: maxBudget ? Number(maxBudget) : undefined,
    minPeople: minPeople ? Number(minPeople) : undefined,
    maxPeople: maxPeople ? Number(maxPeople) : undefined,
    sortBy,
    restaurantId: restaurantId || undefined
  });

  if (onlyAvailable) {
    list = list.filter((meal) => {
      const count = getParticipantCount(meal.id);
      return meal.status === "open" && count < meal.maxPeople;
    });
  }

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

  const profile = getProfile(user.id);
  const meal = createMeal({
    title: String(body.title).trim(),
    foodType: String(body.foodType || "不限").trim(),
    mealTime: mealTime.toISOString(),
    place: String(body.place).trim(),
    campus: String(body.campus || profile?.campus || "主校区").trim(),
    maxPeople,
    budgetMin: Number(body.budgetMin || 0),
    budgetMax: Number(body.budgetMax || 0),
    chatMode: String(body.chatMode || "quiet").trim(),
    description: String(body.description || "").trim(),
    creatorId: user.id
  });

  return sendJson(res, 201, { meal: toMealDetail(meal) });
}

// 功能：饭局详情。前端详情页展示发起人、参与者、是否已满等信息。
function handleMealDetail(mealId, res) {
  const meal = getMeal(mealId);
  if (!meal) {
    return sendError(res, 404, "MEAL_NOT_FOUND", "饭局不存在");
  }

  return sendJson(res, 200, { meal: toMealDetail(meal) });
}

// 功能：加入饭局。会校验饭局状态、人数上限、重复加入。
function handleJoinMeal(req, res, mealId) {
  const user = requireUser(req, res);
  if (!user) return;

  const meal = getMeal(mealId);
  if (!meal) return sendError(res, 404, "MEAL_NOT_FOUND", "饭局不存在");
  if (meal.status !== "open") return sendError(res, 409, "MEAL_CLOSED", "饭局已不可加入");
  if (isUserJoined(mealId, user.id)) {
    return sendError(res, 409, "ALREADY_JOINED", "你已经加入该饭局");
  }
  if (getParticipantCount(mealId) >= meal.maxPeople) {
    return sendError(res, 409, "MEAL_FULL", "饭局人数已满");
  }

  addParticipant(mealId, user.id, "member");
  refreshMealStatus(mealId);

  const updatedMeal = getMeal(mealId);
  return sendJson(res, 200, { meal: toMealDetail(updatedMeal) });
}

// 功能：退出饭局。发起人不能直接退出，普通成员可退出未完成饭局。
function handleLeaveMeal(req, res, mealId) {
  const user = requireUser(req, res);
  if (!user) return;

  const meal = getMeal(mealId);
  if (!meal) return sendError(res, 404, "MEAL_NOT_FOUND", "饭局不存在");
  if (meal.creatorId === user.id) {
    return sendError(res, 409, "CREATOR_CANNOT_LEAVE", "发起人暂不能退出自己创建的饭局");
  }
  if (!isUserJoined(mealId, user.id)) {
    return sendError(res, 404, "PARTICIPANT_NOT_FOUND", "你还没有加入该饭局");
  }

  markParticipantLeft(mealId, user.id);
  updateMeal(mealId, { status: "open", updated_at: new Date().toISOString() });

  const updatedMeal = getMeal(mealId);
  return sendJson(res, 200, { meal: toMealDetail(updatedMeal) });
}

// 功能：我的饭局。按"我发起的"和"我加入的"分组，方便前端我的饭局页直接渲染。
function handleMyMeals(req, res) {
  const user = requireUser(req, res);
  if (!user) return;

  const created = listMealsByCreator(user.id);
  const joinedMealIds = getUserJoinedMealIds(user.id);
  const joined = joinedMealIds.map(getMeal).filter(Boolean);

  return sendJson(res, 200, {
    created: created.map(toMealSummary),
    joined: joined.map(toMealSummary)
  });
}

// 功能：饭后评价。MVP 阶段先记录评分和文字，后续可接入信用分算法。
async function handleCreateReview(req, res, mealId) {
  const user = requireUser(req, res);
  if (!user) return;

  const meal = getMeal(mealId);
  if (!meal) return sendError(res, 404, "MEAL_NOT_FOUND", "饭局不存在");
  if (!hasUserInMeal(mealId, user.id)) {
    return sendError(res, 403, "NOT_MEAL_MEMBER", "只有饭局参与者可以评价");
  }

  const body = await readBody(req);
  const targetUserId = Number(body.targetUserId);
  const rating = Number(body.rating);
  if (!getUser(targetUserId)) {
    return sendError(res, 404, "TARGET_USER_NOT_FOUND", "评价对象不存在");
  }
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return sendError(res, 400, "INVALID_RATING", "评分必须是 1 到 5 的整数");
  }

  const review = createReview({
    mealId: Number(mealId),
    reviewerId: user.id,
    targetUserId,
    rating,
    content: String(body.content || "").trim()
  });

  return sendJson(res, 201, { review });
}

// 功能：取消饭局。仅发起人可取消，必须处于 open 或 matched 状态。
function handleCancelMeal(req, res, mealId) {
  const user = requireUser(req, res);
  if (!user) return;

  const meal = getMeal(mealId);
  if (!meal) return sendError(res, 404, "MEAL_NOT_FOUND", "饭局不存在");
  if (meal.creatorId !== user.id) {
    return sendError(res, 403, "NOT_CREATOR", "只有发起人可以取消该饭局");
  }
  if (meal.status !== "open" && meal.status !== "matched") {
    return sendError(res, 409, "INVALID_STATUS", "当前状态的饭局无法取消");
  }

  const updatedMeal = updateMeal(mealId, {
    status: "cancelled",
    updated_at: new Date().toISOString()
  });

  return sendJson(res, 200, { meal: toMealDetail(updatedMeal) });
}

// 功能：完成饭局。仅发起人可将饭局标为完成，必须处于 matched 状态。
function handleFinishMeal(req, res, mealId) {
  const user = requireUser(req, res);
  if (!user) return;

  const meal = getMeal(mealId);
  if (!meal) return sendError(res, 404, "MEAL_NOT_FOUND", "饭局不存在");
  if (meal.creatorId !== user.id) {
    return sendError(res, 403, "NOT_CREATOR", "只有发起人可以标记该饭局为完成");
  }
  if (meal.status !== "matched") {
    return sendError(res, 409, "INVALID_STATUS", "只有已匹配的饭局才可以标记完成");
  }

  const updatedMeal = updateMeal(mealId, {
    status: "finished",
    updated_at: new Date().toISOString()
  });

  return sendJson(res, 200, { meal: toMealDetail(updatedMeal) });
}

// 功能：举报或爽约记录。只有同局参与者可以举报他人，且不能举报自己。
async function handleCreateReport(req, res, mealId) {
  const user = requireUser(req, res);
  if (!user) return;

  const meal = getMeal(mealId);
  if (!meal) return sendError(res, 404, "MEAL_NOT_FOUND", "饭局不存在");
  if (!hasUserInMeal(mealId, user.id)) {
    return sendError(res, 403, "NOT_MEAL_MEMBER", "只有饭局参与者可以发起举报");
  }

  const body = await readBody(req);
  const targetUserId = Number(body.targetUserId);
  const reason = String(body.reason || "").trim();
  const detail = String(body.detail || "").trim();

  if (targetUserId === user.id) {
    return sendError(res, 400, "CANNOT_REPORT_SELF", "不能举报自己");
  }
  if (!getUser(targetUserId)) {
    return sendError(res, 404, "TARGET_USER_NOT_FOUND", "被举报人不存在");
  }
  if (!hasUserInMeal(mealId, targetUserId)) {
    return sendError(res, 400, "TARGET_NOT_MEAL_MEMBER", "被举报人不是该饭局的参与者");
  }
  if (!reason) {
    return sendError(res, 400, "REASON_REQUIRED", "举报原因不能为空");
  }

  const report = createReport({
    mealId: Number(mealId),
    reporterUserId: user.id,
    targetUserId,
    reason,
    detail
  });

  return sendJson(res, 201, { report });
}

// 功能：餐厅列表。支持 campus / foodType / keyword 筛选以及价格筛选和排序。
function handleRestaurantList(requestUrl, res) {
  const campus = requestUrl.searchParams.get("campus") || undefined;
  const foodType = requestUrl.searchParams.get("foodType") || undefined;
  const keyword = String(requestUrl.searchParams.get("keyword") || "").trim() || undefined;
  const minPrice = requestUrl.searchParams.get("minPrice") ? Number(requestUrl.searchParams.get("minPrice")) : undefined;
  const maxPrice = requestUrl.searchParams.get("maxPrice") ? Number(requestUrl.searchParams.get("maxPrice")) : undefined;
  const sortBy = requestUrl.searchParams.get("sortBy") || undefined;
  const page = requestUrl.searchParams.get("page") || 1;
  const pageSize = requestUrl.searchParams.get("pageSize") || 12;

  // 有独立餐厅仓时会返回真实清洗数据以及两个校区距离；否则保留旧演示数据的兼容逻辑。
  const result = listRestaurantCatalog({ campus, foodType, keyword, page, pageSize, minPrice, maxPrice, sortBy });
  return sendJson(res, 200, result);
}

// 功能：餐厅详情。前端查看某个餐厅的介绍、评分、标签。
function handleRestaurantDetail(id, requestUrl, res) {
  const campus = requestUrl.searchParams.get("campus") || "cufe_shahe";
  // 优先读清洗后的餐厅仓；找不到时才兼容旧演示餐厅。
  const restaurant = getRestaurantCatalogItem(id, campus) || getRestaurant(id);
  if (!restaurant) {
    return sendError(res, 404, "RESTAURANT_NOT_FOUND", "餐厅不存在");
  }
  return sendJson(res, 200, { restaurant });
}

// 功能：新增餐厅。需登录，后续可加管理权限校验。
async function handleCreateRestaurant(req, res) {
  const user = requireUser(req, res);
  if (!user) return;

  const body = await readBody(req);
  if (!body.name || !String(body.name).trim()) {
    return sendError(res, 400, "NAME_REQUIRED", "餐厅名称不能为空");
  }

  const restaurant = createRestaurant({
    name: String(body.name).trim(),
    foodType: String(body.foodType || "").trim(),
    campus: String(body.campus || "主校区").trim(),
    location: String(body.location || "").trim(),
    avgPrice: Number(body.avgPrice || 0),
    rating: Number(body.rating || 0),
    tags: Array.isArray(body.tags) ? body.tags : [],
    description: String(body.description || "").trim()
  });

  return sendJson(res, 201, { restaurant });
}

// ========== 找人帖 ==========

// 功能：找人帖列表。支持按 category 筛选，未登录用户可读。
function handlePostList(req, requestUrl, res) {
  const category = requestUrl.searchParams.get("category") || undefined;
  const posts = listPosts({ category });

  // 尝试读取当前用户 ID（若有携带 Token），但不强求 401 拦截，方便展示
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  const tokenUserId = token?.replace(/^dev-token-/, "");
  const userId = req.headers["x-user-id"] || tokenUserId;
  const currentUser = userId ? getUser(userId) : null;

  const items = posts.map((post) => {
    const joinedAvatars = getPostParticipantAvatars(post.id);
    const joined = currentUser ? isUserJoinedPost(post.id, currentUser.id) : false;
    return {
      ...post,
      author: toPublicUser(getUser(post.authorId)),
      restaurant: post.restaurantId ? getRestaurant(post.restaurantId) : null,
      waitingCount: joinedAvatars.length,
      joinedAvatars,
      joined
    };
  });

  return sendJson(res, 200, { items });
}

// 功能：找人帖详情。返回帖子内容、发起人公开信息与推荐餐厅。
function handlePostDetail(req, postId, res) {
  const post = getPost(postId);
  if (!post) {
    return sendError(res, 404, "POST_NOT_FOUND", "找人帖不存在");
  }

  const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  const tokenUserId = token?.replace(/^dev-token-/, "");
  const userId = req.headers["x-user-id"] || tokenUserId;
  const currentUser = userId ? getUser(userId) : null;

  const joinedAvatars = getPostParticipantAvatars(post.id);
  const joined = currentUser ? isUserJoinedPost(post.id, currentUser.id) : false;

  return sendJson(res, 200, {
    post: {
      ...post,
      author: toPublicUser(getUser(post.authorId)),
      restaurant: post.restaurantId ? getRestaurant(post.restaurantId) : null,
      waitingCount: joinedAvatars.length,
      joinedAvatars,
      joined
    }
  });
}

// 功能：发布找人帖。需登录。
async function handleCreatePost(req, res) {
  const user = requireUser(req, res);
  if (!user) return;

  const body = await readBody(req);
  if (!body.category || !body.content) {
    return sendError(res, 400, "FIELD_REQUIRED", "分类和正文不能为空");
  }

  const post = createPost({
    authorId: user.id,
    category: String(body.category).trim(),
    content: String(body.content).trim(),
    restaurantId: body.restaurantId || null
  });

  return sendJson(res, 201, {
    post: {
      ...post,
      author: toPublicUser(user),
      restaurant: post.restaurantId ? getRestaurant(post.restaurantId) : null,
      waitingCount: 0,
      joinedAvatars: [],
      joined: false
    }
  });
}

// 功能：响应（加入）找人帖。
function handleJoinPost(req, res, postId) {
  const user = requireUser(req, res);
  if (!user) return;

  const post = getPost(postId);
  if (!post) {
    return sendError(res, 404, "POST_NOT_FOUND", "找人帖不存在");
  }

  if (isUserJoinedPost(postId, user.id)) {
    return sendError(res, 409, "ALREADY_JOINED", "你已经响应过该贴");
  }

  addPostParticipant(postId, user.id);
  const joinedAvatars = getPostParticipantAvatars(postId);

  return sendJson(res, 200, {
    post: {
      ...post,
      author: toPublicUser(getUser(post.authorId)),
      restaurant: post.restaurantId ? getRestaurant(post.restaurantId) : null,
      waitingCount: joinedAvatars.length,
      joinedAvatars,
      joined: true
    }
  });
}

// 功能：取消响应（退出）找人帖。
function handleLeavePost(req, res, postId) {
  const user = requireUser(req, res);
  if (!user) return;

  const post = getPost(postId);
  if (!post) {
    return sendError(res, 404, "POST_NOT_FOUND", "找人帖不存在");
  }

  if (!isUserJoinedPost(postId, user.id)) {
    return sendError(res, 409, "NOT_JOINED", "你还没有加入该贴");
  }

  removePostParticipant(postId, user.id);
  const joinedAvatars = getPostParticipantAvatars(postId);

  return sendJson(res, 200, {
    post: {
      ...post,
      author: toPublicUser(getUser(post.authorId)),
      restaurant: post.restaurantId ? getRestaurant(post.restaurantId) : null,
      waitingCount: joinedAvatars.length,
      joinedAvatars,
      joined: false
    }
  });
}

// ========== 辅助函数 ==========

function requireUser(req, res) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  const tokenUserId = token?.replace(/^dev-token-/, "");
  const userId = req.headers["x-user-id"] || tokenUserId;
  const user = getUser(userId);

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

// 功能：构建饭局摘要（供列表接口使用），含创建者公开信息、人数、剩余名额
function toMealSummary(meal) {
  const joinedCount = getParticipantCount(meal.id);
  return {
    ...meal,
    joinedCount,
    availableSeats: Math.max(meal.maxPeople - joinedCount, 0),
    creator: toPublicUser(getUser(meal.creatorId))
  };
}

// 功能：构建饭局详情（供详情接口使用），在摘要基础上附加参与者列表和评价
function toMealDetail(meal) {
  return {
    ...toMealSummary(meal),
    participants: getParticipants(meal.id),
    reviews: getReviews(meal.id)
  };
}

// 功能：构建用户公开信息（脱敏展示），附加完整 profile
function toPublicUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    nickname: user.nickname,
    school: user.school,
    creditScore: user.creditScore,
    profile: getProfile(user.id)
  };
}

// 功能：去过模块列表
async function handleListVisited(req, res) {
  const user = requireUser(req, res);
  if (!user) return;
  const list = listVisitedRestaurants(user.id);
  return sendJson(res, 200, { items: list });
}

// 功能：添加去过餐厅
async function handleAddVisited(req, res) {
  const user = requireUser(req, res);
  if (!user) return;
  const body = await readBody(req);
  const { restaurantId, restaurantName } = body;
  if (!restaurantId && !restaurantName) {
    return sendError(res, 400, "BAD_REQUEST", "参数不完整");
  }
  addVisitedRestaurant(user.id, restaurantId, restaurantName);
  return sendJson(res, 200, { ok: true });
}

// 功能：想去模块列表
async function handleListWishlist(req, res) {
  const user = requireUser(req, res);
  if (!user) return;
  const list = listWishlistRestaurants(user.id);
  return sendJson(res, 200, { items: list });
}

// 功能：添加/移除想去餐厅（切换状态）
async function handleAddWishlist(req, res) {
  const user = requireUser(req, res);
  if (!user) return;
  const body = await readBody(req);
  let { restaurantId, restaurantName } = body;
  
  if (!restaurantId && restaurantName) {
    const match = findRestaurantByName(restaurantName);
    if (match) restaurantId = match.id;
  }

  if (!restaurantId && !restaurantName) {
    return sendError(res, 400, "BAD_REQUEST", "参数不完整");
  }
  const active = toggleWishlistRestaurant(user.id, restaurantId, restaurantName);
  return sendJson(res, 200, { ok: true, active });
}

// 功能：获取动态流
async function handleListMoments(req, requestUrl, res) {
  const userId = requestUrl.searchParams.get("userId") ? Number(requestUrl.searchParams.get("userId")) : null;
  const list = listMoments(userId);
  return sendJson(res, 200, { items: list });
}

// 功能：发布动态
async function handleCreateMoment(req, res) {
  const user = requireUser(req, res);
  if (!user) return;
  const body = await readBody(req);
  const { content, imageUrl } = body;
  if (!content) {
    return sendError(res, 400, "BAD_REQUEST", "动态内容不能为空");
  }
  createMoment(user.id, content, imageUrl);
  return sendJson(res, 200, { ok: true });
}

// 功能：获取收藏列表
async function handleListSaved(req, res) {
  const user = requireUser(req, res);
  if (!user) return;
  const list = listSavedMeals(user.id);
  return sendJson(res, 200, { items: list });
}

// 功能：收藏/取消收藏饭局
async function handleToggleSaveMeal(req, res, mealId) {
  const user = requireUser(req, res);
  if (!user) return;
  const saved = toggleSaveMeal(user.id, mealId);
  return sendJson(res, 200, { saved });
}
