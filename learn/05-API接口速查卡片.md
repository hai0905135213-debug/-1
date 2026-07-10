---
aliases: [API速查, 接口卡片, API Reference]
tags: [api, reference, quick-start]
created: 2026-07-09
---

# API 接口速查卡片

> 速查用——每个接口一句话描述 + 请求示例 + 返回示例。完整文档见 [[../API|API.md]]。

## 约定

- Base URL: `http://127.0.0.1:3001`
- 需登录的接口带：`Authorization: Bearer dev-token-{userId}`
- 或快捷方式：`X-User-Id: {userId}`

---

## 🔌 健康检查

```http
GET /api/health
```

```json
{"ok":true, "service":"fanfan-backend", "version":"0.2.0", "storage":"sqlite"}
```

---

## 👤 登录/注册

```http
POST /api/auth/login
Content-Type: application/json

{"nickname": "小林", "studentNo": "2026001", "school": "示例大学"}
```

```json
{"token": "dev-token-1", "user": {...}, "profile": {...}}
```

> 新用户返回 201，老用户返回 200。`token` 格式固定为 `dev-token-{id}`。

---

## 📋 我的资料

```http
GET  /api/profile   # 读
PUT  /api/profile   # 改
```

PUT 请求体：
```json
{"avatarUrl":"", "gender":"male", "campus":"主校区",
 "tasteTags":["川菜"], "personalityTags":["外向"], "budgetPreference":"20-40"}
```

---

## 🍽️ 饭局

### 列表
```http
GET /api/meals?status=open&campus=主校区&keyword=麻辣&onlyAvailable=true
```
所有参数可选。

### 发布
```http
POST /api/meals
Content-Type: application/json

{
  "title": "二食堂麻辣香锅拼一桌",
  "foodType": "麻辣香锅",
  "mealTime": "2026-07-09T11:30:00.000Z",
  "place": "二食堂一楼",
  "maxPeople": 4,
  "budgetMin": 20, "budgetMax": 35,
  "chatMode": "talkative",
  "description": "想找两三个人一起点。"
}
```

必填：`title` `mealTime` `place` `maxPeople`。`maxPeople` 范围 2-12。

### 详情
```http
GET /api/meals/1
```
返回含 `participants` 和 `reviews`。

### 加入
```http
POST /api/meals/1/join
```
校验：不能重复加入、不能满员、状态必须 open。人数满自动变 `matched`。

### 退出
```http
POST /api/meals/1/leave
```
发起人不能退出自己创建的饭局。

### 我的饭局
```http
GET /api/meals/mine
```
```json
{"created": [...], "joined": [...]}
```

---

## ⭐ 评价

```http
POST /api/meals/1/reviews
Content-Type: application/json

{"targetUserId": 2, "rating": 5, "content": "准时，体验不错。"}
```

约束：必须是该饭局的参与者。`rating` 范围 1-5。

---

## 🏪 餐厅

### 列表
```http
GET /api/restaurants?campus=主校区&foodType=麻辣香锅&keyword=面
```
按评分降序。所有参数可选。

### 详情
```http
GET /api/restaurants/1
```

### 新增
```http
POST /api/restaurants
Content-Type: application/json

{
  "name": "西区食堂黄焖鸡",
  "foodType": "黄焖鸡",
  "campus": "西校区",
  "location": "西区食堂二楼",
  "avgPrice": 2200,
  "rating": 4.1,
  "tags": ["快餐", "单人", "下饭"],
  "description": "黄焖鸡米饭，汤汁拌饭一绝。"
}
```

必填：`name`。`avgPrice` 单位为分（2200=22元）。

---

## 🚀 启动命令

```bash
cd 平台代码/backend
npm run dev
# → http://127.0.0.1:3001
```

重置数据：
```bash
rm backend/data/fanfan.db && npm run dev
```

---

## 📊 全接口一览

| # | 方法 | 路径 | 需要登录 | 作用 |
|---|---|---|---|---|
| 1 | GET | `/api/health` | — | 健康检查 |
| 2 | POST | `/api/auth/login` | — | 登录/注册 |
| 3 | GET | `/api/profile` | ✅ | 读资料 |
| 4 | PUT | `/api/profile` | ✅ | 改资料 |
| 5 | GET | `/api/meals` | — | 饭局列表(可筛选) |
| 6 | POST | `/api/meals` | ✅ | 发布饭局 |
| 7 | GET | `/api/meals/mine` | ✅ | 我的饭局 |
| 8 | GET | `/api/meals/:id` | — | 饭局详情 |
| 9 | POST | `/api/meals/:id/join` | ✅ | 加入饭局 |
| 10 | POST | `/api/meals/:id/leave` | ✅ | 退出饭局 |
| 11 | POST | `/api/meals/:id/reviews` | ✅ | 发表评价 |
| 12 | GET | `/api/restaurants` | — | 餐厅列表 |
| 13 | GET | `/api/restaurants/:id` | — | 餐厅详情 |
| 14 | POST | `/api/restaurants` | ✅ | 新增餐厅 |

---

← 上一篇 [[04-项目约定与模式]]
