/* 原版界面的业务接入层：保留 main.js 的布局与 style.css，不复制另一套后端规则。
 * 资格、截止、人数、成员权限全部由服务端裁决；这里仅负责展示和提交。
 */
(() => {
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
  const persist = () => localStorage.setItem('fanfanPreviewAuth', JSON.stringify(authSession))
  const campusNames = {cufe_shahe:'沙河校区',cufe_nanlu:'学院南路校区'}
  const statusNames = {open:'招募中',matched:'已成局',cancelled:'已取消',finished:'已完成',pending:'待审批',approved:'已通过',rejected:'已拒绝',withdrawn:'已撤回',closed:'已关闭',blocked:'已停用'}
  const back = '<button class="back-link" data-back>‹ 返回</button>'
  const empty = text => `<div class="empty"><p>${escape(text)}</p></div>`
  const fail = error => toast(error.message || '请求失败，请重试')
  const recruitmentHint = meal => {
    if(meal.status==='cancelled')return '饭局已取消，不再接收报名'
    if(meal.status==='finished')return '饭局已完成，正式成员可评价队友'
    if(meal.status==='matched')return '已经满员，暂不接收新申请'
    const left=Date.parse(meal.deadline)-Date.now(),minutes=Math.ceil(left/60000)
    if(meal.recruitmentClosed||left<=0)return '报名已截止，不能新增申请或审批'
    if(!Number.isFinite(left))return '截止时间待刷新，请以服务端状态为准'
    const duration=minutes>=1440?`${Math.floor(minutes/1440)}天${Math.floor(minutes%1440/60)}小时`:minutes>=60?`${Math.floor(minutes/60)}小时${minutes%60}分钟`:`${minutes}分钟`
    return `距报名截止约${duration} · 剩余${Math.max(0,meal.maxPeople-meal.currentPeople)}个正式名额，申请不占位`
  }
  const select = (id, values) => `<select id="${id}">${values.map(([v,label])=>`<option value="${escape(v)}">${escape(label)}</option>`).join('')}</select>`
  const bind = (selector, handler) => screen.querySelectorAll(selector).forEach(old => {
    const node = old.cloneNode(true); old.replaceWith(node)
    node.addEventListener('click', async event => {
      event.stopPropagation(); if(node.disabled)return; node.disabled=true
      try { await handler(node,event) } catch(error) { fail(error) } finally { node.disabled=false }
    })
  })
  let venue = null, detailMeal = null, poll = null, queryVersion = 0
  const history = []
  let goingBack = false
  let filters = {cuisines:[],tags:[],maxDistance:''}, facets = {cuisines:[],tags:{}}
  let notifications = [], notificationCursor = null, notificationHasMore = true
  let messageCursor = 0, messageItems = [], messageHasMore = false, messageBusy = false, detailVersion = 0
  const originalRender = render, originalBind = bindPageActions, originalProfile = loadProfilePage
  const logged = () => {
    if(authSession?.token)return true
    toast('请先登录'); navigate('login'); return false
  }
  const openMeal = id => { activeMealId=Number(id); navigate('detail') }
  const action = async (name,data={}) => {
    await apiRequest(`/meals/${activeMealId}/${name}`,{method:'POST',data})
    await loadPreviewMealDetail(activeMealId)
  }

  // 旧 dev-token 无法访问新接口，过期后清理，避免界面显示假登录。
  apiRequest = async (path, options={}) => {
    const requestToken=authSession?.token;
    const response=await fetch(API_BASE_URL+path,{method:options.method||'GET',signal:AbortSignal.timeout(15000),
      headers:{'Content-Type':'application/json',...(authSession?.token?{Authorization:`Bearer ${authSession.token}`}:{})},
      body:options.data===undefined?undefined:JSON.stringify(options.data)})
    const data=await response.json()
    if(!response.ok){
      if(response.status===401&&authSession?.token===requestToken){authSession=null;localStorage.removeItem('fanfanPreviewAuth')}
      const error=new Error(data.error?.message||'请求失败');Object.assign(error,{code:data.error?.code,status:response.status});throw error
    }
    return data
  }
  formatBudget = meal => meal.budgetMax ? `¥${meal.budgetMin===meal.budgetMax?meal.budgetMax:`${meal.budgetMin}–${meal.budgetMax}`}/人` : '预算未填写'

  pages.login=`<div class="page form login-page-card">${back}<div class="login-header"><div class="login-avatar-wrap">🍲</div><div class="title">登录饭饭之交</div></div>
    <p class="muted">本地开发登录，仅用于联调。正式微信登录请在小程序使用，不收集学号和密码。</p>
    <label>昵称</label><input id="login-nickname" maxlength="32" placeholder="输入测试昵称">
    <button class="primary full-width" data-login>开发登录</button><p class="muted">首次登录后需管理员批准体验资格才能发布和报名；浏览餐厅无需登录。</p></div>`
  pages.publish=`<div class="page form">${back}<div class="title">发布饭局</div><p class="muted">预约组队，报名需发起人审批；发布后关键条件不可修改。</p>
    <label>饭局标题</label><input id="meal-title" maxlength="100" placeholder="今晚一起吃点什么？">
    <label>招募模式</label>${select('meal-recruit',[['appointment','预约招募'],['limited','限时15分钟招募（仍需审批）']])}<p class="muted">限时模式截止时间由服务器限制为发布后15分钟或就餐时间，以较早者为准。</p>
    <label>就餐校区</label>${select('meal-campus',Object.entries(campusNames))}
    <label>就餐时间</label><input id="meal-time" type="datetime-local">
    <label>报名截止（留空默认就餐时间）</label><input id="meal-deadline" type="datetime-local">
    <label>具体餐厅 / 手填地点</label><input id="meal-place" maxlength="500" placeholder="填写明确的集合地点"><p id="venue-hint" class="muted"></p>
    <button class="secondary" data-clear-venue>改为手填地点</button>
    <label>总人数（含发起人，2–12人）</label><input id="meal-people" type="number" min="2" max="12" value="4">
    <label>每人预算（元，例如20-40，可留空）</label><input id="meal-budget" placeholder="20-40">
    <label>聊天模式</label>${select('meal-chat',[['balanced','随意聊聊'],['quiet','安静吃饭'],['chatty','热闹畅聊']])}
    <label>临时话题（逗号分隔，最多5个）</label><input id="meal-topics" placeholder="探店、电影">
    <label>公开补充说明</label><textarea id="meal-note" maxlength="1000" rows="3"></textarea>
    <label>集合说明（仅正式队员可见）</label><textarea id="meal-meeting" maxlength="500" rows="2"></textarea>
    <button class="primary" data-create-meal>发布饭局</button></div>`
  pages.myMeals=`<div class="page">${back}<div class="title">我的饭局</div><div class="pills">
    ${[['created','我发起的'],['pending','待审批'],['joined','已加入'],['ended','已结束']].map(([v,n])=>`<button class="pill" data-my-meal-tab="${v}">${n}</button>`).join('')}</div><div id="my-meal-list"></div></div>`
  pages.detail='<div id="detail-content"><div class="empty"><p>饭局详情加载中...</p></div></div>'
  pages.edit=`<div class="page form">${back}<div class="title">编辑资料</div><label>校区</label>${select('profile-campus',Object.entries(campusNames))}<label>口味标签</label><input id="profile-taste"><label>性格 / 吃饭标签</label><input id="profile-personality"><label>预算偏好</label><input id="profile-budget" placeholder="20-40"><button class="primary" data-save-profile>保存资料</button></div>`
  for(const [key,title] of [['applications','申请管理'],['notifications','站内通知'],['admin','体验资格与举报管理']])
    pages[key]=`<div class="page">${back}<div class="title">${title}</div><div id="${key}-content">加载中…</div></div>`
  pages.review=`<div class="page form">${back}<div class="title">评价队友</div><p class="muted">仅限已完成饭局的正式队员，每位队友每场只能评价一次。</p><div id="review-targets"></div>
    <label>评分</label>${select('review-score',[5,4,3,2,1].map(n=>[n,`${n} 星`]))}<label>评价内容</label><textarea id="review-content" maxlength="500" rows="4"></textarea><button class="primary" data-submit-review>提交评价</button></div>`

  render = page => {
    if(page!==currentPage&&!goingBack)history.push(currentPage)
    clearInterval(poll); poll=null; detailVersion++
    originalRender(page)
    // 原样保留首页专辑、卡片、底栏；隐藏尚未验证的教务代理入口。
    screen.querySelectorAll('[data-go-timetable]').forEach(x=>x.hidden=true)
    if(page==='login' && !['127.0.0.1','localhost'].includes(location.hostname)){
      screen.querySelector('[data-login]').disabled=true
      screen.querySelector('.muted').textContent='网页不提供正式登录，请使用微信小程序。'
    }
    if(page==='publish'){
      const input=screen.querySelector('#meal-place')
      if(venue){input.value=venue.label;input.readOnly=true;screen.querySelector('#venue-hint').textContent='已固定具体分店，发布后不会随校区切换。'}
      else {input.value='';input.readOnly=false;screen.querySelector('#meal-title').value=''}
      screen.querySelector('#meal-campus').value=venue?.campus||(['cufe_shahe','cufe_shahe','cufe_nanlu'][campusFilterIndex])
      const tomorrow=new Date(Date.now()+86400000);tomorrow.setMinutes(tomorrow.getMinutes()-tomorrow.getTimezoneOffset())
      screen.querySelector('#meal-time').value=tomorrow.toISOString().slice(0,16)
    }
    if(page==='edit'){
      const profile=authSession?.profile||{}
      screen.querySelector('#profile-campus').value=Object.entries(campusNames).find(([code,name])=>profile.campus===code||profile.campus===name)?.[0]||'cufe_shahe'
      for(const [id,value] of [['taste',profile.tasteTags?.join('、')],['personality',profile.personalityTags?.join('、')],['budget',profile.budgetPreference]])screen.querySelector('#profile-'+id).value=value||''
    }
    if(page==='applications')loadApplications().catch(fail)
    if(page==='notifications'){notifications=[];notificationCursor=null;notificationHasMore=true;loadNotifications().catch(fail)}
    if(page==='admin')loadAdmin().catch(fail)
    if(page==='review')loadReviewTargets().catch(fail)
    if(page==='feed')loadFeed().catch(fail)
  }
  loginFromForm = async () => {
    const data=await apiRequest('/auth/login',{method:'POST',data:{nickname:screen.querySelector('#login-nickname').value.trim()}})
    authSession=data;persist();toast('登录成功');render('profile')
  }
  createMealFromForm = async () => {
    if(!logged())return
    const val=id=>screen.querySelector('#'+id).value.trim()
    const time=new Date(val('meal-time')), deadline=val('meal-deadline')?new Date(val('meal-deadline')):time
    if(!Number.isFinite(time.getTime())||!Number.isFinite(deadline.getTime()))throw new Error('请选择就餐时间和截止时间')
    const budget=val('meal-budget').match(/\d+(?:\.\d+)?/g)||[]
    const data=await apiRequest('/meals',{method:'POST',data:{title:val('meal-title'),campus:val('meal-campus'),mealTime:time.toISOString(),deadline:deadline.toISOString(),
      place:val('meal-place'),maxPeople:Number(val('meal-people')),budgetMin:Number(budget[0]||0),budgetMax:Number(budget[1]||budget[0]||0),
      description:val('meal-note'),meetingNote:val('meal-meeting'),chatMode:val('meal-chat'),topicTags:splitTags(val('meal-topics')),recruitMode:val('meal-recruit'),
      ...(venue?{restaurantId:venue.id,poiId:venue.poiId}:{})}})
    venue=null;activeRestaurantName='';toast('饭局已发布');openMeal(data.meal.id)
  }
  handleJoinOrLeaveClick = async () => {
    if(!logged())return
    const meal=(await apiRequest(`/meals/${activeMealId}`)).meal
    if(meal.creatorId===authSession.user.id)throw new Error('发起人不能直接退局，请取消饭局')
    const name=meal.joined?'leave':meal.applicationStatus==='pending'?'withdraw':'apply'
    const note=name==='apply'?(prompt('报名说明（可留空，最多200字）')??null):''
    if(note===null)return
    if(note.length>200)throw new Error('报名说明最多200字，请精简后提交')
    if(name!=='apply'&&!confirm(name==='withdraw'?'撤回后可以再次报名，确定撤回申请？':'退出后将失去队内留言访问权限，再加入需要重新审批。确定退出？'))return
    await action(name,{note});toast(name==='apply'?'申请已提交，等待发起人审批':name==='withdraw'?'已撤回申请':'已退出饭局')
  }

  // 同一详情页轮询只追加新留言；切页/退出立刻清空，旧请求不得回填。
  loadPreviewMealDetail = async id => {
    const target=screen.querySelector('#detail-content');if(!target)return
    const version=++detailVersion;clearInterval(poll)
    try{
      const meal=(await apiRequest(`/meals/${encodeURIComponent(id)}`)).meal
      if(version!==detailVersion||!target.isConnected)return
      activeMealId=meal.id;detailMeal=meal
      target.innerHTML=renderMealDetail(meal)
      const bar=screen.querySelector('.bottom-actions');if(bar)bar.hidden=true
      bindPageActions()
      messageCursor=0;messageItems=[]
      if(meal.joined){await loadMessages(version);poll=setInterval(()=>{if(!document.hidden)loadMessages(version).catch(fail)},5000)}
    }catch(e){if(target.isConnected)target.innerHTML=empty(e.message)}
  }
  renderMealDetail = meal => {
    const uid=authSession?.user?.id, host=uid===meal.creatorId, live=['open','matched'].includes(meal.status)
    const before=Date.now()<Date.parse(meal.mealTime), recruiting=meal.status==='open'&&Date.now()<Date.parse(meal.deadline)
    const canApply=!host&&!meal.joined&&recruiting&&meal.applicationStatus!=='rejected'
    return `<div style="position:relative"><img class="hero" src="${escape(getMealImage(meal.foodType))}"><button class="icon-btn dark" data-back style="position:absolute;left:16px;top:18px">‹</button></div>
      <div class="detail-panel"><div class="detail-title">${escape(meal.title)}</div><span class="tag">${escape(statusNames[meal.status])}</span>
      <p>${escape(meal.place)}</p><p>${escape(campusNames[meal.campus]||meal.campus)} · ${escape(formatMealTime(meal.mealTime))} · ${escape(formatBudget(meal))}</p>
      <p class="muted">${meal.recruitMode==='limited'?'限时15分钟招募 · ':''}${meal.recruitmentClosed?'报名已截止 · ':''}报名截止 ${escape(formatMealTime(meal.deadline))} · ${meal.currentPeople}/${meal.maxPeople}人（含发起人）</p>
      <p class="quote" data-recruitment-hint>${escape(recruitmentHint(meal))}</p>
      ${meal.applicationStatus==='pending'?'<p class="muted">等待发起人审批，通过后才能查看集合说明和队内留言。申请尚未占用名额。</p>':meal.applicationStatus==='rejected'?'<p class="muted">本场申请未通过，不能再次申请，可以寻找其他饭局。</p>':meal.applicationStatus==='closed'?'<p class="muted">该申请已关闭，不会自动恢复。若饭局重新开放，请主动重新报名。</p>':''}
      <p>${escape(meal.description)}</p><p>${(meal.topicTags||[]).map(t=>`<span class="tag">${escape(t)}</span>`).join('')}</p>
      <div class="section-title">正式队员</div><p>${meal.participants.map(p=>escape(p.nickname)).join('、')}</p>
      ${meal.applicationStatus?`<p>我的申请：${escape(statusNames[meal.applicationStatus])}</p>`:''}
      <div class="meal-actions-row">
      <button class="meal-action-btn" data-refresh-meal>刷新状态</button>
      ${host?`<button class="meal-action-btn" data-manage-applications>管理申请（${meal.pendingCount}）</button>`:''}
      ${canApply||meal.applicationStatus==='pending'||meal.joined&&!host&&live&&before?`<button class="primary" data-join>${meal.joined?'退出饭局':meal.applicationStatus==='pending'?'撤回申请':'申请加入'}</button>`:''}
      ${host&&live?'<button class="meal-action-btn danger" data-cancel-meal>取消饭局</button>':''}
      ${host&&live&&!before&&meal.currentPeople>=2?'<button class="meal-action-btn" data-finish-meal>标记完成</button>':''}
      ${host&&live?'<button class="meal-action-btn" data-share-post>发布到找人</button>':''}
      ${uid?'<button class="meal-action-btn" data-save-meal>收藏 / 取消收藏</button>':''}
      ${uid&&!host?'<button class="meal-action-btn warn" data-report-meal>举报</button>':''}
      ${meal.joined&&meal.status==='finished'?'<button class="primary" data-go-review>评价队友</button>':''}</div>
      ${meal.joined?`<div class="section-title">集合说明 · 仅队员可见</div><p>${escape(meal.meetingNote||'未填写')}</p><div class="section-title">队内留言</div><div id="team-messages"></div><button class="secondary" data-more-messages hidden>加载更多留言</button>
      ${live?'<textarea id="team-message-input" maxlength="500" rows="3" placeholder="仅正式队员可见，最多500字"></textarea><button class="primary" data-send-message>发送留言</button>':'<p class="muted">饭局已结束，留言仅可阅读。</p>'}`:'<p class="muted">通过审批后才能查看集合说明和队内留言。</p>'}</div>`
  }
  async function loadMessages(version=detailVersion){
    if(messageBusy)return; messageBusy=true
    const mealId=activeMealId
    try{
      const data=await apiRequest(`/meals/${mealId}/messages?after=${messageCursor}`)
      if(version!==detailVersion||mealId!==activeMealId||currentPage!=='detail')return
      messageCursor=data.nextCursor;messageHasMore=data.hasMore
      for(const item of data.items)if(!messageItems.some(x=>x.id===item.id))messageItems.push(item)
      const target=screen.querySelector('#team-messages');if(target)target.innerHTML=messageItems.length?messageItems.map(m=>`<div class="quote"><strong>${escape(m.nickname)}</strong> <span class="muted">${escape(formatMealTime(m.created_at))}</span><p>${escape(m.content)}</p></div>`).join(''):empty('还没有留言')
      const more=screen.querySelector('[data-more-messages]');if(more)more.hidden=!messageHasMore
    }catch(e){if(version===detailVersion){clearInterval(poll);messageItems=[];const target=screen.querySelector('#team-messages');if(target)target.innerHTML=empty(e.message)}}finally{messageBusy=false}
  }
  async function loadApplications(){
    const target=screen.querySelector('#applications-content'),id=activeMealId
    const [result,{meal}]=await Promise.all([apiRequest(`/meals/${id}/applications`),apiRequest(`/meals/${id}`)]);if(!target?.isConnected)return
    const canDecide=meal.status==='open'&&!meal.recruitmentClosed&&Date.now()<Date.parse(meal.deadline),items=result.items
    target.innerHTML=`<p class="quote">${escape(statusNames[meal.status])} · 正式成员${meal.currentPeople}/${meal.maxPeople} · 剩余${Math.max(0,meal.maxPeople-meal.currentPeople)}个名额<br>报名截止 ${escape(formatMealTime(meal.deadline))}<br>${canDecide?'申请不占名额；通过审批后占位。拒绝后本场不可重报。':'当前不能审批，可查看历史申请。'}</p><button class="secondary" data-refresh-applications>刷新申请与名额</button>`+(items.length?items.map(a=>`<div class="quote"><strong>${escape(a.nickname)}</strong> · ${escape(statusNames[a.status])}
      <p>${escape(a.profile?.campus||'未填校区')} · ${escape((a.profile?.tasteTags||[]).join('、')||'未填口味')}</p><p>${escape((a.profile?.personalityTags||[]).join('、')||'未填就餐偏好')} · 预算${escape(a.profile?.budgetPreference||'未填')}</p><p>${escape(a.note||'无报名说明')}</p>
      ${a.status==='pending'&&canDecide?`<button class="primary" data-approval="${a.id}" data-decision="approve">通过</button><button class="secondary" data-approval="${a.id}" data-decision="reject">拒绝</button>`:''}</div>`).join(''):empty('暂无申请，邀请同学查看饭局即可报名'))
    bind('[data-refresh-applications]',loadApplications)
    bind('[data-approval]',async n=>{if(n.dataset.decision==='reject'&&!confirm('拒绝后，对方本场不能重新报名。确定拒绝？'))return;try{await apiRequest(`/meals/${id}/applications/${n.dataset.approval}/${n.dataset.decision}`,{method:'POST'});await loadApplications()}catch(e){await loadApplications();throw e}})
  }
  async function loadNotifications(){
    const target=screen.querySelector('#notifications-content');if(!target)return
    const data=await apiRequest('/notifications'+(notificationCursor?`?before=${notificationCursor}`:''));if(!target.isConnected)return
    notifications.push(...data.items);notificationCursor=data.nextCursor;notificationHasMore=data.items.length===30
    target.innerHTML=`<p>未读 ${data.unread} 条</p><button class="secondary" data-read-notifications>全部标为已读</button>`+
      (notifications.map(n=>`<div class="quote"><p>${n.read_at?'':'● '}${escape(n.content)}</p><span class="muted">${escape(formatMealTime(n.created_at))}</span>${n.meal_id?`<button class="secondary" data-notification-meal="${n.meal_id}">查看饭局</button>`:''}</div>`).join('')||empty('暂无通知'))+
      (notificationHasMore?'<button class="secondary" data-more-notifications>加载更多</button>':'')
    bind('[data-notification-meal]',n=>openMeal(n.dataset.notificationMeal))
    bind('[data-more-notifications]',()=>loadNotifications())
    bind('[data-read-notifications]',async()=>{await apiRequest('/notifications/read',{method:'POST'});notifications=[];notificationCursor=null;await loadNotifications()})
  }
  async function loadAdmin(){
    const target=screen.querySelector('#admin-content')
    const [users,reports]=await Promise.all([apiRequest('/admin/users'),apiRequest('/admin/reports')]);if(!target?.isConnected)return
    target.innerHTML='<div class="section-title">体验资格</div>'+users.items.map(u=>`<div class="quote">${escape(u.nickname)} · ${escape(statusNames[u.accessStatus])}<div>${[['approved','批准'],['pending','待审批'],['blocked','停用']].map(([s,n])=>`<button class="secondary" data-access-user="${u.id}" data-status="${s}">${n}</button>`).join('')}</div></div>`).join('')+
      '<div class="section-title">举报待处理</div>'+ (reports.items.map(r=>`<div class="quote">${escape(r.reason)} · ${escape(r.status)}${r.status==='pending'?`<button class="secondary" data-report-id="${r.id}" data-status="resolved">已处理</button><button class="secondary" data-report-id="${r.id}" data-status="dismissed">不予处理</button>`:''}</div>`).join('')||empty('暂无举报'))
    bind('[data-access-user]',async n=>{await apiRequest(`/admin/users/${n.dataset.accessUser}/access`,{method:'POST',data:{status:n.dataset.status}});await loadAdmin()})
    bind('[data-report-id]',async n=>{await apiRequest(`/admin/reports/${n.dataset.reportId}`,{method:'POST',data:{status:n.dataset.status}});await loadAdmin()})
  }
  loadPreviewMyMeals = async () => {try{myMealsCache=await apiRequest('/meals/mine');renderMyMeals()}catch(e){const t=screen.querySelector('#my-meal-list');if(t)t.innerHTML=empty(e.message)}}
  renderMyMeals = () => {
    const target=screen.querySelector('#my-meal-list');if(!target)return
    screen.querySelectorAll('[data-my-meal-tab]').forEach(n=>n.classList.toggle('active',n.dataset.myMealTab===myMealsTab))
    target.innerHTML=(myMealsCache[myMealsTab]||[]).map(m=>`<div class="quote" data-meal-detail="${m.id}"><strong>${escape(m.title)}</strong><p>${escape(statusNames[m.status])} · ${m.currentPeople}/${m.maxPeople} 人</p><p>${escape(m.place)}</p><span class="muted">${escape(formatMealTime(m.mealTime))} · ${escape(formatBudget(m))}</span></div>`).join('')||empty('暂无饭局')
    bindPageActions()
  }
  loadProfilePage = async () => {
    if(authSession?.token){try{const {user}=await apiRequest('/auth/me');authSession.user=user;authSession.profile=user.profile;persist()}catch(e){fail(e)}}
    if(currentPage!=='profile')return
    await originalProfile()
    const hero=screen.querySelector('.profile-hero h2');if(hero)hero.textContent=authSession?`${authSession.user.nickname}，今天吃什么？`:'发现属于你的校园美食'
    screen.querySelector('.stats')?.remove() // 删除固定演示计数，不把模拟统计当真实数据。
    const panel=screen.querySelector('.profile-panel');if(!panel)return
    panel.querySelector('#access-panel')?.remove()
    panel.insertAdjacentHTML('afterbegin',`<div id="access-panel"><p class="muted">体验资格：${authSession?escape(statusNames[authSession.user.accessStatus]||'待审批'):'未登录'}</p>
      ${authSession?'<button class="secondary" data-go-notifications>站内通知</button><button class="secondary" data-logout>退出登录</button>':''}
      ${authSession?.user?.isAdmin?'<button class="secondary" data-go-admin>体验资格与举报管理</button>':''}</div>`)
    screen.querySelectorAll('[data-go-timetable]').forEach(x=>x.hidden=true);bindPageActions()
  }
  loadProfileMyMealsPreview = async () => {
    const target=screen.querySelector('#profile-my-meals-preview');if(!target)return
    try{const data=await apiRequest('/meals/mine');if(!target.isConnected)return
      const meals=[...data.created,...data.pending,...data.joined].filter((m,i,a)=>a.findIndex(x=>x.id===m.id)===i).filter(m=>['open','matched'].includes(m.status))
      target.innerHTML=meals.slice(0,3).map(m=>`<div class="profile-meal-preview-item" data-meal-detail="${m.id}"><span>${escape(m.title)}</span><span class="muted">${escape(m.applicationStatus==='pending'?'待审批':statusNames[m.status])}</span></div>`).join('')||empty('暂无活动中的饭局');bindPageActions()
    }catch(e){if(target.isConnected)target.innerHTML=empty(e.message)}
  }
  loadProfileTabContent = async () => {
    const target=screen.querySelector('#profile-tab-content');if(!target||!authSession)return
    const tab=activeProfileTab;target.innerHTML=empty('加载中…')
    try{
      const data=await apiRequest(tab==='moments'?'/posts':`/profile/${tab}`)
      if(!target.isConnected||activeProfileTab!==tab)return
      const items=tab==='moments'?data.items.filter(x=>x.author?.id===authSession.user.id):data.items
      target.innerHTML=items.map(x=>tab==='wishlist'||tab==='visited'?`<div class="profile-list-item" ${x.restaurantId?`data-restaurant-detail="${escape(x.restaurantId)}"`:''}><div class="item-info"><strong>${escape(x.restaurantName)}</strong><p class="muted">${escape(formatMealTime(x.createdAt))}</p></div></div>`:tab==='saved'?`<div class="profile-list-item" data-meal-detail="${x.mealId}"><strong>${escape(x.meal?.title||'历史饭局')}</strong><p>${escape(x.meal?.place)}</p></div>`:`<div class="quote"><p>${escape(x.content)}</p>${x.mealId?`<button class="secondary" data-open-post-meal="${x.mealId}">查看饭局</button>`:''}</div>`).join('')||empty('暂无记录')
      bindPageActions()
    }catch(e){if(target.isConnected)target.innerHTML=empty(e.message)}
  }
  async function loadReviewTargets(){
    const target=screen.querySelector('#review-targets'),{meal}=await apiRequest(`/meals/${activeMealId}`)
    if(!target?.isConnected)return
    if(meal.status!=='finished'||!meal.joined){target.innerHTML=empty('仅已完成饭局的正式队员可以互评');screen.querySelector('[data-submit-review]').disabled=true;return}
    target.innerHTML='<label>评价对象</label>'+select('review-target',meal.participants.filter(p=>p.id!==authSession?.user?.id).map(p=>[p.id,p.nickname]))
  }
  submitReviewFromForm = async () => {
    await apiRequest(`/meals/${activeMealId}/reviews`,{method:'POST',data:{targetUserId:Number(screen.querySelector('#review-target').value),rating:Number(screen.querySelector('#review-score').value),content:screen.querySelector('#review-content').value.trim()}})
    toast('评价已提交');render('detail')
  }

  // 找人和动态使用真实帖子，关联饭局的报名统一跳到申请流程。
  loadPreviewFindPosts = async () => {
    const target=screen.querySelector('#find-post-list');if(!target)return
    try{
      const [posts,meals]=await Promise.all([apiRequest('/posts'),apiRequest('/meals?onlyAvailable=true')]);if(!target.isConnected)return
      const selected=activeFindCategory==='全部'?posts.items:posts.items.filter(p=>p.category===activeFindCategory)
      target.innerHTML='<div class="section-title">可预约饭局</div>'+meals.items.map(m=>`<div class="post-card" data-meal-detail="${m.id}"><strong>${escape(m.title)}</strong><p>${escape(m.place)} · ${m.currentPeople}/${m.maxPeople}人</p><span class="muted">需发起人审批 · ${escape(formatMealTime(m.mealTime))}</span></div>`).join('')+
      '<div class="section-title">群友找人</div>'+(selected.map(p=>`<div class="post-card"><div class="post-user-row"><strong>${escape(p.author?.nickname)}</strong><span class="muted">${escape(p.category)}</span></div><p>${escape(p.content)}</p>${p.mealId?`<button class="secondary" data-open-post-meal="${p.mealId}">查看饭局 / 申请加入</button>`:'<span class="muted">历史帖子未关联饭局，仅供浏览</span>'}</div>`).join('')||empty('暂无帖子'))
      bindPageActions()
    }catch(e){target.innerHTML=empty(e.message)}
  }
  async function loadFeed(){
    const target=screen.querySelector('.page');if(!target)return
    const {items}=await apiRequest('/posts');if(!target.isConnected)return
    target.innerHTML='<div class="title">动态</div>'+(items.map(p=>`<article class="feed-card"><div class="user"><strong>${escape(p.author?.nickname)}</strong></div><p>${escape(p.content)}</p>${p.mealId?`<button class="secondary" data-open-post-meal="${p.mealId}">查看关联饭局</button>`:''}</article>`).join('')||empty('还没有真实动态，发起饭局后可发布到找人'))
    bindPageActions()
  }

  bindPageActions = () => {
    originalBind()
    // 替换节点去掉旧事件，避免多次刷新后重复提交。
    bind('[data-login]',()=>loginFromForm())
    bind('[data-create-meal]',()=>createMealFromForm())
    bind('[data-join]',()=>handleJoinOrLeaveClick())
    bind('[data-submit-review]',()=>submitReviewFromForm())
    bind('[data-save-profile]',()=>saveProfileFromForm())
    bind('[data-go-login]',()=>navigate('login'))
    bind('[data-go-edit]',()=>{if(logged())navigate('edit')})
    bind('[data-go-my-meals]',()=>{if(logged())navigate('myMeals')})
    bind('[data-go-publish]',()=>navigate('publish'))
    bind('[data-restaurant-detail]',n=>{activeRestaurantId=n.dataset.restaurantDetail;navigate('restaurant-detail')})
    bind('[data-meal-detail]',n=>openMeal(n.dataset.mealDetail))
    bind('[data-find-category]',async n=>{activeFindCategory=n.dataset.findCategory;screen.querySelectorAll('[data-find-category]').forEach(x=>x.classList.toggle('active',x===n));await loadPreviewFindPosts()})
    bind('[data-back]',()=>{goingBack=true;try{render(history.pop()||'home')}finally{goingBack=false}})
    bind('[data-my-meal-tab]',n=>{myMealsTab=n.dataset.myMealTab;renderMyMeals()})
    bind('[data-clear-venue]',()=>{venue=null;const input=screen.querySelector('#meal-place');input.readOnly=false;input.value='';screen.querySelector('#venue-hint').textContent='将保存手填地点'})
    bind('[data-go-notifications]',()=>navigate('notifications'))
    bind('[data-go-admin]',()=>navigate('admin'))
    bind('[data-manage-applications]',()=>navigate('applications'))
    bind('[data-refresh-meal]',()=>loadPreviewMealDetail(activeMealId))
    bind('[data-open-post-meal]',n=>openMeal(n.dataset.openPostMeal))
    bind('[data-logout],[data-switch-account]',async()=>{if(authSession?.token)await apiRequest('/auth/logout',{method:'POST'});authSession=null;localStorage.removeItem('fanfanPreviewAuth');render('login')})
    bind('[data-cancel-meal]',async()=>{if(confirm('确定取消？取消后无法恢复。'))await action('cancel')})
    bind('[data-finish-meal]',async()=>{if(confirm('确认本场饭局已完成？'))await action('finish')})
    bind('[data-save-meal]',()=>handleSaveMeal())
    bind('[data-report-meal]',()=>handleReportMeal())
    bind('[data-go-review]',()=>{if(logged())navigate('review')})
    bind('[data-more-messages]',()=>loadMessages())
    bind('[data-send-message]',async()=>{const input=screen.querySelector('#team-message-input');await apiRequest(`/meals/${activeMealId}/messages`,{method:'POST',data:{content:input.value.trim()}});input.value='';await loadMessages()})
    bind('[data-share-post]',async()=>{const content=prompt('找人帖子内容（关联当前饭局）',detailMeal.title);if(content===null)return;await apiRequest('/posts',{method:'POST',data:{mealId:activeMealId,category:'约饭',content}});toast('已发布到找人')})
    if(currentPage==='home')bindHome()
  }

  // 查询序号保证快速切校区/搜索时旧响应不能覆盖新列表。
  resetPreviewHomeRestaurants = () => {queryVersion++;homeRestaurantLoading=false;homeRestaurantPage=1;homeRestaurantHasMore=true;loadPreviewMeals()}
  const clearDiscoveryFilters = () => {clearTimeout(homeRestaurantSearchTimer);homeRestaurantKeyword='';filters={cuisines:[],tags:[],maxDistance:''};const input=screen.querySelector('#home-search-input');if(input)input.value='';resetPreviewHomeRestaurants()}
  sortFilterOptions=['群内热度','距离最近']
  loadPreviewMeals = async ({append=false}={}) => {
    const target=screen.querySelector('#home-restaurant-list');if(!target||homeRestaurantLoading||!homeRestaurantHasMore)return
    const version=queryVersion;homeRestaurantLoading=true
    const campus=['','cufe_shahe','cufe_nanlu'][campusFilterIndex]
    const query=new URLSearchParams({page:homeRestaurantPage,pageSize:HOME_RESTAURANT_PAGE_SIZE,keyword:homeRestaurantKeyword,sortBy:sortFilterIndex?'distance-asc':'mention-desc'})
    if(campus)query.set('campus',campus)
    if(filters.maxDistance)query.set('maxDistance',filters.maxDistance)
    filters.cuisines.forEach(x=>query.append('cuisine',x));filters.tags.forEach(x=>query.append('tag',x))
    try{
      const data=await apiRequest('/restaurants?'+query)
      if(version!==queryVersion||!target.isConnected)return
      homeRestaurantHasMore=data.hasMore;homeRestaurantPage++
      target.querySelectorAll('.home-load-state').forEach(x=>x.remove())
      const html=data.items.map(r=>renderHomeRestaurantCard(r,campus)).join('')
      if(append)target.insertAdjacentHTML('beforeend',html);else target.innerHTML=html||empty('没有符合条件的餐厅。试试缩短店名或放宽筛选，校区选择会保留。')+'<button class="secondary" data-clear-discovery>清空搜索与筛选</button>'
      if(data.items.length||append)target.insertAdjacentHTML('beforeend',`<div class="home-load-state muted">${homeRestaurantHasMore?'继续下滑加载 6 家':'已经到底啦'}</div>`)
      updateHomeFilterPills();bindPageActions()
      bind('[data-clear-discovery]',clearDiscoveryFilters)
    }catch(e){if(version===queryVersion&&target.isConnected){homeRestaurantHasMore=false;target.querySelectorAll('.home-load-state').forEach(x=>x.remove());const message=`<div class="home-load-state">${empty(append?'后续餐厅加载失败，已加载内容仍保留':e.message)}<button class="secondary" data-retry-discovery>重新加载</button></div>`;if(append)target.insertAdjacentHTML('beforeend',message);else target.innerHTML=message;bind('[data-retry-discovery]',()=>{homeRestaurantHasMore=true;return loadPreviewMeals({append})})}}finally{if(version===queryVersion)homeRestaurantLoading=false}
  }
  updateHomeFilterPills = () => {
    const pills=screen.querySelectorAll('.pills[data-choice-group] .pill');if(currentPage!=='home'||pills.length<4)return
    pills[0].textContent=campusFilterOptions[campusFilterIndex]+'⌄';pills[1].textContent=(filters.cuisines.length?`品类(${filters.cuisines.length})`:'品类')+'⌄'
    pills[2].textContent=sortFilterOptions[sortFilterIndex]+'⌄';pills[3].textContent=(filters.tags.length||filters.maxDistance?'已筛选':'筛选')+'⌄'
    const hint=screen.querySelector('.home-restaurant-heading .muted');if(hint)hint.textContent=sortFilterIndex?'附近好吃的 · 群友推荐 · 按直线距离排序':'附近好吃的 · 群友推荐 · 按群内热度排序'
  }
  function bindHome(){
    const pills=screen.querySelectorAll('.pills[data-choice-group] .pill')
    pills.forEach((old,i)=>{const n=old.cloneNode(true);old.replaceWith(n);n.onclick=()=>{if(i===0){campusFilterIndex=(campusFilterIndex+1)%3;resetPreviewHomeRestaurants()}else if(i===2){sortFilterIndex=1-sortFilterIndex;resetPreviewHomeRestaurants()}else showFilters().catch(fail)}})
    const input=screen.querySelector('#home-search-input');if(input){input.oninput=()=>{homeRestaurantKeyword=input.value.trim();queryVersion++;clearTimeout(homeRestaurantSearchTimer);homeRestaurantSearchTimer=setTimeout(resetPreviewHomeRestaurants,300)}}
  }
  async function showFilters(){
    facets=await apiRequest('/restaurants/facets');if(currentPage!=='home')return
    const modal=screen.querySelector('#filter-modal');if(!modal)return
    const tags=[...new Set(Object.values(facets.tags||{}).flat())]
    modal.innerHTML=`<div class="modal-content"><div class="modal-header"><h3>餐厅筛选</h3><button class="close-btn" data-close-filters>×</button></div><div class="modal-body"><label>品类（多选取并集）</label><div class="filter-options">${facets.cuisines.map(x=>`<label><input type="checkbox" name="cuisine" value="${escape(x)}" ${filters.cuisines.includes(x)?'checked':''}>${escape(x)}</label>`).join('')}</div>
      <label>已确认标签（多选取并集）</label><div class="filter-options">${tags.map(x=>`<label><input type="checkbox" name="tag" value="${escape(x)}" ${filters.tags.includes(x)?'checked':''}>${escape(x)}</label>`).join('')||'<span class="muted">暂无已确认标签</span>'}</div><label>最大直线距离（公里，留空不限）</label><input id="distance-filter" type="number" min="0" step="0.1" value="${escape(filters.maxDistance)}"></div><div class="modal-footer"><button class="secondary" data-reset-filters>清空</button><button class="primary" data-apply-filters>应用筛选</button></div></div>`
    modal.classList.add('show');modal.style.display='flex'
    bind('[data-close-filters]',()=>{modal.classList.remove('show');modal.style.display='none'})
    bind('[data-reset-filters]',()=>{filters={cuisines:[],tags:[],maxDistance:''};modal.style.display='none';resetPreviewHomeRestaurants()})
    bind('[data-apply-filters]',()=>{const distance=modal.querySelector('#distance-filter').value;if(distance!==''&&(!Number.isFinite(Number(distance))||Number(distance)<0))throw new Error('距离需为非负数字');filters={cuisines:[...modal.querySelectorAll('[name=cuisine]:checked')].map(x=>x.value),tags:[...modal.querySelectorAll('[name=tag]:checked')].map(x=>x.value),maxDistance:distance};modal.style.display='none';resetPreviewHomeRestaurants()})
  }

  renderHomeRestaurantCard = (r,campus) => {
    const values=Object.values(r.distanceKm||{}).filter(Number.isFinite),d=campus?r.distanceKm?.[campus]:values.length?Math.min(...values):null
    return `<article class="home-restaurant-card" data-restaurant-detail="${escape(r.id)}"><img src="${escape(getRestaurantImage(r))}" loading="lazy" onerror="this.onerror=null;this.src='./placeholder.svg'" alt="${escape(r.name)}"><div class="home-restaurant-card-body"><strong>${escape(r.name)}</strong><span class="home-restaurant-address">${escape(r.fullAddress||'地址待补充')}</span><div class="home-restaurant-card-footer"><span>直线距离 ${Number.isFinite(d)?d.toFixed(1)+' km':'待补充'}</span><span>${escape(r.cuisine||'餐厅')}</span></div></div></article>`
  }
  getRestaurantImage = r => r.photoUrl||'./placeholder.svg'
  loadPreviewRestaurantDetail = async (id,poiId='') => {
    const target=screen.querySelector('#restaurant-detail-content');if(!target)return
    const query=new URLSearchParams();const campus=['','cufe_shahe','cufe_nanlu'][campusFilterIndex];if(campus)query.set('campus',campus);if(poiId)query.set('poiId',poiId)
    try{
      const {restaurant:r}=await apiRequest(`/restaurants/${encodeURIComponent(id)}?${query}`);if(!target.isConnected)return
      activeRestaurantId=r.id;activeRestaurantName=r.name
      target.dataset.poi=r.selectedCandidate?.poiId||''
      const d=c=>Number.isFinite(r.distanceKm?.[c])?r.distanceKm[c].toFixed(1)+' km':'待补充'
      target.innerHTML=`<div class="restaurant-detail-view"><div style="position:relative"><img class="hero" src="${escape(getRestaurantImage(r))}" onerror="this.onerror=null;this.src='./placeholder.svg'"><button class="icon-btn dark" data-back style="position:absolute;left:16px;top:18px">‹</button></div><div class="detail-info"><h2>${escape(r.name)}</h2><label>具体分店</label>${select('restaurant-branch',(r.candidates||[]).map(x=>[x.poiId,x.name]))}<p>${escape(r.fullAddress||r.location||'地址待补充')}</p><p class="muted">沙河直线 ${d('cufe_shahe')} · 学院南路直线 ${d('cufe_nanlu')}</p><p>推荐菜：${escape(r.recommendedDishes||'待补充')}</p><p>人数建议：${escape(r.partySize||'待补充')}</p><p>预约提示：${escape(r.bookingNote||'待补充')}</p><p>${escape(r.cuisine||'')}</p><div class="meal-actions-row"><button class="secondary" data-map>查看地图</button><button class="secondary" data-catalog-wish>想去 / 取消想去</button><button class="secondary" data-catalog-visited>记录去过</button></div><button class="primary full-width" data-start-catalog>在此店发起约饭</button><div class="section-title">在此店组队</div><div id="catalog-meals"></div></div></div>`
      if(r.correctionNote)target.querySelector('.detail-info h2').insertAdjacentHTML('afterend',`<p class="quote">地址已核验：${escape(r.correctionNote)}。旧坐标与距离暂停展示，等待重新补全。</p>`)
      const branch=screen.querySelector('#restaurant-branch');branch.value=r.selectedCandidate?.poiId||'';branch.onchange=()=>{branch.disabled=true;screen.querySelector('[data-start-catalog]').disabled=true;loadPreviewRestaurantDetail(r.id,branch.value)}
      bindPageActions()
      bind('[data-start-catalog]',()=>{if(!logged())return;venue={id:String(r.id),poiId:r.selectedCandidate?.poiId||null,campus:campus||'cufe_shahe',label:`${r.selectedCandidate?.name||r.name} ${r.fullAddress||''}`};navigate('publish')})
      bind('[data-catalog-wish]',async()=>{if(!logged())return;const data=await apiRequest('/profile/wishlist',{method:'POST',data:{restaurantId:String(r.id),restaurantName:r.name}});toast(data.active?'已加入想去':'已取消想去')})
      bind('[data-catalog-visited]',async()=>{if(!logged())return;await apiRequest('/profile/visited',{method:'POST',data:{restaurantId:String(r.id),restaurantName:r.name}});toast('已记录去过')})
      bind('[data-map]',()=>{const loc=r.selectedCandidate?.location;if(!loc)throw new Error('坐标待补充');window.open(`https://uri.amap.com/marker?position=${encodeURIComponent(loc)}&name=${encodeURIComponent(r.name)}&coordinate=gaode`,'_blank','noopener')})
      const {items}=await apiRequest('/meals?restaurantId='+encodeURIComponent(r.id));const list=target.querySelector('#catalog-meals');if(list){list.innerHTML=items.map(m=>`<div class="quote" data-meal-detail="${m.id}">${escape(m.title)} · ${escape(statusNames[m.status])}</div>`).join('')||empty('暂无饭局');bind('[data-meal-detail]',n=>openMeal(n.dataset.mealDetail))}
    }catch(e){if(target.isConnected)target.innerHTML=empty(e.message)}
  }
  // 页面切后台暂停轮询，离开页面时 render 会销毁定时器。
  const deadlineTimer=setInterval(()=>{
    if(document.hidden||currentPage!=='detail'||!detailMeal)return
    const hint=screen.querySelector('[data-recruitment-hint]');if(hint)hint.textContent=recruitmentHint(detailMeal)
    if(detailMeal.status==='open'&&!detailMeal.recruitmentClosed&&Date.now()>=Date.parse(detailMeal.deadline))loadPreviewMealDetail(activeMealId)
  },15000)
  window.addEventListener('pagehide',()=>{clearInterval(poll);clearInterval(deadlineTimer)})
  document.addEventListener('error',event=>{const target=event.target;if(target instanceof HTMLImageElement&&!target.src.endsWith('/placeholder.svg'))target.src='./placeholder.svg'},true)
  render('home')
})()
