<template>
  <view class="profile-page"
    ><view class="profile-hero"
      ><view class="profile-hero-top"
        ><view class="profile-stats"
          ><view
            ><text class="stat-number">{{ user ? counts.visited : "—" }}</text
            ><text class="stat-label">去过</text></view
          ><view
            ><text class="stat-number">{{ user ? counts.wishlist : "—" }}</text
            ><text class="stat-label">想去</text></view
          ><view
            ><text class="stat-number">{{ user ? counts.saved : "—" }}</text
            ><text class="stat-label">收藏</text></view
          ></view
        ><view class="hero-actions"
          ><button
            v-if="user"
            class="hero-edit"
            @tap="go('/pages/edit-profile/index')"
          >
            编辑资料</button
          ><button
            class="hero-edit"
            @tap="user ? logout() : go('/pages/login/index')"
          >
            {{ user ? "退出登录" : "登录" }}
          </button></view
        ></view
      ><view class="profile-identity"
        ><view class="profile-avatar">{{ (user?.nickname || "饭")[0] }}</view
        ><view
          ><text class="profile-greeting">{{
            user ? user.nickname + "，今天吃什么？" : "发现属于你的校园美食"
          }}</text
          ><text class="taste-label">{{
            (user?.profile?.tasteTags || []).join(" · ") ||
            "找个合拍的人，一起好好吃饭"
          }}</text></view
        ></view
      ><view class="access-label" v-if="user">{{ accessText }}</view></view
    >
    <view class="profile-panel"
      ><view v-if="!user" class="guest-panel"
        ><text class="section-title">把想吃的，都记下来</text
        ><text class="muted">登录后收藏好店，和同学发起下一顿饭。</text
        ><button class="button-primary" @tap="go('/pages/login/index')">
          登录饭饭之交
        </button></view
      ><template v-else
        ><view
          v-if="user.onboardingRequired"
          class="notice-banner"
          @tap="go('/pages/onboarding/index')"
          >先核对资料与服务说明，再参加饭局 ›</view
        ><view class="profile-section-heading"
          ><text class="section-title">我的饭局</text
          ><text class="muted" @tap="go('/pages/my-meals/index')"
            >全部 ›</text
          ></view
        ><view
          v-for="meal in activeMeals.slice(0, 2)"
          :key="meal.id"
          class="meal-preview"
          @tap="go('/pages/meal-detail/index?id=' + meal.id)"
          ><view class="preview-dot" /><view class="preview-copy"
            ><text class="preview-title">{{ meal.title }}</text
            ><text class="muted">{{ meal.place }}</text></view
          ><text class="preview-status">{{
            meal.applicationStatus === "pending"
              ? "待审批"
              : labels[meal.status]
          }}</text></view
        ><view v-if="!activeMeals.length" class="small-empty"
          >还没有进行中的饭局，发起一场试试。</view
        ><view class="profile-actions"
          ><button class="button-quiet" @tap="go('/pages/my-meals/index')">
            全部饭局</button
          ><button class="button-primary" @tap="create">
            ＋ 新建饭局
          </button></view
        ><view class="record-tabs"
          ><text
            v-for="tab in tabs"
            :key="tab.code"
            :class="['record-tab', { selected: current === tab.code }]"
            @tap="
              current = tab.code;
              loadRecords();
            "
            >{{ tab.name }}</text
          ></view
        ><view v-if="recordLoading" class="small-empty">正在加载记录…</view
        ><view
          v-for="item in records"
          :key="item.id"
          class="record-row"
          @tap="openRecord(item)"
          ><view class="record-mark">{{
            current === "saved" ? "☆" : current === "moments" ? "▤" : "食"
          }}</view
          ><view class="record-copy"
            ><text class="record-title">{{
              current === "moments"
                ? item.content
                : item.restaurantName ||
                  item.mealTitle ||
                  item.title ||
                  item.content ||
                  "历史记录"
            }}</text
            ><text class="muted">{{
              item.location || item.place || "查看详情"
            }}</text></view
          ><text class="record-arrow">›</text></view
        ><view v-if="!recordLoading && !records.length" class="small-empty"
          >这里还没有记录，去发现一家想吃的店吧。</view
        >
        <view class="quick-tools"
          ><view @tap="go('/pages/notifications/index')"
            ><text>消息与审批结果</text
            ><text class="tool-count">{{
              unread ? unread + "条未读" : "›"
            }}</text></view
          ><view @tap="go('/pages/discovery/index?tab=schedule')"
            ><text>课表与空闲推荐</text><text>›</text></view
          ><view @tap="go('/pages/discovery/index?tab=recommend')"
            ><text>为我推荐饭搭子</text><text>›</text></view
          ><view @tap="go('/pages/discovery/index?tab=fulfillment')"
            ><text>我的履约记录</text><text>›</text></view
          ><view @tap="go('/pages/support/index?tab=feedback')"
            ><text>反馈、纠错与申诉</text><text>›</text></view
          ><view @tap="go('/pages/support/index?tab=data')"
            ><text>我的数据与账号</text><text>›</text></view
          ></view
        ><view v-if="user.isAdmin" class="admin-tools"
          ><text class="admin-label">试运行管理</text
          ><view @tap="go('/pages/admin/index')">体验资格和举报 ›</view
          ><view @tap="go('/pages/support/index?tab=admin')"
            >反馈与内容处置 ›</view
          ><view @tap="go('/pages/support/index?tab=correction')"
            >餐厅核验纠错 ›</view
          ><view @tap="go('/pages/discovery/index?tab=offerAdmin')"
            >商家优惠管理 ›</view
          ></view
        ></template
      ><view v-if="error" class="notice-banner"
        >{{ error }}<text @tap="load"> 重新加载 ›</text></view
      ><view class="profile-legal" @tap="go('/pages/support/index?tab=policy')"
        >服务与隐私说明 ›</view
      ></view
    ><AppTabBar active="profile"
  /></view>
