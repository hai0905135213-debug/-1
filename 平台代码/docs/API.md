# 饭饭之交后端接口文档

## 2026-10-21 试运行产品收尾（优先于历史描述）

- `GET /api/policies`：公开服务/隐私说明、版本、运营名称及支持联系方式。
- `POST /api/account/onboarding`：昵称、校区、可选 `tasteTags/budgetPreference`，必须 `accepted:true` 和当前 `policyVersion`。未完成返回 `ONBOARDING_REQUIRED`，与组队白名单独立。
- `GET /api/account/data`：本人资料、当前课程、数据统计及删除说明。
- `DELETE /api/account/timetable`：清空本人课程和时间设置。
- `DELETE /api/account`：`confirmation:"注销账号"`。未结束饭局未处理或最后一名管理员返回409；成功撤销全部会话，删除当前个人数据并匿名化保留历史关联，不即时物理抹除备份。
- `GET /api/notifications/unread`：本人未读数量。
- `GET/POST /api/feedback`：本人游标分页20条；提交 `category:issue|restaurant|appeal`、`content`（1–1000字）、可选 `restaurantId`。其他用户不可读取。
- `GET /api/my-reports`：本人举报及处理说明。
- `GET /api/admin/feedback`、`POST /api/admin/feedback/:id`：管理员查看及回复，提交 `status:processing|resolved|rejected` 和非空 `reply`，发送通知。
- `POST /api/admin/reports/:id`：必须提交 `status:resolved|dismissed` 及非空 `reason`，留痕、通知举报者，不自动扣分。
- `GET /api/admin/content?type=meal|post|message&id=`：管理员核验预览；`POST /api/admin/moderation` 提交相同 `type`、数字 `id`、布尔 `hidden` 及非空 `reason`。隐藏招募饭局会关闭申请并取消；恢复展示不会自动重新招募。
- `PUT /api/admin/catalog/:restaurantId`：提交具体 `poiId`、核实 `address`、HTTPS `sourceUrl`、公开 `note`、`confirmed:true`；地址纠错停用旧坐标距离，不改已发布饭局快照。
- 管理员停用用户时撤销该用户所有会话，不能停用最后一名有效管理员。所有管理员接口服务端鉴权，客户端按钮不代替权限检查。

运行与外部待配置项见 `试运行产品收尾与验收.md`。迁移版本5，自动迁移前备份。

## 2026-10-20 审批组队版本更新

本节优先于后文历史MVP描述。接口错误为 `{ error: { code, message } }`。登录后使用 `Authorization: Bearer <token>`，不再接受 `dev-token-*` 或 `X-User-Id` 冒充登录。会话7天到期，可通过退出撤销。

