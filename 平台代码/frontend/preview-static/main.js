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
        <div class="mascot">饭</div>
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
    <div class="page">
      <div><span class="title">找人</span> <span class="muted">本校值得一起吃的饭搭子</span></div>
      <div class="rank-tabs" data-choice-group><div class="active">⚑<br>去过</div><div>♥<br>想去</div><div>●<br>好评</div></div>
      <div class="pills" data-choice-group><button class="pill active">全部</button><button class="pill">食堂</button><button class="pill">夜宵</button><button class="pill">咖啡</button></div>
      ${['米雪食记','不是在吃就是在吃的路上','清淡口同学','amor27 的饭路'].map((name, i) => `<div class="person"><div class="rank">${i + 1}</div><img src="${img.avatar}"><div class="grow"><strong>${name}</strong><div class="muted">校园约饭活跃用户</div></div><div class="score">${[36,28,21,18][i]}</div></div>`).join('')}
    </div>
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
      <div class="profile-panel"><div class="section-title">我的饭局</div><div class="empty"><div style="font-size:56px">🍽</div><p>还没有发起饭局，快去创建一个吧</p><button class="primary" data-go-publish>新建饭局</button></div><div class="pills" data-choice-group><button class="pill active">去过</button><button class="pill">想去</button><button class="pill">动态</button><button class="pill">收藏</button></div><div class="empty"><div style="font-size:48px">☕</div><p>哪次饭局让你印象深刻</p><button class="primary" data-go-review>发布评价</button></div><button class="secondary full-width" data-go-login>${authSession ? '切换账号' : '登录账号'}</button></div>
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

function render(page) {
  screen.innerHTML = pages[page]
  currentPage = page
  screen.scrollTop = 0
  buttons.forEach((button) => button.classList.toggle('active', button.dataset.page === page))
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
