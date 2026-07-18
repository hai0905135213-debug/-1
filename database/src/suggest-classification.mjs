import fs from "node:fs/promises";
import path from "node:path";
import { DATABASE_DATA_DIR, openDatabase, nowIso, parseCliArgs } from "./lib.mjs";

const OUTPUT_PATH = path.join(DATABASE_DATA_DIR, "classification-suggestions.json");
const CSV_OUTPUT_PATH = path.join(DATABASE_DATA_DIR, "classification-suggestions.csv");
const HIGH_CONFIDENCE_THRESHOLD = 0.82;

const CUISINE_RULES = [
  { cuisine: "火锅", tags: ["火锅", "聚餐"], confidence: 0.9, patterns: [/火锅|涮|锅底|毛肚|鸭肠|酸汤|牛杂煲|猪肚鸡/] },
  { cuisine: "烧烤", tags: ["烧烤", "夜宵"], confidence: 0.88, patterns: [/烧烤|烤翅|烤串|烤肉|焖烤/] },
  { cuisine: "湘菜", tags: ["湘菜", "下饭菜"], confidence: 0.86, patterns: [/湘|臭鳜鱼|小炒黄牛肉/] },
  { cuisine: "川菜", tags: ["川菜", "重口味"], confidence: 0.84, patterns: [/川|蜀|渝|宜宾|小面|燃面|麻辣|水煮|酸菜鱼/] },
  { cuisine: "粤菜", tags: ["粤菜", "早茶"], confidence: 0.84, patterns: [/粤|顺德|茶餐厅|冰室|干蒸|煲仔|肠粉/] },
  { cuisine: "东北菜", tags: ["东北菜", "大份量"], confidence: 0.84, patterns: [/东北|铁锅炖|锅包肉|砂锅居/] },
  { cuisine: "北京菜", tags: ["北京菜", "本地菜"], confidence: 0.82, patterns: [/北京|北平|炸酱面|烤鸭|铜锅|涮羊肉|护国寺/] },
  { cuisine: "日料", tags: ["日料"], confidence: 0.82, patterns: [/日式|寿喜烧|和牛|寿司|三文鱼/] },
  { cuisine: "西餐", tags: ["西餐"], confidence: 0.82, patterns: [/西餐|披萨|pizza|俄餐|阿拉伯/] },
  { cuisine: "甜品饮品", tags: ["甜品", "饮品"], confidence: 0.82, patterns: [/甜品|糖水|面包|蛋糕|冰淇淋|茶冰厅/] },
  { cuisine: "面食", tags: ["面食", "快餐"], confidence: 0.78, patterns: [/面|米粉|米线|粉|炸酱/] },
  { cuisine: "清真", tags: ["清真"], confidence: 0.9, patterns: [/清真|牛街|阿拉伯|ALAMEEN/i] }
];

const DISH_RULES = [
  { dish: "火锅", patterns: [/火锅|涮|锅底|毛肚|酸汤|牛杂煲/] },
  { dish: "烤肉", patterns: [/烤肉|烧肉|烤串|烧烤/] },
  { dish: "炸酱面", patterns: [/炸酱面|方砖厂/] },
  { dish: "锅包肉", patterns: [/东北|铁锅炖|锅包肉/] },
  { dish: "煲仔饭", patterns: [/煲仔/] },
  { dish: "小炒黄牛肉", patterns: [/湘|小炒/] },
  { dish: "酸菜鱼", patterns: [/酸菜鱼|鱼火锅|石锅鱼/] },
  { dish: "寿喜烧", patterns: [/寿喜烧|和牛/] },
  { dish: "披萨", patterns: [/披萨|pizza/i] },
  { dish: "甜品", patterns: [/甜品|糖水|蛋糕|冰淇淋/] }
];

function textOf(row) {
  return [
    row.name,
    row.cuisine,
    row.location_hint,
    row.recommended_dishes,
    row.optional_dishes,
    row.party_size,
    row.booking_note,
    row.cleaning_note,
    row.raw_messages,
    row.amap_name,
    row.amap_category,
    row.full_address,
    row.district,
    row.candidate_names,
    row.candidate_categories
  ].filter(Boolean).join(" ");
}

