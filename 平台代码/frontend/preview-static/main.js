const img = {
  noodle: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=800&q=80',
  spicy: 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=800&q=80',
  pizza: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=800&q=80',
  salad: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80',
  avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=240&q=80'
}

const API_BASE_URL = 'http://127.0.0.1:3001/api'
let authSession = JSON.parse(window.localStorage.getItem('fanfanPreviewAuth') || 'null')

const pages = {
  home: `
    <div class="page">
      <div class="header">
        <div class="mascot">${getUserInitial()}</div>
        <div class="search"><strong>本校⌄</strong><input id="home-search-input" placeholder="火锅 / 清真 / 近沙河"></div>
      </div>
      <div style="padding: 0 16px 12px 16px;">
        <button class="secondary full-width" data-go-timetable style="background:linear-gradient(135deg, #e6f7ff 0%, #f0f5ff 100%);color:#096dd9;border:1px solid #91d5ff;padding:10px 14px;border-radius:14px;display:flex;align-items:center;justify-content:space-between;font-weight:bold;cursor:pointer;">
          <span>📅 联通教务处课表 · 自动拉取导出</span>
          <span style="font-size:12px;background:#1890ff;color:#fff;padding:2px 8px;border-radius:10px;">测试入口 ›</span>
        </button>
      </div>
      <section class="section">
        <div class="section-title">精选专辑 ›</div>
        <div class="albums">
          <div class="album"><img src="${img.salad}"><strong>一食堂接头指南</strong><span class="muted">本校饭搭子严选</span></div>
          <div class="album"><img src="${img.noodle}"><strong>校门口 Best15</strong><span class="muted">下课后再去</span></div>
          <div class="album"><img src="${img.pizza}"><strong>社恐友好饭局</strong><span class="muted">安静吃也舒服</span></div>
        </div>
      </section>
      <section class="section home-restaurant-section">
        <div class="home-restaurant-heading">
          <div>
            <div class="section-title">今天吃什么？</div>
            <div class="muted">附近好吃的 · 群友推荐 · 按校区距离排序</div>
          </div>
        </div>
        <!-- 这排控件保留；现在直接向真实餐厅库传查询参数。 -->
        <div class="pills" data-choice-group><button class="pill active">全校⌄</button><button class="pill">品类⌄</button><button class="pill">排序⌄</button><button class="pill">筛选⌄</button></div>
        <div id="home-restaurant-list"><div class="empty"><p>附近餐厅加载中...</p></div></div>
      </section>

      <!-- 筛选模态弹窗 -->
      <div id="filter-modal" class="modal-overlay">
        <div class="modal-content">
          <div class="modal-header">
            <h3>高级筛选</h3>
            <button class="close-btn" id="close-filter-modal">×</button>
          </div>
          <div class="modal-body">
            <div class="filter-group">
              <label>预算区间</label>
              <div class="filter-options" id="filter-budget-options">
                <button class="option-btn active" data-value="all">全部</button>
                <button class="option-btn" data-value="0-20">0-20 元</button>
                <button class="option-btn" data-value="20-40">20-40 元</button>
                <button class="option-btn" data-value="40-80">40-80 元</button>
                <button class="option-btn" data-value="80+">80 元以上</button>
              </div>
            </div>
            <div class="filter-group">
              <label>就餐校区</label>
              <div class="filter-options" id="filter-campus-options">
                <button class="option-btn active" data-value="all">全部</button>
                <button class="option-btn" data-value="主校区">主校区</button>
                <button class="option-btn" data-value="西校区">西校区</button>
                <button class="option-btn" data-value="东校区">东校区</button>
                <button class="option-btn" data-value="市区">市区</button>
              </div>
            </div>
            <div class="filter-group">
              <label>人数限制</label>
              <div class="filter-options" id="filter-people-options">
                <button class="option-btn active" data-value="all">全部</button>
                <button class="option-btn" data-value="2">仅限双人 (2人)</button>
                <button class="option-btn" data-value="3-4">拼桌聚餐 (3-4人)</button>
                <button class="option-btn" data-value="5+">多人成行 (5人以上)</button>
              </div>
            </div>
            <div class="filter-group">
              <label>排序方式</label>
              <div class="filter-options" id="filter-sort-options">
                <button class="option-btn active" data-value="default">默认时间排序</button>
                <button class="option-btn" data-value="budget-asc">价格从低到高</button>
                <button class="option-btn" data-value="people-desc">名额从多到少</button>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn-reset" id="btn-filter-reset">重置</button>
            <button class="btn-confirm" id="btn-filter-confirm">确定</button>
          </div>
        </div>
      </div>
    </div>
  `,
  find: `
    <div class="page find-page-content">
      <div class="find-title-row">
        <span class="title">找人</span>
        <span class="muted">发现值得一起吃的饭搭子</span>
      </div>
      <div class="find-search">
        <span>🔍</span>
        <span class="muted">搜索饭搭子...</span>
      </div>
      <div class="pills" data-find-categories>
        <button class="pill active" data-find-category="全部">全部</button>
        <button class="pill" data-find-category="约饭">约饭</button>
        <button class="pill" data-find-category="探店">探店</button>
        <button class="pill" data-find-category="夜宵">夜宵</button>
        <button class="pill" data-find-category="拼桌">拼桌</button>
        <button class="pill" data-find-category="咖啡">咖啡</button>
      </div>
      <div class="post-list" id="find-post-list"></div>
      <div class="fab-wrapper">
        <button class="fab" data-fab-post>+</button>
      </div>
    </div>
  `,
  'find-detail': `
    <div class="page find-detail-page" id="find-detail-content"></div>
  `,
  publish: `
    <div class="page form">
      <div class="title">发布饭局</div>
      <p class="muted">把吃什么、几点、哪里、几个人先说清楚。</p>
      <label>饭局标题</label><input id="meal-title" placeholder="例如：今晚拼麻辣烫">
      <label>时间</label><input id="meal-time" placeholder="例如：今天 18:30">
      <label>地点</label><input id="meal-place" placeholder="例如：一食堂二楼">
      <label>人数</label><input id="meal-people" placeholder="例如：4">
      <label>预算</label><input id="meal-budget" placeholder="例如：20元以内">
      <label>补充说明</label><textarea id="meal-note" rows="4" placeholder="口味、忌口、聊天偏好等"></textarea>
      <button class="primary" data-create-meal>发布饭局</button>
    </div>
  `,
  feed: `
    <div class="page">
      <div class="feed-tabs" data-choice-group><span class="muted title">关注</span><strong class="active">推荐</strong></div>
      <div class="pills" data-choice-group><button class="pill active">全部</button><button class="pill">约饭</button><button class="pill">工作餐</button><button class="pill">夜宵</button></div>
      <article class="feed-card"><div class="user"><img class="avatar" src="${img.avatar}"><div><h3>米雪食记 v</h3><div class="muted">认为这家适合 饭搭子初见</div></div></div><img src="${img.noodle}"><p>这家窗口出餐快，适合下课十分钟内集合，聊天压力也不大。</p><div class="restaurant"><strong>一食堂二楼牛肉面 ›</strong><br><span>一食堂 · 300m</span><button class="want-btn" data-want>♡</button></div></article>
      <article class="feed-card"><div class="user"><img class="avatar" src="${img.avatar}"><div><h3>小马吃吃吃 v</h3><div class="muted">认为这家适合 夜宵拼桌</div></div></div><img src="${img.spicy}"><p>四个人拼很舒服，预算能压到 25 左右，适合晚课后一起去。</p><div class="restaurant"><strong>东门麻辣烫 ›</strong><br><span>东门小吃街 · 800m</span><button class="want-btn" data-want>♡</button></div></article>
    </div>
  `,
  profile: `
    <div>
      <div class="profile-hero">
        <div class="profile-hero-top">
          <div class="stats">
            <div><strong>3</strong><br><span>关注</span></div>
            <div><strong>2</strong><br><span>饭搭子</span></div>
            <div><strong>8</strong><br><span>好评与想去</span></div>
          </div>
          <div class="hero-action-buttons">
            <button class="edit" data-go-edit>编辑资料</button>
            <button class="edit" data-switch-account style="background: rgba(255,255,255,0.15); border-color: rgba(255,255,255,0.4); cursor:pointer;">切换账号</button>
          </div>
        </div>
        <h2>${authSession ? `${authSession.user.nickname}，今天吃什么？` : '发现属于你的校园美食'}</h2>
        <button class="quiet" data-go-edit>${getTasteLabel()}</button>
      </div>
      <div class="profile-panel">
        <div class="section-title">我的饭局</div>
        <div id="profile-my-meals-preview">
          <div class="empty"><p>饭局列表加载中...</p></div>
        </div>
        <div style="margin: 12px 0 20px; display: flex; gap: 10px;">
          <button class="secondary full-width" data-go-my-meals>全部饭局</button>
          <button class="primary full-width" data-go-publish>新建饭局</button>
        </div>
        <div class="pills" id="profile-tab-pills">
          <button class="pill active" data-profile-tab="visited">去过</button>
          <button class="pill" data-profile-tab="wishlist">想去</button>
          <button class="pill" data-profile-tab="moments">动态</button>
          <button class="pill" data-profile-tab="saved">收藏</button>
        </div>
        <div id="profile-tab-content">
          <div class="empty"><p>点击上方切换查看详情</p></div>
        </div>
        <div style="margin-top: 24px; border-top: 1px dashed #e5e5ea; padding-top: 16px;">
          <button class="secondary full-width" data-go-timetable style="margin-bottom:10px;font-weight:bold;background:#e6f7ff;color:#096dd9;border:1px solid #91d5ff;">
            📅 联通教务处拉取课表与导出测试
          </button>
          ${authSession ? `
            <button class="secondary full-width" data-switch-account style="font-weight:600;">
              🔄 切换当前账号
            </button>
          ` : `
            <button class="primary full-width" data-go-login>登录账号</button>
          `}
        </div>
      </div>
    </div>
  `,
  detail: `
    <div>
      <div id="detail-content"><div class="empty"><p>饭局详情加载中...</p></div></div>
      <div class="bottom-actions"><button class="secondary" data-go-review>评价</button><button class="primary" data-join>想去/加入</button></div>
    </div>
  `,
  'restaurant-detail': `
    <div>
      <div id="restaurant-detail-content">
        <div class="empty"><p>店铺详情加载中...</p></div>
      </div>
    </div>
  `,
  myMeals: `
    <div class="page">
      <button class="back-link" data-back>‹ 我的</button>
      <div class="title">我的饭局</div>
      
      <!-- 我的饭局数据概览 Dashboard -->
      <div class="meal-dashboard">
        <div class="dashboard-stats">
          <div class="stat-item">
            <span class="stat-val" id="dashboard-created-count">0</span>
            <span class="stat-lbl">发起饭局</span>
          </div>
          <div class="stat-item">
            <span class="stat-val" id="dashboard-joined-count">0</span>
            <span class="stat-lbl">参与饭局</span>
          </div>
          <div class="stat-item">
            <span class="stat-val" id="dashboard-budget-sum">¥0</span>
            <span class="stat-lbl">拼伙花费</span>
          </div>
        </div>
        <div class="dashboard-chart">
          <div class="chart-title">活跃打卡 (最近约饭热力)</div>
          <div class="chart-grid">
            <span class="grid-dot active" title="已完成"></span>
            <span class="grid-dot active" title="已完成"></span>
            <span class="grid-dot" title="无活动"></span>
            <span class="grid-dot active" title="已完成"></span>
            <span class="grid-dot" title="无活动"></span>
            <span class="grid-dot active" title="已完成"></span>
            <span class="grid-dot active" title="已完成"></span>
          </div>
          <span class="chart-summary-txt">本周与 <strong>6</strong> 位饭友愉快拼餐，信用优秀</span>
        </div>
      </div>

      <div class="pills">
        <button class="pill active" data-my-meal-tab="created">我发起的</button>
        <button class="pill" data-my-meal-tab="joined">我加入的</button>
      </div>
      <div id="my-meal-list"><div class="empty"><p>饭局加载中...</p></div></div>
    </div>
  `,
  login: `
    <div class="page form login-page-card">
      <div class="login-header">
        <div class="login-avatar-wrap">🍲</div>
        <div class="title" style="margin-top:8px;">登录饭饭之交</div>
        <p class="muted" style="margin-top:4px;">寻找口味相投的校园饭搭子 · 轻松拼桌</p>
      </div>

      <div class="login-fields" style="margin-top:16px;">
        <label>学号 / 手机号</label>
        <input id="login-student" value="${authSession?.user?.studentNo || '2026001'}" placeholder="例如：2026001">

        <label>用户昵称</label>
        <input id="login-nickname" value="${authSession?.user?.nickname || '小林'}" placeholder="例如：小林">

        <label>就读高校</label>
        <input id="login-school" value="${authSession?.user?.school || '示例大学'}" placeholder="例如：示例大学">
      </div>

      <button class="primary full-width login-submit-btn" data-login style="margin-top:18px;">验证进入 / 登录账号</button>

      <div class="demo-accounts-section">
        <div class="demo-divider"><span>或一键体验预设测试账号</span></div>
        <div class="demo-account-pills">
          <button class="demo-pill" data-demo-user="1">
            <strong>小林</strong> <span>主校区 · 计算机系</span>
          </button>
          <button class="demo-pill" data-demo-user="2">
            <strong>阿晴</strong> <span>主校区 · 设计系</span>
          </button>
          <button class="demo-pill" data-demo-user="3">
            <strong>米雪</strong> <span>西校区 · 软件工程</span>
          </button>
        </div>
      </div>
      
      <button class="secondary full-width" data-back style="margin-top: 16px;">返回上一页</button>
    </div>
  `,
  edit: `
    <div class="page form">
      <div class="title">编辑资料</div>
      <p class="muted">这些字段会保存到后端资料接口。</p>
      <label>校区</label><input id="profile-campus" value="${authSession?.profile?.campus || '主校区'}">
      <label>口味标签</label><input id="profile-taste" value="${(authSession?.profile?.tasteTags || ['川菜', '不吃香菜']).join('、')}">
      <label>性格/吃饭标签</label><input id="profile-personality" value="${(authSession?.profile?.personalityTags || ['慢热', '安静吃饭']).join('、')}">
      <label>预算偏好</label><input id="profile-budget" value="${authSession?.profile?.budgetPreference || '20-40'}">
      <button class="primary" data-save-profile>保存资料</button>
      <button class="secondary full-width" data-back>返回</button>
    </div>
  `,
  timetableImport: `
    <div class="page timetable-import-page">
      <div class="header-card">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div>
            <div class="title" style="margin:0;font-size:20px;font-weight:800;color:#08091f;">📅 教务处课表对接与导出测试</div>
            <p class="muted" style="margin:4px 0 0 0;font-size:13px;">自动检测拉取网页课表，分析无课时段并导出标准数据</p>
          </div>
          <button class="secondary" data-back style="padding:6px 12px;font-size:12px;">返回</button>
        </div>
      </div>

      <div class="url-bar-card" style="margin-top:14px;background:#fff;padding:14px;border-radius:16px;border:1px solid #f0f0f5;">
        <label style="font-size:12px;font-weight:700;color:#5a5b6a;display:block;margin-bottom:6px;">教务处课表系统网址</label>
        <div style="display:flex;gap:8px;">
          <input id="jwxt-url-input" value="https://xuanke.cufe.edu.cn/jwglxt/kbcx/xskbcx_cxXskbcxIndex.html?gnmkdm=N2151&layout=default" placeholder="输入教务处课表网址..." style="flex:1;padding:8px 12px;border:1px solid #e5e5ea;border-radius:10px;font-size:13px;">
          <button class="primary" data-fetch-timetable style="padding:8px 16px;white-space:nowrap;font-size:13px;">⚡ 检测拉取</button>
        </div>
        <div style="margin-top:10px;display:flex;gap:8px;align-items:center;">
          <span style="font-size:12px;color:#8e8f98;">快速测试：</span>
          <button class="pill active" data-load-sample-timetable style="font-size:12px;padding:4px 10px;">🧪 载入示范课表数据</button>
        </div>
      </div>

      <div class="webview-preview-card" style="margin-top:14px;background:#fff;padding:14px;border-radius:16px;border:1px solid #f0f0f5;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
          <span style="font-size:13px;font-weight:700;color:#08091f;">🌐 Webview 网页容器 (央财统一身份认证)</span>
          <span class="status-tag" id="webview-status" style="font-size:11px;background:#fff2e8;color:#fa541c;padding:2px 8px;border-radius:6px;font-weight:bold;">未登录</span>
        </div>
        <div id="webview-frame-container" style="height:220px;background:#f9f9fc;border:1px solid #d1d5db;border-radius:12px;overflow:hidden;position:relative;">
          
          <div id="cufe-mock-login" style="padding:16px;height:100%;box-sizing:border-box;background:#fff;display:flex;flex-direction:column;justify-content:center;align-items:center;">
            <div style="font-size:14px;font-weight:bold;color:#b22222;text-align:center;margin-bottom:10px;">中央财经大学统一身份认证 (MOCK)</div>
            <div style="display:flex;flex-direction:column;gap:8px;max-width:240px;width:100%;">
              <input type="text" id="cufe-username" value="2026001" placeholder="用户名 / 学号" style="padding:6px 10px;font-size:12px;border:1px solid #ccc;border-radius:6px;width:100%;box-sizing:border-box;">
              <input type="password" id="cufe-password" value="password" placeholder="密码" style="padding:6px 10px;font-size:12px;border:1px solid #ccc;border-radius:6px;width:100%;box-sizing:border-box;">
              <button id="btn-cufe-login" class="primary full-width" style="padding:6px;font-size:12px;background:#b22222;border-color:#b22222;color:#fff;border-radius:6px;cursor:pointer;font-weight:bold;width:100%;">确认登录 (Sign In)</button>
            </div>
            <div style="font-size:10px;color:#8e8f98;text-align:center;margin-top:10px;">提示：点击“确认登录”进入教务系统课表页以完成 DOM 解析测试</div>
          </div>

          <div id="cufe-mock-timetable" style="display:none;padding:10px;height:100%;box-sizing:border-box;overflow-y:auto;background:#fafafa;">
            <div style="font-size:12px;font-weight:bold;color:#333;margin-bottom:6px;display:flex;justify-content:space-between;align-items:center;">
              <span>学生课表查询 - 2026-2027学年第一学期</span>
              <span style="font-size:11px;color:#52c41a;font-weight:bold;">● 已成功登录 (2026001)</span>
            </div>
            
            <table id="cufe-kbtable" style="width:100%;border-collapse:collapse;font-size:10px;background:#fff;border:1px solid #ddd;text-align:center;">
              <thead>
                <tr style="background:#eef2f7;height:22px;font-weight:bold;">
                  <th style="border:1px solid #ddd;width:15%;">节次</th>
                  <th style="border:1px solid #ddd;width:17%;">周一</th>
                  <th style="border:1px solid #ddd;width:17%;">周二</th>
                  <th style="border:1px solid #ddd;width:17%;">周三</th>
                  <th style="border:1px solid #ddd;width:17%;">周四</th>
                  <th style="border:1px solid #ddd;width:17%;">周五</th>
                </tr>
              </thead>
              <tbody>
                <tr style="height:44px;">
                  <td style="border:1px solid #ddd;font-weight:bold;background:#fafafa;">1-2节</td>
                  <td style="border:1px solid #ddd;" class="kbcontent">
                    <div class="kb-course" style="font-weight:bold;color:#b22222;">微观经济学</div>
                    <div class="kb-teacher" style="color:#666;">刘教授</div>
                    <div class="kb-loc" style="color:#888;">学院楼 301</div>
                  </td>
                  <td style="border:1px solid #ddd;" class="kbcontent"></td>
                  <td style="border:1px solid #ddd;" class="kbcontent">
                    <div class="kb-course" style="font-weight:bold;color:#b22222;">线性代数</div>
                    <div class="kb-teacher" style="color:#666;">王教授</div>
                    <div class="kb-loc" style="color:#888;">教二楼 105</div>
                  </td>
                  <td style="border:1px solid #ddd;" class="kbcontent">
                    <div class="kb-course" style="font-weight:bold;color:#b22222;">思想道德与法治</div>
                    <div class="kb-teacher" style="color:#666;">赵老师</div>
                    <div class="kb-loc" style="color:#888;">大报告厅</div>
                  </td>
                  <td style="border:1px solid #ddd;" class="kbcontent"></td>
                </tr>
                <tr style="height:44px;">
                  <td style="border:1px solid #ddd;font-weight:bold;background:#fafafa;">3-4节</td>
                  <td style="border:1px solid #ddd;" class="kbcontent">
                    <div class="kb-course" style="font-weight:bold;color:#b22222;">计量经济学</div>
                    <div class="kb-teacher" style="color:#666;">陈老师</div>
                    <div class="kb-loc" style="color:#888;">实验楼 204</div>
                  </td>
                  <td style="border:1px solid #ddd;" class="kbcontent">
                    <div class="kb-course" style="font-weight:bold;color:#b22222;">计算机设计 (C++)</div>
                    <div class="kb-teacher" style="color:#666;">李老师</div>
                    <div class="kb-loc" style="color:#888;">实验楼 302</div>
                  </td>
                  <td style="border:1px solid #ddd;" class="kbcontent"></td>
                  <td style="border:1px solid #ddd;" class="kbcontent">
                    <div class="kb-course" style="font-weight:bold;color:#b22222;">体育 (羽毛球)</div>
                    <div class="kb-teacher" style="color:#666;">陈教练</div>
                    <div class="kb-loc" style="color:#888;">体育馆</div>
                  </td>
                  <td style="border:1px solid #ddd;" class="kbcontent"></td>
                </tr>
              </tbody>
            </table>
          </div>

        </div>
      </div>

      <div class="timetable-result-section" style="margin-top:16px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
          <h3 style="margin:0;font-size:16px;font-weight:800;color:#08091f;">📊 解析课表预览网格</h3>
          <button class="secondary" data-copy-json style="padding:4px 10px;font-size:12px;">📋 复制导出的 JSON</button>
        </div>

        <div id="free-slots-summary-container" style="margin-bottom:12px;"></div>

        <div id="timetable-grid-container" style="overflow-x:auto;background:#fff;border-radius:16px;padding:12px;border:1px solid #f0f0f5;">
          <div class="empty"><p>暂无已解析课表，请点击“检测拉取”或“载入示范课表”</p></div>
        </div>

        <div style="margin-top:16px;background:#1e1e2e;color:#a6adc8;padding:14px;border-radius:16px;font-family:monospace;font-size:12px;overflow-x:auto;">
          <div style="color:#cdd6f4;font-weight:bold;margin-bottom:6px;">📄 导出数据 (Export JSON Payload):</div>
          <pre id="json-export-preview" style="margin:0;white-space:pre-wrap;word-break:break-all;color:#a6e3a1;">{\n  "status": "waiting_import"\n}</pre>
        </div>
      </div>
    </div>
  `,
  review: `
    <div class="page form">
      <div class="title">发布评价</div>
      <p class="muted">默认评价 1 号饭局，示例账号小林可以直接提交。</p>
      <label>饭局 ID</label><input id="review-meal" value="1">
      <label>评价对象用户 ID</label><input id="review-target" value="1">
      <label>评分</label><div class="rating-line" data-rating><button class="star active">★</button><button class="star active">★</button><button class="star active">★</button><button class="star active">★</button><button class="star active">★</button></div>
      <label>评价内容</label><textarea id="review-content" rows="4" placeholder="例如：准时，吃饭体验不错。">准时，吃饭体验不错。</textarea>
      <button class="primary" data-submit-review>发布评价</button>
      <button class="secondary full-width" data-back>返回</button>
    </div>
  `
}

