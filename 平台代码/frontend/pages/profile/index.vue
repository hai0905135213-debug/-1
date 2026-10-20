<template>
  <view class="page"
    ><text class="heading">{{ user?.nickname || "欢迎来饭饭之交" }}</text
    ><text class="muted" v-if="user">{{
      user.accessStatus === "approved"
        ? "体验资格已通过"
        : user.accessStatus === "blocked"
          ? "体验资格已停用"
          : "等待管理员批准体验资格"
    }}</text
    ><button v-if="!user" @tap="go('/pages/login/index')">微信登录</button
    ><template v-else
      ><view class="menu"
        ><text @tap="go('/pages/edit-profile/index')">编辑个人资料 ›</text
        ><text @tap="go('/pages/my-meals/index')">我的饭局与报名 ›</text
        ><text @tap="go('/pages/notifications/index')">消息与审批结果 ›</text
        ><text v-if="user.isAdmin" @tap="go('/pages/admin/index')"
          >体验资格和举报管理 ›</text
        ></view
      ><view class="tabs"
        ><text
          v-for="tab in tabs"
          :key="tab.code"
          :class="{ active: current === tab.code }"
          @tap="
            current = tab.code;
            loadRecords();
          "
          >{{ tab.name }}</text
        ></view
      ><view
        v-for="item in records"
        :key="item.id"
        class="card"
        @tap="openRecord(item)"
        ><text>{{
          item.restaurantName || item.mealTitle || item.title || "历史记录"
        }}</text
        ><text class="muted">{{
          item.location || item.place || ""
        }}</text></view
      ><text v-if="!records.length" class="muted">还没有记录</text
      ><button class="logout" @tap="logout">退出登录</button></template
    ><text class="error">{{ error }}</text></view
  >
</template>
<script>
import { authApi, request } from "../../services/api";
export default {
  data() {
    return {
      user: null,
      error: "",
      records: [],
      current: "wishlist",
      tabs: [
        { code: "wishlist", name: "想去" },
        { code: "visited", name: "去过" },
        { code: "saved", name: "饭局收藏" },
      ],
    };
  },
  async onShow() {
    try {
      if (!authApi.token()) {
        this.user = null;
        return;
      }
      this.user = (await authApi.me()).user;
      uni.setStorageSync("currentUser", this.user);
      await this.loadRecords();
    } catch (e) {
      this.error = e.message;
    }
  },
  methods: {
    go(url) {
      uni.navigateTo({ url });
    },
    async loadRecords() {
      try {
        this.records = ((await request("/profile/" + this.current)).items || []).map(item => ({ ...item, mealTitle:item.meal?.title, place:item.meal?.place }));
      } catch (e) {
        this.error = e.message;
      }
    },
    openRecord(item) {
      if (this.current === "saved")
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
      await authApi.logout();
      this.user = null;
      this.records = [];
    },
  },
};
</script>
<style scoped>
.page {
  padding: 60rpx 32rpx;
}
.heading {
  display: block;
  font-size: 42rpx;
  font-weight: 800;
}
.muted {
  display: block;
  color: #888;
  font-size: 25rpx;
  margin: 18rpx 0;
}
.menu {
  margin: 36rpx 0;
}
.menu text {
  display: block;
  padding: 28rpx 0;
  border-bottom: 1px solid #eee;
}
.tabs {
  display: flex;
  gap: 32rpx;
  margin-top: 30rpx;
}
.active {
  border-bottom: 6rpx solid #ffe388;
}
.card {
  padding: 24rpx;
  background: #faf7ef;
  margin: 20rpx 0;
  border-radius: 18rpx;
}
.logout {
  margin-top: 60rpx;
}
.error {
  color: #b33;
}
</style>
