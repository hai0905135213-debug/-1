# 饭饭之交后端接口文档

本接口文档对应 `平台代码/backend`，当前为 MVP 联调版。服务默认运行在：

```text
http://127.0.0.1:3001
```

## 通用规则

- 请求体：`Content-Type: application/json`
- 返回体：统一为 JSON
- 登录后接口携带：`Authorization: Bearer <token>`
- MVP 阶段 token 示例：登录接口返回 `dev-token-用户ID`
- 也可临时用请求头：`X-User-Id: 1`

错误格式：

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "错误说明"
  }
}
```

## 1. 健康检查

```http
GET /api/health
```

用途：确认后端是否启动。

## 2. 登录或注册

```http
POST /api/auth/login
```

请求：

```json
{
  "nickname": "小林",
  "studentNo": "2026001",
  "school": "示例大学"
}
```

返回：

```json
{
  "token": "dev-token-1",
  "user": {
    "id": "1",
    "nickname": "小林",
    "studentNo": "2026001",
    "school": "示例大学",
    "creditScore": 98
  },
  "profile": {
    "userId": "1",
    "campus": "主校区",
    "tasteTags": ["川菜", "不吃香菜"],
    "personalityTags": ["慢热", "安静吃饭"],
    "budgetPreference": "20-40"
  }
}
```

## 3. 获取我的资料

```http
GET /api/profile
Authorization: Bearer dev-token-1
```

用途：我的资料页初始化。

## 4. 更新我的资料

```http
PUT /api/profile
Authorization: Bearer dev-token-1
```

请求：

```json
{
  "avatarUrl": "",
  "gender": "unknown",
  "campus": "主校区",
  "tasteTags": ["川菜", "不吃香菜"],
  "personalityTags": ["慢热", "安静吃饭"],
  "budgetPreference": "20-40"
}
```

## 5. 饭局列表

```http
GET /api/meals
```

可选查询参数：

| 参数 | 说明 | 示例 |
| --- | --- | --- |
| `status` | 饭局状态：`open` 可加入，`matched` 已成局 | `open` |
| `campus` | 校区 | `主校区` |
| `keyword` | 搜索标题、类型、地点、描述 | `麻辣香锅` |
| `onlyAvailable` | 只看可加入饭局 | `true` |

示例：

```http
GET /api/meals?status=open&onlyAvailable=true
```

## 6. 发布饭局

```http
POST /api/meals
Authorization: Bearer dev-token-1
```

请求：

```json
{
  "title": "二食堂麻辣香锅拼一桌",
  "foodType": "麻辣香锅",
  "mealTime": "2026-07-09T11:30:00.000Z",
  "place": "二食堂一楼",
  "campus": "主校区",
  "maxPeople": 4,
  "budgetMin": 20,
  "budgetMax": 35,
  "chatMode": "talkative",
  "description": "想找两三个人一起点，口味中辣。"
}
```

字段说明：

| 字段 | 是否必填 | 说明 |
| --- | --- | --- |
| `title` | 是 | 饭局标题 |
| `mealTime` | 是 | ISO 时间字符串 |
| `place` | 是 | 食堂、商圈或店铺位置 |
| `maxPeople` | 是 | 2 到 12 人 |
| `foodType` | 否 | 菜品/餐饮类型 |
| `budgetMin` / `budgetMax` | 否 | 预算区间 |
| `chatMode` | 否 | `quiet` 少聊天，`balanced` 正常，`talkative` 可聊天 |
| `description` | 否 | 补充说明 |

## 7. 饭局详情

```http
GET /api/meals/:mealId
```

示例：

```http
GET /api/meals/1
```

返回包含：

- 饭局基础信息
- 发起人 `creator`
- 当前人数 `joinedCount`
- 剩余名额 `availableSeats`
- 参与者 `participants`
- 评价 `reviews`

## 8. 加入饭局

```http
POST /api/meals/:mealId/join
Authorization: Bearer dev-token-2
```

成功后返回最新饭局详情。人数达到 `maxPeople` 后，饭局状态自动变为 `matched`。

## 9. 退出饭局

```http
POST /api/meals/:mealId/leave
Authorization: Bearer dev-token-2
```

说明：

- 普通参与者可退出
- 当前 MVP 中发起人不能退出自己创建的饭局

## 10. 我的饭局

```http
GET /api/meals/mine
Authorization: Bearer dev-token-1
```

返回：

```json
{
  "created": [],
  "joined": []
}
```

## 11. 发布评价

```http
POST /api/meals/:mealId/reviews
Authorization: Bearer dev-token-1
```

请求：

```json
{
  "targetUserId": "2",
  "rating": 5,
  "content": "准时，吃饭体验不错。"
}
```

说明：只有饭局参与者可以评价。

## 前端联调建议

1. 启动后端：在 `平台代码/backend` 下执行 `npm run dev`
2. 先调 `POST /api/auth/login` 拿 token
3. 后续请求统一带 `Authorization: Bearer <token>`
4. 首页调用 `GET /api/meals?onlyAvailable=true`
5. 详情页调用 `GET /api/meals/:mealId`
6. 发布页调用 `POST /api/meals`
