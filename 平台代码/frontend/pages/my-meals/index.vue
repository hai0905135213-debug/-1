<template>
  <view class="page"
    ><text class="heading">我的饭局</text
    ><view class="tabs"
      ><text
        v-for="tab in tabs"
        :key="tab.code"
        :class="{ active: current === tab.code }"
        @tap="current = tab.code"
        >{{ tab.name }}</text
      ></view
    ><MealCard
      v-for="meal in data[current]"
      :key="meal.id"
      :meal="meal"
      @open="open"
    />
    <view v-if="!data[current]?.length" class="state-box"
      ><text class="state-title">这里还没有饭局</text
      ><text>从“找人”发现同学发起的饭局，或发布自己想吃的那顿饭。</text></view
    ><text class="error">{{ error }}</text></view
  >
</template>
<script>
import { mealApi } from "../../services/api";
import MealCard from "../../components/MealCard.vue";
export default {
  components: { MealCard },
  data() {
    return {
      current: "created",
      data: { created: [], pending: [], joined: [], ended: [] },
      error: "",
      tabs: [
        { code: "created", name: "我发起的" },
        { code: "pending", name: "待审批" },
        { code: "joined", name: "已加入" },
        { code: "ended", name: "已结束" },
      ],
      labels: {
        open: "招募中",
        matched: "已成局",
        finished: "已完成",
        cancelled: "已取消",
      },
    };
  },
  onShow() {
    this.load();
  },
  methods: {
    async load() {
      try {
        this.data = await mealApi.mine();
      } catch (e) {
        this.error = e.message;
      }
    },
    open(id) {
      uni.navigateTo({ url: "/pages/meal-detail/index?id=" + id });
    },
  },
};
</script>
<style scoped>
.page {
  padding: 36rpx;
}
.heading {
  font-size: 40rpx;
  font-weight: 800;
}
.tabs {
  display: flex;
  justify-content: space-between;
  margin: 32rpx 0;
  font-size: 25rpx;
}
.active {
  border-bottom: 6rpx solid #ffe733;
}
.card {
  background: #faf7ef;
  padding: 24rpx;
  border-radius: 20rpx;
  margin: 22rpx 0;
}
.card text {
  display: block;
  margin: 10rpx 0;
}
.name {
  font-weight: 700;
}
.muted {
  color: #888;
}
.error {
  color: #b33;
}
</style>
