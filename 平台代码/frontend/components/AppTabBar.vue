<template>
  <view class="app-tabbar">
    <view
      v-for="tab in tabs"
      :key="tab.key"
      :class="[
        'app-tab',
        {
          'is-active': active === tab.key,
          'publish-tab': tab.key === 'publish',
        },
      ]"
      @tap="switchTo(tab)"
    >
      <view :class="['nav-icon', 'nav-' + tab.key]"
        ><view class="icon-part part-one" /><view
          class="icon-part part-two" /><view class="icon-part part-three"
      /></view>
      <text class="nav-label">{{ tab.text }}</text
      ><text v-if="tab.key === 'profile' && unread" class="unread-dot">{{
        unread > 99 ? "99+" : unread
      }}</text>
    </view>
  </view>
</template>
<script>
import { refreshUnread } from "../services/notification-badge";
export default {
  props: { active: { type: String, required: true } },
  data() {
    return {
      unread: 0,
      tabs: [
        { key: "home", text: "首页", path: "home" },
        { key: "find", text: "找人", path: "find" },
        { key: "publish", text: "发布", path: "create-meal" },
        { key: "feed", text: "动态", path: "feed" },
        { key: "profile", text: "我的", path: "profile" },
      ],
    };
  },
  mounted() {
    uni.hideTabBar({ animation: false, fail: () => {} });
    this.updateUnread = (count) => (this.unread = count);
    uni.$on("notifications:unread", this.updateUnread);
    refreshUnread().then((count) => (this.unread = count));
  },
  beforeUnmount() {
    uni.$off("notifications:unread", this.updateUnread);
  },
  methods: {
    switchTo(tab) {
      if (this.active !== tab.key)
        uni.switchTab({ url: "/pages/" + tab.path + "/index" });
    },
  },
};
</script>
<style scoped>
.app-tabbar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  height: 132rpx;
  padding: 4rpx 0 calc(4rpx + env(safe-area-inset-bottom));
  background: #fff;
  border-top: 1rpx solid #eeeef2;
  box-sizing: content-box;
}
.app-tab {
  position: relative;
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #8c8d96;
  height: 122rpx;
}
.app-tab.is-active {
  color: #08091f;
}
.nav-label {
  font-size: 24rpx;
  line-height: 34rpx;
  margin-top: 10rpx;
}
.is-active .nav-label {
  font-weight: 800;
}
.nav-icon {
  width: 40rpx;
  height: 40rpx;
  position: relative;
  box-sizing: border-box;
}
.icon-part {
  position: absolute;
  box-sizing: border-box;
}
.nav-home .part-one {
  width: 29rpx;
  height: 29rpx;
  border-left: 3rpx solid currentColor;
  border-top: 3rpx solid currentColor;
  transform: rotate(45deg);
  left: 6rpx;
  top: 1rpx;
}
.nav-home .part-two {
  left: 5rpx;
  top: 17rpx;
  width: 31rpx;
  height: 25rpx;
  border: 3rpx solid currentColor;
  border-top: 0;
  border-radius: 2rpx;
}
.nav-find .part-one {
  left: 3rpx;
  top: 1rpx;
  width: 17rpx;
  height: 17rpx;
  border: 3rpx solid currentColor;
  border-radius: 50%;
}
.nav-find .part-two {
  right: 0;
  top: 5rpx;
  width: 14rpx;
  height: 14rpx;
  border: 3rpx solid currentColor;
  border-radius: 50%;
}
.nav-find .part-three {
  left: 0;
  top: 24rpx;
  width: 40rpx;
  height: 18rpx;
  border: 3rpx solid currentColor;
  border-bottom: 0;
  border-radius: 22rpx 22rpx 0 0;
}
.nav-publish {
  width: 76rpx;
  height: 76rpx;
  border: 7rpx solid #eeeef2;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 7rpx 20rpx rgba(8, 9, 31, 0.08);
}
.publish-tab .nav-label {
  margin-top: 0;
}
.publish-tab.is-active .nav-publish {
  border-color: #ffe733;
  background: #ffe733;
}
.nav-publish .part-one {
  width: 32rpx;
  height: 3rpx;
  left: 15rpx;
  top: 29rpx;
  background: currentColor;
}
.nav-publish .part-two {
  width: 3rpx;
  height: 32rpx;
  left: 29rpx;
  top: 15rpx;
  background: currentColor;
}
.nav-feed {
  border: 3rpx solid currentColor;
  border-radius: 3rpx;
}
.nav-feed .part-one,
.nav-feed .part-two,
.nav-feed .part-three {
  left: 6rpx;
  right: 6rpx;
  height: 3rpx;
  background: currentColor;
}
.nav-feed .part-one {
  top: 8rpx;
}
.nav-feed .part-two {
  top: 17rpx;
}
.nav-feed .part-three {
  top: 26rpx;
}
.nav-profile .part-one {
  width: 20rpx;
  height: 20rpx;
  border: 3rpx solid currentColor;
  left: 10rpx;
  top: 0;
  border-radius: 50%;
}
.nav-profile .part-two {
  width: 38rpx;
  height: 19rpx;
  border: 3rpx solid currentColor;
  border-bottom: 0;
  left: 1rpx;
  top: 25rpx;
  border-radius: 28rpx 28rpx 0 0;
}
.unread-dot {
  position: absolute;
  top: 8rpx;
  left: 56%;
  min-width: 26rpx;
  line-height: 27rpx;
  text-align: center;
  border-radius: 20rpx;
  background: #d93d41;
  color: #fff;
  font-size: 19rpx;
  padding: 0 5rpx;
}
</style>
