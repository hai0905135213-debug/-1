import path from "node:path";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";
import { normalizeName, nowIso, openDatabase, parseCliArgs, stableRestaurantId } from "./lib.mjs";

const args = parseCliArgs(process.argv.slice(2));
const workbookPath = path.resolve(args.input || "database/source/饭饭之交_合并饭店库.xlsx");
const workbook = await SpreadsheetFile.importXlsx(await FileBlob.load(workbookPath));
const sheet = workbook.worksheets.getItem("饭店总库");
const rows = sheet.getUsedRange().values;
const headerRowIndex = rows.findIndex((row) => row?.[0] === "饭店ID" && row?.[1] === "标准店名");
if (headerRowIndex < 0) throw new Error("没有在「饭店总库」找到表头，请确认输入文件未被改名或损坏。");

const headers = rows[headerRowIndex];
const field = (row, name) => String(row[headers.indexOf(name)] ?? "").trim();
const records = rows.slice(headerRowIndex + 1)
  .filter((row) => field(row, "饭店ID") && field(row, "标准店名"))
  .map((row) => ({
    sourceId: field(row, "饭店ID"), name: field(row, "标准店名"), cuisine: field(row, "菜系"), locationHint: field(row, "位置线索"),
    recommendedDishes: field(row, "推荐菜 / 活动"), optionalDishes: field(row, "非必需菜"), partySize: field(row, "适合人数"),
    bookingNote: field(row, "预约 / 排队提示"), mentionCount: Number(field(row, "累计提及")) || 0,
    positiveCount: Number(field(row, "正向词")) || 0, cautionCount: Number(field(row, "保留词")) || 0,
    sentiment: field(row, "群内倾向"), intakeStatus: field(row, "入库状态"), sourceBatches: field(row, "来源批次"),
    cleaningNote: field(row, "清洗备注"), rawMessages: field(row, "原始命中消息（汇总）"),
  }));

const db = await openDatabase();
const upsert = db.prepare(`
  INSERT INTO restaurants (
    id, source_id, name, normalized_name, cuisine, location_hint, recommended_dishes, optional_dishes, party_size, booking_note,
    mention_count, positive_count, caution_count, sentiment, intake_status, source_batches, cleaning_note, raw_messages,
    poi_status, created_at, updated_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '待补全', ?, ?)
  ON CONFLICT(normalized_name) DO UPDATE SET
    source_id=excluded.source_id, name=excluded.name, cuisine=excluded.cuisine, location_hint=excluded.location_hint,
    recommended_dishes=excluded.recommended_dishes, optional_dishes=excluded.optional_dishes, party_size=excluded.party_size,
    booking_note=excluded.booking_note, mention_count=excluded.mention_count, positive_count=excluded.positive_count,
    caution_count=excluded.caution_count, sentiment=excluded.sentiment, intake_status=excluded.intake_status,
    source_batches=excluded.source_batches, cleaning_note=excluded.cleaning_note, raw_messages=excluded.raw_messages,
    updated_at=excluded.updated_at
`);
const timestamp = nowIso();
db.exec("BEGIN");
try {
  for (const restaurant of records) {
    upsert.run(stableRestaurantId(restaurant.name), restaurant.sourceId, restaurant.name, normalizeName(restaurant.name), restaurant.cuisine, restaurant.locationHint,
      restaurant.recommendedDishes, restaurant.optionalDishes, restaurant.partySize, restaurant.bookingNote,
      restaurant.mentionCount, restaurant.positiveCount, restaurant.cautionCount, restaurant.sentiment, restaurant.intakeStatus,
      restaurant.sourceBatches, restaurant.cleaningNote, restaurant.rawMessages, timestamp, timestamp);
  }
  db.prepare("INSERT INTO sync_log(event_type, created_at, summary) VALUES (?, ?, ?)")
    .run("workbook_import", timestamp, JSON.stringify({ workbookPath, imported: records.length }));
  db.exec("COMMIT");
} catch (error) {
  db.exec("ROLLBACK");
  throw error;
} finally {
  db.close();
}
console.log(JSON.stringify({ ok: true, database: "database/data/restaurants.db", imported: records.length }, null, 2));
