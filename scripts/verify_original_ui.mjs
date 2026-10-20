import {chromium} from 'playwright';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,extname,resolve} from 'node:path';
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';

// 所有写入只发生在临时业务库；原餐厅仓只读，不向日常数据库添加测试用户。
const root=resolve('平台代码/frontend/preview-static');
const dataDir=mkdtempSync(join(tmpdir(),'fanfan-original-db-'));
const screenshots=join(tmpdir(),'fanfan-original-ui');await mkdir(screenshots,{recursive:true});
const backend=spawn(process.execPath,['平台代码/backend/src/server.js'],{env:{...process.env,DATA_DIR:dataDir,PORT:'0',ENABLE_DEV_LOGIN:'true',ADMIN_USER_IDS:'1',SEED_DEMO:'false'}});
let server,browser;
const checks=[];
checks.push=function(...items){console.log(items.join('；'));return Array.prototype.push.apply(this,items)};
try{
  const base=await new Promise((resolve,reject)=>{let output='';const timer=setTimeout(()=>reject(new Error(output||'后端启动超时')),15000);backend.stdout.on('data',s=>{output+=s;const m=output.match(/http:\/\/127\.0\.0\.1:\d+/);if(m){clearTimeout(timer);resolve(m[0]+'/api')}});backend.stderr.on('data',s=>output+=s);backend.once('error',reject)});
  const api=async(path,method='GET',token,data)=>{const res=await fetch(base+path,{method,signal:AbortSignal.timeout(10000),headers:{'content-type':'application/json',...(token?{authorization:'Bearer '+token}:{})},body:data===undefined?undefined:JSON.stringify(data)});const result=await res.json();assert.ok(res.ok,JSON.stringify(result));return result};
  const host=await api('/auth/login','POST',null,{nickname:'原版验收发起人'});
  const member=await api('/auth/login','POST',null,{nickname:'原版验收队员'});
  server=createServer(async(req,res)=>{try{const pathname=new URL(req.url,'http://local').pathname;const file=resolve(root,'.'+(pathname==='/'?'/index.html':pathname));assert.ok(file.startsWith(root+'/'));res.setHeader('Content-Type',({'.html':'text/html','.js':'application/javascript','.css':'text/css','.svg':'image/svg+xml'})[extname(file)]||'application/octet-stream');res.end(await readFile(file))}catch{res.writeHead(404);res.end('Not found')}});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));const web=`http://127.0.0.1:${server.address().port}`;
  browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_EXECUTABLE||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
  console.log('临时数据库及隔离浏览器已启动');
  const errors=[];
  async function makePage(){
    const context=await browser.newContext({viewport:{width:430,height:900}});
    await context.route('**/*',async route=>{const url=route.request().url();if(url.startsWith('http://127.0.0.1:3001/api/'))return route.fulfill({response:await context.request.fetch(url.replace('http://127.0.0.1:3001/api',base),{method:route.request().method(),headers:route.request().headers(),data:route.request().postData()||undefined})});if(!url.startsWith(web)&&route.request().resourceType()==='image')return route.abort();return route.continue()});
    const page=await context.newPage();page.setDefaultTimeout(12000);page.on('pageerror',e=>errors.push(e.message));page.on('dialog',dialog=>dialog.accept(dialog.type()==='prompt'?'一起吃饭，请审批':undefined));await page.goto(web);return page;
  }
  async function login(page,nickname){await page.locator('.tabbar [data-page=profile]').click();await page.locator('[data-go-login]').first().click();await page.locator('#login-nickname').fill(nickname);await page.locator('[data-login]').click();await page.locator('#access-panel').waitFor()}
  const page=await makePage();
  await page.locator('.home-restaurant-card').first().waitFor();assert.equal(await page.locator('.home-restaurant-card').count(),6);checks.push('原版布局首屏6家');
  await page.waitForFunction(()=>{const img=document.querySelector('.home-restaurant-card img');return img?.complete&&img.naturalWidth>0&&img.src.includes('placeholder.svg')});checks.push('远程图片失败时本地占位');
  await page.screenshot({path:join(screenshots,'home.png')});
  // 输入与切换条件使用真实事件，等待请求而不是固定延时。
  await page.locator('#home-search-input').fill('潇湘阁');await page.waitForFunction(()=>{const cards=[...document.querySelectorAll('.home-restaurant-card')];return cards.length>0&&cards.every(x=>x.textContent.includes('潇湘阁'))});checks.push('搜索防抖');
  await page.locator('.pills[data-choice-group] .pill').nth(3).click();await page.locator('[data-apply-filters]').waitFor();await page.locator('[data-reset-filters]').click();checks.push('数据库筛选面板');
  await login(page,'原版验收发起人');await page.locator('[data-go-admin]').click();await page.locator(`[data-access-user="${member.user.id}"][data-status=approved]`).click();
  await page.waitForFunction(id=>[...document.querySelectorAll('.quote')].some(x=>x.textContent.includes('原版验收队员')&&x.textContent.includes('已通过')),member.user.id);checks.push('管理员白名单审批');
  await page.locator('.tabbar [data-page=home]').click();await page.locator('.home-restaurant-card').first().waitFor();await page.locator('.home-restaurant-card').first().click();
  await page.locator('[data-start-catalog]').waitFor();const branches=await page.locator('#restaurant-branch option').count();let expectedPoi=await page.locator('#restaurant-branch').inputValue();if(branches>1){expectedPoi=await page.locator('#restaurant-branch option').nth(1).getAttribute('value');await page.locator('#restaurant-branch').selectOption({index:1});await page.waitForFunction(poi=>document.querySelector('#restaurant-detail-content')?.dataset.poi===poi&&!document.querySelector('[data-start-catalog]')?.disabled,expectedPoi)}
  await page.locator('[data-catalog-wish]').click();await page.locator('[data-catalog-visited]').click();checks.push('餐厅想去与去过写入');
  await page.locator('[data-start-catalog]').click();await page.locator('#meal-title').fill('原版界面审批测试');await page.locator('#meal-people').fill('2');await page.locator('#meal-budget').fill('20-40');await page.locator('#meal-meeting').fill('靠窗集合，仅正式队员可见');await page.locator('[data-create-meal]').click();await page.locator('[data-manage-applications]').waitFor();
  const meal=(await api('/meals','GET',host.token)).items.find(x=>x.title==='原版界面审批测试');assert.ok(meal);assert.equal(meal.budgetMin,20);assert.ok(meal.restaurantId);assert.ok(meal.venue.address);assert.equal(meal.poiId,expectedPoi||null);checks.push('分店快照发布及预算单位');
  const wishes=await api('/profile/wishlist','GET',host.token);assert.equal(wishes.items[0].restaurantId,meal.restaurantId);await page.locator('[data-save-meal]').click();await page.getByText('★ 已收藏',{exact:true}).waitFor();assert.equal((await api('/profile/saved','GET',host.token)).items[0].mealId,meal.id);checks.push('餐厅字符串ID及饭局收藏');
  await page.locator('#team-message-input').fill('发起人第一条留言');await page.locator('[data-send-message]').click();await page.getByText('发起人第一条留言',{exact:true}).waitFor();checks.push('发起人队内留言');
  await page.locator('[data-share-post]').click();await page.locator('.tabbar [data-page=find]').click();await page.locator('[data-open-post-meal]').first().waitFor();checks.push('真实找人帖子关联饭局');
  const memberPage=await makePage();await login(memberPage,'原版验收队员');await memberPage.locator('.tabbar [data-page=find]').click();await memberPage.locator(`[data-meal-detail="${meal.id}"]`).click();await memberPage.locator('[data-join]').click();await memberPage.getByText('我的申请：待审批',{exact:true}).waitFor();assert.equal(await memberPage.locator('#team-messages').count(),0);checks.push('申请不占位且不可读留言');
  // 待审批入口及撤回后重新申请。
  await memberPage.locator('.tabbar [data-page=profile]').click();await memberPage.locator('[data-go-my-meals]').click();await memberPage.locator('[data-my-meal-tab=pending]').click();await memberPage.locator(`[data-meal-detail="${meal.id}"]`).click();await memberPage.locator('[data-join]').click();await memberPage.getByText('我的申请：已撤回',{exact:true}).waitFor();await memberPage.locator('[data-join]').click();await memberPage.getByText('我的申请：待审批',{exact:true}).waitFor();checks.push('待审批列表与撤回重报');
  await page.locator(`[data-meal-detail="${meal.id}"]`).click();await page.locator('[data-manage-applications]').click();await page.locator('[data-decision=approve]').click();await page.getByText(/原版验收队员/).filter({hasText:'已通过'}).first().waitFor().catch(()=>page.waitForFunction(()=>document.querySelector('#applications-content')?.textContent.includes('已通过')));
  assert.equal((await api(`/meals/${meal.id}`,'GET',host.token)).meal.status,'matched');checks.push('实际审批按钮与满员成局');
  await page.screenshot({path:join(screenshots,'applications.png')});
  await memberPage.locator('.tabbar [data-page=profile]').click();await memberPage.locator('[data-go-notifications]').click();await memberPage.getByText(/通过/).first().waitFor();await memberPage.locator('[data-read-notifications]').click();await memberPage.getByText('未读 0 条',{exact:true}).waitFor();await memberPage.locator(`[data-notification-meal="${meal.id}"]`).first().click();await memberPage.getByText('靠窗集合，仅正式队员可见',{exact:true}).waitFor();checks.push('审批通知与成员集合说明');
  await memberPage.locator('#team-message-input').fill('队员留言');await memberPage.locator('[data-send-message]').click();await memberPage.getByText('队员留言',{exact:true}).waitFor();await memberPage.locator('[data-join]').click();await memberPage.getByText('我的申请：已撤回',{exact:true}).waitFor();assert.equal(await memberPage.locator('#team-messages').count(),0);assert.equal((await api(`/meals/${meal.id}`,'GET',host.token)).meal.status,'open');checks.push('退出撤销访问与重新招募');
  await memberPage.locator('[data-join]').click();await memberPage.getByText('我的申请：待审批',{exact:true}).waitFor();
  await page.locator('.tabbar [data-page=profile]').click();await page.locator('[data-go-my-meals]').click();await page.locator(`[data-meal-detail="${meal.id}"]`).click();await page.locator('[data-manage-applications]').click();await page.locator('[data-decision=reject]').click();await page.waitForFunction(()=>document.querySelector('#applications-content')?.textContent.includes('已拒绝'));checks.push('发起人拒绝');
  // 另建独立完成场景：只调整测试库时间，不能改真实业务库。
  const done=(await api('/meals','POST',host.token,{title:'完成及互评验收',place:'测试集合处',campus:'cufe_shahe',maxPeople:2,mealTime:new Date(Date.now()+86400000).toISOString()})).meal;
  await api(`/meals/${done.id}/apply`,'POST',member.token,{});const apps=await api(`/meals/${done.id}/applications`,'GET',host.token);await api(`/meals/${done.id}/applications/${apps.items[0].id}/approve`,'POST',host.token,{});
  const require=createRequire(resolve('平台代码/backend/package.json'));const Database=require('better-sqlite3');const fixtureDb=new Database(join(dataDir,'fanfan.db'));fixtureDb.prepare('UPDATE meals SET meal_time=?,deadline=? WHERE id=?').run(new Date(Date.now()-60000).toISOString(),new Date(Date.now()-120000).toISOString(),done.id);fixtureDb.close();
  await page.locator('.tabbar [data-page=profile]').click();await page.locator('[data-go-my-meals]').click();await page.locator(`[data-meal-detail="${done.id}"]`).click();await page.locator('[data-finish-meal]').click();await page.locator('[data-go-review]').click();await page.locator('#review-target').selectOption(String(member.user.id));await page.locator('#review-content').fill('准时，交流愉快');await page.locator('[data-submit-review]').click();await page.getByText('已完成',{exact:true}).waitFor();checks.push('完成与真实队友评价');
  await page.screenshot({path:join(screenshots,'finished.png')});
  await page.locator('.tabbar [data-page=profile]').click();await page.locator('[data-go-my-meals]').click();await page.locator(`[data-meal-detail="${meal.id}"]`).click();await page.locator('[data-cancel-meal]').click();await page.getByText('已取消',{exact:true}).waitFor();assert.equal(await page.locator('[data-send-message]').count(),0);checks.push('取消关闭发言');
  await page.locator('.tabbar [data-page=profile]').click();await page.locator('[data-logout]').click();await page.locator('[data-login]').waitFor();checks.push('会话退出');
  assert.deepEqual(errors,[]);console.log(JSON.stringify({ok:true,checks,screenshots},null,2));
}finally{if(browser)await browser.close();if(server)await new Promise(r=>server.close(r));backend.kill()}
