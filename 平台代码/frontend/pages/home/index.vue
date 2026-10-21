<template>
  <view class="home-page">
    <view class="home-header"
      ><view class="mascot" @tap="profile">{{ initial }}</view
      ><view class="home-search"
        ><text class="school-label" @tap="chooseCampus">本校⌄</text
        ><input
          v-model="keyword"
          placeholder="火锅 / 湘菜 / 近沙河"
          @input="search"
          @confirm="searchNow"
        /><text v-if="keyword" class="clear-search" @tap="clearSearch"
          >×</text
        ></view
      ><view class="message-link" @tap="notifications"
        ><view class="message-ring" /><text
          v-if="unread"
          class="message-dot" /></view
    ></view>
    <view class="home-section"
      ><view class="home-section-heading"
        ><text class="home-title"
          >精选专辑 <text class="section-chevron">›</text></text
        ><text class="muted small">一起好好吃饭</text></view
      ><view class="albums"
        ><view
          v-for="album in albums"
          :key="album.title"
          class="album"
          @tap="openAlbum(album)"
          ><image
            :src="album.failed ? placeholder : album.image"
            mode="aspectFill"
            lazy-load
            @error="album.failed = true"
          /><text class="album-title">{{ album.title }}</text
          ><text class="album-caption">{{ album.caption }}</text></view
        ></view
      ></view
    >
    <view class="service-shortcuts"
      ><text @tap="discovery('recommend')"
        >为我推荐 <text class="shortcut-arrow">↗</text></text
      ><text @tap="discovery('schedule')">课表空闲</text
      ><text @tap="discovery('offers')">商家优惠</text></view
    >
    <RestaurantBrowser
      ref="browser"
      :initial-size="6"
      :show-search="false"
      @campus-change="campusName = $event"
      @keyword-clear="keyword = ''"
    />
    <view class="home-footnote"
      ><text @tap="policy">服务与隐私说明</text><text> · </text
      ><text @tap="feedback">问题反馈</text></view
    >
    <AppTabBar active="home" />
  </view>
</template>
<script>
import RestaurantBrowser from "../../components/RestaurantBrowser.vue";
import AppTabBar from "../../components/AppTabBar.vue";
import { refreshUnread } from "../../services/notification-badge";
export default {
  components: { RestaurantBrowser, AppTabBar },
  data() {
    return {
      keyword: "",
      campusName: "全校",
      initial: "饭",
      unread: 0,
      placeholder: "/static/restaurant-placeholder.png",
      albums: [
        {
          title: "群友好店清单",
          caption: "大家聊过的美味",
          image:
            "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=360&q=80",
          action: "popular",
          failed: false,
        },
        {
          title: "校门口吃点好",
          caption: "从近处开始探索",
          image:
            "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=360&q=80",
          action: "nearby",
          failed: false,
        },
        {
          title: "安静吃也舒服",
          caption: "找个合拍的饭搭子",
          image:
            "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=360&q=80",
          action: "quiet",
          failed: false,
        },
      ],
    };
  },
  onShow() {
    uni.hideTabBar({ animation: false, fail: () => {} });
    const user = uni.getStorageSync("currentUser");
    this.initial = (user?.nickname || "饭")[0];
    refreshUnread().then((n) => (this.unread = n));
  },
  onReachBottom() {
    this.$refs.browser?.loadMore();
  },
  methods: {
    search() {
      this.$refs.browser?.setKeyword(this.keyword);
    },
    searchNow() {
      this.$refs.browser?.setKeyword(this.keyword, true);
    },
    clearSearch() {
      this.keyword = "";
      this.searchNow();
    },
    chooseCampus() {
      this.$refs.browser?.cycleCampus();
    },
    openAlbum(album) {
      if (album.action === "quiet") {
        uni.setStorageSync("findChatMode", "quiet");
        uni.switchTab({ url: "/pages/find/index" });
        return;
      }
      this.$refs.browser?.setSort(album.action === "nearby" ? 1 : 0);
      uni.pageScrollTo({ scrollTop: 280, duration: 250 });
    },
    profile() {
      uni.switchTab({ url: "/pages/profile/index" });
    },
    notifications() {
      uni.navigateTo({ url: "/pages/notifications/index" });
    },
    discovery(tab) {
      uni.navigateTo({ url: "/pages/discovery/index?tab=" + tab });
    },
    policy() {
      uni.navigateTo({ url: "/pages/support/index?tab=policy" });
    },
    feedback() {
      uni.navigateTo({ url: "/pages/support/index?tab=feedback" });
    },
  },
};
</script>
<style scoped>
.home-page {
  padding: 44rpx 36rpx calc(170rpx + env(safe-area-inset-bottom));
  background: #fff;
  min-height: 100vh;
  box-sizing: border-box;
}
.home-header {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 58rpx;
}
.mascot {
  width: 86rpx;
  height: 86rpx;
  border-radius: 50%;
  background: #fff4a8;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32rpx;
  font-weight: 900;
  flex-shrink: 0;
}
.home-search {
  height: 80rpx;
  display: flex;
  align-items: center;
  gap: 18rpx;
  border: 1rpx solid #ededf2;
  border-radius: 44rpx;
  padding: 0 24rpx;
  flex: 1;
  min-width: 0;
}
.home-search input {
  min-width: 0;
  flex: 1;
  font-size: 27rpx;
  height: 76rpx;
}
.school-label {
  font-size: 27rpx;
  font-weight: 800;
  white-space: nowrap;
}
.clear-search {
  color: #8e8f98;
  font-size: 34rpx;
}
.message-link {
  position: relative;
  width: 38rpx;
  height: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.message-ring {
  height: 31rpx;
  width: 31rpx;
  border: 3rpx solid #08091f;
  border-radius: 11rpx;
}
.message-dot {
  width: 12rpx;
  height: 12rpx;
  background: #d93d41;
  border-radius: 50%;
  position: absolute;
  right: 0;
  top: 1rpx;
}
.home-section {
  margin-bottom: 38rpx;
}
.home-section-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 25rpx;
}
.home-title {
  font-size: 38rpx;
  font-weight: 900;
  line-height: 1.4;
}
.section-chevron {
  font-size: 36rpx;
}
.small {
  font-size: 22rpx;
}
.albums {
  display: flex;
  gap: 22rpx;
}
.album {
  flex: 1;
  min-width: 0;
}
.album image {
  width: 100%;
  height: 202rpx;
  background: #f1f2f5;
  border-radius: 20rpx;
}
.album-title {
  display: block;
  font-size: 26rpx;
  font-weight: 800;
  margin-top: 14rpx;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.album-caption {
  display: block;
  color: #8e8f98;
  font-size: 23rpx;
  margin-top: 7rpx;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.service-shortcuts {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #fafafc;
  border-radius: 18rpx;
  padding: 20rpx 24rpx;
  margin: 0 0 36rpx;
  font-size: 24rpx;
  color: #737581;
}
.service-shortcuts text:first-child {
  color: #08091f;
  font-weight: 700;
}
.shortcut-arrow {
  margin-left: 8rpx;
}
.home-footnote {
  text-align: center;
  font-size: 22rpx;
  color: #8e8f98;
  margin: 40rpx 0 10rpx;
}
</style>
