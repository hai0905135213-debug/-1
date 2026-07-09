<template>
  <view class="page">
    <view class="section">
      <view class="section-title">我的饭局</view>
      <view class="muted">查看我发起的和我加入的饭局。</view>
    </view>

    <view class="tabs">
      <button :class="activeTab === 'hosted' ? 'pill active' : 'pill'" @tap="activeTab = 'hosted'">我发起的</button>
      <button :class="activeTab === 'joined' ? 'pill active' : 'pill'" @tap="activeTab = 'joined'">我加入的</button>
    </view>

    <view class="card" v-for="meal in visibleMeals" :key="meal.id">
      <view class="meal-title">{{ meal.title }}</view>
      <view class="muted">{{ meal.time }} · {{ meal.status }}</view>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      activeTab: 'hosted',
      hostedMeals: [
        { id: 1, title: '今晚拼麻辣烫', time: '今天 19:00', status: '待成局' }
      ],
      joinedMeals: [
        { id: 2, title: '明天午饭一食堂', time: '明天 12:10', status: '已加入' }
      ]
    }
  },
  computed: {
    visibleMeals() {
      return this.activeTab === 'hosted' ? this.hostedMeals : this.joinedMeals
    }
  }
}
</script>

<style scoped>
.tabs {
  display: flex;
  gap: 16rpx;
  margin-bottom: 20rpx;
}

.tabs .pill {
  flex: 1;
}

.meal-title {
  font-size: 30rpx;
  font-weight: 700;
  margin-bottom: 10rpx;
}
</style>