const screen = document.querySelector('#screen')
const buttons = document.querySelectorAll('.tabbar button')
let previousPage = 'home'
let currentPage = 'home'
let reviewRating = 5
let activeFindCategory = '全部'
let activeMealId = 1
let activeRestaurantId = 1
let activeRestaurantName = ''
let mealsCache = []
let myMealsCache = { created: [], joined: [] }
let myMealsTab = 'created'
let activeProfileTab = 'visited'
// 首页新餐厅区选择的校区，用来决定显示哪一个距离字段。
let campusFilterOptions = ['全校', '沙河校区', '学院南路校区']
let campusFilterIndex = 0
let foodFilterOptions = ['全部品类', '麻辣香锅', '米线', '轻食', '火锅']
let foodFilterIndex = 0
let sortFilterOptions = ['智能排序', '评价最高', '价格最低']
let sortFilterIndex = 0
const HOME_RESTAURANT_PAGE_SIZE = 6
let homeRestaurantPage = 1
let homeRestaurantHasMore = true
let homeRestaurantLoading = false
let homeRestaurantKeyword = ''
let homeRestaurantSearchTimer = null

let selectedBudget = 'all'
let selectedCampus = 'all'
let selectedPeople = 'all'
let selectedSort = 'default'

const findPosts = [
  {
    id: 1,
    author: {
      name: '米雪食记',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=240&q=80',
      level: 6,
      role: '大学',
      roleColor: '#D88BB3',
      campus: '主校区',
      creditScore: 98,
      mealCount: 36,
      reviewCount: 22,
      tasteTags: ['川菜', '火锅', '麻辣'],
      personalityTags: ['健谈', '吃得快', '准时不鸽'],
      budgetPreference: '20-40',
      desc: '食堂窗口发现者，二食堂二楼老常客。每次约饭都会提前到，从不爽约。饭量大，节奏快，适合不想拖沓的饭友。'
    },
    time: '07-09 18:35',
    category: { name: '约饭', color: '#FF9F43' },
    content: '蹲蹲今晚一食堂吃麻辣香锅的uu，本人女生～最好是口味偏辣的！大概7点左右去。',
    waitingCount: 2,
    joinedAvatars: [
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=240&q=80',
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=240&q=80'
    ],
    joined: false,
    restaurant: {
      name: '二食堂麻辣香锅',
      foodType: '川菜',
      campus: '主校区',
      location: '二食堂二楼靠窗区域',
      avgPrice: 2200,
      rating: 4.7,
      tags: ['麻辣香锅', '出餐快', '分量足'],
      description: '窗口出餐快，适合下课十分钟内集合。排队不算久，面汤稳定，第一次和饭搭子见面选这里比较稳。',
      image: img.spicy
    }
  },
  {
    id: 2,
    author: {
      name: '怎么什么用户名都在',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=240&q=80',
      level: 6,
      role: '大学',
      roleColor: '#D88BB3',
      campus: '主校区',
      creditScore: 95,
      mealCount: 28,
      reviewCount: 16,
      tasteTags: ['韩料', '日料', '探店'],
      personalityTags: ['爱拍照', '慢节奏', 'AA记账'],
      budgetPreference: '40-80',
      desc: '校门口新店活地图，拍照修图一条龙。吃饭节奏偏慢，喜欢边吃边聊，特别适合想放松吃的饭友。'
    },
    time: '07-09 12:14',
    category: { name: '探店', color: '#8FD4D2' },
    content: '有没有uu想一起去校门口新开的韩料店探店！本人喜欢拍照，最好是也爱拍照的姐妹～',
    waitingCount: 1,
    joinedAvatars: [
      'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=240&q=80'
    ],
    joined: false,
    restaurant: {
      name: '东门新韩式料理',
      foodType: '韩料',
      campus: '主校区',
      location: '东门外步行街南侧',
      avgPrice: 4500,
      rating: 4.4,
      tags: ['新店', '部队锅', '拍照好看'],
      description: '新开一个月，用餐环境干净明亮。部队锅分量大，建议凑 2-3 人一起吃。炸鸡出片率高。',
      image: img.noodle
    }
  },
  {
    id: 3,
    author: {
      name: '小马吃吃吃',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=240&q=80',
      level: 5,
      role: '实习',
      roleColor: '#D88BB3',
      campus: '东校区',
      creditScore: 92,
      mealCount: 21,
      reviewCount: 11,
      tasteTags: ['烧烤', '夜宵', '啤酒'],
      personalityTags: ['夜猫子', '随性', '不拘束'],
      budgetPreference: '20-50',
      desc: '晚课结束后必约夜宵，东门烧烤摊资深品鉴师。比较随性，不挑食不挑环境，主打一个吃得开心。'
    },
    time: '07-08 21:10',
    category: { name: '夜宵', color: '#7C5CBF' },
    content: '晚课结束后想吃夜宵，东门烧烤摊常驻选手，缺一个饭搭子！AA制，大概22点出发。',
    waitingCount: 3,
    joinedAvatars: [
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=240&q=80',
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=240&q=80',
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=240&q=80'
    ],
    joined: false,
    restaurant: {
      name: '东门烧烤摊',
      foodType: '烧烤',
      campus: '主校区',
      location: '东门小吃街最里面',
      avgPrice: 3000,
      rating: 4.5,
      tags: ['露天', '深夜营业', '性价比高'],
      description: '开到凌晨 1 点，四个人拼很舒服，预算能压到 25 左右。羊肉串和烤茄子口碑很好，人多能多点几样。',
      image: img.spicy
    }
  },
  {
    id: 4,
    author: {
      name: '清淡口同学',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=240&q=80',
      level: 4,
      role: '大学',
      roleColor: '#D88BB3',
      campus: '主校区',
      creditScore: 99,
      mealCount: 18,
      reviewCount: 10,
      tasteTags: ['轻食', '清淡', '沙拉'],
      personalityTags: ['社恐友好', '安静吃饭', '准时'],
      budgetPreference: '15-25',
      desc: '长期驻扎三食堂轻食窗口，口味非常清淡。社恐友好型饭搭子——不尬聊、不勉强、准时到、吃完走。'
    },
    time: '07-08 15:42',
    category: { name: '拼桌', color: '#54A0FF' },
    content: '三食堂轻食窗口长期拼桌，本人吃得很清淡，偏好安静吃饭不尬聊的氛围～',
    waitingCount: 1,
    joinedAvatars: [],
    joined: false,
    restaurant: {
      name: '三食堂轻食窗口',
      foodType: '轻食',
      campus: '主校区',
      location: '三食堂一楼右侧',
      avgPrice: 1500,
      rating: 4.3,
      tags: ['低脂', '高蛋白', '现做'],
      description: '每周换菜单，食材新鲜。鸡胸肉沙拉和荞麦面是招牌，适合减脂期同学。座位充足，不用抢位。',
      image: img.salad
    }
  },
  {
    id: 5,
    author: {
      name: 'amor27的饭路',
      avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=240&q=80',
      level: 7,
      role: '大学',
      roleColor: '#D88BB3',
      campus: '主校区',
      creditScore: 96,
      mealCount: 42,
      reviewCount: 30,
      tasteTags: ['酸菜鱼', '火锅', '湘菜'],
      personalityTags: ['组织能手', 'AA精确到分', '饭后逛街'],
      budgetPreference: '40-100',
      desc: '校园约饭天花板选手，人均 60 的酸菜鱼局能组织 6 人成行。AA 精确到分值得信赖，吃完总会安排饭后逛逛消食。'
    },
    time: '07-07 11:20',
    category: { name: '约饭', color: '#FF9F43' },
    content: '周末想去市区吃那家很火的酸菜鱼，有没有人一起！AA，大概人均60，吃完还可以逛逛。',
    waitingCount: 2,
    joinedAvatars: [
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=240&q=80',
      'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=240&q=80'
    ],
    joined: false,
    restaurant: {
      name: '市区太二酸菜鱼',
      foodType: '川菜',
      campus: '市区',
      location: '解放路步行街 3 楼',
      avgPrice: 6000,
      rating: 4.8,
      tags: ['网红店', '酸菜鱼', '适合多人'],
      description: '市区口碑很好的酸菜鱼店，人均 60 左右。建议 3-4 人成行，能点多几道菜。周末排队约 20 分钟，可提前取号。',
      image: img.pizza
    }
  }
]