function hasUncertainCuisine(value) {
  return /推测|需确认|依据上下文/.test(String(value || ""));
}

function cleanCuisine(value) {
  return String(value || "")
    .replace(/[（(].*?[）)]/g, "")
    .replace(/需确认|待核验|推测|依据上下文/g, "")
    .trim();
}

function splitTags(...values) {
  return values
    .flatMap((value) => String(value || "").split(/[、,，/｜|;；\s]+/))
    .map(cleanCuisine)
    .filter(Boolean);
}

function inferCuisine(row) {
  const text = textOf(row);
  const matches = [];
  for (const rule of CUISINE_RULES) {
    const matchedPatterns = rule.patterns.filter((pattern) => pattern.test(text));
    if (matchedPatterns.length === 0) continue;
    matches.push({
      cuisine: rule.cuisine,
      tags: rule.tags,
      confidence: Math.min(0.98, rule.confidence + (matchedPatterns.length - 1) * 0.03),
      reason: matchedPatterns.map((pattern) => String(pattern)).join(", ")
    });
  }
  matches.sort((a, b) => b.confidence - a.confidence);
  return matches[0] || null;
}

function inferRecommendedDishes(row) {
  if (String(row.recommended_dishes || "").trim()) return [];
  const text = textOf(row);
  return [...new Set(DISH_RULES
    .filter((rule) => rule.patterns.some((pattern) => pattern.test(text)))
    .map((rule) => rule.dish))]
    .slice(0, 4);
}

function buildSuggestion(row) {
  const cuisineEmpty = !String(row.cuisine || "").trim();
  const cuisineUncertain = hasUncertainCuisine(row.cuisine);
  const cuisineSuggestion = cuisineEmpty || cuisineUncertain ? inferCuisine(row) : null;
  const dishSuggestions = inferRecommendedDishes(row);
  const tags = splitTags(
    cuisineSuggestion?.cuisine || row.cuisine,
    row.recommended_dishes,
    row.optional_dishes,
    row.amap_category,
    row.candidate_categories,
    ...dishSuggestions
  );
  if (/沙河/.test(textOf(row))) tags.push("近沙河");
  if (/南路|学院南路/.test(textOf(row))) tags.push("近学院南路");
  if (/清真/.test(textOf(row))) tags.push("清真");
  if (/聚|团建|宴请|多人/.test(textOf(row))) tags.push("适合聚餐");

  const issues = [];
  if (cuisineEmpty) issues.push("cuisine_empty");
  if (cuisineUncertain) issues.push("cuisine_uncertain");
  if (!String(row.recommended_dishes || "").trim()) issues.push("recommended_dishes_empty");
  if (!String(row.full_address || "").trim()) issues.push("full_address_empty");

  const confidence = cuisineSuggestion?.confidence || (dishSuggestions.length > 0 ? 0.68 : 0.35);
  return {
    id: row.id,
    name: row.name,
    mentionCount: row.mention_count,
    current: {
      cuisine: row.cuisine || "",
      recommendedDishes: row.recommended_dishes || "",
      optionalDishes: row.optional_dishes || "",
      locationHint: row.location_hint || "",
      fullAddress: row.full_address || "",
      amapCategory: row.amap_category || ""
    },
    issues,
    suggestion: {
      cuisine: cuisineSuggestion?.cuisine || cleanCuisine(row.cuisine) || "",
      recommendedDishes: dishSuggestions.join("、"),
      tags: [...new Set(tags)].slice(0, 10),
      confidence,
      reason: cuisineSuggestion?.reason || "只生成标签/推荐菜线索，需人工确认"
    },
    reviewStatus: confidence >= HIGH_CONFIDENCE_THRESHOLD ? "high_confidence" : "needs_review"
  };
}