</template>
<script>
import { authApi, request, mealApi } from "../../services/api";
import { refreshUnread } from "../../services/notification-badge";
import { rememberReturn } from "../../services/session";
import AppTabBar from "../../components/AppTabBar.vue";
export default {
  components: { AppTabBar },
  data() {
    return {
      user: null,
      unread: 0,
      error: "",
      records: [],
      recordLoading: false,
      recordVersion: 0,
      activeMeals: [],
      counts: { visited: 0, wishlist: 0, saved: 0 },
      current: "visited",
      tabs: [
        { code: "visited", name: "去过" },
        { code: "wishlist", name: "想去" },
        { code: "moments", name: "动态" },
        { code: "saved", name: "收藏" },
      ],
      labels: {
        open: "招募中",
        matched: "已成局",
        finished: "已完成",
        cancelled: "已取消",
      },
    };
  },
  computed: {
    accessText() {
      return this.user?.accessStatus === "approved"
        ? "体验资格已通过"
        : this.user?.accessStatus === "blocked"
          ? "体验资格已停用，可在反馈中心申诉"
          : "体验资格待管理员核验";
    },
  },
  onShow() {
    uni.hideTabBar({ animation: false, fail: () => {} });
    this.load();
  },
  methods: {
    async load() {
      this.error = "";
      if (!authApi.token()) {
        this.user = null;
        this.records = [];
        this.activeMeals = [];
        return;
      }
      try {
        this.user = (await authApi.me()).user;
        uni.setStorageSync("currentUser", this.user);
        this.unread = await refreshUnread();
        const [meals, visited, wishes, saved] = await Promise.all([
          mealApi.mine(),
          request("/profile/visited"),
          request("/profile/wishlist"),
          request("/profile/saved"),
        ]);
        this.activeMeals = [
          ...meals.created,
          ...meals.pending,
          ...meals.joined,
        ].filter(
          (m, i, a) =>
            ["open", "matched"].includes(m.status) &&
            a.findIndex((x) => x.id === m.id) === i,
        );
        this.counts = {
          visited: visited.items.length,
          wishlist: wishes.items.length,
          saved: saved.items.length,
        };
        await this.loadRecords();
      } catch (e) {
        this.error = e.message || "加载失败，请重试";
      }
    },
    go(url) {
      if (url === "/pages/login/index") rememberReturn("/pages/profile/index");
      uni.navigateTo({ url });
    },
    create() {
      uni.switchTab({ url: "/pages/create-meal/index" });
    },
    async loadRecords() {
      const version = ++this.recordVersion;
      this.recordLoading = true;
      try {
        const result = await request(
          this.current === "moments" ? "/posts" : "/profile/" + this.current,
        );
        const items =
          this.current === "moments"
            ? (result.items || []).filter(
                (item) => item.author?.id === this.user?.id,
              )
            : result.items || [];
        if (version === this.recordVersion)
          this.records = items.map((item) => ({
            ...item,
            mealTitle: item.meal?.title,
            place: item.meal?.place,
          }));
      } catch (e) {
        if (version === this.recordVersion) this.error = e.message;
      } finally {
        if (version === this.recordVersion) this.recordLoading = false;
      }
    },
    openRecord(item) {
      if (this.current === "saved" || item.mealId)
        return this.go(
          "/pages/meal-detail/index?id=" + (item.mealId || item.id),
        );
      if (item.restaurantId)
        this.go(
          "/pages/restaurant-detail/index?id=" +
            encodeURIComponent(item.restaurantId),
        );
    },
    async logout() {
      uni.showModal({
        title: "退出当前账号？",
        content: "退出不会删除你的收藏和饭局记录。",
        success: async (result) => {
          if (!result.confirm) return;
          try {
            await authApi.logout();
            this.user = null;
            this.records = [];
            this.activeMeals = [];
            this.unread = 0;
            refreshUnread();
          } catch (e) {
            this.error = e.message;
          }
        },
      });
    },
  },
};
</script>
<style scoped>
.profile-page {
  min-height: 100vh;
  padding-bottom: calc(160rpx + env(safe-area-inset-bottom));
  background: #fff;
}
.profile-hero {
  background: #18849a;
  color: #fff;
  padding: 48rpx 38rpx 74rpx;
  min-height: 360rpx;
  box-sizing: border-box;
}
.profile-hero-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 24rpx;
  margin-bottom: 40rpx;
}
.profile-stats {
  display: flex;
  gap: 36rpx;
}
.profile-stats view {
  text-align: center;
}
.stat-number {
  display: block;
  font-size: 38rpx;
  font-weight: 800;
  line-height: 1.3;
}
.stat-label {
  display: block;
  font-size: 22rpx;
  margin-top: 6rpx;
  color: rgba(255, 255, 255, 0.8);
}
.hero-actions {
  display: flex;
  gap: 12rpx;
  flex-wrap: wrap;
  justify-content: flex-end;
}
.hero-edit {
  color: #fff;
  background: transparent;
  border: 1rpx solid rgba(255, 255, 255, 0.65);
  border-radius: 34rpx;
  font-size: 22rpx;
  padding: 8rpx 20rpx;
  line-height: 1.8;
}
.profile-identity {
  display: flex;
  align-items: center;
  gap: 22rpx;
}
.profile-avatar {
  background: rgba(255, 255, 255, 0.2);
  border: 2rpx solid rgba(255, 255, 255, 0.5);
  border-radius: 50%;
  width: 90rpx;
  height: 90rpx;
  line-height: 90rpx;
  text-align: center;
  font-size: 38rpx;
  font-weight: 800;
  flex-shrink: 0;
}
.profile-greeting {
  display: block;
  font-size: 34rpx;
  font-weight: 900;
  line-height: 1.5;
}
.taste-label {
  display: block;
  font-size: 23rpx;
  color: rgba(255, 255, 255, 0.75);
  margin-top: 9rpx;
}
.access-label {
  font-size: 21rpx;
  color: rgba(255, 255, 255, 0.8);
  margin-top: 28rpx;
}
.profile-panel {
  position: relative;
  background: #fff;
  border-radius: 38rpx 38rpx 0 0;
  margin-top: -34rpx;
  padding: 36rpx;
}
.profile-section-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 8rpx 0 22rpx;
}
.profile-section-heading .section-title {
  margin: 0;
  font-size: 35rpx;
}
.profile-section-heading .muted {
  font-size: 24rpx;
}
.meal-preview {
  display: flex;
  align-items: center;
  gap: 18rpx;
  border-bottom: 1rpx solid #f1f1f5;
  padding: 22rpx 0;
}
.preview-dot {
  width: 12rpx;
  height: 12rpx;
  border-radius: 50%;
  background: #ffe733;
  flex-shrink: 0;
}
.preview-copy {
  flex: 1;
  min-width: 0;
}
.preview-title {
  display: block;
  font-size: 27rpx;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.preview-copy .muted {
  display: block;
  font-size: 22rpx;
  margin-top: 8rpx;
}
.preview-status {
  font-size: 23rpx;
  color: #18849a;
}
.profile-actions {
  display: flex;
  gap: 20rpx;
  margin: 26rpx 0 38rpx;
}
.profile-actions button {
  flex: 1;
  height: 74rpx;
  line-height: 74rpx;
  font-size: 25rpx;
  box-shadow: none;
}
.record-tabs {
  display: flex;
  gap: 34rpx;
  border-bottom: 1rpx solid #eeeef2;
  margin: 0 0 20rpx;
}
.record-tab {
  font-size: 29rpx;
  color: #8e8f98;
  padding: 14rpx 7rpx 17rpx;
}
.record-tab.selected {
  color: #08091f;
  font-weight: 800;
  border-bottom: 6rpx solid #ffe733;
}
.record-row {
  display: flex;
  gap: 20rpx;
  align-items: center;
  padding: 24rpx 0;
  border-bottom: 1rpx solid #f1f1f5;
}
.record-mark {
  width: 62rpx;
  height: 62rpx;
  background: #f7f7fa;
  border-radius: 14rpx;
  line-height: 62rpx;
  text-align: center;
  font-size: 26rpx;
  color: #8e8f98;
}
.record-copy {
  flex: 1;
  min-width: 0;
}
.record-title {
  display: block;
  font-size: 27rpx;
  font-weight: 700;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.record-copy .muted {
  display: block;
  font-size: 22rpx;
  margin-top: 8rpx;
}
.record-arrow {
  color: #9a9ca8;
}
.small-empty {
  text-align: center;
  color: #9698a1;
  font-size: 24rpx;
  padding: 30rpx 0;
  line-height: 1.7;
}
.quick-tools {
  border-top: 1rpx solid #ededf2;
  margin-top: 28rpx;
  padding-top: 16rpx;
}
.quick-tools view {
  display: flex;
  justify-content: space-between;
  padding: 25rpx 0;
  border-bottom: 1rpx solid #f5f5f8;
  font-size: 26rpx;
}
.quick-tools view text:last-child {
  color: #94969f;
}
.quick-tools .tool-count {
  color: #18849a;
}
.admin-tools {
  margin-top: 30rpx;
  background: #f7f7fa;
  border-radius: 20rpx;
  padding: 24rpx;
}
.admin-label {
  font-size: 22rpx;
  color: #8e8f98;
}
.admin-tools view {
  font-size: 25rpx;
  padding: 16rpx 0;
}
.profile-legal {
  text-align: center;
  font-size: 23rpx;
  color: #8e8f98;
  padding: 38rpx 0 6rpx;
}
.guest-panel .muted {
  display: block;
  line-height: 1.8;
  margin: 18rpx 0 30rpx;
}
.notice-banner {
  padding: 20rpx 24rpx;
  background: #fff9dc;
  font-size: 24rpx;
  line-height: 1.7;
  border-radius: 16rpx;
  margin: 12rpx 0 24rpx;
}
</style>