function render(page) {
  const pageKey = page.startsWith && page.startsWith('find-detail:') ? 'find-detail' : page
  screen.innerHTML = pages[pageKey]
  currentPage = page
  screen.scrollTop = 0
  buttons.forEach((button) => button.classList.toggle('active', button.dataset.page === page))
  if (page === 'timetableImport') loadTimetableImportPage()
  if (page === 'home') resetPreviewHomeRestaurants()
  if (page === 'detail') loadPreviewMealDetail(activeMealId)
  if (page === 'restaurant-detail') loadPreviewRestaurantDetail(activeRestaurantId)
  if (page === 'myMeals') loadPreviewMyMeals()
  if (page === 'profile') loadProfilePage()
  if (page === 'publish') {
    if (activeRestaurantName) {
      const placeInput = screen.querySelector('#meal-place')
      if (placeInput) placeInput.value = activeRestaurantName
      const titleInput = screen.querySelector('#meal-title')
      if (titleInput) titleInput.value = `拼桌去吃「${activeRestaurantName}」`
      // Reset after prefill
      activeRestaurantName = ''
    }
  }
  if (page === 'review') {
    const reviewMealInput = screen.querySelector('#review-meal')
    if (reviewMealInput) reviewMealInput.value = activeMealId || 1
  }
  if (page === 'find') loadPreviewFindPosts()
  if (page.startsWith && page.startsWith('find-detail:')) {
    const postId = Number(page.split(':')[1])
    loadPreviewFindDetail(postId)
  }
  bindPageActions()
}