function applyHighConfidenceSuggestions(db, suggestions) {
  const now = nowIso();
  const update = db.prepare(`
    UPDATE restaurants
    SET cuisine = CASE WHEN trim(COALESCE(cuisine, '')) = '' OR cuisine LIKE '%推测%' OR cuisine LIKE '%需确认%' THEN ? ELSE cuisine END,
        recommended_dishes = CASE WHEN trim(COALESCE(recommended_dishes, '')) = '' THEN ? ELSE recommended_dishes END,
        cleaning_note = trim(COALESCE(cleaning_note, '') || ?),
        updated_at = ?
    WHERE id = ?
  `);
  let applied = 0;
  for (const item of suggestions) {
    if (item.reviewStatus !== "high_confidence") continue;
    if (!item.suggestion.cuisine && !item.suggestion.recommendedDishes) continue;
    update.run(
      item.suggestion.cuisine,
      item.suggestion.recommendedDishes,
      `\n自动分类建议 ${now}: ${item.suggestion.tags.join("、")}`,
      now,
      item.id
    );
    applied += 1;
  }
  return applied;
}

function csvEscape(value) {
  const text = Array.isArray(value) ? value.join("、") : String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

function buildCsv(suggestions) {
  const headers = [
    "id",
    "name",
    "reviewStatus",
    "confidence",
    "issues",
    "currentCuisine",
    "suggestedCuisine",
    "currentRecommendedDishes",
    "suggestedRecommendedDishes",
    "suggestedTags",
    "locationHint",
    "fullAddress",
    "reason"
  ];
  const rows = suggestions.map((item) => [
    item.id,
    item.name,
    item.reviewStatus,
    item.suggestion.confidence,
    item.issues,
    item.current.cuisine,
    item.suggestion.cuisine,
    item.current.recommendedDishes,
    item.suggestion.recommendedDishes,
    item.suggestion.tags,
    item.current.locationHint,
    item.current.fullAddress,
    item.suggestion.reason
  ].map(csvEscape).join(","));
  return `\uFEFF${headers.join(",")}\n${rows.join("\n")}\n`;
}

const args = parseCliArgs(process.argv.slice(2));
const db = await openDatabase();
const rows = db.prepare(`
  SELECT r.*,
         GROUP_CONCAT(pc.name, ' ') AS candidate_names,
         GROUP_CONCAT(pc.category, ' ') AS candidate_categories
  FROM restaurants r
  LEFT JOIN poi_candidates pc ON pc.restaurant_id = r.id
  GROUP BY r.id
  ORDER BY
    CASE WHEN trim(COALESCE(r.cuisine, '')) = '' THEN 0 ELSE 1 END,
    r.mention_count DESC,
    r.id ASC
`).all();

const suggestions = rows
  .map(buildSuggestion)
  .filter((item) => item.issues.length > 0 || item.suggestion.tags.length > 0)
  .sort((a, b) => b.suggestion.confidence - a.suggestion.confidence || b.mentionCount - a.mentionCount);

await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
await fs.writeFile(OUTPUT_PATH, JSON.stringify({
  generatedAt: nowIso(),
  source: "database/data/restaurants.db",
  totals: {
    restaurants: rows.length,
    suggestions: suggestions.length,
    highConfidence: suggestions.filter((item) => item.reviewStatus === "high_confidence").length,
    needsReview: suggestions.filter((item) => item.reviewStatus === "needs_review").length
  },
  suggestions
}, null, 2), "utf8");
await fs.writeFile(CSV_OUTPUT_PATH, buildCsv(suggestions), "utf8");

let applied = 0;
if (args["apply-high-confidence"]) {
  applied = applyHighConfidenceSuggestions(db, suggestions);
  db.prepare("INSERT INTO sync_log (event_type, created_at, summary) VALUES (?, ?, ?)")
    .run("classification_suggestions_applied", nowIso(), `Applied ${applied} high confidence classification suggestions.`);
}
db.close();

console.log(JSON.stringify({
  output: "database/data/classification-suggestions.json",
  csvOutput: "database/data/classification-suggestions.csv",
  suggestions: suggestions.length,
  highConfidence: suggestions.filter((item) => item.reviewStatus === "high_confidence").length,
  needsReview: suggestions.filter((item) => item.reviewStatus === "needs_review").length,
  applied
}, null, 2));
