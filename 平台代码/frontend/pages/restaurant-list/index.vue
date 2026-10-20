<template>
  <view class="page"><RestaurantBrowser ref="browser" /></view>
</template>
<script>
import RestaurantBrowser from "../../components/RestaurantBrowser.vue";
export default {
  components: { RestaurantBrowser },
  onReachBottom() {
    this.$refs.browser?.loadMore();
  },
};
</script>
<style scoped>
.page {
  padding: 32rpx;
}
</style>