function bindPageActions() {
  screen.querySelectorAll('[data-choice-group]').forEach((group) => {
    group.querySelectorAll('button, div, span, strong').forEach((item) => {
      item.addEventListener('click', () => {
        group.querySelectorAll('.active').forEach((active) => active.classList.remove('active'))
        item.classList.add('active')
        toast(`已切换到「${item.textContent.trim().replace(/\s+/g, ' ')}」`)
      })
    })
  })

  screen.querySelectorAll('[data-want]').forEach((button) => {
    let placeName = button.getAttribute('data-restaurant-name') || ''
    if (!placeName) {
      const mealCard = button.closest('[data-meal-detail]')
      if (mealCard) {
        const mutedDiv = mealCard.querySelector('.muted')
        if (mutedDiv) {
          placeName = mutedDiv.textContent.split('·')[0].trim()
        }
      }
    }

    const clone = button.cloneNode(true)
    button.parentNode.replaceChild(clone, button)

    clone.addEventListener('click', async (event) => {
      event.stopPropagation()
      if (!authSession?.token) {
        toast('请先登录再操作')
        navigate('login')
        return
      }

      clone.disabled = true
      try {
        const res = await apiRequest('/profile/wishlist', {
          method: 'POST',
          data: { restaurantName: placeName }
        })
        clone.classList.toggle('active', res.active)
        clone.textContent = res.active ? '♥' : '♡'
        toast(res.active ? '已加入想去' : '已取消想去')
      } catch (error) {
        toast(error.message)
      } finally {
        clone.disabled = false
      }
    })
  })

  screen.querySelectorAll('[data-toast]').forEach((button) => {
    button.addEventListener('click', (event) => {
      event.stopPropagation()
      toast(button.dataset.toast)
    })
  })

  const detailLink = screen.querySelector('[data-detail]')
  if (detailLink) {
    detailLink.addEventListener('click', () => {
      previousPage = currentPage
      render('detail')
    })
  }

  screen.querySelectorAll('[data-meal-detail]').forEach((card) => {
    card.addEventListener('click', () => {
      activeMealId = Number(card.dataset.mealDetail)
      previousPage = currentPage
      render('detail')
    })
  })

  screen.querySelectorAll('[data-restaurant-detail]').forEach((card) => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('[data-want]')) return
      activeRestaurantId = card.dataset.restaurantDetail
      previousPage = currentPage
      render('restaurant-detail')
    })
  })

  const backButton = screen.querySelector('[data-back]')
  if (backButton) {
    backButton.addEventListener('click', () => render(previousPage || 'home'))
  }

  const createButton = screen.querySelector('[data-create-meal]')
  if (createButton) {
    createButton.addEventListener('click', createMealFromForm)
  }

  const publishButton = screen.querySelector('[data-go-publish]')
  if (publishButton) {
    publishButton.addEventListener('click', () => render('publish'))
  }

  const joinButton = screen.querySelector('[data-join]')
  if (joinButton) {
    const clone = joinButton.cloneNode(true)
    joinButton.parentNode.replaceChild(clone, joinButton)
    clone.addEventListener('click', handleJoinOrLeaveClick)
  }

  const homePillsContainer = screen.querySelector('.pills[data-choice-group]')
  if (homePillsContainer && currentPage === 'home') {
    const pills = homePillsContainer.querySelectorAll('.pill')
    pills.forEach((p, idx) => {
      const clone = p.cloneNode(true)
      p.parentNode.replaceChild(clone, p)
      clone.addEventListener('click', (e) => {
        e.stopPropagation()
        if (idx === 0) {
          campusFilterIndex = (campusFilterIndex + 1) % campusFilterOptions.length
          selectedCampus = campusFilterIndex === 0 ? 'all' : campusFilterOptions[campusFilterIndex]
          resetPreviewHomeRestaurants()
        } else if (idx === 1) {
          foodFilterIndex = (foodFilterIndex + 1) % foodFilterOptions.length
          resetPreviewHomeRestaurants()
        } else if (idx === 2) {
          sortFilterIndex = (sortFilterIndex + 1) % sortFilterOptions.length
          selectedSort = sortFilterIndex === 0 ? 'default' : (sortFilterIndex === 1 ? 'rating-desc' : 'price-asc')
          resetPreviewHomeRestaurants()
        } else if (idx === 3) {
          openFilterModal()
        }
      })
    })
  }

  const homeSearchInput = screen.querySelector('#home-search-input')
  if (homeSearchInput && currentPage === 'home') {
    homeSearchInput.value = homeRestaurantKeyword
    homeSearchInput.oninput = () => {
      homeRestaurantKeyword = homeSearchInput.value.trim()
      if (homeRestaurantSearchTimer) clearTimeout(homeRestaurantSearchTimer)
      homeRestaurantSearchTimer = setTimeout(() => resetPreviewHomeRestaurants(), 360)
    }
    homeSearchInput.onkeydown = (event) => {
      if (event.key !== 'Enter') return
      event.preventDefault()
      homeRestaurantKeyword = homeSearchInput.value.trim()
      if (homeRestaurantSearchTimer) clearTimeout(homeRestaurantSearchTimer)
      resetPreviewHomeRestaurants()
    }
  }

  const homeSearchButton = screen.querySelector('[data-home-search]')
  if (homeSearchButton && currentPage === 'home') {
    homeSearchButton.onclick = () => {
      const input = screen.querySelector('#home-search-input')
      homeRestaurantKeyword = input ? input.value.trim() : homeRestaurantKeyword
      if (homeRestaurantSearchTimer) clearTimeout(homeRestaurantSearchTimer)
      resetPreviewHomeRestaurants()
    }
  }


  const modal = screen.querySelector('#filter-modal')
  if (modal && currentPage === 'home') {
    const closeBtn = modal.querySelector('#close-filter-modal')
    if (closeBtn) {
      closeBtn.onclick = () => closeFilterModal()
    }
    
    modal.querySelectorAll('.option-btn').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation()
        const parent = btn.parentNode
        parent.querySelectorAll('.option-btn').forEach(b => b.classList.remove('active'))
        btn.classList.add('active')
      }
    })
    
    const resetBtn = modal.querySelector('#btn-filter-reset')
    if (resetBtn) {
      resetBtn.onclick = (e) => {
        e.stopPropagation()
        modal.querySelectorAll('.filter-options').forEach(group => {
          group.querySelectorAll('.option-btn').forEach((btn, index) => {
            btn.classList.toggle('active', index === 0)
          })
        })
      }
    }
    
    const confirmBtn = modal.querySelector('#btn-filter-confirm')
    if (confirmBtn) {
      confirmBtn.onclick = (e) => {
        e.stopPropagation()
        
        const activeBudget = modal.querySelector('#filter-budget-options .option-btn.active')
        selectedBudget = activeBudget ? activeBudget.dataset.value : 'all'
        
        const activeCampus = modal.querySelector('#filter-campus-options .option-btn.active')
        selectedCampus = activeCampus ? activeCampus.dataset.value : 'all'
        
        const activePeople = modal.querySelector('#filter-people-options .option-btn.active')
        selectedPeople = activePeople ? activePeople.dataset.value : 'all'
        
        const activeSort = modal.querySelector('#filter-sort-options .option-btn.active')
        selectedSort = activeSort ? activeSort.dataset.value : 'default'
        
        if (selectedCampus === 'all') {
          campusFilterIndex = 0
        } else {
          const idx = campusFilterOptions.indexOf(selectedCampus)
          if (idx !== -1) campusFilterIndex = idx
        }
        
        closeFilterModal()
        resetPreviewHomeRestaurants()
      }
    }
  }

  const loginButton = screen.querySelector('[data-go-login]')
  if (loginButton) loginButton.addEventListener('click', () => navigate('login'))

  const switchAccountBtn = screen.querySelector('[data-switch-account]')
  if (switchAccountBtn) {
    switchAccountBtn.addEventListener('click', () => {
      authSession = null
      window.localStorage.removeItem('fanfanPreviewAuth')
      toast('已退出当前账号，请选择或登录新账号')
      render('login')
    })
  }

  const editButton = screen.querySelector('[data-go-edit]')
  if (editButton) editButton.addEventListener('click', () => requireLoginThen('edit'))

  const reviewButton = screen.querySelector('[data-go-review]')
  if (reviewButton) reviewButton.addEventListener('click', () => requireLoginThen('review'))

  const myMealsButton = screen.querySelector('[data-go-my-meals]')
  if (myMealsButton) myMealsButton.addEventListener('click', () => requireLoginThen('myMeals'))

  const timetableButton = screen.querySelector('[data-go-timetable]')
  if (timetableButton) timetableButton.addEventListener('click', () => requireLoginThen('timetableImport'))

  const fetchTimetableBtn = screen.querySelector('[data-fetch-timetable]')
  if (fetchTimetableBtn) {
    fetchTimetableBtn.addEventListener('click', () => {
      const mockTimetableDiv = screen.querySelector('#cufe-mock-timetable');
      if (!mockTimetableDiv || mockTimetableDiv.style.display !== 'block') {
        toast('⚠️ 请先在下方 Webview 容器中完成统一身份认证登录！');
        return;
      }

      // 真实 DOM 提取逻辑模拟
      const parsedCourses = [];
      const cells = screen.querySelectorAll('#cufe-kbtable tbody td.kbcontent');
      
      cells.forEach((cell) => {
        const courseNameEl = cell.querySelector('.kb-course');
        const teacherEl = cell.querySelector('.kb-teacher');
        const locEl = cell.querySelector('.kb-loc');
        
        if (courseNameEl && courseNameEl.textContent.trim()) {
          const parentRow = cell.closest('tr');
          const rowIndex = Array.from(parentRow.parentNode.children).indexOf(parentRow);
          const tds = Array.from(parentRow.querySelectorAll('td'));
          const cellIndex = tds.indexOf(cell);
          
          // cellIndex 1=周一, 2=周二...
          const dayOfWeek = cellIndex; 
          const startPeriod = rowIndex === 0 ? 1 : 3;
          const endPeriod = rowIndex === 0 ? 2 : 4;
          
          parsedCourses.push({
            courseName: courseNameEl.textContent.trim(),
            dayOfWeek: dayOfWeek,
            startPeriod: startPeriod,
            endPeriod: endPeriod,
            location: locEl ? locEl.textContent.trim() : '未分配教室',
            teacher: teacherEl ? teacherEl.textContent.trim() : '教师未定'
          });
        }
      });

      if (parsedCourses.length > 0) {
        handleImportCourses(parsedCourses);
      } else {
        toast('未在表格中解析出有效课程');
      }
    })
  }

  const loadSampleTimetableBtn = screen.querySelector('[data-load-sample-timetable]')
  if (loadSampleTimetableBtn) {
    loadSampleTimetableBtn.addEventListener('click', () => {
      handleImportCourses(SAMPLE_TIMETABLE_COURSES)
    })
  }

  const copyJsonBtn = screen.querySelector('[data-copy-json]')
  if (copyJsonBtn) {
    copyJsonBtn.addEventListener('click', () => {
      const jsonText = screen.querySelector('#json-export-preview')?.textContent || ''
      if (navigator.clipboard) {
        navigator.clipboard.writeText(jsonText)
        toast('已复制导出 JSON 到剪贴板')
      } else {
        toast('JSON 可以在框内直接选中复制')
      }
    })
  }

  screen.querySelectorAll('[data-my-meal-tab]').forEach((button) => {
    button.addEventListener('click', () => {
      myMealsTab = button.dataset.myMealTab
      screen.querySelectorAll('[data-my-meal-tab]').forEach((item) => item.classList.toggle('active', item === button))
      renderMyMeals()
    })
  })

  // Profile sub-tabs click handler
  const profilePillsContainer = screen.querySelector('#profile-tab-pills')
  if (profilePillsContainer && currentPage === 'profile') {
    profilePillsContainer.querySelectorAll('[data-profile-tab]').forEach((button) => {
      const clone = button.cloneNode(true)
      button.parentNode.replaceChild(clone, button)
      clone.addEventListener('click', (e) => {
        e.stopPropagation()
        activeProfileTab = clone.dataset.profileTab
        profilePillsContainer.querySelectorAll('[data-profile-tab]').forEach((item) => item.classList.toggle('active', item === clone))
        loadProfileTabContent()
      })
    })
  }

  const loginSubmit = screen.querySelector('[data-login]')
  if (loginSubmit) loginSubmit.addEventListener('click', loginFromForm)

  screen.querySelectorAll('[data-demo-user]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault()
      const userId = btn.dataset.demoUser
      if (userId === '1') {
        document.querySelector('#login-nickname').value = '小林'
        document.querySelector('#login-student').value = '2026001'
        document.querySelector('#login-school').value = '示例大学'
      } else if (userId === '2') {
        document.querySelector('#login-nickname').value = '阿晴'
        document.querySelector('#login-student').value = '2026002'
        document.querySelector('#login-school').value = '示例大学'
      } else if (userId === '3') {
        document.querySelector('#login-nickname').value = '米雪'
        document.querySelector('#login-student').value = '2026003'
        document.querySelector('#login-school').value = '示例大学'
      }
      loginFromForm()
    })
  })

  const saveProfile = screen.querySelector('[data-save-profile]')
  if (saveProfile) saveProfile.addEventListener('click', saveProfileFromForm)

  const rating = screen.querySelector('[data-rating]')
  if (rating) {
    rating.querySelectorAll('.star').forEach((star, index) => {
      star.addEventListener('click', () => {
        reviewRating = index + 1
        rating.querySelectorAll('.star').forEach((item, itemIndex) => {
          item.classList.toggle('active', itemIndex <= index)
        })
      })
    })
  }

  const reviewSubmit = screen.querySelector('[data-submit-review]')
  if (reviewSubmit) reviewSubmit.addEventListener('click', submitReviewFromForm)

  // --- find page interactions ---
  screen.querySelectorAll('[data-find-category]').forEach((pill) => {
    pill.addEventListener('click', () => {
      screen.querySelectorAll('[data-find-category]').forEach((p) => p.classList.remove('active'))
      pill.classList.add('active')
      activeFindCategory = pill.dataset.findCategory
      loadPreviewFindPosts()
    })
  })

  screen.querySelectorAll('[data-find-join]').forEach((btn) => {
    btn.addEventListener('click', async (event) => {
      event.stopPropagation()
      if (!authSession?.token) {
        toast('请先登录')
        navigate('login')
        return
      }
      const postId = Number(btn.dataset.findJoin)
      const isJoined = btn.classList.contains('joined')
      btn.disabled = true
      try {
        if (isJoined) {
          await apiRequest(`/posts/${postId}/leave`, { method: 'POST' })
          toast('已取消约饭请求')
        } else {
          await apiRequest(`/posts/${postId}/join`, { method: 'POST' })
          toast('已发送约饭请求')
        }
        loadPreviewFindPosts()
      } catch (error) {
        toast(error.message)
        btn.disabled = false
      }
    })
  })

  const fabBtn = screen.querySelector('[data-fab-post]')
  if (fabBtn) {
    fabBtn.addEventListener('click', () => navigate('publish'))
  }

  // --- find-detail interactions ---
  screen.querySelectorAll('[data-find-detail]').forEach((card) => {
    card.addEventListener('click', (event) => {
      if (event.target.closest('[data-find-join]')) return
      previousPage = 'find'
      render(`find-detail:${card.dataset.findDetail}`)
    })
  })

  screen.querySelectorAll('[data-find-detail-join]').forEach((btn) => {
    btn.addEventListener('click', async (event) => {
      event.stopPropagation()
      if (!authSession?.token) {
        toast('请先登录')
        navigate('login')
        return
      }
      const postId = Number(btn.dataset.findDetailJoin)
      const isJoined = btn.classList.contains('joined')
      btn.disabled = true
      try {
        if (isJoined) {
          await apiRequest(`/posts/${postId}/leave`, { method: 'POST' })
          toast('已取消约饭请求')
        } else {
          await apiRequest(`/posts/${postId}/join`, { method: 'POST' })
          toast('已发送约饭请求')
        }
        loadPreviewFindDetail(postId)
      } catch (error) {
        toast(error.message)
        btn.disabled = false
      }
    })
  })

  screen.querySelectorAll('[data-find-detail-review]').forEach((btn) => {
    btn.addEventListener('click', (event) => {
      event.stopPropagation()
      toast('评价功能即将上线')
    })
  })
}

function navigate(page) {
  previousPage = currentPage
  render(page)
}

function requireLoginThen(page) {
  if (!authSession?.token) {
    toast('请先登录')
    navigate('login')
    return
  }
  navigate(page)
}

