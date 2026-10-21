/* 原界面产品收尾。不替换布局；登录返回只接受本应用页面，不跳外部网址。 */
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
  const status = (s) =>
    ({
      pending: "待处理",
      processing: "处理中",
      resolved: "已处理",
      rejected: "未采纳",
      dismissed: "举报未成立",
    })[s] || s;
  const blank = (x) => `<div class="empty"><p>${e(x)}</p></div>`;
  const on = (selector, handler) =>
    screen.querySelectorAll(selector).forEach((node) => {
      node.onclick = async (event) => {
        event.stopPropagation();
        if (node.disabled) return;
        node.disabled = true;
        try {
          await handler(node);
        } catch (error) {
          toast(error.message);
        } finally {
          node.disabled = false;
        }
      };
    });
  const originalRender = render,
    originalAPI = apiRequest,
    originalProfile = loadProfilePage,
    originalMeal = loadPreviewMealDetail,
    originalRestaurant = loadPreviewRestaurantDetail;
  let unreadTimer = null,
    badgeDebounce = null,
    restaurantForFeedback = null,
    feedbackCursor = null,
    feedbackItems = [],
    feedbackMore = false;
  function remember() {
    if (
      !["login", "onboarding", "policy"].includes(currentPage) &&
      pages[currentPage]
    )
      localStorage.setItem(
        "fanfanReturn",
        JSON.stringify({
          page: currentPage,
          mealId: activeMealId,
          restaurantId: activeRestaurantId,
        }),
      );
  }
  function resume() {
    let target;
    try {
      target = JSON.parse(localStorage.getItem("fanfanReturn") || "null");
    } catch {}
    localStorage.removeItem("fanfanReturn");
    if (
      target &&
      pages[target.page] &&
      !["login", "onboarding", "policy"].includes(target.page)
    ) {
      if (target.mealId) activeMealId = Number(target.mealId);
      if (target.restaurantId) activeRestaurantId = String(target.restaurantId);
      render(target.page);
    } else render("profile");
  }
  function clearSession() {
    authSession = null;
    localStorage.removeItem("fanfanPreviewAuth");
    localStorage.removeItem("fanfanReturn");
    refreshUnread();
  }
  const auth = () => {
    if (authSession?.token) return true;
    remember();
    navigate("login");
    return false;
  };
  async function refreshUnread() {
    const token = authSession?.token;
    let count = 0;
    if (token)
      try {
        count = (await apiRequest("/notifications/unread")).unread;
      } catch {}
    if (authSession?.token !== token) return;
    const button = document.querySelector(".tabbar [data-page=profile]");
    button?.querySelector(".product-badge")?.remove();
    if (count)
      button?.insertAdjacentHTML(
        "beforeend",
        `<sup class="product-badge">${count > 99 ? "99+" : count}</sup>`,
      );
    screen
      .querySelectorAll("[data-unread-count]")
      .forEach((n) => (n.textContent = count ? `（${count}条未读）` : ""));
  }
  apiRequest = async (path, options = {}) => {
    if (
      /^\/admin\/reports\/\d+$/.test(path) &&
      options.method === "POST" &&
      !options.data?.reason
    ) {
      const reason = prompt("填写核验与处理说明（不要包含私人信息）");
      if (!reason) throw new Error("请填写处置说明");
      options = { ...options, data: { ...options.data, reason } };
    }
    try {
      const data = await originalAPI(path, options);
      if (
        options.method &&
        options.method !== "GET" &&
        !path.startsWith("/auth/")
      ) {
        clearTimeout(badgeDebounce);
        badgeDebounce = setTimeout(refreshUnread, 300);
      }
      return data;
    } catch (error) {
      if (
        error.code === "ONBOARDING_REQUIRED" &&
        !["onboarding", "login"].includes(currentPage)
      ) {
        remember();
        render("onboarding");
      }
      if (
        error.status === 401 &&
        !path.startsWith("/auth/") &&
        path !== "/notifications/unread" &&
        !["login", "onboarding"].includes(currentPage)
      ) {
        remember();
        render("login");
      }
      throw error;
    }
  };
  const heading = (title) =>
    `<div class="page form"><button class="back-link" data-product-back>‹ 我的</button><div class="title">${title}</div>`;
  for (const [key, title] of [
    ["onboarding", "完善资料与使用说明"],
    ["policy", "服务与隐私说明"],
    ["feedback", "反馈、纠错与申诉"],
    ["accountData", "我的数据与账号"],
    ["operations", "反馈与内容处置"],
    ["catalogCorrection", "核验餐厅地址"],
  ])
    pages[key] =
      heading(title) + '<div id="product-content">加载中…</div></div>';
  const run = (fn) =>
    Promise.resolve()
      .then(fn)
      .catch((error) => {
        const target = screen.querySelector("#product-content");
        if (target?.textContent === "加载中…") {
          target.innerHTML =
            blank(error.message) +
            '<button class="secondary" data-product-retry>重试</button>';
          on("[data-product-retry]", fn);
        }
        toast(error.message);
      });
  render = (page) => {
    if (page === "login") remember();
    if (page === "publish" && authSession?.user?.onboardingRequired) {
      remember();
      localStorage.setItem(
        "fanfanReturn",
        JSON.stringify({
          page: "publish",
          mealId: activeMealId,
          restaurantId: activeRestaurantId,
        }),
      );
      page = "onboarding";
    }
    originalRender(page);
    if (page === "onboarding") run(showOnboarding);
    if (page === "policy") run(showPolicy);
    if (page === "feedback") {
      feedbackItems = [];
      feedbackCursor = null;
      run(showFeedback);
    }
    if (page === "accountData") run(showData);
    if (page === "operations") run(showOperations);
    if (page === "catalogCorrection") run(showCorrection);
    if (page === "login") {
      screen
        .querySelector(".login-header")
        ?.insertAdjacentHTML(
          "afterend",
          '<button class="secondary" data-product-go="policy">先阅读服务与隐私说明</button>',
        );
      wire();
    }
    if (page === "home") {
      screen
        .querySelector(".home-restaurant-heading")
        ?.insertAdjacentHTML(
          "beforebegin",
          '<p class="muted"><button class="quiet" data-product-go="policy">服务说明</button> · <button class="quiet" data-product-go="feedback">问题反馈</button></p>',
        );
      wire();
    }
    on("[data-product-back]", () => navigate("profile"));
    refreshUnread();
  };
  function wire() {
    on("[data-product-go]", (n) => {
      if (n.dataset.productGo === "feedback") restaurantForFeedback = null;
      navigate(n.dataset.productGo);
    });
  }
  loginFromForm = async () => {
    const data = await apiRequest("/auth/login", {
      method: "POST",
      data: { nickname: screen.querySelector("#login-nickname").value.trim() },
    });
    authSession = data;
    localStorage.setItem("fanfanPreviewAuth", JSON.stringify(data));
    if (data.user.onboardingRequired) render("onboarding");
    else resume();
  };
  function paragraphs(p) {
    return `<p class="muted">版本${e(p.version)} · ${e(p.operator)} · ${e(p.support)}</p><details><summary>服务说明（点击阅读）</summary>${p.documents.terms.map((t) => `<p>${e(t)}</p>`).join("")}</details><details><summary>隐私与数据说明（点击阅读）</summary>${p.documents.privacy.map((t) => `<p>${e(t)}</p>`).join("")}</details>`;
  }
  async function showPolicy() {
    const target = screen.querySelector("#product-content"),
      p = await apiRequest("/policies");
    if (target?.isConnected) target.innerHTML = paragraphs(p);
  }
  async function showOnboarding() {
    if (!auth()) return;
    const target = screen.querySelector("#product-content");
    const [p, me] = await Promise.all([
      apiRequest("/policies"),
      apiRequest("/auth/me"),
    ]);
    if (!target?.isConnected) return;
    const user = me.user;
    target.innerHTML = `<p class="muted">不要求真实姓名、学号或教务密码。完成后仍需管理员批准体验资格，白名单不是学籍认证。</p><label>昵称</label><input id="onboard-name" maxlength="32"><label>校区</label><select id="onboard-campus"><option value="cufe_shahe">沙河校区</option><option value="cufe_nanlu">学院南路校区</option></select><label>口味偏好（可留空）</label><input id="onboard-tastes"><label>每人预算偏好（可留空）</label><input id="onboard-budget">${paragraphs(p)}<label><input type="checkbox" id="onboard-accepted">我已阅读并同意此版本服务与隐私说明</label><button class="primary" data-save-onboarding>保存并继续</button><button class="secondary" data-onboard-visitor>暂不确认，返回浏览餐厅</button>`;
    screen.querySelector("#onboard-name").value =
      user.nickname === "新同学" ? "" : user.nickname;
    screen.querySelector("#onboard-campus").value = [
      "cufe_nanlu",
      "学院南路校区",
    ].includes(user.profile?.campus)
      ? "cufe_nanlu"
      : "cufe_shahe";
    screen.querySelector("#onboard-tastes").value = (
      user.profile?.tasteTags || []
    ).join("、");
    screen.querySelector("#onboard-budget").value =
      user.profile?.budgetPreference || "";
    on("[data-save-onboarding]", async () => {
      await apiRequest("/account/onboarding", {
        method: "POST",
        data: {
          nickname: screen.querySelector("#onboard-name").value.trim(),
          campus: screen.querySelector("#onboard-campus").value,
          tasteTags: splitTags(screen.querySelector("#onboard-tastes").value),
          budgetPreference: screen.querySelector("#onboard-budget").value,
          policyVersion: p.version,
          accepted: screen.querySelector("#onboard-accepted").checked,
        },
      });
      const { user } = await apiRequest("/auth/me");
      authSession.user = user;
      authSession.profile = user.profile;
      localStorage.setItem("fanfanPreviewAuth", JSON.stringify(authSession));
      toast("资料已保存");
      resume();
    });
    on("[data-onboard-visitor]", () => render("home"));
  }
  loadProfilePage = async () => {
    await originalProfile();
    if (currentPage !== "profile") return;
    const panel = screen.querySelector(".profile-panel");
    if (!panel) return;
    panel.insertAdjacentHTML(
      "afterbegin",
      `<div class="pills">${authSession?.user?.onboardingRequired ? '<button class="pill" data-product-go="onboarding">核对资料与说明</button>' : ""}<button class="pill" data-product-go="feedback">反馈与申诉</button><button class="pill" data-product-go="accountData">我的数据 / 注销</button><button class="pill" data-product-go="policy">服务说明</button>${authSession?.user?.isAdmin ? '<button class="pill" data-product-go="operations">反馈与内容处置</button><button class="pill" data-product-go="catalogCorrection">餐厅纠错</button>' : ""}</div><p class="muted">消息<span data-unread-count></span> · 体验资格待审批时，请联系试运行管理员核验</p>`,
    );
    wire();
    refreshUnread();
  };
  loadPreviewMealDetail = async (id) => {
    await originalMeal(id);
    if (currentPage !== "detail" || Number(activeMealId) !== Number(id)) return;
    const panel = screen.querySelector(".detail-panel");
    if (!panel) return;
    panel.insertAdjacentHTML(
      "afterbegin",
      '<button class="secondary" data-copy-meal>复制本饭局邀请链接</button>',
    );
    on("[data-copy-meal]", async () => {
      const link = location.origin + "/?meal=" + encodeURIComponent(id);
      try {
        await navigator.clipboard.writeText(link);
        toast("邀请链接已复制");
      } catch {
        prompt("复制以下链接发给同学", link);
      }
    });
  };
  loadPreviewRestaurantDetail = async (id, poiId = "") => {
    await originalRestaurant(id, poiId);
    if (currentPage !== "restaurant-detail") return;
    const panel = screen.querySelector(".detail-info");
    if (!panel) return;
    panel.insertAdjacentHTML(
      "beforeend",
      '<button class="secondary" data-report-restaurant>信息有误？反馈纠错</button>',
    );
    on("[data-report-restaurant]", () => {
      restaurantForFeedback = String(id);
      navigate("feedback");
    });
  };
  async function showFeedback() {
    if (!auth()) return;
    const target = screen.querySelector("#product-content");
    target.innerHTML = `<p class="muted">问题、餐厅纠错、处理结果申诉均可在这里提交；不要填写密码、证件或不必要的联系方式。</p><select id="feedback-category"><option value="issue">功能问题</option><option value="restaurant">餐厅信息有误</option><option value="appeal">处理结果申诉</option></select>${restaurantForFeedback ? `<p>关联餐厅：${e(restaurantForFeedback)}</p>` : ""}<textarea id="feedback-content" maxlength="1000" rows="4" placeholder="描述问题或填写申诉的举报编号"></textarea><button class="primary" data-feedback-submit>提交反馈</button><div id="feedback-list"></div><div id="my-report-list"></div>`;
    if (restaurantForFeedback)
      screen.querySelector("#feedback-category").value = "restaurant";
    on("[data-feedback-submit]", async () => {
      const category = screen.querySelector("#feedback-category").value;
      await apiRequest("/feedback", {
        method: "POST",
        data: {
          category,
          restaurantId:
            category === "restaurant"
              ? restaurantForFeedback || undefined
              : undefined,
          content: screen.querySelector("#feedback-content").value.trim(),
        },
      });
      screen.querySelector("#feedback-content").value = "";
      feedbackItems = [];
      feedbackCursor = null;
      await loadFeedback();
      toast("反馈已提交");
    });
    await loadFeedback();
    const { items } = await apiRequest("/my-reports");
    const list = target.querySelector("#my-report-list");
    if (list) {
      list.innerHTML =
        '<div class="section-title">我的举报结果</div>' +
        items
          .map(
            (r) =>
              `<div class="quote">举报#${r.id} · ${e(status(r.status))}<p>${e(r.resolution_note || "等待核验")}</p><button class="secondary" data-appeal-report="${r.id}">对此结果申诉</button></div>`,
          )
          .join("");
      on("[data-appeal-report]", (n) => {
        screen.querySelector("#feedback-category").value = "appeal";
        screen.querySelector("#feedback-content").value =
          `对举报#${n.dataset.appealReport}的处理有异议：`;
        screen.scrollTop = 0;
      });
    }
  }
  async function loadFeedback() {
    const list = screen.querySelector("#feedback-list");
    const data = await apiRequest(
      "/feedback" + (feedbackCursor ? "?before=" + feedbackCursor : ""),
    );
    if (!list?.isConnected) return;
    feedbackItems.push(...data.items);
    feedbackCursor = data.nextCursor;
    feedbackMore = data.hasMore;
    list.innerHTML =
      '<div class="section-title">我的反馈进展</div>' +
      (feedbackItems
        .map(
          (f) =>
            `<div class="quote">#${f.id} · ${e(status(f.status))}<p>${e(f.content)}</p><p>管理员回复：${e(f.reply || "尚未回复")}</p></div>`,
        )
        .join("") || blank("暂无反馈")) +
      (feedbackMore
        ? '<button class="secondary" data-more-feedback>加载更多</button>'
        : "");
    on("[data-more-feedback]", loadFeedback);
  }
  async function showData() {
    if (!auth()) return;
    const target = screen.querySelector("#product-content"),
      data = await apiRequest("/account/data");
    if (!target?.isConnected) return;
    target.innerHTML = `<div class="quote">昵称：${e(data.user.nickname)}<p>已确认说明版本：${e(data.user.consentVersion || "尚未确认")}</p><p>关联饭局${data.counts.meals}场 · 当前留言${data.counts.messages}条</p></div><p class="muted">${e(data.note)}</p><button class="secondary" data-clear-timetable>清空当前课表和时间设置</button><button class="secondary" data-product-go="policy">查看隐私与注销说明</button><p class="muted">注销不可撤销。请先处理未结束饭局；当前个人数据被清理、所有会话被撤销，历史关联匿名保留。历史备份不承诺即时物理抹除。</p><input id="account-delete-confirmation" placeholder="确需注销请输入：注销账号"><button class="secondary" data-delete-account>注销我的账号</button>`;
    wire();
    on("[data-clear-timetable]", async () => {
      if (!confirm("确认删除当前课表及时间设置？之后不再按该课表推荐。"))
        return;
      await apiRequest("/account/timetable", { method: "DELETE" });
      toast("当前课表已清空");
    });
    on("[data-delete-account]", async () => {
      if (!confirm("确定注销？请先阅读隐私说明，操作不可撤销。")) return;
      await apiRequest("/account", {
        method: "DELETE",
        data: {
          confirmation: screen.querySelector("#account-delete-confirmation")
            .value,
        },
      });
      clearSession();
      render("home");
      toast("账号已注销，当前会话已撤销");
    });
  }
  async function showOperations() {
    if (!auth()) return;
    const target = screen.querySelector("#product-content");
    const [feedback, reports] = await Promise.all([
      apiRequest("/admin/feedback"),
      apiRequest("/admin/reports"),
    ]);
    if (!target?.isConnected) return;
    target.innerHTML =
      '<div class="section-title">反馈处理</div>' +
      feedback.items
        .map(
          (f) =>
            `<div class="quote">反馈#${f.id} · ${e(f.nickname)} · ${e(status(f.status))}<p>${e(f.content)}</p><textarea id="reply-feedback-${f.id}" maxlength="1000" placeholder="处理进展和结论，用户可见">${e(f.reply)}</textarea><button class="secondary" data-reply-feedback="${f.id}" data-status="processing">处理中</button><button class="primary" data-reply-feedback="${f.id}" data-status="resolved">回复并解决</button><button class="secondary" data-reply-feedback="${f.id}" data-status="rejected">不采纳并说明</button></div>`,
        )
        .join("") +
      '<div class="section-title">举报核验</div>' +
      reports.items
        .map(
          (r) =>
            `<div class="quote">举报#${r.id} · 饭局#${r.meal_id} · ${e(status(r.status))}<p>${e(r.reason)} ${e(r.detail)}</p><textarea id="report-reason-${r.id}" maxlength="500" placeholder="核验和处理说明，不含私人信息">${e(r.resolution_note)}</textarea><button class="primary" data-resolve-report="${r.id}" data-status="resolved">处理完成并通知</button><button class="secondary" data-resolve-report="${r.id}" data-status="dismissed">驳回并说明</button></div>`,
        )
        .join("") +
      '<div class="section-title">违规内容处置</div><p class="muted">按举报编号核验，隐藏饭局会取消未结束饭局并通知成员，不扣信用分。恢复展示不自动重开。</p><select id="moderation-type"><option value="meal">饭局</option><option value="post">找人帖子</option><option value="message">队内留言</option></select><input id="moderation-id" type="number" min="1" placeholder="内容编号"><button class="secondary" data-load-content>查询内容</button><div id="moderation-results"></div>';
    on("[data-reply-feedback]", async (n) => {
      await apiRequest("/admin/feedback/" + n.dataset.replyFeedback, {
        method: "POST",
        data: {
          status: n.dataset.status,
          reply: screen.querySelector(
            "#reply-feedback-" + n.dataset.replyFeedback,
          ).value,
        },
      });
      await showOperations();
    });
    on("[data-resolve-report]", async (n) => {
      await apiRequest("/admin/reports/" + n.dataset.resolveReport, {
        method: "POST",
        data: {
          status: n.dataset.status,
          reason: screen.querySelector(
            "#report-reason-" + n.dataset.resolveReport,
          ).value,
        },
      });
      await showOperations();
    });
    on("[data-load-content]", loadContent);
  }
  async function loadContent() {
    const type = screen.querySelector("#moderation-type").value,
      id = screen.querySelector("#moderation-id").value;
    if (!/^\d+$/.test(id)) throw new Error("请输入需要核验的内容编号");
    const { items } = await apiRequest(
      "/admin/content?type=" + type + "&id=" + id,
    );
    const list = screen.querySelector("#moderation-results");
    if (!list) return;
    list.innerHTML =
      items
        .map(
          (x) =>
            `<div class="quote">#${x.id} · ${x.hidden_at ? "已隐藏" : "展示中"}<p>${e(x.title || x.content)} ${e(x.description || "")}</p><textarea id="moderation-reason-${x.id}" maxlength="500" placeholder="公开处理原因，不含私人信息"></textarea><button class="secondary" data-moderate="${x.id}" data-hidden="${x.hidden_at ? "false" : "true"}">${x.hidden_at ? "恢复展示" : "隐藏并处置"}</button></div>`,
        )
        .join("") || blank("没有找到内容");
    on("[data-moderate]", async (n) => {
      if (!confirm("确认执行内容处置？饭局隐藏会关闭相关申请并通知成员。"))
        return;
      await apiRequest("/admin/moderation", {
        method: "POST",
        data: {
          type,
          id: Number(n.dataset.moderate),
          hidden: n.dataset.hidden === "true",
          reason: screen.querySelector(
            "#moderation-reason-" + n.dataset.moderate,
          ).value,
        },
      });
      await loadContent();
    });
  }
  async function showCorrection() {
    if (!auth()) return;
    const target = screen.querySelector("#product-content");
    await apiRequest("/admin/feedback");
    if (!target?.isConnected) return;
    target.innerHTML =
      '<p class="muted">选择核实的具体分店。地址修正会停用旧坐标和距离，既有饭局地点快照不变。</p><input id="correction-keyword" placeholder="餐厅名称"><button class="secondary" data-search-correction>搜索餐厅</button><select id="correction-restaurant"></select><select id="correction-poi"></select><textarea id="correction-address" maxlength="500" placeholder="核实后的完整地址"></textarea><input id="correction-source" placeholder="官方或商家HTTPS来源"><textarea id="correction-note" maxlength="500" placeholder="公开核验说明，不含私人信息"></textarea><label><input type="checkbox" id="correction-confirmed">已核验，确认停用旧距离和坐标</label><button class="primary" data-save-correction>保存核验地址</button>';
    let restaurants = [];
    const branches = () => {
      const r = restaurants.find(
        (x) =>
          String(x.id) === screen.querySelector("#correction-restaurant").value,
      );
      screen.querySelector("#correction-poi").innerHTML = (r?.candidates || [])
        .map((c) => `<option value="${e(c.poiId)}">${e(c.name)}</option>`)
        .join("");
    };
    const search = async () => {
      restaurants = (
        await apiRequest(
          "/restaurants?pageSize=30&keyword=" +
            encodeURIComponent(
              screen.querySelector("#correction-keyword").value,
            ),
        )
      ).items;
      screen.querySelector("#correction-restaurant").innerHTML = restaurants
        .map((r) => `<option value="${e(r.id)}">${e(r.name)}</option>`)
        .join("");
      branches();
    };
    on("[data-search-correction]", search);
    screen.querySelector("#correction-restaurant").onchange = branches;
    on("[data-save-correction]", async () => {
      await apiRequest(
        "/admin/catalog/" +
          encodeURIComponent(
            screen.querySelector("#correction-restaurant").value,
          ),
        {
          method: "PUT",
          data: {
            poiId: screen.querySelector("#correction-poi").value,
            address: screen.querySelector("#correction-address").value,
            sourceUrl: screen.querySelector("#correction-source").value,
            note: screen.querySelector("#correction-note").value,
            confirmed: screen.querySelector("#correction-confirmed").checked,
          },
        },
      );
      toast("地址已更新，旧坐标和距离已停用");
    });
    await search();
  }
  unreadTimer = setInterval(() => {
    if (!document.hidden) refreshUnread();
  }, 30000);
  window.addEventListener("pagehide", () => clearInterval(unreadTimer));
  const invitation = new URLSearchParams(location.search).get("meal");
  if (invitation && /^\d{1,10}$/.test(invitation)) {
    activeMealId = Number(invitation);
    render("detail");
  } else render(currentPage);
})();
