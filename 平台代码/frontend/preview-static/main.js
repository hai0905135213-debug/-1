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
        <div class="search"><strong>本校⌄</strong><span class="muted">今天吃什么</span></div>
        <strong>⌖</strong>
      </div>
      <section class="section">
        <div class="section-title">精选专辑 ›</div>
        <div class="albums">
          <div class="album"><img src="${img.salad}"><strong>一食堂接头指南</strong><span class="muted">本校饭搭子严选</span></div>
          <div class="album"><img src="${img.noodle}"><strong>校门口 Best15</strong><span class="muted">下课后再去</span></div>
          <div class="album"><img src="${img.pizza}"><strong>社恐友好饭局</strong><span class="muted">安静吃也舒服</span></div>
        </div>
      </section>
      <section class="section">
        <div class="section-title">今日饭局</div>
        <p class="muted">从校园真实约饭里挑出来，好吃和合拍都重要</p>
        <div class="pills" data-choice-group><button class="pill active">全校⌄</button><button class="pill">品类⌄</button><button class="pill">时间⌄</button><button class="pill">筛选⌄</button></div>
      </section>
      <div id="created-meals"></div>
      <div class="meal" data-detail><img src="${img.noodle}"><div><h3>今晚一食堂吃面，缺 2 人 <button class="want-btn" data-want>♡</button></h3><div class="muted">一食堂二楼 · 300m · ¥20/人</div><span class="tag">3 人想去</span><span class="tag">米粉面馆</span><div class="quote">同学A：想找吃饭节奏差不多的，轻松聊天就行。</div></div></div>
      <div class="meal"><img src="${img.spicy}"><div><h3>校门口麻辣烫拼桌 <button class="want-btn active" data-want>♡</button></h3><div class="muted">东门小吃街 · 800m · ¥30/人</div><span class="tag">5 人推荐</span><span class="tag">麻辣烫</span><div class="quote">下课以后去，最好能凑到 3 到 4 个人。</div></div></div>
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
      <div class="profile-hero"><div class="stats"><div><strong>3</strong><br><span>关注</span></div><div><strong>2</strong><br><span>饭搭子</span></div><div><strong>8</strong><br><span>好评与想去</span></div><button class="edit" data-go-edit>编辑资料</button></div><h2>${authSession ? `${authSession.user.nickname}，今天吃什么？` : '说点什么吧...'}</h2><button class="quiet" data-go-edit>${getTasteLabel()}</button></div>
      <div class="profile-panel"><div class="section-title">我的饭局</div><div class="empty"><div style="font-size:56px">🍽</div><p>还没有发起饭局，快去创建一个吧</p><button class="primary" data-go-publish>新建饭局</button></div><div class="pills" data-choice-group><button class="pill active">去过</button><button class="pill">想去</button><button class="pill">动态</button><button class="pill">收藏</button></div><div class="empty"><div style="font-size:48px">☕</div><p>哪次饭局让你印象深刻</p><button class="primary" data-go-review>发布评价</button></div>${authSession ? '' : '<button class="secondary full-width" data-go-login>登录账号</button>'}</div>
    </div>
  `,
  detail: `
    <div>
      <div style="position:relative"><img class="hero" src="${img.noodle}"><button class="icon-btn dark" data-back style="position:absolute;left:16px;top:18px">‹</button><button class="icon-btn dark" data-toast="已复制分享链接" style="position:absolute;right:16px;top:18px">↗</button></div>
      <div class="detail-panel"><div class="detail-title">一食堂牛肉面饭局</div><span class="tag">值得一起去吃</span><span class="tag">第 2 校园饭局</span><p>米粉面馆 ｜ 一食堂二楼 ｜ ¥20/人</p><hr><p><strong>可加入 今天 18:20</strong><br><span class="muted">今晚饭点 · 2/4 人</span></p><p><strong>一食堂二楼靠窗区域 ›</strong><br><span class="muted">距离你 300m 步行 4 分钟</span></p><div class="section-title">推荐吃法</div><div class="dishes"><div class="dish"><img src="${img.noodle}">番茄牛肉面</div><div class="dish"><img src="${img.spicy}">炸猪排</div><div class="dish"><img src="${img.pizza}">辣肉臊子</div></div><div class="section-title">饭搭子评价</div><div class="quote">面汤稳定，排队不算久。第一次和饭搭子见面选这里比较稳。</div></div>
      <div class="bottom-actions"><button class="secondary" data-go-review>评价</button><button class="primary" data-join>想去/加入</button></div>
    </div>
  `,
  login: `
    <div class="page form">
      <div class="title">登录饭搭子</div>
      <p class="muted">登录后可以保存资料、发布评价和加入饭局。</p>
      <label>昵称</label><input id="login-nickname" value="${authSession?.user?.nickname || '小林'}" placeholder="例如：小林">
      <label>学号</label><input id="login-student" value="${authSession?.user?.studentNo || '2026001'}" placeholder="例如：2026001">
      <label>学校</label><input id="login-school" value="${authSession?.user?.school || '示例大学'}" placeholder="例如：示例大学">
      <button class="primary" data-login>登录 / 注册</button>
      <button class="secondary full-width" data-login-demo>使用示例账号</button>
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
const createdMeals = []
let previousPage = 'home'
let currentPage = 'home'
let reviewRating = 5
let activeFindCategory = '全部'

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
  if (page === 'find') renderFindPosts()
  if (page.startsWith && page.startsWith('find-detail:')) renderFindDetail(page)
  renderCreatedMeals()
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
    button.addEventListener('click', (event) => {
      event.stopPropagation()
      button.classList.toggle('active')
      toast(button.classList.contains('active') ? '已加入想去' : '已取消想去')
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
    joinButton.addEventListener('click', () => {
      joinButton.textContent = '已加入'
      joinButton.disabled = true
      toast('已加入饭局')
    })
  }

  const loginButton = screen.querySelector('[data-go-login]')
  if (loginButton) loginButton.addEventListener('click', () => navigate('login'))

  const editButton = screen.querySelector('[data-go-edit]')
  if (editButton) editButton.addEventListener('click', () => requireLoginThen('edit'))

  const reviewButton = screen.querySelector('[data-go-review]')
  if (reviewButton) reviewButton.addEventListener('click', () => requireLoginThen('review'))

  const loginSubmit = screen.querySelector('[data-login]')
  if (loginSubmit) loginSubmit.addEventListener('click', loginFromForm)

  const loginDemo = screen.querySelector('[data-login-demo]')
  if (loginDemo) {
    loginDemo.addEventListener('click', () => {
      document.querySelector('#login-nickname').value = '小林'
      document.querySelector('#login-student').value = '2026001'
      document.querySelector('#login-school').value = '示例大学'
      loginFromForm()
    })
  }

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
      renderFindPosts()
    })
  })

  screen.querySelectorAll('[data-find-join]').forEach((btn) => {
    btn.addEventListener('click', (event) => {
      event.stopPropagation()
      const postId = Number(btn.dataset.findJoin)
      const post = findPosts.find((p) => p.id === postId)
      if (post) {
        post.joined = !post.joined
        renderFindPosts()
        toast(post.joined ? '已发送约饭请求' : '已取消约饭请求')
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
    btn.addEventListener('click', (event) => {
      event.stopPropagation()
      const postId = Number(btn.dataset.findDetailJoin)
      const post = findPosts.find((p) => p.id === postId)
      if (post) {
        post.joined = !post.joined
        renderFindDetail(`find-detail:${postId}`)
        toast(post.joined ? '已发送约饭请求' : '已取消约饭请求')
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
            <span>💰 ¥${(restaurant.avgPrice / 100).toFixed(0)}/人</span>
          </div>
          <div class="detail-tags">
            ${restaurant.tags.map(t => `<span class="detail-tag rest">${t}</span>`).join('')}
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

function renderCreatedMeals() {
  const target = screen.querySelector('#created-meals')
  if (!target || createdMeals.length === 0) return

  target.innerHTML = createdMeals.map((meal) => `
    <div class="meal">
      <img src="${img.salad}">
      <div>
        <h3>${meal.title} <button class="want-btn active" data-want>♡</button></h3>
        <div class="muted">${meal.place} · ${meal.time} · ${meal.budget}</div>
        <span class="tag">${meal.people} 人局</span><span class="tag">新发布</span>
        <div class="quote">${meal.note || '还没有补充说明，等饭搭子来聊。'}</div>
      </div>
    </div>
  `).join('')
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

function createMealFromForm() {
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

  createdMeals.unshift({
    title,
    time,
    place,
    people,
    budget: budget || '预算待定',
    note
  })
  toast('饭局已发布')
  render('home')
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

async function submitReviewFromForm() {
  const mealId = document.querySelector('#review-meal').value.trim() || '1'
  const targetUserId = Number(document.querySelector('#review-target').value || 1)
  const content = document.querySelector('#review-content').value.trim()
  if (!content) {
    toast('先写一句评价')
    return
  }

  try {
    await apiRequest(`/meals/${mealId}/reviews`, {
      method: 'POST',
      data: { targetUserId, rating: reviewRating, content }
    })
    toast('评价已发布')
    render('profile')
  } catch (error) {
    toast(error.message)
  }
}

buttons.forEach((button) => {
  button.addEventListener('click', () => {
    navigate(button.dataset.page)
  })
})

render('home')