function renderFindDetail(page) {
  const postId = Number(page.split(':')[1])
  const post = findPosts.find((p) => p.id === postId)
  if (!post) return

  const target = screen.querySelector('#find-detail-content')
  if (!target) return

  const author = post.author
  const restaurant = post.restaurant

  target.innerHTML = `
    <button class="back-link" data-back>‹ 找人</button>

    <!-- 帖子内容区域 -->
    <div class="detail-card">
      <div class="detail-header">
        <img class="detail-avatar" src="${author.avatar}">
        <div class="detail-user-info">
          <div class="detail-user-row">
            <span class="detail-username">${author.name}</span>
            <span class="detail-level">Lv.${author.level}</span>
            <span class="detail-role" style="color:${author.roleColor || '#D88BB3'}">${author.role}</span>
          </div>
          <span class="detail-time">${post.time} 发布</span>
        </div>
      </div>
      <span class="detail-category" style="border-color:${post.category.color};color:${post.category.color}">${post.category.name}</span>
      <p class="detail-content">${post.content}</p>
      <div class="detail-meta">
        <span>等 <strong>${post.waitingCount}</strong> 人</span>
        ${post.joinedAvatars.length ? `<span style="margin-left:16px">已加入：${post.joinedAvatars.map(av => `<img class="detail-mini-avatar" src="${av}">`).join('')}</span>` : ''}
      </div>
    </div>

    <!-- 发起人信息卡片 -->
    <div class="detail-card">
      <div class="section-title">发起人</div>
      <div class="author-profile">
        <div class="author-top">
          <img class="author-big-avatar" src="${author.avatar}">
          <div class="author-summary">
            <div class="author-name-row">
              <strong>${author.name}</strong>
              <span class="author-level">Lv.${author.level}</span>
              <span class="author-role" style="color:${author.roleColor || '#D88BB3'}">${author.role}</span>
            </div>
            <div class="detail-tags">
              ${author.tasteTags.map(t => `<span class="detail-tag taste">${t}</span>`).join('')}
              ${author.personalityTags.map(t => `<span class="detail-tag personality">${t}</span>`).join('')}
            </div>
          </div>
        </div>

        <p class="author-desc">${author.desc}</p>

        <div class="credit-section">
          <div class="credit-score">
            <span class="credit-label">信用分</span>
            <span class="credit-value high">${author.creditScore}</span>
            <span class="credit-sub">信用优秀</span>
          </div>
          <div class="credit-stats">
            <div class="credit-stat">
              <span class="credit-stat-num">${author.mealCount}</span>
              <span class="credit-stat-label">历史约饭</span>
            </div>
            <div class="credit-stat">
              <span class="credit-stat-num">${author.reviewCount}</span>
              <span class="credit-stat-label">获得评价</span>
            </div>
            <div class="credit-stat">
              <span class="credit-stat-num">0</span>
              <span class="credit-stat-label">爽约次数</span>
            </div>
          </div>
          <div class="credit-info-row">
            <span class="credit-item"><strong>校区</strong> ${author.campus}</span>
            <span class="credit-item"><strong>预算</strong> ¥${author.budgetPreference}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 餐厅信息卡片 -->
    ${restaurant ? `
    <div class="detail-card">
      <div class="section-title">推荐餐厅</div>
      <div class="restaurant-card-detail">
        <img class="restaurant-hero-img" src="${restaurant.image || img.salad}">
        <div class="restaurant-info-detail">
          <div class="restaurant-name-row">
            <strong>${restaurant.name}</strong>
            <span class="detail-category" style="border-color:#FF9F43;color:#FF9F43">${restaurant.foodType}</span>
          </div>
          <div class="restaurant-meta">
            <span>⭐ ${restaurant.rating}</span>
            <span>📍 ${restaurant.location}</span>
            <span>💰 ${formatRestaurantPrice(restaurant)}</span>
          </div>
          <div class="detail-tags">
            ${parseRestaurantTags(restaurant.tags).map(t => `<span class="detail-tag rest">${t}</span>`).join('')}
          </div>
          <p class="restaurant-desc">${restaurant.description}</p>
        </div>
      </div>
    </div>
    ` : ''}

    <!-- 底部操作 -->
    <div class="detail-bottom-actions">
      <button class="detail-btn secondary" data-find-detail-review="${post.id}">评价</button>
      <button class="detail-btn primary" id="detail-join-btn" data-find-detail-join="${post.id}">${post.joined ? '已约' : '约 TA'}</button>
    </div>

    <!-- 分割间距 -->
    <div style="height:24px"></div>
  `
}

function resetPreviewHomeRestaurants() {
  homeRestaurantPage = 1
  homeRestaurantHasMore = true
  loadPreviewMeals({ append: false })
}

async function loadPreviewMeals({ append = false } = {}) {
  // 名字沿用旧函数，实际已改为读取真实餐厅库。
  const target = screen.querySelector('#home-restaurant-list')
  if (!target) return
  if (homeRestaurantLoading || !homeRestaurantHasMore) return
  homeRestaurantLoading = true

  try {
    const oldState = target.querySelector('.home-load-state')
    if (oldState) oldState.remove()

    let query = `?page=${homeRestaurantPage}&pageSize=${HOME_RESTAURANT_PAGE_SIZE}`
    
    // 1. Campus Filter
    const selectedCampusLabel = selectedCampus !== 'all' ? selectedCampus : campusFilterOptions[campusFilterIndex]
    const campusCodeByLabel = { '沙河校区': 'cufe_shahe', '学院南路校区': 'cufe_nanlu' }
    if (campusCodeByLabel[selectedCampusLabel]) query += `&campus=${campusCodeByLabel[selectedCampusLabel]}`
    
    // 2. Food Type Filter
    if (foodFilterIndex > 0) {
      query += `&foodType=${encodeURIComponent(foodFilterOptions[foodFilterIndex])}`
    }
    if (homeRestaurantKeyword) {
      query += `&keyword=${encodeURIComponent(homeRestaurantKeyword)}`
    }
    
    // 3. Price Filter (translated from budget options)
    if (selectedBudget !== 'all') {
      const [minB, maxB] = parseBudgetRange(selectedBudget)
      query += `&minPrice=${(minB / 100).toFixed(0)}&maxPrice=${(maxB / 100).toFixed(0)}`
    }
    
    // 4. Sort By
    if (selectedSort !== 'default') {
      query += `&sortBy=${selectedSort}`
    } else if (sortFilterIndex > 0) {
      query += `&sortBy=${sortFilterIndex === 1 ? 'rating-desc' : 'price-asc'}`
    }

    const data = await apiRequest(`/restaurants${query}`)
    const items = data.items || []

    let wishlist = []
    if (authSession?.token) {
      try {
        const wishData = await apiRequest('/profile/wishlist')
        wishlist = wishData.items || []
      } catch (e) {
        console.error("Failed to load wishlist:", e)
      }
    }

    homeRestaurantHasMore = typeof data.hasMore === 'boolean'
      ? data.hasMore
      : items.length === HOME_RESTAURANT_PAGE_SIZE
    if (items.length > 0) homeRestaurantPage += 1

    if (append) {
      const listHtml = items.map((restaurant) => renderHomeRestaurantCard(restaurant, campusCodeByLabel[selectedCampusLabel])).join('')
      if (listHtml) target.insertAdjacentHTML('beforeend', listHtml)
      if (target.children.length > 0) {
        target.insertAdjacentHTML('beforeend', `<div class="home-load-state muted">${homeRestaurantHasMore ? '继续下滑加载 6 家' : '已经到底啦'}</div>`)
      }
      updateHomeFilterPills()
      bindPageActions()
      homeRestaurantLoading = false
      return
    }

    target.innerHTML = items.length
      ? items.map((restaurant) => renderHomeRestaurantCard(restaurant, campusCodeByLabel[selectedCampusLabel])).join('')
      : `<div class="empty"><div style="font-size:48px">🍽</div><p>没有找到符合条件的美食推荐</p></div>`
    if (target.children.length > 0 && items.length > 0) {
      target.insertAdjacentHTML('beforeend', `<div class="home-load-state muted">${homeRestaurantHasMore ? '继续下滑加载 6 家' : '已经到底啦'}</div>`)
    }
    homeRestaurantLoading = false

    updateHomeFilterPills()
    bindPageActions()
  } catch (error) {
    target.innerHTML = `<div class="empty"><p>${error.message}</p></div>`
    homeRestaurantLoading = false
    bindPageActions()
  }
}

// 首页只请求 6 家。图片使用 loading="lazy"，滚到卡片附近才会实际下载。
function renderHomeRestaurantCard(restaurant, selectedCampusCode) {
  const distances = restaurant.distanceKm || {}
  // 「全校」时不丢掉距离：展示两个校区里更近的那个，方便列表快速浏览。
  const campusCode = selectedCampusCode || Object.keys(distances).sort((a, b) => distances[a] - distances[b])[0]
  const distance = campusCode ? distances[campusCode] : null
  const campusName = campusCode === 'cufe_nanlu' ? '学院南路' : campusCode === 'cufe_shahe' ? '沙河校区' : '最近校区'
  const distanceText = Number.isFinite(distance) ? `${distance.toFixed(1)} km` : '待计算'
  const imageUrl = getRestaurantImage(restaurant)
  return `
    <article class="home-restaurant-card" data-restaurant-detail="${restaurant.id}">
      <img src="${imageUrl}" loading="lazy" onerror="this.onerror=null;this.src='${img.salad}'" alt="${restaurant.name}">
      <div class="home-restaurant-card-body">
        <strong>${restaurant.name}</strong>
        <span class="home-restaurant-address">${restaurant.fullAddress || '地址待补充'}</span>
        <div class="home-restaurant-card-footer">
          <span>距${campusName} ${distanceText}</span>
          <span>${restaurant.cuisine || '餐厅'}</span>
        </div>
      </div>
    </article>
  `
}

function parseBudgetRange(val) {
  if (val === '0-20') return [0, 2000]
  if (val === '20-40') return [2000, 4000]
  if (val === '40-80') return [4000, 8000]
  if (val === '80+') return [8000, 999999]
  return [0, 0]
}

function parsePeopleRange(val) {
  if (val === '2') return [2, 2]
  if (val === '3-4') return [3, 4]
  if (val === '5+') return [5, 99]
  return [0, 0]
}

function openFilterModal() {
  const modal = screen.querySelector('#filter-modal')
  if (!modal) return
  
  const budgetOpts = modal.querySelectorAll('#filter-budget-options .option-btn')
  budgetOpts.forEach(btn => btn.classList.toggle('active', btn.dataset.value === selectedBudget))
  
  const campusOpts = modal.querySelectorAll('#filter-campus-options .option-btn')
  campusOpts.forEach(btn => btn.classList.toggle('active', btn.dataset.value === selectedCampus))
  
  const peopleOpts = modal.querySelectorAll('#filter-people-options .option-btn')
  peopleOpts.forEach(btn => btn.classList.toggle('active', btn.dataset.value === selectedPeople))
  
  const sortOpts = modal.querySelectorAll('#filter-sort-options .option-btn')
  sortOpts.forEach(btn => btn.classList.toggle('active', btn.dataset.value === selectedSort))
  
  modal.classList.add('active')
}

function closeFilterModal() {
  const modal = screen.querySelector('#filter-modal')
  if (modal) modal.classList.remove('active')
}

function renderMealCard(meal, isWished = false) {
  return `
    <div class="meal" data-meal-detail="${meal.id}">
      <img src="${getMealImage(meal.foodType)}">
      <div>
        <h3>${meal.title} <button class="want-btn${isWished ? ' active' : ''}" data-want>${isWished ? '♥' : '♡'}</button></h3>
        <div class="muted">${meal.place} · ${formatMealTime(meal.mealTime)} · ${formatBudget(meal)}</div>
        <span class="tag">${meal.currentPeople || 1}/${meal.maxPeople} 人</span><span class="tag">${meal.foodType || '约饭'}</span>
        <div class="quote">${meal.description || `${meal.creator?.nickname || '同学'} 发起了这场饭局。`}</div>
      </div>
    </div>
  `
}

function parseRestaurantTags(tags) {
  if (!tags) return [];
  if (Array.isArray(tags)) return tags;
  try {
    const parsed = JSON.parse(tags);
    if (Array.isArray(parsed)) return parsed;
  } catch (e) {
    if (typeof tags === 'string') {
      return tags.split(',').map(t => t.trim()).filter(Boolean);
    }
  }
  return [];
}

function formatRestaurantRating(restaurant = {}) {
  const rating = Number(restaurant.rating ?? restaurant.score ?? restaurant.poiMatchScore)
  return Number.isFinite(rating) && rating > 0 ? `⭐ ${rating.toFixed(1)}` : '暂无评分'
}

function formatRestaurantPrice(restaurant = {}) {
  const rawPrice = Number(restaurant.avgPrice ?? restaurant.averagePrice)
  if (!Number.isFinite(rawPrice) || rawPrice <= 0) return '人均待补'
  const yuan = rawPrice > 1000 ? rawPrice / 100 : rawPrice
  return `¥${yuan.toFixed(0)}/人`
}

function getRestaurantCuisine(restaurant = {}) {
  return restaurant.foodType || restaurant.cuisine || '美食'
}

function getRestaurantLocationText(restaurant = {}) {
  return restaurant.location || restaurant.fullAddress || restaurant.address || restaurant.district || '地址待补'
}

function getRestaurantImage(restaurant = {}) {
  return restaurant.photoUrl || restaurant.image || restaurant.coverUrl || restaurant.imageUrl || getMealImage(restaurant.foodType || restaurant.cuisine)
}

