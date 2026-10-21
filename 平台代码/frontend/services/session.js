const tabs = [
  "/pages/home/index",
  "/pages/find/index",
  "/pages/create-meal/index",
  "/pages/feed/index",
  "/pages/profile/index",
];
export function currentPageUrl() {
  try {
    const pages = getCurrentPages();
    const page = pages.at(-1);
    if (!page) return "";
    const query = Object.entries(page.options || {})
      .filter(
        ([k, v]) =>
          ["id", "mealId", "campus", "poiId", "tab", "restaurantId"].includes(
            k,
          ) && String(v).length < 250,
      )
      .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
      .join("&");
    return "/" + page.route + (query ? "?" + query : "");
  } catch {
    return "";
  }
}
export function rememberReturn(url = currentPageUrl()) {
  if (
    /^\/pages\/[a-z-]+\/index(?:\?[^\r\n#]{0,1000})?$/.test(url) &&
    !["/pages/login/index", "/pages/onboarding/index"].includes(
      url.split("?")[0],
    )
  )
    uni.setStorageSync("returnAfterLogin", url);
}
export function returnAfterLogin(user) {
  if (user?.onboardingRequired) {
    uni.redirectTo({ url: "/pages/onboarding/index" });
    return;
  }
  const saved = uni.getStorageSync("returnAfterLogin");
  uni.removeStorageSync("returnAfterLogin");
  const url =
    typeof saved === "string" &&
    /^\/pages\/[a-z-]+\/index(?:\?[^\r\n#]{0,1000})?$/.test(saved)
      ? saved
      : "/pages/profile/index";
  if (tabs.includes(url.split("?")[0]))
    uni.switchTab({ url: url.split("?")[0] });
  else uni.redirectTo({ url });
}
export function goLogin(url) {
  rememberReturn(url || currentPageUrl());
  uni.navigateTo({ url: "/pages/login/index" });
}
