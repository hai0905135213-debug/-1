/* 不改原设计：沿用page/form/quote/primary，给新增业务提供独立入口。 */
(() => {
  const e = (x) =>
    String(x ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
  const empty = (x) => `<div class="empty"><p>${e(x)}</p></div>`;
  const heading = (title) =>
    `<div class="page form"><button class="back-link" data-discovery-back>‹ 返回</button><div class="title">${title}</div>`;
  const safe = (fn) => async () => {
    try {
      await fn();
    } catch (error) {
      toast(error.message);
      const target = screen.querySelector("#discovery-content");
      if (target && target.textContent === "加载中…") {
        target.innerHTML =
          empty(error.message) +
          '<button class="secondary" data-discovery-retry>重试</button>';
        click("[data-discovery-retry]", fn);
      }
    }
  };
  const click = (selector, fn) =>
    screen.querySelectorAll(selector).forEach((node) => {
      node.onclick = async () => {
        if (node.disabled) return;
        node.disabled = true;
        try {
          await fn(node);
        } catch (error) {
          toast(error.message);
        } finally {
          node.disabled = false;
        }
      };
    });
  const originalRender = render,
    originalProfile = loadProfilePage,
    originalDetail = loadPreviewMealDetail;
  const DEFAULT_PERIODS = [
    ["08:00", "08:45"],
    ["08:55", "09:40"],
    ["10:00", "10:45"],
    ["10:55", "11:40"],
    ["13:30", "14:15"],
    ["14:25", "15:10"],
    ["15:30", "16:15"],
    ["16:25", "17:10"],
    ["18:30", "19:15"],
    ["19:25", "20:10"],
    ["20:20", "21:05"],
    ["21:15", "22:00"],
  ];
  let lastMeal = 0,
    detailEpoch = 0,
    historyCursor = null,
    historyItems = [];
  function courseEditor(courses) {
    const list = screen.querySelector("#course-editor");
    list.innerHTML = courses
      .map(
        (c) =>
          `<div class="quote" data-course-row><label>课程名称</label><input data-course-name value="${e(c.courseName)}"><label>星期（1–7） / 起止节次</label><div style="display:flex;gap:6px"><input data-course-day type="number" min="1" max="7" value="${e(c.dayOfWeek)}"><input data-course-start type="number" min="1" max="16" value="${e(c.startPeriod)}"><input data-course-end type="number" min="1" max="16" value="${e(c.endPeriod)}"></div><label>上课周次（逗号分隔，如1,2,3；留空保守按每周）</label><input data-course-weeks value="${e((c.weeks || []).join(","))}"><label>单双周</label><select data-course-week-type><option value="all" ${!c.weekType || c.weekType === "all" ? "selected" : ""}>每周</option><option value="odd" ${c.weekType === "odd" ? "selected" : ""}>单周</option><option value="even" ${c.weekType === "even" ? "selected" : ""}>双周</option></select><button class="secondary" data-remove-course>删除此课程</button></div>`,
      )
      .join("");
    click("[data-remove-course]", (n) =>
      n.closest("[data-course-row]").remove(),
    );
  }
  function readCourses() {
    return [...screen.querySelectorAll("[data-course-row]")].map((row) => {
      const v = (key) => row.querySelector("[data-course-" + key + "]").value;
      return {
        courseName: v("name"),
        dayOfWeek: Number(v("day")),
        startPeriod: Number(v("start")),
        endPeriod: Number(v("end")),
        weeks: v("weeks")
          .split(/[,，、]/)
          .filter((x) => x.trim())
          .map(Number),
        weekType: v("week-type"),
      };
    });
  }
  const auth = () => {
    if (authSession?.token) return true;
    navigate("login");
    return false;
  };
  for (const [key, title] of [
    ["discovery", "为我推荐"],
    ["schedule", "课表与空闲时间"],
    ["fulfillment", "我的履约记录"],
    ["offers", "商家优惠"],
    ["offerAdmin", "优惠信息管理"],
  ])
    pages[key] =
      heading(title) + `<div id="discovery-content">加载中…</div></div>`;
  render = (page) => {
    originalRender(page);
    if (page === "home") {
      const target = screen.querySelector(".home-restaurant-heading");
      if (target)
        target.insertAdjacentHTML(
          "beforebegin",
          '<div class="pills"><button class="pill" data-discovery-go="discovery">为我推荐</button><button class="pill" data-discovery-go="offers">商家优惠</button></div>',
        );
      wire();
    }
    if (page === "discovery") safe(showRecommendations)();
    if (page === "schedule") safe(showSchedule)();
    if (page === "fulfillment") {
      historyCursor = null;
      historyItems = [];
      safe(loadFulfillment)();
    }
    if (page === "offers") safe(showOffers)();
    if (page === "offerAdmin") safe(showOfferAdmin)();
    click("[data-discovery-back]", () => navigate("profile"));
  };
  function wire() {
    click("[data-discovery-go]", (n) => {
      if (n.dataset.discoveryGo === "offers" || auth())
        navigate(n.dataset.discoveryGo);
    });
  }
  loadProfilePage = async () => {
    await originalProfile();
    if (currentPage !== "profile") return;
    const panel = screen.querySelector(".profile-panel");
    if (!panel) return;
    panel.insertAdjacentHTML(
      "afterbegin",
      `<div class="pills"><button class="pill" data-discovery-go="discovery">为我推荐</button><button class="pill" data-discovery-go="schedule">课表推荐</button><button class="pill" data-discovery-go="fulfillment">履约记录</button>${authSession?.user?.isAdmin ? '<button class="pill" data-discovery-go="offerAdmin">优惠管理</button>' : ""}</div>`,
    );
    wire();
  };
  loadPreviewMealDetail = async (id) => {
    const epoch = ++detailEpoch;
    lastMeal = Number(id);
    await originalDetail(id);
    if (
      currentPage !== "detail" ||
      lastMeal !== Number(id) ||
      epoch !== detailEpoch
    )
      return;
    try {
      const data = await apiRequest(`/meals/${id}`);
      if (
        currentPage !== "detail" ||
        lastMeal !== Number(id) ||
        epoch !== detailEpoch
      )
        return;
      if (data.meal.joined && data.meal.status !== "cancelled") {
        const panel = screen.querySelector(".detail-panel");
        if (!panel?.querySelector("[data-self-checkin]"))
          panel?.insertAdjacentHTML(
            "beforeend",
            '<button class="secondary" data-self-checkin>本人自报到场</button><p class="muted">可在就餐前30分钟至开始后4小时填写；不是GPS签到，不自动影响信用分。</p>',
          );
        click("[data-self-checkin]", async () => {
          const r = await apiRequest(`/meals/${id}/check-in`, {
            method: "POST",
          });
          toast(r.label);
        });
      }
    } catch (error) {
      if (epoch === detailEpoch && currentPage === "detail")
        toast(error.message);
    }
  };
  async function showRecommendations() {
    if (!auth()) return;
    const target = screen.querySelector("#discovery-content");
    if (!target) return;
    target.innerHTML = `<p class="muted">规则匹配，不是成功概率；没有自动派单，仍由发起人审批。</p><label>校区</label><select id="recommend-campus"><option value="">按资料 / 全校</option><option value="cufe_shahe">沙河校区</option><option value="cufe_nanlu">学院南路校区</option></select><label>手动空闲分钟（留空使用已确认课表）</label><input id="recommend-minutes" type="number" min="1" max="240"><label>饭局预计用餐时长（分钟）</label><input id="recommend-duration" type="number" min="20" max="180" value="60"><label>这次想聊的话题（逗号分隔）</label><input id="recommend-topics"><label>聊天偏好</label><select id="recommend-chat"><option value="">不限</option><option value="quiet">纯干饭少聊天</option><option value="balanced">自在吃饭</option><option value="chatty">想聊聊天</option></select><button class="primary" data-recommend-refresh>刷新推荐</button><button class="secondary" data-discovery-go="schedule">导入 / 核对课表</button><div id="recommend-results"></div>`;
    const run = async () => {
      const query = new URLSearchParams();
      for (const [id, key] of [
        ["campus", "campus"],
        ["minutes", "freeMinutes"],
        ["duration", "duration"],
        ["topics", "topics"],
        ["chat", "chatMode"],
      ]) {
        const value = screen.querySelector("#recommend-" + id)?.value;
        if (value) query.set(key, value);
      }
      const result = await apiRequest("/discovery/recommendations?" + query);
      const out = target.querySelector("#recommend-results");
      if (!out || !target.isConnected) return;
      out.innerHTML =
        `<p>${result.availability.source === "unknown" ? "尚不能确认空闲时间" : result.availability.inClass ? "课表显示当前正在上课" : `可用时间约 ${result.availability.minutes} 分钟（最多展示240分钟）`}</p><p class="muted">${result.availability.notes.map(e).join("；")}</p><div class="section-title">适合你的饭局</div>` +
        (result.meals
          .map(
            (m) =>
              `<div class="quote"><strong>${e(m.title)}</strong><p>规则匹配分 ${m.matchScore}/100</p><p>${m.reasons.map(e).join("；")}</p><p>${e(formatMealTime(m.mealTime))} · ${e(m.place)}</p><button class="secondary" data-match-meal="${m.id}">查看并申请</button></div>`,
          )
          .join("") || empty("暂无合适饭局，可以调整条件或自己发起")) +
        '<div class="section-title">吃什么推荐</div>' +
        (result.restaurants
          .map(
            (r) =>
              `<div class="quote"><strong>${e(r.name)}</strong><p>${r.reasons.map(e).join("；")}</p><p class="muted">${r.warnings.map(e).join("；")}</p><button class="secondary" data-match-restaurant="${e(r.id)}">查看餐厅</button></div>`,
          )
          .join("") ||
          empty("当前空闲时间内没有可判断适合的餐厅，不会伪造“来得及”的结果"));
      click("[data-match-meal]", (n) => {
        activeMealId = Number(n.dataset.matchMeal);
        navigate("detail");
      });
      click("[data-match-restaurant]", (n) => {
        activeRestaurantId = n.dataset.matchRestaurant;
        navigate("restaurant-detail");
      });
    };
    click("[data-recommend-refresh]", run);
    wire();
    await run();
  }
  async function showSchedule() {
    if (!auth()) return;
    const target = screen.querySelector("#discovery-content");
    const [timetable, config] = await Promise.all([
      apiRequest("/timetable/mine"),
      apiRequest("/schedule/settings"),
    ]);
    if (!target?.isConnected) return;
    target.innerHTML = `<p class="muted">仅支持文字版PDF。识别结果要逐条核对；不收集教务密码。示例节次不是学校官方时间，请按实际作息修改。</p><label>导入PDF</label><input id="schedule-pdf" type="file" accept="application/pdf,.pdf"><button class="primary" data-import-schedule>上传并识别</button><div id="course-editor"></div><button class="secondary" data-add-course>手动添加课程</button><button class="secondary" data-save-courses>保存核对后的课程</button><label>第一周周一日期</label><input id="schedule-term" type="date"><label>节次起止时间（每行 HH:MM-HH:MM，按第1节起依次填写）</label><textarea id="schedule-periods" rows="8"></textarea><label><input id="schedule-confirmed" type="checkbox">我已核对课程、周次与节次时间</label><button class="primary" data-save-schedule>确认并启用课表推荐</button><div id="schedule-feedback"></div>`;
    courseEditor(timetable.courses);
    screen.querySelector("#schedule-term").value =
      config.settings?.termStartDate || "";
    screen.querySelector("#schedule-periods").value = (
      config.settings?.periods || DEFAULT_PERIODS
    )
      .map((p) => p.join("-"))
      .join("\n");
    screen.querySelector("#schedule-confirmed").checked = Boolean(
      config.settings?.confirmed,
    );
    click("[data-add-course]", () =>
      courseEditor([
        ...readCourses(),
        { courseName: "", dayOfWeek: 1, startPeriod: 1, endPeriod: 2 },
      ]),
    );
    click("[data-import-schedule]", async () => {
      const file = screen.querySelector("#schedule-pdf").files[0];
      if (!file || file.size > 8 * 1024 * 1024)
        throw new Error("请选择8MB以内的文字版PDF");
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const data = await apiRequest("/timetable/pdf-import", {
        method: "POST",
        data: { fileName: file.name, pdfBase64: base64 },
      });
      courseEditor(data.courses);
      screen.querySelector("#schedule-confirmed").checked = false;
      screen.querySelector("#schedule-feedback").textContent =
        "已识别，请逐条检查并保存，然后重新确认时间设置。";
    });
    click("[data-save-courses]", async () => {
      await apiRequest("/timetable/import", {
        method: "POST",
        data: { courses: readCourses() },
      });
      screen.querySelector("#schedule-confirmed").checked = false;
      toast("课程已保存，请重新确认时间设置");
    });
    click("[data-save-schedule]", async () => {
      const periods = screen
        .querySelector("#schedule-periods")
        .value.split("\n")
        .filter((x) => x.trim())
        .map((x) => x.trim().split("-"));
      await apiRequest("/timetable/import", {
        method: "POST",
        data: { courses: readCourses() },
      });
      await apiRequest("/schedule/settings", {
        method: "PUT",
        data: {
          termStartDate: screen.querySelector("#schedule-term").value,
          periods,
          confirmed: screen.querySelector("#schedule-confirmed").checked,
        },
      });
      toast("课表推荐已启用");
    });
  }
  async function loadFulfillment() {
    if (!auth()) return;
    const target = screen.querySelector("#discovery-content"),
      data = await apiRequest(
        "/profile/fulfillment" +
          (historyCursor ? "?before=" + historyCursor : ""),
      );
    if (!target?.isConnected) return;
    historyItems.push(...data.items);
    historyCursor = data.nextCursor;
    target.innerHTML =
      `<p class="muted">${e(data.policy)}</p><div class="quote">完成组队 ${data.summary.completed} 场 · 本人退出 ${data.summary.left} 次 · 发起后取消 ${data.summary.hostCancelled} 次<p>收到评价 ${data.summary.receivedReviews} 条${data.summary.averageRating === null ? "" : ` · 平均 ${data.summary.averageRating.toFixed(1)} 星`}</p></div>` +
      (historyItems
        .map(
          (r) =>
            `<div class="quote"><strong>${e(r.title)}</strong><p>${e(r.recordLabel)}</p><p class="muted">${e(r.attendanceLabel)}</p></div>`,
        )
        .join("") || empty("还没有履约记录")) +
      (data.hasMore
        ? '<button class="secondary" data-more-fulfillment>加载更多</button>'
        : "");
    click("[data-more-fulfillment]", loadFulfillment);
  }
  async function showOffers() {
    const target = screen.querySelector("#discovery-content"),
      data = await apiRequest("/offers");
    if (!target?.isConnected) return;
    target.innerHTML =
      `<p class="muted">${e(data.disclaimer)}</p>` +
      (data.items
        .map(
          (o) =>
            `<div class="quote"><strong>${e(o.title)}</strong><p>${e(o.restaurantName)}</p><p>${e(o.description)}</p><p>有效至 ${e(formatMealTime(o.valid_until))}</p><a href="${e(o.source_url)}" target="_blank" rel="noopener noreferrer">核对信息来源</a></div>`,
        )
        .join("") || empty("暂无已核实且有效的商家优惠，不展示虚构折扣"));
  }
  async function showOfferAdmin() {
    if (!auth()) return;
    const target = screen.querySelector("#discovery-content"),
      { items } = await apiRequest("/admin/offers");
    if (!target?.isConnected) return;
    target.innerHTML =
      `<p class="muted">只展示真实核验的信息，不收款、不发券、不承诺补贴。发布后可下架；修改请下架后重建。</p><label>餐厅ID（从餐厅仓选择）</label><input id="offer-restaurant"><label>标题</label><input id="offer-title" maxlength="100"><label>说明</label><textarea id="offer-description" maxlength="1000"></textarea><label>来源HTTPS链接</label><input id="offer-source"><label>核验备注（联系渠道/核验时间，不填私人联系方式）</label><textarea id="offer-verification" maxlength="500"></textarea><label>生效时间</label><input id="offer-from" type="datetime-local"><label>到期时间</label><input id="offer-until" type="datetime-local"><label><input id="offer-confirmed" type="checkbox">已向商家或官方来源核验</label><button class="secondary" data-offer-create="draft">保存草稿</button><button class="primary" data-offer-create="published">确认发布</button>` +
      items
        .map(
          (o) =>
            `<div class="quote"><strong>${e(o.title)}</strong> · ${e(o.status)}${o.status !== "archived" ? `<button class="secondary" data-offer-archive="${o.id}">下架</button>` : ""}</div>`,
        )
        .join("");
    click("[data-offer-create]", async (n) => {
      const value = (id) => screen.querySelector("#offer-" + id).value.trim();
      await apiRequest("/admin/offers", {
        method: "POST",
        data: {
          restaurantId: value("restaurant"),
          title: value("title"),
          description: value("description"),
          sourceUrl: value("source"),
          verificationNote: value("verification"),
          validFrom: new Date(value("from")).toISOString(),
          validUntil: new Date(value("until")).toISOString(),
          status: n.dataset.offerCreate,
          confirmed: screen.querySelector("#offer-confirmed").checked,
        },
      });
      await showOfferAdmin();
    });
    click("[data-offer-archive]", async (n) => {
      await apiRequest(`/admin/offers/${n.dataset.offerArchive}/archive`, {
        method: "POST",
      });
      await showOfferAdmin();
    });
  }
  // 管理员按名称搜索并选择餐厅，不要求运营人员记数据库ID。
  const basicOfferAdmin = showOfferAdmin;
  showOfferAdmin = async () => {
    await basicOfferAdmin();
    const original = screen.querySelector("#offer-restaurant");
    if (!original) return;
    original.insertAdjacentHTML(
      "beforebegin",
      '<input id="offer-restaurant-keyword" placeholder="搜索餐厅名称"><button class="secondary" data-search-offer-restaurant>搜索餐厅</button>',
    );
    const picker = document.createElement("select");
    picker.id = "offer-restaurant";
    original.replaceWith(picker);
    const search = async () => {
      const keyword = screen.querySelector("#offer-restaurant-keyword").value;
      const { items } = await apiRequest(
        "/restaurants?pageSize=30&keyword=" + encodeURIComponent(keyword),
      );
      if (picker.isConnected)
        picker.innerHTML = items
          .map((r) => `<option value="${e(r.id)}">${e(r.name)}</option>`)
          .join("");
    };
    click("[data-search-offer-restaurant]", search);
    await search();
  };
  render(currentPage);
})();
