// 服务端统一存UTC，页面按设备本地时区展示，避免直接截取ISO字符串产生8小时偏移。
export function localTime(value) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "时间待定";
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