function renderRestaurantCard(restaurant, isWished = false) {
  return `
    <div class="restaurant-card" data-restaurant-detail="${restaurant.id}">
      <img class="restaurant-img" src="${getRestaurantImage(restaurant)}" onerror="this.onerror=null;this.src='${img.salad}'">
      <div class="restaurant-info">
        <h3>
          ${restaurant.name}
          <button class="want-btn${isWished ? ' active' : ''}" data-want data-restaurant-name="${restaurant.name}">${isWished ? '♥' : '♡'}</button>
        </h3>
        <div class="restaurant-rating">${formatRestaurantRating(restaurant)} · ${formatRestaurantPrice(restaurant)}</div>
        <div class="restaurant-meta">${restaurant.campus} · ${restaurant.location} · ${restaurant.foodType}</div>
        <div class="restaurant-tags">
          ${parseRestaurantTags(restaurant.tags).map(t => `<span class="tag">${t}</span>`).join('')}
        </div>
      </div>
    </div>
  `
}

async function loadPreviewRestaurantDetail(id) {
  const target = screen.querySelector('#restaurant-detail-content')
  if (!target) return

  try {
    const data = await apiRequest(`/restaurants/${id || activeRestaurantId}`)
    const restaurant = data.restaurant
    activeRestaurantId = restaurant.id
    activeRestaurantName = restaurant.name

    let wishlist = []
    if (authSession?.token) {
      try {
        const wishData = await apiRequest('/profile/wishlist')
        wishlist = wishData.items || []
      } catch (e) {
        console.error("Failed to load wishlist:", e)
      }
    }
    const isWished = wishlist.some(w => w.restaurantId === restaurant.id || w.restaurantName === restaurant.name)

    target.innerHTML = `
      <div class="restaurant-detail-view">
        <div style="position:relative">
          <img class="hero" src="${getRestaurantImage(restaurant)}" onerror="this.onerror=null;this.src='${img.salad}'">
          <button class="icon-btn dark" data-back style="position:absolute;left:16px;top:18px">‹</button>
        </div>
        <div class="detail-info">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <h2 style="margin:0;font-size:22px;font-weight:800;color:#08091f;">${restaurant.name}</h2>
            <button class="want-btn${isWished ? ' active' : ''}" data-want data-restaurant-name="${restaurant.name}" style="font-size:22px;border:none;background:none;cursor:pointer;">${isWished ? '♥' : '♡'}</button>
          </div>
          <div style="margin-top: 8px; font-size:15px; color:#ff9900; font-weight:bold;">${formatRestaurantRating(restaurant)} · ${formatRestaurantPrice(restaurant)}</div>
          <div style="margin-top: 8px; font-size:13px; color:#5a5b6a;">${restaurant.campus} · ${restaurant.location} · ${restaurant.foodType}</div>
          
          <div class="restaurant-tags" style="margin-top:12px;display:flex;flex-wrap:wrap;gap:6px;">
            ${parseRestaurantTags(restaurant.tags).map(t => `<span class="tag" style="background:#f0f0f5;color:#5a5b6a;padding:3px 8px;border-radius:6px;font-size:12px;">${t}</span>`).join('')}
          </div>

          <div style="margin-top: 16px; font-size:14px; color:#08091f; line-height:1.6; border-top:1px solid #f0f0f5; padding-top:14px;">
            <strong>店家介绍：</strong>
            <p style="margin:6px 0 0 0;color:#5a5b6a;">${restaurant.description || '暂无特色介绍，快来亲自品尝一下吧！'}</p>
          </div>
          
          <div style="margin-top: 24px; border-top: 1px solid #f0f0f5; padding-top: 16px;">
            <h3 style="margin: 0 0 12px 0;font-size:16px;font-weight:800;color:#08091f;">在此店约饭的同学</h3>
            <div id="restaurant-active-meals-list">
              <div class="empty" style="padding: 12px 0;"><p>加载中...</p></div>
            </div>
            <button class="primary full-width" id="btn-create-meal-for-restaurant" style="margin-top: 16px;">在此店发起约饭</button>
          </div>
        </div>
      </div>
    `

    // Load active meals at this restaurant
    const mealsData = await apiRequest(`/meals?restaurantId=${restaurant.id}`)
    const meals = mealsData.items || []
    const mealsListContainer = screen.querySelector('#restaurant-active-meals-list')
    if (mealsListContainer) {
      if (meals.length === 0) {
        mealsListContainer.innerHTML = `
          <div class="empty" style="padding: 16px 0; background:#f7f7fa; border-radius:12px;">
            <p style="margin:0;color:#8e8f98;font-size:13px;">暂无同学在此店约饭，你来发起第一场吧！</p>
          </div>
        `
      } else {
        mealsListContainer.innerHTML = meals.map(meal => `
          <div class="profile-meal-preview-item" data-meal-detail="${meal.id}" style="margin-bottom:8px;">
            <div class="preview-item-left">
              <span class="preview-item-status-tag ${meal.status === 'open' ? 'open' : 'matched'}">
                ${meal.status === 'open' ? '招募中' : '已成局'}
              </span>
              <span class="preview-item-title">${meal.title}</span>
            </div>
            <div class="preview-item-right">
              <span>${formatMealTime(meal.mealTime)}</span>
            </div>
          </div>
        `).join('')
      }
    }

    const startMealBtn = screen.querySelector('#btn-create-meal-for-restaurant')
    if (startMealBtn) {
      startMealBtn.onclick = () => {
        render('publish')
      }
    }

    bindPageActions()
  } catch (error) {
    target.innerHTML = `<div class="empty"><p>加载失败: ${error.message}</p></div>`
  }
}

async function loadPreviewMealDetail(id) {
  const target = screen.querySelector('#detail-content')
  if (!target) return

  try {
    const data = await apiRequest(`/meals/${id || activeMealId}`)
    const meal = data.meal
    activeMealId = meal.id
    target.innerHTML = renderMealDetail(meal)

    const joinButton = screen.querySelector('[data-join]')
    if (joinButton) {
      const joined = Boolean(meal.participants?.some((item) => item.id === authSession?.user?.id))
      joinButton.textContent = joined ? '已加入' : '想去/加入'
      joinButton.disabled = joined
    }
  } catch (error) {
    target.innerHTML = `<div class="empty"><p>${error.message}</p></div>`
  }
}

function renderMealDetail(meal) {
  return `
    <div style="position:relative"><img class="hero" src="${getMealImage(meal.foodType)}"><button class="icon-btn dark" data-back style="position:absolute;left:16px;top:18px">‹</button><button class="icon-btn dark" data-toast="已复制分享链接" style="position:absolute;right:16px;top:18px">↗</button></div>
    <div class="detail-panel">
      <div class="detail-title">${meal.title}</div>
      <span class="tag">值得一起去吃</span><span class="tag">${meal.foodType || '校园饭局'}</span>
      <p>${meal.foodType || '约饭'} ｜ ${meal.place} ｜ ${formatBudget(meal)}</p>
      <hr>
      <p><strong>${meal.status === 'open' ? '可加入' : '已结束'} ${formatMealTime(meal.mealTime)}</strong><br><span class="muted">${meal.currentPeople || 1}/${meal.maxPeople} 人 · ${meal.chatMode || 'balanced'}</span></p>
      <p><strong>${meal.place} ›</strong><br><span class="muted">${meal.campus || '主校区'} · 发起人 ${meal.creator?.nickname || '同学'}</span></p>
      <div class="section-title">推荐吃法</div>
      <div class="dishes"><div class="dish"><img src="${getMealImage(meal.foodType)}">${meal.foodType || '随便吃点'}</div><div class="dish"><img src="${img.noodle}">招牌主食</div><div class="dish"><img src="${img.salad}">饭后散步</div></div>
      <div class="section-title">饭搭子评价</div>
      <div class="quote">${meal.reviews?.[0]?.content || meal.description || '还没有评价，加入后可以回来补一条真实体验。'}</div>
    </div>
  `
}

async function loadPreviewMyMeals() {
  const target = screen.querySelector('#my-meal-list')
  if (!target) return

  try {
    const data = await apiRequest('/meals/mine')
    myMealsCache = { created: data.created || [], joined: data.joined || [] }
    renderMyMeals()
  } catch (error) {
    target.innerHTML = `<div class="empty"><p>${error.message}</p></div>`
  }
}

function renderMyMeals() {
  const target = screen.querySelector('#my-meal-list')
  if (!target) return

  // Populate dashboard stats dynamically
  const createdCount = myMealsCache.created.length
  const joinedCount = myMealsCache.joined.length
  
  const createdEl = screen.querySelector('#dashboard-created-count')
  if (createdEl) createdEl.textContent = createdCount
  
  const joinedEl = screen.querySelector('#dashboard-joined-count')
  if (joinedEl) joinedEl.textContent = joinedCount
  
  // Calculate total budget spent
  const createdBudget = myMealsCache.created.reduce((sum, meal) => sum + (meal.budgetMin || 0), 0)
  const joinedBudget = myMealsCache.joined.reduce((sum, meal) => sum + (meal.budgetMin || 0), 0)
  const totalBudget = createdBudget + joinedBudget
  const budgetEl = screen.querySelector('#dashboard-budget-sum')
  if (budgetEl) budgetEl.textContent = `¥${totalBudget}`

  const meals = myMealsCache[myMealsTab] || []
  target.innerHTML = meals.length
    ? meals.map(renderMealCard).join('')
    : `<div class="empty"><div style="font-size:48px">🍽</div><p>${myMealsTab === 'created' ? '你还没发起饭局' : '你还没加入饭局'}</p><button class="primary" data-go-publish>去发布</button></div>`
  bindPageActions()
}

async function loadProfilePage() {
  if (!authSession?.token) {
    const previewContainer = screen.querySelector('#profile-my-meals-preview')
    if (previewContainer) {
      previewContainer.innerHTML = `
        <div class="empty" style="padding: 12px 0;">
          <div style="font-size:36px">🍽</div>
          <p>请先登录查看你的饭局信息</p>
        </div>
      `
    }
    const tabContainer = screen.querySelector('#profile-tab-content')
    if (tabContainer) {
      tabContainer.innerHTML = `<div class="empty"><p>请先登录查看记录</p><button class="primary" data-go-login>去登录</button></div>`
      bindPageActions()
    }
    return
  }
  loadProfileMyMealsPreview()
  loadProfileTabContent()
}

async function loadProfileMyMealsPreview() {
  const container = screen.querySelector('#profile-my-meals-preview')
  if (!container) return

  try {
    const data = await apiRequest('/meals/mine')
    const created = data.created || []
    const joined = data.joined || []
    const allMeals = [...created.map(m => ({ ...m, role: 'creator' })), ...joined.map(m => ({ ...m, role: 'member' }))]
    
    if (allMeals.length === 0) {
      container.innerHTML = `
        <div class="empty" style="padding: 20px 0;">
          <div style="font-size:36px">🍲</div>
          <p>暂无活动中的饭局，快去发布吧！</p>
        </div>
      `
      return
    }

    container.innerHTML = allMeals.slice(0, 3).map(meal => `
      <div class="profile-meal-preview-item" data-meal-detail="${meal.id}">
        <div class="preview-item-left">
          <span class="preview-item-status-tag ${meal.status === 'open' ? 'open' : 'matched'}">
            ${meal.status === 'open' ? '招募中' : '已成局'}
          </span>
          <span class="preview-item-title">${meal.title}</span>
        </div>
        <div class="preview-item-right">
          <span>${meal.place}</span>
        </div>
      </div>
    `).join('')
    
    bindPageActions()
  } catch (error) {
    container.innerHTML = `<p class="error-msg">${error.message}</p>`
  }
}

async function loadProfileTabContent() {
  const container = screen.querySelector('#profile-tab-content')
  if (!container) return

  container.innerHTML = '<div class="empty"><p>内容加载中...</p></div>'

  try {
    if (activeProfileTab === 'visited') {
      const data = await apiRequest('/profile/visited')
      const items = data.items || []
      container.innerHTML = items.length === 0
        ? `<div class="empty"><div style="font-size:48px">🍽</div><p>你还没有去过的餐厅记录</p></div>`
        : items.map(item => `
            <div class="profile-list-item">
              <div class="item-info">
                <div class="item-title"><strong>${item.restaurantName}</strong></div>
                <div class="item-meta">${item.foodType || '约餐'} · ${formatRestaurantRating(item)} · ${formatRestaurantPrice(item)}</div>
                <div class="item-date">记录时间: ${formatFindPostTime(item.visitedAt)}</div>
              </div>
              <img class="item-thumb" src="${getMealImage(item.foodType)}">
            </div>
          `).join('')
    } else if (activeProfileTab === 'wishlist') {
      const data = await apiRequest('/profile/wishlist')
      const items = data.items || []
      container.innerHTML = items.length === 0
        ? `<div class="empty"><div style="font-size:48px">💖</div><p>你还没有想去的餐厅，去首页点点红心吧！</p></div>`
        : items.map(item => `
            <div class="profile-list-item">
              <div class="item-info">
                <div class="item-title"><strong>${item.restaurantName}</strong></div>
                <div class="item-meta">${item.foodType || '美食'} · ${formatRestaurantRating(item)} · ${formatRestaurantPrice(item)}</div>
                <div class="item-date">添加时间: ${formatFindPostTime(item.createdAt)}</div>
              </div>
              <img class="item-thumb" src="${getMealImage(item.foodType)}">
            </div>
          `).join('')
    } else if (activeProfileTab === 'moments') {
      const data = await apiRequest(`/moments?userId=${authSession.user.id}`)
      const items = data.items || []
      container.innerHTML = items.length === 0
        ? `<div class="empty"><div style="font-size:48px">📝</div><p>你还没有发布过动态</p></div>`
        : items.map(item => `
            <div class="profile-moment-item">
              <div class="moment-content">${item.content}</div>
              ${item.imageUrl ? `<img class="moment-img" src="${item.imageUrl}">` : ''}
              <div class="moment-meta">👍 ${item.likesCount} · ${formatFindPostTime(item.createdAt)}</div>
            </div>
          `).join('')
    } else if (activeProfileTab === 'saved') {
      const data = await apiRequest('/profile/saved')
      const items = data.items || []
      container.innerHTML = items.length === 0
        ? `<div class="empty"><div style="font-size:48px">⭐</div><p>你还没有收藏的饭局</p></div>`
        : items.map(item => `
            <div class="profile-list-item" data-meal-detail="${item.mealId}">
              <div class="item-title">⭐ <strong>${item.meal.title}</strong></div>
              <div class="item-meta">${item.meal.place} · ${formatMealTime(item.meal.mealTime)}</div>
              <div class="item-date">发起人: ${item.meal.creatorName} · 状态: ${item.meal.status === 'open' ? '招募中' : '已成局'}</div>
            </div>
          `).join('')
    }
    
    bindPageActions()
  } catch (error) {
    container.innerHTML = `<div class="empty"><p>${error.message}</p></div>`
  }
}

