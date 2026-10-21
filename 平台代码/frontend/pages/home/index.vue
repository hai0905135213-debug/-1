<template>
  <view class="page"
    ><view class="top"
      ><text class="heading">饭饭之交</text
      ><text @tap="notifications">消息 ›</text></view
    ><view class="section-row"><text class="subtitle">今天吃什么？</text><text class="more" @tap="allRestaurants">查看全部 ›</text></view
    ><text class="description">从群友推荐里，找一顿值得一起吃的饭</text
    ><view class="section-row"><text class="more" @tap="discovery('recommend')">为我推荐 ›</text><text class="more" @tap="discovery('offers')">商家优惠 ›</text></view><RestaurantBrowser ref="browser" :initial-size="6"
  /></view>
</template>
<script>
import RestaurantBrowser from "../../components/RestaurantBrowser.vue";
export default {
  components: { RestaurantBrowser },
  onReachBottom() {
    this.$refs.browser?.loadMore();
  },
  methods: {
    discovery(tab) { uni.navigateTo({url:'/pages/discovery/index?tab='+tab}) },
    allRestaurants(){uni.navigateTo({url:'/pages/restaurant-list/index'})},
    notifications() {
      uni.navigateTo({ url: "/pages/notifications/index" });
    },
  },
};
</script>
<style scoped>
.page {
  padding: 60rpx 32rpx;
}
.top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 48rpx;
}
.heading {
  font-size: 42rpx;
  font-weight: 800;
}
.subtitle {
  display: block;
  font-size: 40rpx;
  font-weight: 700;
}
.section-row {display:flex;align-items:center;justify-content:space-between;}
.more {font-size:25rpx;color:#a56c1f;}
.description {
  display: block;
  font-size: 25rpx;
  color: #888;
  margin: 14rpx 0 32rpx;
}
</style>
