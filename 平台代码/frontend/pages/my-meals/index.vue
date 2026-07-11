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

    <view v-if="loading" class="muted empty">加载中...</view>
    <view v-else-if="visibleMeals.length === 0" class="empty">
      {{ activeTab === 'hosted' ? '还没有发起饭局' : '还没有加入饭局' }}
    </view>

    <view class="card" v-for="meal in visibleMeals" :key="meal.id" @tap="goDetail(meal.id)">
      <view class="meal-title">{{ meal.title }}</view>
      <view class="muted">{{ meal.time }} · {{ meal.statusText }} · {{ meal.people }}</view>
      <view class="muted">{{ meal.place }} · {{ meal.budget }}</view>
    </view>
  </view>
</template>

<script>
import { authApi, mealApi } from '../../services/api'

function formatBudget(meal) {
  if (meal.budgetMin && meal.budgetMax) return `¥${meal.budgetMin}-${meal.budgetMax}/人`
  if (meal.budgetMax) return `¥${meal.budgetMax}/人`
  return '预算随意'
}

function formatTime(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '时间待定'
  return `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function normalizeMeal(meal) {
  return {
    ...meal,
    time: formatTime(meal.mealTime),
    people: `${meal.joinedCount || 0}/${meal.maxPeople} 人`,
    budget: formatBudget(meal),
    statusText: meal.status === 'open' ? '待成局' : '已成局'
  }
}

export default {
  data() {
    return {
      loading: false,
      activeTab: 'hosted',
      hostedMeals: [],
      joinedMeals: []
    }
  },
  computed: {
    visibleMeals() {
      return this.activeTab === 'hosted' ? this.hostedMeals : this.joinedMeals
    }
  },
  onShow() {
    this.loadMyMeals()
  },
  methods: {
    async loadMyMeals() {
      if (!authApi.token()) {
        uni.navigateTo({ url: '/pages/login/index' })
        return
      }

      this.loading = true
      try {
        const result = await mealApi.mine()
        this.hostedMeals = (result.created || []).map(normalizeMeal)
        this.joinedMeals = (result.joined || []).map(normalizeMeal)
      } catch (error) {
        uni.showToast({ title: error.message || '我的饭局加载失败', icon: 'none' })
      } finally {
        this.loading = false
      }
    },
    goDetail(id) {
      uni.navigateTo({ url: `/pages/meal-detail/index?id=${id}` })
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
  font-weight: 800;
  margin-bottom: 10rpx;
}

.empty {
  padding: 58rpx 0;
  text-align: center;
  color: #94959f;
  font-size: 28rpx;
}
</style>
