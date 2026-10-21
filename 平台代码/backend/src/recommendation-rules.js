// 可解释规则，不使用模型推断饮食禁忌；所有时间按北京时间计算。
export const SAMPLE_PERIODS = [
  ["08:00", "08:45"],
  ["08:55", "09:40"],
  ["10:00", "10:45"],
  ["10:55", "11:40"],
  ["13:30", "14:15"],
  ["14:25", "15:10"],
  ["15:30", "16:15"],
  ["16:25", "17:10"],
  ["18:30", "19:15"],
  ["19:25", "20:10"],
  ["20:20", "21:05"],
  ["21:15", "22:00"],
];
const DAY = 86400000;
export const dateInChina = (value) =>
  new Date(Number(value) + 8 * 3600000).toISOString().slice(0, 10);
export const minuteOfDay = (text) =>
  /^\d{2}:\d{2}$/.test(text) &&
  Number(text.slice(0, 2)) < 24 &&
  Number(text.slice(3)) < 60
    ? Number(text.slice(0, 2)) * 60 + Number(text.slice(3))
    : NaN;
export const overlap = (start, end, a, b) => start < b && end > a;
const at = (date, clock) => Date.parse(`${date}T${clock}:00+08:00`);
export function courseIntervals(courses, settings, date) {
  if (!settings?.confirmed) return [];
  const week =
    Math.floor(
      (at(date, "00:00") - at(settings.termStartDate, "00:00")) / (7 * DAY),
    ) + 1;
  if (week < 1 || week > 30) return [];
  const day = new Date(at(date, "12:00") + 8 * 3600000).getUTCDay() || 7;
  return courses
    .filter((c) => Number(c.dayOfWeek) === day)
    .filter(
      (c) =>
        !Array.isArray(c.weeks) || !c.weeks.length || c.weeks.includes(week),
    )
    .filter((c) => c.weekType !== "odd" || week % 2 === 1)
    .filter((c) => c.weekType !== "even" || week % 2 === 0)
    .flatMap((c) => {
      const first = settings.periods[Number(c.startPeriod) - 1],
        last = settings.periods[Number(c.endPeriod) - 1];
      return first && last
        ? [
            {
              start: at(date, first[0]),
              end: at(date, last[1]),
              name: c.courseName,
              week,
            },
          ]
        : [];
    })
    .sort((a, b) => a.start - b.start);
}
export function availability(
  courses,
  settings,
  now = Date.now(),
  manualMinutes,
) {
  if (manualMinutes !== undefined)
    return {
      source: "manual",
      minutes: manualMinutes,
      inClass: false,
      notes: ["空闲时间由本人填写，不代表课表校验结果"],
    };
  if (!courses.length || !settings?.confirmed)
    return {
      source: "unknown",
      minutes: null,
      inClass: false,
      notes: ["请导入课表并确认学期起始日和节次时间，或手动填写空闲分钟"],
    };
  const date = dateInChina(now),
    week =
      Math.floor(
        (at(date, "00:00") - at(settings.termStartDate, "00:00")) / (7 * DAY),
      ) + 1;
  if (week < 1 || week > 30)
    return {
      source: "unknown",
      minutes: null,
      inClass: false,
      notes: ["当前日期不在已配置的30周学期范围内，请更新学期设置"],
    };
  const intervals = courseIntervals(courses, settings, date),
    current = intervals.find((c) => overlap(now, now + 1, c.start, c.end)),
    next = intervals.find((c) => c.start > now);
  const notes = ["依据已导入且本人确认的课表；临时调课不会自动同步"];
  if (courses.some((c) => !c.weeks?.length))
    notes.push("部分课程缺少周次，保守按每周上课处理");
  return {
    source: "timetable",
    minutes: current
      ? 0
      : next
        ? Math.min(240, Math.floor((next.start - now) / 60000))
        : 240,
    inClass: Boolean(current),
    nextClass: next
      ? { start: new Date(next.start).toISOString(), name: next.name }
      : null,
    notes,
  };
}
export const normalizeCampus = (value) =>
  ({
    沙河校区: "cufe_shahe",
    学院南路校区: "cufe_nanlu",
    cufe_shahe: "cufe_shahe",
    cufe_nanlu: "cufe_nanlu",
  })[value] || "";
export function budgetRange(text) {
  const n = String(text || "")
    .match(/\d+(?:\.\d+)?/g)
    ?.map(Number);
  return n?.length ? [n[0], n[1] ?? n[0]] : null;
}
export function validCourses(courses) {
  return (
    Array.isArray(courses) &&
    courses.length <= 200 &&
    courses.every(
      (c) =>
        c &&
        typeof c.courseName === "string" &&
        c.courseName.trim().length > 0 &&
        c.courseName.length <= 100 &&
        Number.isInteger(c.dayOfWeek) &&
        c.dayOfWeek >= 1 &&
        c.dayOfWeek <= 7 &&
        Number.isInteger(c.startPeriod) &&
        Number.isInteger(c.endPeriod) &&
        c.startPeriod >= 1 &&
        c.endPeriod >= c.startPeriod &&
        c.endPeriod <= 16 &&
        (!c.weeks ||
          (Array.isArray(c.weeks) &&
            c.weeks.length <= 30 &&
            c.weeks.every((w) => Number.isInteger(w) && w >= 1 && w <= 30))) &&
        (!c.weekType || ["all", "odd", "even"].includes(c.weekType)),
    )
  );
}
export function rankMeal(meal, context) {
  const reasons = [],
    breakdown = [],
    add = (rule, points, reason) => {
      breakdown.push({ rule, points });
      reasons.push(reason);
    };
  add("available", 10, "仍在招募，报名需发起人审批");
  if (context.campus && meal.campus === context.campus)
    add("campus", 20, "与你选择的校区相同");
  if (
    context.budget &&
    meal.budgetMax > 0 &&
    meal.budgetMin <= context.budget[1] &&
    meal.budgetMax >= context.budget[0]
  )
    add("budget", 15, "每人预算与你的偏好区间重叠");
  const text = `${meal.foodType} ${meal.title} ${meal.description}`;
  const tastes = context.tastes.filter((x) => x && text.includes(x));
  if (tastes.length)
    add("taste", 20, `包含口味偏好：${tastes.slice(0, 3).join("、")}`);
  const topics = context.topics.filter((x) => meal.topicTags.includes(x));
  if (topics.length) add("topics", 15, `共同话题：${topics.join("、")}`);
  if (context.chatMode && meal.chatMode === context.chatMode)
    add("chat", 10, "聊天模式与你选择的一致");
  if (context.scheduleKnown)
    add("schedule", 10, "按已确认课表未发现就餐时段冲突");
  return {
    ...meal,
    matchScore: breakdown.reduce((n, x) => n + x.points, 0),
    reasons,
    breakdown,
  };
}