function renderFindPosts() {
  const target = screen.querySelector('#find-post-list')
  if (!target) return

  const filtered = activeFindCategory === '全部'
    ? findPosts
    : findPosts.filter(p => p.category.name === activeFindCategory)

  if (filtered.length === 0) {
    target.innerHTML = `<div class="empty-state"><div class="empty-icon">🍽</div><p class="muted">该分类下暂无找饭友帖</p></div>`
    return
  }

  target.innerHTML = filtered.map(post => `
    <div class="post-card" data-find-detail="${post.id}">
      <div class="post-header">
        <img class="post-avatar" src="${post.author.avatar}">
        <div class="post-user-info">
          <div class="post-user-row">
            <span class="post-username">${post.author.name}</span>
            <span class="post-level">Lv.${post.author.level}</span>
            <span class="post-role" style="color:${post.author.roleColor || '#D88BB3'}">${post.author.role}</span>
          </div>
          <span class="post-time">${post.time}</span>
        </div>
      </div>
      <div class="post-body">
        <span class="post-category" style="border-color:${post.category.color};color:${post.category.color}">${post.category.name}</span>
        <p class="post-content">${post.content}</p>
      </div>
      <div class="post-footer">
        <span class="post-waiting">等${post.waitingCount}人</span>
        <div class="post-avatars">
          ${post.joinedAvatars.map(av => `<img class="post-joined-avatar" src="${av}">`).join('')}
        </div>
        <div class="post-spacer"></div>
        <button class="post-join${post.joined ? ' joined' : ''}" data-find-join="${post.id}">${post.joined ? '已约' : '+'}</button>
      </div>
    </div>
  `).join('')
}

async function createMealFromForm() {
  if (!authSession?.token) {
    toast('请先登录再发布饭局')
    navigate('login')
    return
  }

  const title = document.querySelector('#meal-title').value.trim()
  const time = document.querySelector('#meal-time').value.trim()
  const place = document.querySelector('#meal-place').value.trim()
  const people = document.querySelector('#meal-people').value.trim()
  const budget = document.querySelector('#meal-budget').value.trim()
  const note = document.querySelector('#meal-note').value.trim()

  if (!title || !time || !place || !people) {
    toast('标题、时间、地点、人数要先填好')
    return
  }

  try {
    const parsedBudget = parseBudgetRange(budget)
    const data = await apiRequest('/meals', {
      method: 'POST',
      data: {
        title,
        foodType: '校园约饭',
        mealTime: parseMealTime(time),
        place,
        campus: authSession?.profile?.campus || '主校区',
        maxPeople: Number(people) || 4,
        budgetMin: parsedBudget.min,
        budgetMax: parsedBudget.max,
        chatMode: 'balanced',
        description: note || '一起轻松吃个饭。'
      }
    })
    activeMealId = data.meal.id
    toast('饭局已发布')
    render('detail')
  } catch (error) {
    toast(error.message)
  }
}

async function joinActiveMeal() {
  if (!authSession?.token) {
    toast('请先登录再加入饭局')
    navigate('login')
    return
  }

  const joinButton = screen.querySelector('[data-join]')
  if (joinButton) {
    joinButton.disabled = true
    joinButton.textContent = '加入中...'
  }

  try {
    await apiRequest(`/meals/${activeMealId}/join`, { method: 'POST' })
    toast('已加入饭局')
    loadPreviewMealDetail(activeMealId)
  } catch (error) {
    toast(error.message)
    if (joinButton) {
      joinButton.disabled = false
      joinButton.textContent = '想去/加入'
    }
  }
}

function toast(message) {
  const oldToast = document.querySelector('.toast')
  if (oldToast) oldToast.remove()

  const node = document.createElement('div')
  node.className = 'toast'
  node.textContent = message
  document.body.appendChild(node)

  window.setTimeout(() => {
    node.classList.add('show')
  }, 10)

  window.setTimeout(() => {
    node.classList.remove('show')
    window.setTimeout(() => node.remove(), 180)
  }, 1500)
}

function getTasteLabel() {
  const tags = authSession?.profile?.tasteTags || []
  return tags.length ? `${tags.join('、')} ＋` : '你的口味标签 ＋'
}

function getUserInitial() {
  const nickname = authSession?.user?.nickname?.trim()
  return nickname ? Array.from(nickname)[0] : '饭'
}

function splitTags(text) {
  return text
    .split(/[，,\s、]+/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function parseBudgetRange(text) {
  const numbers = (text.match(/\d+/g) || []).map(Number)
  if (numbers.length >= 2) return { min: numbers[0] * 100, max: numbers[1] * 100 }
  if (numbers.length === 1) return { min: numbers[0] * 100, max: numbers[0] * 100 }
  return { min: 2000, max: 4000 }
}

function parseMealTime(text) {
  const match = text.match(/(\d{1,2})[:：](\d{2})/)
  const date = new Date()
  if (text.includes('明天')) date.setDate(date.getDate() + 1)
  if (match) {
    date.setHours(Number(match[1]), Number(match[2]), 0, 0)
  } else {
    date.setHours(18, 30, 0, 0)
  }
  return date.toISOString()
}

function formatBudget(meal) {
  const min = Math.round((meal.budgetMin || 0) / 100)
  const max = Math.round((meal.budgetMax || 0) / 100)
  if (min && max && min !== max) return `¥${min}-${max}/人`
  if (max) return `¥${max}/人`
  return '预算待定'
}

function formatMealTime(value) {
  if (!value) return '时间待定'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function getMealImage(foodType = '') {
  if (/辣|川|火锅|麻辣/.test(foodType)) return img.spicy
  if (/轻|沙拉|咖啡/.test(foodType)) return img.salad
  if (/披萨|西|烤/.test(foodType)) return img.pizza
  return img.noodle
}

async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(authSession?.token ? { Authorization: `Bearer ${authSession.token}` } : {})
    },
    body: options.data ? JSON.stringify(options.data) : undefined
  })
  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.error?.message || '请求失败')
  }
  return data
}

async function loginFromForm() {
  const nickname = document.querySelector('#login-nickname').value.trim()
  const studentNo = document.querySelector('#login-student').value.trim()
  const school = document.querySelector('#login-school').value.trim() || '示例大学'
  if (!nickname) {
    toast('昵称不能为空')
    return
  }

  try {
    const data = await apiRequest('/auth/login', {
      method: 'POST',
      data: { nickname, studentNo, school }
    })
    authSession = data
    window.localStorage.setItem('fanfanPreviewAuth', JSON.stringify(data))
    toast('登录成功')
    render('profile')
  } catch (error) {
    toast(error.message)
  }
}

async function saveProfileFromForm() {
  try {
    const data = await apiRequest('/profile', {
      method: 'PUT',
      data: {
        campus: document.querySelector('#profile-campus').value.trim() || '主校区',
        tasteTags: splitTags(document.querySelector('#profile-taste').value),
        personalityTags: splitTags(document.querySelector('#profile-personality').value),
        budgetPreference: document.querySelector('#profile-budget').value.trim() || '20-40'
      }
    })
    authSession.profile = data.profile
    window.localStorage.setItem('fanfanPreviewAuth', JSON.stringify(authSession))
    toast('资料已保存')
    render('profile')
  } catch (error) {
    toast(error.message)
  }
}

async function handleJoinOrLeaveClick() {
  if (!authSession?.token) {
    toast('请先登录再操作')
    navigate('login')
    return
  }

  const joinButton = screen.querySelector('[data-join]')
  if (joinButton) {
    joinButton.disabled = true
    joinButton.textContent = '请稍候...'
  }

  try {
    const response = await apiRequest(`/meals/${activeMealId}`)
    const meal = response.meal
    const joined = Boolean(meal.participants?.some((item) => item.userId === authSession?.user?.id))

    if (joined) {
      await apiRequest(`/meals/${activeMealId}/leave`, { method: 'POST' })
      toast('已退出饭局')
    } else {
      await apiRequest(`/meals/${activeMealId}/join`, { method: 'POST' })
      toast('已加入饭局')
    }
    loadPreviewMealDetail(activeMealId)
  } catch (error) {
    toast(error.message)
    loadPreviewMealDetail(activeMealId)
  }
}

function updateHomeFilterPills() {
  const container = screen.querySelector('.pills[data-choice-group]')
  if (!container) return
  
  const pills = container.querySelectorAll('.pill')
  if (pills.length >= 4) {
    pills[0].textContent = `${campusFilterOptions[campusFilterIndex]}⌄`
    pills[0].classList.toggle('active', campusFilterIndex > 0)
    
    pills[1].textContent = `${foodFilterOptions[foodFilterIndex]}⌄`
    pills[1].classList.toggle('active', foodFilterIndex > 0)
    
    pills[2].textContent = `${sortFilterOptions[sortFilterIndex]}⌄`
    pills[2].classList.toggle('active', sortFilterIndex > 0)
    
    const hasAdvancedFilter = selectedBudget !== 'all' || selectedPeople !== 'all' || selectedSort !== 'default'
    pills[3].textContent = hasAdvancedFilter ? '已筛选⌄' : '筛选⌄'
    pills[3].classList.toggle('active', hasAdvancedFilter)
  }
}

async function loadPreviewFindPosts() {
  const target = screen.querySelector('#find-post-list')
  if (!target) return

  try {
    const category = activeFindCategory === '全部' ? '' : activeFindCategory
    const data = await apiRequest(`/posts${category ? `?category=${encodeURIComponent(category)}` : ''}`)
    
    const posts = (data.items || []).map(post => ({
      id: post.id,
      author: {
        name: post.author?.nickname || '同学',
        avatar: post.author?.profile?.avatarUrl || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=240&q=80',
        level: 5,
        role: '大学',
        roleColor: '#D88BB3'
      },
      time: post.createdAt ? formatFindPostTime(post.createdAt) : '刚刚',
      category: { name: post.category, color: getFindPostCategoryColor(post.category) },
      content: post.content,
      waitingCount: post.waitingCount || 0,
      joinedAvatars: post.joinedAvatars || [],
      joined: post.joined || false
    }))

    if (posts.length === 0) {
      target.innerHTML = `<div class="empty-state"><div class="empty-icon">🍽</div><p class="muted">该分类下暂无找饭友帖</p></div>`
      return
    }

    target.innerHTML = posts.map(post => `
      <div class="post-card" data-find-detail="${post.id}">
        <div class="post-header">
          <img class="post-avatar" src="${post.author.avatar}">
          <div class="post-user-info">
            <div class="post-user-row">
              <span class="post-username">${post.author.name}</span>
              <span class="post-level">Lv.${post.author.level}</span>
              <span class="post-role" style="color:${post.author.roleColor || '#D88BB3'}">${post.author.role}</span>
            </div>
            <span class="post-time">${post.time}</span>
          </div>
        </div>
        <div class="post-body">
          <span class="post-category" style="border-color:${post.category.color};color:${post.category.color}">${post.category.name}</span>
          <p class="post-content">${post.content}</p>
        </div>
        <div class="post-footer">
          <span class="post-waiting">等${post.waitingCount}人</span>
          <div class="post-avatars">
            ${post.joinedAvatars.map(av => `<img class="post-joined-avatar" src="${av}">`).join('')}
          </div>
          <div class="post-spacer"></div>
          <button class="post-join${post.joined ? ' joined' : ''}" data-find-join="${post.id}">${post.joined ? '已约' : '+'}</button>
        </div>
      </div>
    `).join('')

    bindPageActions()
  } catch (error) {
    target.innerHTML = `<div class="empty"><p>${error.message}</p></div>`
  }
}

