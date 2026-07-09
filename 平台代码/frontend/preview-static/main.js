const img = {
  noodle: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=800&q=80',
  spicy: 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=800&q=80',
  pizza: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=800&q=80',
  salad: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80',
  avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=240&q=80'
}

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
        <div class="pills"><button class="pill active">全校⌄</button><button class="pill">品类⌄</button><button class="pill">时间⌄</button><button class="pill">筛选⌄</button></div>
      </section>
      <div class="meal" data-detail><img src="${img.noodle}"><div><h3>今晚一食堂吃面，缺 2 人 <button class="want-btn">♡</button></h3><div class="muted">一食堂二楼 · 300m · ¥20/人</div><span class="tag">3 人想去</span><span class="tag">米粉面馆</span><div class="quote">同学A：想找吃饭节奏差不多的，轻松聊天就行。</div></div></div>
      <div class="meal"><img src="${img.spicy}"><div><h3>校门口麻辣烫拼桌 <button class="want-btn active">♡</button></h3><div class="muted">东门小吃街 · 800m · ¥30/人</div><span class="tag">5 人推荐</span><span class="tag">麻辣烫</span><div class="quote">下课以后去，最好能凑到 3 到 4 个人。</div></div></div>
    </div>
  `,
  find: `
    <div class="page">
      <div><span class="title">找人</span> <span class="muted">本校值得一起吃的饭搭子</span></div>
      <div class="rank-tabs"><div class="active">⚑<br>去过</div><div>♥<br>想去</div><div>●<br>好评</div></div>
      <div class="pills"><button class="pill active">全部</button><button class="pill">食堂</button><button class="pill">夜宵</button><button class="pill">咖啡</button></div>
      ${['米雪食记','不是在吃就是在吃的路上','清淡口同学','amor27 的饭路'].map((name, i) => `<div class="person"><div class="rank">${i + 1}</div><img src="${img.avatar}"><div class="grow"><strong>${name}</strong><div class="muted">校园约饭活跃用户</div></div><div class="score">${[36,28,21,18][i]}</div></div>`).join('')}
    </div>
  `,
  publish: `
    <div class="page form">
      <div class="title">发布饭局</div>
      <p class="muted">把吃什么、几点、哪里、几个人先说清楚。</p>
      <label>饭局标题</label><input placeholder="例如：今晚拼麻辣烫">
      <label>时间</label><input placeholder="例如：今天 18:30">
      <label>地点</label><input placeholder="例如：一食堂二楼">
      <label>人数</label><input placeholder="例如：4">
      <label>预算</label><input placeholder="例如：20元以内">
      <label>补充说明</label><textarea rows="4" placeholder="口味、忌口、聊天偏好等"></textarea>
      <button class="primary">发布饭局</button>
    </div>
  `,
  feed: `
    <div class="page">
      <div class="feed-tabs"><span class="muted title">关注</span><strong>推荐</strong></div>
      <div class="pills"><button class="pill active">全部</button><button class="pill">约饭</button><button class="pill">工作餐</button><button class="pill">夜宵</button></div>
      <article class="feed-card"><div class="user"><img class="avatar" src="${img.avatar}"><div><h3>米雪食记 v</h3><div class="muted">认为这家适合 饭搭子初见</div></div></div><img src="${img.noodle}"><p>这家窗口出餐快，适合下课十分钟内集合，聊天压力也不大。</p><div class="restaurant"><strong>一食堂二楼牛肉面 ›</strong><br><span>一食堂 · 300m</span></div></article>
      <article class="feed-card"><div class="user"><img class="avatar" src="${img.avatar}"><div><h3>小马吃吃吃 v</h3><div class="muted">认为这家适合 夜宵拼桌</div></div></div><img src="${img.spicy}"><p>四个人拼很舒服，预算能压到 25 左右，适合晚课后一起去。</p><div class="restaurant"><strong>东门麻辣烫 ›</strong><br><span>东门小吃街 · 800m</span></div></article>
    </div>
  `,
  profile: `
    <div>
      <div class="profile-hero"><div class="stats"><div><strong>3</strong><br><span>关注</span></div><div><strong>2</strong><br><span>饭搭子</span></div><div><strong>8</strong><br><span>好评与想去</span></div><button class="edit">编辑资料</button></div><h2>说点什么吧...</h2><button class="quiet">你的口味标签 ＋</button></div>
      <div class="profile-panel"><div class="section-title">我的饭局</div><div class="empty"><div style="font-size:56px">🍽</div><p>还没有发起饭局，快去创建一个吧</p><button class="primary">新建饭局</button></div><div class="pills"><button class="pill active">去过</button><button class="pill">想去</button><button class="pill">动态</button><button class="pill">收藏</button></div><div class="empty"><div style="font-size:48px">☕</div><p>哪次饭局让你印象深刻</p><button class="primary">发布评价</button></div></div>
    </div>
  `,
  detail: `
    <div>
      <div style="position:relative"><img class="hero" src="${img.noodle}"><button class="icon-btn dark" style="position:absolute;left:16px;top:18px">‹</button><button class="icon-btn dark" style="position:absolute;right:16px;top:18px">↗</button></div>
      <div class="detail-panel"><div class="detail-title">一食堂牛肉面饭局</div><span class="tag">值得一起去吃</span><span class="tag">第 2 校园饭局</span><p>米粉面馆 ｜ 一食堂二楼 ｜ ¥20/人</p><hr><p><strong>可加入 今天 18:20</strong><br><span class="muted">今晚饭点 · 2/4 人</span></p><p><strong>一食堂二楼靠窗区域 ›</strong><br><span class="muted">距离你 300m 步行 4 分钟</span></p><div class="section-title">推荐吃法</div><div class="dishes"><div class="dish"><img src="${img.noodle}">番茄牛肉面</div><div class="dish"><img src="${img.spicy}">炸猪排</div><div class="dish"><img src="${img.pizza}">辣肉臊子</div></div><div class="section-title">饭搭子评价</div><div class="quote">面汤稳定，排队不算久。第一次和饭搭子见面选这里比较稳。</div></div>
      <div class="bottom-actions"><button class="secondary">评价</button><button class="primary">想去/加入</button></div>
    </div>
  `
}

const screen = document.querySelector('#screen')
const buttons = document.querySelectorAll('.tabbar button')

function render(page) {
  screen.innerHTML = pages[page]
  screen.scrollTop = 0
  buttons.forEach((button) => button.classList.toggle('active', button.dataset.page === page))

  const detailLink = screen.querySelector('[data-detail]')
  if (detailLink) {
    detailLink.addEventListener('click', () => render('detail'))
  }
}

buttons.forEach((button) => {
  button.addEventListener('click', () => render(button.dataset.page))
})

render('home')