| 接口 | 用途 |
| --- | --- |
| `POST /api/auth/wechat` | `{code}` 换取微信身份与本应用会话；后端需AppID及AppSecret |
| `POST /api/auth/login` | `{nickname}` 仅明确启用的本地开发环境可用 |
| `GET /api/auth/me` | 返回当前用户及 `accessStatus / isAdmin` |
| `POST /api/auth/logout` | 撤销当前会话 |
| `GET /api/restaurants/facets` | 有效菜系、场景标签和距离选项 |
| `GET /api/restaurants` | 支持 `page/pageSize/campus/keyword/sortBy/cuisine/tag/maxDistance`；多菜系及标签重复传同名参数 |
| `GET /api/restaurants/:id` | 支持 `campus/poiId`，返回所有候选及选定分店 |
| `POST /api/meals` | 发布预约饭局；新增 `deadline/restaurantId/poiId/meetingNote/topicTags` |
| `POST /api/meals/:id/apply` | 报名进入待审批，支持可选200字 `note` |
| `POST /api/meals/:id/join` | 兼容旧调用，语义同申请，不直接成为队员 |
| `POST /api/meals/:id/withdraw` | 撤回待审批申请 |
| `GET /api/meals/:id/applications` | 仅发起人可看申请与公开资料 |
| `POST /api/meals/:id/applications/:applicationId/approve` | 发起人审批通过，事务内分配名额 |
| `POST /api/meals/:id/applications/:applicationId/reject` | 发起人拒绝，申请者本场不可重报 |
| `POST /api/meals/:id/leave` | 普通成员在就餐开始前退出 |
| `POST /api/meals/:id/cancel` | 发起人取消饭局并通知 |
| `POST /api/meals/:id/finish` | 就餐开始且至少两名成员时，发起人标记完成 |
| `GET /api/meals/:id/messages?after=0` | 仅正式成员可读，最多30条，返回 `items/nextCursor/hasMore` |
| `POST /api/meals/:id/messages` | 正式成员在活跃饭局内提交 `{content}`，1–500字 |
| `GET /api/meals/mine` | `created/pending/joined/ended` 四组 |
| `POST /api/meals/:id/reviews` | 完成后对其他正式队员评价，同一对用户每场仅一次 |
| `GET /api/notifications?before=ID` | 当前用户消息，最多30条，含未读数 |
| `POST /api/notifications/read` | 标记当前用户全部已读 |
| `GET /api/admin/users` | 仅管理员读取体验资格列表 |
| `POST /api/admin/users/:id/access` | `{status: approved/pending/blocked}`；仅管理员 |
| `GET /api/admin/reports` | 仅管理员读取举报 |
| `POST /api/admin/reports/:id` | `{status: resolved/dismissed}`；仅管理员 |

餐厅ID统一视为字符串；候选POI及地址在发布饭局时保存快照。报名状态为 `pending/approved/rejected/withdrawn/closed`，饭局状态仍为 `open/matched/cancelled/finished`。待审批不占名额，发起人计入人数，满员关闭其余申请。

餐厅分页返回 `{items,total,hasMore}`，校区为 `cufe_shahe/cufe_nanlu`，排序为 `mention-desc/distance-asc`，距离单位km且为直线距离。未选校区时按两个校区中的较近距离处理。价格和评分无可靠数据时不提供模拟值。

`meetingNote` 只向正式成员返回；队内留言对退出者撤销访问。帖子新增 `mealId`，报名统一进入对应饭局；未关联历史帖子返回 `MEAL_LINK_REQUIRED`。

后文为历史接口说明，实际运行和新规则以本节及 `小程序开发与验收.md` 为准。

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

## 12. 餐厅列表

```http
GET /api/restaurants
```

可选查询参数：

| 参数 | 说明 | 示例 |
| --- | --- | --- |
| `campus` | 校区筛选 | `主校区` |
| `foodType` | 菜系/类型 | `麻辣香锅` |
| `keyword` | 搜索名称、类型、位置、描述 | `面` |

示例：

```http
GET /api/restaurants?foodType=麻辣香锅
GET /api/restaurants?keyword=面
```

返回按评分降序排列。

## 13. 餐厅详情

```http
GET /api/restaurants/:id
```

示例：

```http
GET /api/restaurants/1
```

## 14. 新增餐厅

```http
POST /api/restaurants
Authorization: Bearer dev-token-1
```

请求：

```json
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

| 字段 | 是否必填 | 说明 |
| --- | --- | --- |
| `name` | 是 | 餐厅/窗口名称 |
| `foodType` | 否 | 菜系/类型 |
| `campus` | 否 | 所在校区，默认 `主校区` |
| `location` | 否 | 具体位置 |
| `avgPrice` | 否 | 人均价格（单位：分，2200 = 22元） |
| `rating` | 否 | 综合评分 1-5 |
| `tags` | 否 | 标签数组 |
| `description` | 否 | 简介 |

## 前端联调建议

1. 启动后端：在 `平台代码/backend` 下执行 `npm run dev`
2. 先调 `POST /api/auth/login` 拿 token
3. 后续请求统一带 `Authorization: Bearer <token>`
4. 首页调用 `GET /api/meals?onlyAvailable=true`
5. 详情页调用 `GET /api/meals/:mealId`
6. 发布页调用 `POST /api/meals`
