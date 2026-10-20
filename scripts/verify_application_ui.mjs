import {chromium} from 'playwright';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,extname,resolve} from 'node:path';
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';

// 独立浏览器上下文、临时业务库；真实餐厅仓只读。不会接触日常浏览器的登录状态。
const root=resolve('平台代码/frontend/dist/build/h5');
const screenshots=join(tmpdir(),'fanfan-ui-acceptance');await mkdir(screenshots,{recursive:true});
const child=spawn(process.execPath,['平台代码/backend/src/server.js'],{env:{...process.env,DATA_DIR:mkdtempSync(join(tmpdir(),'fanfan-ui-db-')),PORT:'0',ENABLE_DEV_LOGIN:'true',ADMIN_USER_IDS:'1',SEED_DEMO:'false'}});
let browser,server;
try{
 const base=await new Promise((resolve,reject)=>{let out='';const timeout=setTimeout(()=>reject(new Error('后端启动超时: '+out)),15000);child.stdout.on('data',x=>{out+=x;const match=out.match(/http:\/\/127\.0\.0\.1:\d+/);if(match){clearTimeout(timeout);resolve(match[0]+'/api')}});child.stderr.on('data',x=>out+=x);child.once('error',reject);child.once('exit',code=>{if(code){clearTimeout(timeout);reject(new Error(out))}})});
 console.log('临时后端已启动');
 const api=async(path,method='GET',token,data)=>{const response=await fetch(base+path,{method,signal:AbortSignal.timeout(10000),headers:{'content-type':'application/json',...(token?{authorization:'Bearer '+token}:{})},body:data===undefined?undefined:JSON.stringify(data)});const result=await response.json();assert.ok(response.ok,JSON.stringify(result));return result};
 server=createServer(async(req,res)=>{try{const filename=resolve(root,'.'+new URL(req.url,'http://local').pathname);if(!filename.startsWith(root+'/')&&filename!==root)throw new Error('Invalid path');const actual=filename===root||filename===root+'/'?join(root,'index.html'):filename;res.setHeader('Content-Type',({'.html':'text/html','.js':'application/javascript','.css':'text/css','.svg':'image/svg+xml'})[extname(actual)]||'application/octet-stream');res.end(await readFile(actual))}catch{res.writeHead(404);res.end('Not found')}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const web=`http://127.0.0.1:${server.address().port}`;
 browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_EXECUTABLE||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 console.log('隔离浏览器已启动');
 const host=await api('/auth/login','POST',null,{nickname:'页面发起人'}),member=await api('/auth/login','POST',null,{nickname:'页面队员'});
 await api(`/admin/users/${member.user.id}/access`,'POST',host.token,{status:'approved'});
 const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1});
 await context.addInitScript(session=>{localStorage.setItem('authToken',session.token);localStorage.setItem('currentUser',JSON.stringify({type:'object',data:session.user}))},host);
 await context.route('**/*',async route=>{const url=route.request().url();if(url.startsWith('http://127.0.0.1:3001/api/')){const response=await context.request.fetch(url.replace('http://127.0.0.1:3001/api',base),{method:route.request().method(),headers:route.request().headers(),data:route.request().postData()||undefined});return route.fulfill({response})}if(route.request().resourceType()==='image'&&!url.startsWith(web))return route.abort();return route.continue()});
 const page=await context.newPage(),errors=[];page.setDefaultTimeout(15000);page.setDefaultNavigationTimeout(15000);page.on('pageerror',error=>errors.push(error.message));
 await page.goto(web);console.log('页面已打开');await page.locator('.restaurant').first().waitFor();console.log('餐厅卡片已显示');
 assert.equal(await page.locator('.restaurant').count(),6);
 await page.waitForFunction(()=>{const image=document.querySelector('.restaurant img');return image&&image.complete&&image.naturalWidth>0&&image.src.includes('restaurant-placeholder')},null,{timeout:15000});
 await page.screenshot({path:join(screenshots,'home.png')});
 await page.locator('.search-row input').fill('潇湘阁');
 await page.waitForFunction(()=>document.querySelectorAll('.restaurant').length>0&&Array.from(document.querySelectorAll('.restaurant .name')).every(x=>x.textContent.includes('潇湘阁')),null,{timeout:15000});
 await page.screenshot({path:join(screenshots,'restaurant-search.png')});
 await page.locator('.restaurant').first().click();await page.getByText('在此店发起饭局',{exact:true}).waitFor();
 await page.getByText('在此店发起饭局',{exact:true}).click();await page.getByText('发起预约饭局',{exact:true}).waitFor();
 const meal=(await api('/meals','POST',host.token,{title:'页面审批验收',place:'校门口',campus:'cufe_shahe',maxPeople:2,mealTime:new Date(Date.now()+86400000).toISOString()})).meal;
 await api(`/meals/${meal.id}/apply`,'POST',member.token,{});
 await page.goto(web+`/#/pages/meal-detail/index?id=${meal.id}`);await page.getByText('管理申请（1）',{exact:true}).waitFor();
 await page.getByText('管理申请（1）',{exact:true}).click();await page.getByText('通过',{exact:true}).click();
 await page.getByText('已通过',{exact:true}).waitFor();
 assert.equal((await api(`/meals/${meal.id}`,'GET',host.token)).meal.status,'matched');
 await page.screenshot({path:join(screenshots,'team-approved.png')});
 assert.deepEqual(errors,[]);
 console.log(JSON.stringify({ok:true,checks:['首屏6家','搜索防抖','图片失败回退','餐厅详情','餐厅预填发布','实际审批按钮','满员成局','无页面运行异常'],screenshots},null,2));
}finally{if(browser)await browser.close();if(server)await new Promise(r=>server.close(r));child.kill()}
