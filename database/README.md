# 饭饭之交｜餐厅数据仓

这个目录独立于 `平台代码/backend`：它负责把聊天清洗后的饭店资料变成可持续维护的本地 SQLite 数据库，并用高德 POI 检索补全门店信息。

## 第一次使用

在项目根目录运行：

```bash
node database/src/bootstrap-from-workbook.mjs
node database/src/status.mjs
```

这会从 `database/source/饭饭之交_合并饭店库.xlsx` 导入餐厅资料，创建：

```text
database/data/restaurants.db
```

原 Excel 的副本会保存在本目录的 `source/`，不会被脚本改动；SQLite 是后续持续补充、查询和给产品使用的数据源。

## 接入高德自动补全

1. 在高德开放平台创建 **Web 服务** Key。
2. 复制 `.env.example` 为 `.env`，只在本地填写 Key。
3. 运行：

```bash
node database/src/enrich-amap.mjs
```

脚本默认只查 `待补全` 的店；高置信度门店自动写入地址、坐标、电话、营业时间、类别、POI ID 和一张地图图片链接。重名或分店不明确的结果同样会保留高德返回的候选地址和坐标，供后续按距离计算，不会丢弃。

常用命令：

```bash
# 每次清洗出新的总库后，增量导入新店和新推荐信息
node database/src/bootstrap-from-workbook.mjs

# 再尝试查询「人工确认 / 未找到 / 请求异常」的记录
node database/src/enrich-amap.mjs --retry

# 180 天后重新核验已匹配门店
node database/src/enrich-amap.mjs --refresh-days 180

# 导出给前端或后端读取的 JSON
node database/src/export-for-app.mjs
```

其中 `database/data/poi-candidates.json` 是“每家餐厅 → 高德前 5 个候选门店”的完整候选集；可用学校、宿舍或用户位置坐标计算距离后再选门店。不要下载北京全量 POI，按店名查询候选集更快，也能避免把无关商户混进来。

## 两个校区距离

已内置中央财经大学的两个距离锚点：`cufe_shahe`（沙河校区）和 `cufe_nanlu`（学院南路校区）。首次运行：

```bash
node database/src/sync-campus-locations.mjs
node database/src/calculate-campus-distances.mjs
node database/src/export-for-app.mjs
```

导出的每个候选门店会有 `distanceKm.cufe_shahe` 和 `distanceKm.cufe_nanlu`；前端按用户选择的校区读取对应字段即可。`nearestCandidateByCampus` 还提前给出了每个校区距离最近的候选门店。

## 数据安全与规则

- `.env` 和 `.db` 都不会提交到 Git。
- 地图图片只保存公开 POI 返回的 URL，不抓取或转存图片。
- `poi_status=人工确认` 时，请先核验候选项再在库里确认；不要把同名不同店自动合并。
- 查询日志、候选结果和最后查询时间都会存库，方便复查和控制重复请求。

## 半自动分类补全

当 `cuisine`、推荐菜或标签不完整时，可以先生成审核队列，不直接改库：

```bash
node database/src/suggest-classification.mjs
```

脚本会输出：

```text
database/data/classification-suggestions.json
database/data/classification-suggestions.csv
```

CSV 适合用 Excel 打开人工审核；JSON 适合后续继续写审核工具。建议先看 `reviewStatus=high_confidence` 的记录，再看 `needs_review`。

确认规则可靠后，才使用高置信自动应用：

```bash
node database/src/suggest-classification.mjs --apply-high-confidence
```

该命令只会应用高置信建议，并写入 `sync_log`。低置信建议仍需人工确认。
