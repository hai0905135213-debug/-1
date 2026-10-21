import { request, authApi } from "./api";
let timer = null;
export async function refreshUnread() {
  try {
    const token = authApi.token();
    const count = token
      ? (await request("/notifications/unread", { silentAuth: true })).unread
      : 0;
    if (authApi.token() !== token) return 0;
    if (count)
      uni.setTabBarBadge({
        index: 4,
        text: count > 99 ? "99+" : String(count),
        fail: () => {},
      });
    else uni.removeTabBarBadge({ index: 4, fail: () => {} });
    uni.$emit("notifications:unread", count);
    return count;
  } catch {
    return 0;
  }
}
export function startUnread() {
  stopUnread();
  refreshUnread();
  timer = setInterval(refreshUnread, 30000);
}
export function stopUnread() {
  clearInterval(timer);
  timer = null;
}
