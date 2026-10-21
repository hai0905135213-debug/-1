// 这里只计算展示提示；是否允许申请、审批仍由后端最终校验。
export function recruitmentHint(meal, now = Date.now()) {
  if (!meal) return "";
  if (meal.status === "cancelled") return "饭局已取消，不再接收报名";
  if (meal.status === "finished") return "饭局已完成，可由正式成员评价队友";
  if (meal.status === "matched") return "已经满员，暂不接收新申请";
  const remaining = Date.parse(meal.deadline) - now;
  if (meal.recruitmentClosed || remaining <= 0)
    return "报名已截止，不能新增申请或审批";
  if (!Number.isFinite(remaining)) return "截止时间待刷新，请以服务端状态为准";
  const minutes = Math.ceil(remaining / 60000);
  const left =
    minutes >= 1440
      ? `${Math.floor(minutes / 1440)}天${Math.floor((minutes % 1440) / 60)}小时`
      : minutes >= 60
        ? `${Math.floor(minutes / 60)}小时${minutes % 60}分钟`
        : `${minutes}分钟`;
  return `距报名截止约${left} · 剩余${Math.max(0, meal.maxPeople - meal.currentPeople)}个正式名额，申请不占位`;
}