async function loadPreviewFindDetail(postId) {
  const target = screen.querySelector('#find-detail-content')
  if (!target) return

  try {
    const data = await apiRequest(`/posts/${postId}`)
    const post = data.post
    
    const author = {
      name: post.author?.nickname || '同学',
      avatar: post.author?.profile?.avatarUrl || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=240&q=80',
      level: 5,
      role: '大学',
      roleColor: '#D88BB3',
      campus: post.author?.profile?.campus || '主校区',
      creditScore: post.author?.creditScore || 95,
      mealCount: 10,
      reviewCount: 5,
      tasteTags: post.author?.profile?.tasteTags || [],
      personalityTags: post.author?.profile?.personalityTags || [],
      budgetPreference: post.author?.profile?.budgetPreference || '20-40',
      desc: post.author?.profile?.description || '这家伙很懒，什么都没写。'
    }

    const restaurant = post.restaurant

    target.innerHTML = `
      <button class="back-link" data-back>‹ 找人</button>

      <!-- 帖子内容区域 -->
      <div class="detail-card">
        <div class="detail-header">
          <img class="detail-avatar" src="${author.avatar}">
          <div class="detail-user-info">
            <div class="detail-user-row">
              <span class="detail-username">${author.name}</span>
              <span class="detail-level">Lv.${author.level}</span>
              <span class="detail-role" style="color:${author.roleColor || '#D88BB3'}">${author.role}</span>
            </div>
            <span class="detail-time">${post.createdAt ? formatFindPostTime(post.createdAt) : '刚刚'} 发布</span>
          </div>
        </div>
        <span class="detail-category" style="border-color:${getFindPostCategoryColor(post.category)};color:${getFindPostCategoryColor(post.category)}">${post.category}</span>
        <p class="detail-content">${post.content}</p>
        <div class="detail-meta">
          <span>等 <strong>${post.waitingCount}</strong> 人</span>
          ${post.joinedAvatars?.length ? `<span style="margin-left:16px">已加入：${post.joinedAvatars.map(av => `<img class="detail-mini-avatar" src="${av}">`).join('')}</span>` : ''}
        </div>
      </div>

      <!-- 发起人信息卡片 -->
      <div class="detail-card">
        <div class="section-title">发起人</div>
        <div class="author-profile">
          <div class="author-top">
            <img class="author-big-avatar" src="${author.avatar}">
            <div class="author-summary">
              <div class="author-name-row">
                <span class="author-name-text">${author.name}</span>
                <span class="author-level">Lv.${author.level}</span>
                <span class="author-role" style="color:${author.roleColor}">${author.role}</span>
              </div>
              <div class="detail-tags">
                ${author.tasteTags.map(t => `<span class="detail-tag taste">${t}</span>`).join('')}
                ${author.personalityTags.map(t => `<span class="detail-tag personality">${t}</span>`).join('')}
              </div>
            </div>
          </div>
          <p class="author-desc">${author.desc}</p>
          <div class="credit-section">
            <div class="credit-score">
              <span class="credit-label">信用分</span>
              <span class="credit-value high">${author.creditScore}</span>
              <span class="credit-sub">信用优秀</span>
            </div>
            <div class="credit-stats">
              <div class="credit-stat">
                <span class="credit-stat-num">${author.mealCount}</span>
                <span class="credit-stat-label">历史约饭</span>
              </div>
              <div class="credit-stat">
                <span class="credit-stat-num">${author.reviewCount}</span>
                <span class="credit-stat-label">获得评价</span>
              </div>
              <div class="credit-stat">
                <span class="credit-stat-num">0</span>
                <span class="credit-stat-label">爽约次数</span>
              </div>
            </div>
            <div class="credit-info-row">
              <span class="credit-item"><strong>校区</strong> ${author.campus}</span>
              <span class="credit-item" style="margin-left:16px"><strong>预算</strong> ¥${author.budgetPreference}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 餐厅信息卡片 -->
      ${restaurant ? `
      <div class="detail-card">
        <div class="section-title">推荐餐厅</div>
        <div class="restaurant-card-detail">
          <img class="restaurant-hero-img" src="${restaurant.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80'}">
          <div class="restaurant-info-detail">
            <div class="restaurant-name-row">
              <span class="restaurant-name-text">${restaurant.name}</span>
              <span class="detail-category" style="border-color:#FF9F43;color:#FF9F43">${restaurant.foodType}</span>
            </div>
            <div class="restaurant-meta">
              <span>⭐ ${restaurant.rating}</span>
              <span style="margin-left:12px">📍 ${restaurant.location}</span>
              <span style="margin-left:12px">💰 ${formatRestaurantPrice(restaurant)}</span>
            </div>
            <div class="detail-tags" style="margin-top:12px">
              ${parseRestaurantTags(restaurant.tags).map(t => `<span class="detail-tag rest">${t}</span>`).join('')}
            </div>
            <p class="restaurant-desc">${restaurant.description}</p>
          </div>
        </div>
      </div>
      ` : ''}

      <!-- 底部操作 -->
      <div class="detail-bottom-actions">
        <button class="detail-btn secondary" data-find-detail-review>评价</button>
        <button class="detail-btn primary${post.joined ? ' joined' : ''}" data-find-detail-join="${post.id}">${post.joined ? '已约' : '约 TA'}</button>
      </div>
      <div style="height:48px"></div>
    `

    bindPageActions()
  } catch (error) {
    target.innerHTML = `<div class="empty"><p>${error.message}</p></div>`
  }
}

function formatFindPostTime(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '刚刚'
  return `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function getFindPostCategoryColor(category) {
  const colors = {
    '约饭': '#FF9F43',
    '探店': '#8FD4D2',
    '夜宵': '#7C5CBF',
    '拼桌': '#54A0FF',
    '咖啡': '#D88BB3'
  }
  return colors[category] || '#FF9F43'
}

screen.addEventListener('scroll', () => {
  if (currentPage !== 'home') return
  const nearBottom = screen.scrollTop + screen.clientHeight >= screen.scrollHeight - 80
  if (nearBottom) loadPreviewMeals({ append: true })
})

// ========== 教务处课表对接与导出 ==========

const SAMPLE_TIMETABLE_COURSES = [
  { courseName: "高等数学 A(2)", dayOfWeek: 1, startPeriod: 1, endPeriod: 2, location: "教二楼 201", teacher: "张教授" },
  { courseName: "大学英语 IV", dayOfWeek: 1, startPeriod: 3, endPeriod: 4, location: "主楼 405", teacher: "Smith" },
  { courseName: "计算机程序设计 (C++)", dayOfWeek: 2, startPeriod: 3, endPeriod: 4, location: "实验楼 302", teacher: "李老师" },
  { courseName: "线性代数", dayOfWeek: 3, startPeriod: 1, endPeriod: 2, location: "教二楼 105", teacher: "王教授" },
  { courseName: "思想道德与法治", dayOfWeek: 4, startPeriod: 1, endPeriod: 2, location: "大报告厅", teacher: "赵老师" },
  { courseName: "体育 (羽毛球)", dayOfWeek: 4, startPeriod: 3, endPeriod: 4, location: "体育馆", teacher: "陈教练" }
];

let currentTimetableData = null;

async function loadTimetableImportPage() {
  const container = screen.querySelector('#timetable-grid-container');
  const slotsContainer = screen.querySelector('#free-slots-summary-container');
  const jsonPreview = screen.querySelector('#json-export-preview');
  if (!container) return;

  // 绑定 Mock Webview 内的登录点击事件
  const mockLoginDiv = screen.querySelector('#cufe-mock-login');
  const mockTimetableDiv = screen.querySelector('#cufe-mock-timetable');
  const loginBtn = screen.querySelector('#btn-cufe-login');
  const webviewStatus = screen.querySelector('#webview-status');

  if (loginBtn && mockLoginDiv && mockTimetableDiv) {
    loginBtn.onclick = (e) => {
      e.preventDefault();
      mockLoginDiv.style.display = 'none';
      mockTimetableDiv.style.display = 'block';
      if (webviewStatus) {
        webviewStatus.textContent = '已登录课表页';
        webviewStatus.style.background = '#e6f7ff';
        webviewStatus.style.color = '#1890ff';
      }
      toast('登录成功！正方教务课表页面渲染完毕。');
    };
  }

  try {
    const data = await apiRequest('/timetable/mine', { method: 'GET' });
    if (data && data.courses && data.courses.length > 0) {
      currentTimetableData = data;
      renderTimetableGrid(data.courses, container);
      renderFreeSlotsSummary(data.freeSlots, slotsContainer);
      if (jsonPreview) jsonPreview.textContent = JSON.stringify(data, null, 2);
    }
  } catch (err) {
    console.log('读取本地课表失败:', err);
  }
}

async function handleImportCourses(courses = []) {
  const container = screen.querySelector('#timetable-grid-container');
  const slotsContainer = screen.querySelector('#free-slots-summary-container');
  const jsonPreview = screen.querySelector('#json-export-preview');
  const webviewText = screen.querySelector('#webview-frame-text');
  const webviewStatus = screen.querySelector('#webview-status');

  if (webviewText) webviewText.innerHTML = `✅ 已成功通过 Webview DOM 抽取 <strong style="color:#096dd9;">${courses.length}</strong> 门课程数据！`;
  if (webviewStatus) {
    webviewStatus.textContent = '解析完成';
    webviewStatus.style.background = '#f6ffed';
    webviewStatus.style.color = '#52c41a';
  }

  try {
    const data = await apiRequest('/timetable/import', {
      method: 'POST',
      data: { courses }
    });
    currentTimetableData = data;
    toast(`成功导出并归档 ${courses.length} 门课程！`);
    if (container) renderTimetableGrid(data.courses, container);
    if (slotsContainer) renderFreeSlotsSummary(data.freeSlots, slotsContainer);
    if (jsonPreview) jsonPreview.textContent = JSON.stringify(data, null, 2);
  } catch (err) {
    toast(err.message || '课表导出失败');
  }
}

function renderTimetableGrid(courses = [], container) {
  const days = ['周一', '周二', '周三', '周四', '周五'];
  
  let html = `
    <table style="width:100%;border-collapse:collapse;font-size:12px;text-align:center;">
      <thead>
        <tr style="background:#f7f7fa;color:#5a5b6a;height:32px;">
          <th style="padding:4px;border:1px solid #f0f0f5;width:12%;">节次</th>
          ${days.map(d => `<th style="padding:4px;border:1px solid #f0f0f5;width:17.6%;">${d}</th>`).join('')}
        </tr>
      </thead>
      <tbody>
  `;

  for (let period = 1; period <= 8; period += 2) {
    const periodLabel = `${period}-${period + 1}节`;
    html += `<tr style="height:54px;"><td style="background:#fafafa;font-weight:bold;color:#8e8f98;border:1px solid #f0f0f5;">${periodLabel}</td>`;
    
    for (let day = 1; day <= 5; day++) {
      const match = courses.find(c => Number(c.dayOfWeek) === day && Number(c.startPeriod) <= period && Number(c.endPeriod) >= period);
      if (match) {
        html += `
          <td style="background:#e6f7ff;color:#096dd9;border:1px solid #bae7ff;padding:4px;border-radius:6px;">
            <strong style="display:block;font-size:11px;">${match.courseName}</strong>
            <span style="font-size:10px;color:#595959;">📍 ${match.location || '教室未定'}</span>
          </td>
        `;
      } else {
        html += `<td style="border:1px solid #f0f0f5;color:#d9d9d9;font-size:11px;">无课</td>`;
      }
    }
    html += `</tr>`;
  }

  html += `</tbody></table>`;
  container.innerHTML = html;
}

function renderFreeSlotsSummary(freeSlots = [], container) {
  if (!container) return;
  if (!freeSlots || freeSlots.length === 0) {
    container.innerHTML = `<div style="font-size:12px;color:#8e8f98;">暂未分析出空闲时段</div>`;
    return;
  }

  container.innerHTML = `
    <div style="font-size:13px;font-weight:700;color:#08091f;margin-bottom:6px;">💡 无课空闲时段智能识别：</div>
    <div style="display:flex;flex-wrap:wrap;gap:6px;">
      ${freeSlots.map(s => `
        <span class="free-slot-tag" style="background:#f6ffed;color:#389e0d;border:1px solid #b7eb8f;padding:4px 10px;border-radius:12px;font-size:12px;font-weight:bold;">
          🌿 ${s.label} (${s.tag})
        </span>
      `).join('')}
    </div>
  `;
}

buttons.forEach((button) => {
  button.addEventListener('click', () => {
    navigate(button.dataset.page)
  })
})

render('home')
