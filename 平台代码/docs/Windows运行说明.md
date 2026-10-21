# Windows 拉取和运行

本说明用于本地开发与微信开发者工具导入，不代表已部署体验版。建议安装 Node.js 22 LTS、Git 和微信开发者工具。后端和前端都要安装各自依赖，不复制 Mac 的 node_modules。

## 获取代码

首次使用，在 PowerShell 执行：

```powershell
git clone https://github.com/hai0905135213-debug/-1.git fanfan
cd fanfan
```

已经克隆过的仓库，在项目根目录执行：

```powershell
git status
git pull --ff-only origin main
```

如果有本地修改或提示分支分叉，先停止，不执行强制重置，避免丢失 Windows 端代码。

## 启动后端

在项目根目录打开一个终端：

```powershell
cd 平台代码/backend
npm ci
Copy-Item .env.example .env
```

复制配置仅在第一次进行，不覆盖已有 .env。编辑 .env，本地测试可设置 `ENABLE_DEV_LOGIN=true`，然后启动：

```powershell
node --env-file=.env src/server.js
```

接口为 `http://127.0.0.1:3001/api`。现有餐厅仓位于 `database/data/restaurants.db`。不得把真实用户库、密钥、教务信息或数据库备份提交到公开仓库。

组队需要管理员批准资格。管理员由后端 `ADMIN_USER_IDS` 明确配置；不要未经确认直接填写用户1。普通新用户默认待审批。

## 打开原版网页

另开终端，在项目根目录执行：

```powershell
cd 平台代码/frontend
$env:PORT="5174"
npm run preview:web
```

浏览器访问 `http://127.0.0.1:5174/`。这是保留原界面的网页入口，不是微信小程序。

## 编译微信小程序

另开终端，在项目根目录执行：

```powershell
cd 平台代码/frontend
npm ci
npm run build
```

微信开发者工具选择“导入”，目录选择当前电脑的 `平台代码/frontend/dist/build/mp-weixin`，不是 frontend 源码根目录。使用真实 AppID，并先在 `frontend/manifest.json` 的 `mp-weixin.appid` 填写同一个值后重新构建。

2026-10-22已将原版网页视觉移植到小程序主流程：头像搜索、三列专辑、餐厅卡片、四个筛选入口、图标底栏、蓝绿色个人页及发布/详情。保留真实帖子、资料确认、反馈申诉、账号数据、申请说明与审批状态。最新本地微信目标构建通过，但不等于微信开发者工具及真机验收已通过，也不是正式发布版。

你若已在 `frontend` 运行开发监听，先 `Ctrl+C`，然后 `git pull --ff-only origin main`，再运行 `npm.cmd run dev`；继续打开 `dist/dev/mp-weixin` 原项目即可。本次移植没有变更依赖，不必重新安装。若拉取提示本地修改冲突，不要强制覆盖，先保留自己的AppID配置与其他改动。

如需单独调试小程序的网页页面，运行 `npm run dev:h5`，默认地址为 `http://127.0.0.1:5173/`。

## 接口与真实登录

`frontend/.env.example` 是模板，默认接口为本地3001。可复制为 `.env.development`（开发）或 `.env.production`（构建）设置 `VITE_API_BASE_URL`。

手机上的127.0.0.1是手机自己，不是电脑。真机联调需使用手机可达的电脑地址并配置监听与防火墙；交给他人长期试运行需部署稳定后端及HTTPS，不靠关闭域名校验交付。

微信登录的 AppID/AppSecret 在后端 .env 配置，AppSecret不得写进前端或提交Git。开发者工具导入成功不等于微信登录和真机业务已验收。

## 常见日志：连接被拒绝、游客模式和卡片参数

- `http://127.0.0.1:3001/api/... ERR_CONNECTION_REFUSED`：请求的是Windows本机，不是Mac，也不是你的云服务器。确认Windows后端窗口仍在运行，再打开 `http://127.0.0.1:3001/api/health`，应返回 `ok:true`。前端监听窗口不能代替后端服务。
- 首次只做本地数据联调，可在另一个frontend目录的PowerShell执行 `cd ..\backend`、`npm.cmd ci`、`$env:ENABLE_DEV_LOGIN="true"`、`node src/server.js`。这使用默认本地3001端口和开发登录，不读取.env；需要真实微信登录或自定义配置时，按前文环境文件方式启动。
- `游客模式 / 无AppID关联`：先核对源码manifest的`mp-weixin.appid`及导入项目的AppID。未配置真实微信身份之前使用开发环境登录，不把游客模拟返回当作真实微信登录通过。
- `Missing required prop: post`及`undefined.author`：已补组件空参数防护。拉取最新代码后重新运行`npm.cmd run dev`；不要直接改dist。
- 开发构建后可在frontend运行 `node scripts/check-mp-output.mjs dist/dev/mp-weixin` 做产物级回归。这不是微信设备测试。

## 本次同步注意事项（2026-10-22）

- 本地业务库不随Git同步；Windows首次启动会新建业务库。餐厅仓已在仓库内，用户、资格、饭局和收藏不会从Mac自动迁移。
- 后端启动自动运行版本迁移，已有Windows业务库先备份再迁移；请保留 `backend/data` 和 `backups`，不要用Mac的库直接覆盖。
- 首次使用需明确确认当前版本服务/隐私说明，组队还需管理员批准体验资格，两者互相独立。
- 对外试用前配置真实 `PUBLIC_OPERATOR_NAME`、`PUBLIC_SUPPORT_CONTACT`，决定备份保留/清理办法；详见 `试运行产品收尾与验收.md`。
- 最近本地验收为后端27项、网页35个检查步骤通过；网页浏览器测试需要Playwright及本机Chrome，可用 `CHROME_EXECUTABLE` 指定Windows浏览器路径，不是运行小程序的前置条件。
