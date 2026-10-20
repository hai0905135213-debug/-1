# 前端说明

2026-10-20更新：网页主预览保留原设计 `preview-static/`，`npm run preview:web` 启动；同时运行小程序H5时可用 `PORT=5174 npm run preview:web`。新增 `preview-static/integration.js` 接新登录、餐厅仓与审批组队接口。`npm run dev:h5` 单独调试 uni-app 页面；`npm run build` 生成 `dist/build/mp-weixin`；`npm run build:h5` 生成 uni-app 网页构建。两套UI共享后端，外观尚未统一。详细运行、资格管理及待验说明见 `../docs/小程序开发与验收.md`。

前端按 uni-app / 微信小程序方向组织，第一版先覆盖校园饭搭子 MVP 的五个核心页面。

## 页面

- `pages/home/index.vue`：首页，展示饭局列表和快捷发起入口。
- `pages/create-meal/index.vue`：发起饭局页。
- `pages/meal-detail/index.vue`：饭局详情页。
- `pages/my-meals/index.vue`：我的饭局页。
- `pages/profile/index.vue`：我的资料页。

## 目录

- `services/`：请求封装和接口调用。
- `styles/`：全局样式。
- `static/`：图片、图标等静态资源。

## 当前状态

已接真实后端数据及审批组队；真实微信登录、开发者工具及真机验收仍待AppID和设备条件。
