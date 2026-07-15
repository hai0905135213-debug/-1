<template>
  <view class="page home-page">
    <view class="home-header">
      <view class="mascot">{{ userInitial }}</view>
      <view class="search-box">
        <text class="city">本校⌄</text>
        <view class="divider"></view>
        <text class="search-placeholder">今天吃什么</text>
      </view>
      <view class="map-icon">⌖</view>
    </view>

    <view class="section">
      <view class="section-title">精选专辑 ›</view>
      <scroll-view scroll-x class="album-scroll">
        <view class="album-card" v-for="album in albums" :key="album.id">
          <image class="album-image food-image" :src="album.image" mode="aspectFill" />
          <view class="album-overlay">{{ album.city }}</view>
          <view class="album-title">{{ album.title }}</view>
          <view class="album-subtitle">{{ album.subtitle }}</view>
        </view>
      </scroll-view>
    </view>

    <view class="section">
      <view class="section-title">今日饭局</view>
      <view class="muted section-desc">从校园真实约饭里挑出来，好吃和合拍都重要</view>
      <view class="pill-row filter-row">
        <view :class="campusIndex > 0 ? 'pill active' : 'pill'" @tap="cycleCampus">{{ campusOptions[campusIndex] }} ⌄</view>
        <view :class="foodTypeIndex > 0 ? 'pill active' : 'pill'" @tap="cycleFoodType">{{ foodTypeOptions[foodTypeIndex] }} ⌄</view>
        <view :class="timeIndex > 0 ? 'pill active' : 'pill'" @tap="cycleTime">{{ timeOptions[timeIndex] }} ⌄</view>
      </view>
    </view>

    <view class="meal-list">
      <view v-if="loading" class="muted loading-text">饭局加载中...</view>
      <view v-else-if="meals.length === 0" class="empty-state">今天还没有可加入饭局</view>
      <view class="meal-item" v-for="meal in meals" :key="meal.id" @tap="goDetail(meal.id)">
        <image class="meal-image food-image" :src="meal.image" mode="aspectFill" />
        <view class="meal-content">
          <view class="meal-title-row">
            <view class="meal-title">{{ meal.title }}</view>
            <view
              :class="wantedMealIds.includes(meal.id) ? 'want-button active' : 'want-button'"
              @tap.stop="toggleWant(meal.id)"
            >♡</view>
          </view>
          <view class="meal-meta">{{ meal.location }} · {{ meal.distance }} · {{ meal.budget }}</view>
          <view class="tag-row">
            <text class="tag">{{ meal.recommend }}</text>
            <text class="tag quiet">{{ meal.category }}</text>
          </view>
          <view class="quote-card">
            <view class="quote-user">{{ meal.user }}</view>
            <view class="quote-text">{{ meal.comment }}</view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import { mealApi } from '../../services/api'

const foodImages = [
  'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80'
]

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

export default {
  data() {
    return {
      albums: [
        {
          id: 1,
          city: '校园',
          title: '一食堂接头指南',
          subtitle: '本校饭搭子严选',
          image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80'
        },
        {
          id: 2,
          city: '夜宵',
          title: '校门口 Best15',
          subtitle: '下课后再去',
          image: 'https://images.unsplash.com/photo-1555126634-323283e090fa?auto=format&fit=crop&w=600&q=80'
        },
        {
          id: 3,
          city: '拼饭',
          title: '社恐友好饭局',
          subtitle: '安静吃也舒服',
          image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=600&q=80'
        }
      ],
      campusOptions: ['全校', '主校区', '西校区'],
      campusIndex: 0,
      foodTypeOptions: ['全部品类', '麻辣香锅', '米线', '轻食', '火锅'],
      foodTypeIndex: 0,
      timeOptions: ['全部时间', '今日', '可加入'],
      timeIndex: 0,
      currentUser: null,
      loading: false,
      wantedMealIds: [2],
      meals: []
    }
  },
  computed: {
    userInitial() {
      const nickname = this.currentUser?.nickname?.trim()
      return nickname ? Array.from(nickname)[0] : '饭'
    }
  },
  onShow() {
    this.currentUser = uni.getStorageSync('currentUser') || null
    this.loadMeals()
  },
  methods: {
    async loadMeals() {
      this.loading = true
      try {
        const params = {}
        if (this.campusIndex > 0) {
          params.campus = this.campusOptions[this.campusIndex]
        }
        if (this.foodTypeIndex > 0) {
          params.keyword = this.foodTypeOptions[this.foodTypeIndex]
        }
        if (this.timeIndex === 2) {
          params.onlyAvailable = 'true'
        }
        const result = await mealApi.list(params)
        this.meals = (result.items || []).map((meal, index) => ({
          id: meal.id,
          title: meal.title,
          location: meal.place,
          distance: formatTime(meal.mealTime),
          budget: formatBudget(meal),
          recommend: `${meal.joinedCount || 0}/${meal.maxPeople} 人`,
          category: meal.foodType || '饭局',
          user: meal.creator?.nickname || '同学',
          comment: meal.description || '等一个合适饭搭子一起吃。',
          image: foodImages[index % foodImages.length]
        }))
      } catch (error) {
        uni.showToast({ title: error.message || '饭局加载失败', icon: 'none' })
      } finally {
        this.loading = false
      }
    },
    cycleCampus() {
      this.campusIndex = (this.campusIndex + 1) % this.campusOptions.length
      this.loadMeals()
    },
    cycleFoodType() {
      this.foodTypeIndex = (this.foodTypeIndex + 1) % this.foodTypeOptions.length
      this.loadMeals()
    },
    cycleTime() {
      this.timeIndex = (this.timeIndex + 1) % this.timeOptions.length
      this.loadMeals()
    },
    goDetail(id) {
      uni.navigateTo({ url: `/pages/meal-detail/index?id=${id}` })
    },
    toggleWant(id) {
      if (this.wantedMealIds.includes(id)) {
        this.wantedMealIds = this.wantedMealIds.filter((mealId) => mealId !== id)
        uni.showToast({ title: '已取消想去', icon: 'none' })
        return
      }

      this.wantedMealIds.push(id)
      uni.showToast({ title: '已加入想去', icon: 'success' })
    }
  }
}
</script>

<style scoped>
.home-page {
  padding-top: 42rpx;
}

.home-header {
  display: flex;
  align-items: center;
  gap: 18rpx;
  margin-bottom: 54rpx;
}

.mascot {
  width: 92rpx;
  height: 92rpx;
  border-radius: 46rpx;
  background: #fff4a8;
  color: #08091f;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 34rpx;
  font-weight: 900;
}

.search-box {
  flex: 1;
  height: 82rpx;
  border: 2rpx solid #ededf2;
  border-radius: 42rpx;
  display: flex;
  align-items: center;
  padding: 0 28rpx;
  box-sizing: border-box;
}

.city {
  font-size: 30rpx;
  font-weight: 700;
}

.divider {
  width: 2rpx;
  height: 32rpx;
  background: #ededf2;
  margin: 0 22rpx;
}

.search-placeholder {
  color: #a1a2aa;
  font-size: 30rpx;
}

.map-icon {
  width: 58rpx;
  font-size: 48rpx;
  text-align: center;
  color: #08091f;
}

.album-scroll {
  white-space: nowrap;
}

.album-card {
  display: inline-block;
  width: 248rpx;
  margin-right: 24rpx;
  vertical-align: top;
}

.album-image {
  width: 248rpx;
  height: 218rpx;
  border-radius: 18rpx;
}

.album-overlay {
  margin-top: -164rpx;
  padding-left: 20rpx;
  height: 150rpx;
  color: #ffffff;
  font-size: 54rpx;
  font-weight: 900;
  text-shadow: 0 4rpx 10rpx rgba(0, 0, 0, 0.28);
  position: relative;
}

.album-title {
  margin-top: 18rpx;
  font-size: 30rpx;
  font-weight: 800;
}

.album-subtitle {
  color: #94959f;
  font-size: 26rpx;
  margin-top: 6rpx;
}

.section-desc {
  margin-top: -8rpx;
  margin-bottom: 20rpx;
}

.filter-row {
  margin-top: 20rpx;
}

.meal-item {
  display: flex;
  gap: 22rpx;
  margin-bottom: 34rpx;
}

.meal-image {
  width: 248rpx;
  height: 248rpx;
  border-radius: 18rpx;
  flex-shrink: 0;
}

.meal-content {
  flex: 1;
  min-width: 0;
}

.meal-title-row {
  display: flex;
  justify-content: space-between;
  gap: 16rpx;
}

.meal-title {
  font-size: 32rpx;
  font-weight: 900;
  line-height: 1.25;
}

.meal-meta {
  margin-top: 10rpx;
  color: #7f8088;
  font-size: 26rpx;
}

.tag-row {
  margin-top: 14rpx;
}

.tag.quiet {
  background: #f7f7f8;
  color: #7f8088;
}

.quote-card {
  margin-top: 18rpx;
  padding: 18rpx;
  border-radius: 16rpx;
  background: #fafafa;
}

.quote-user {
  color: #6b6c74;
  font-size: 24rpx;
  margin-bottom: 6rpx;
}

.quote-text {
  color: #7f8088;
  font-size: 25rpx;
  line-height: 1.45;
}

.loading-text,
.empty-state {
  padding: 48rpx 0;
  text-align: center;
}

.empty-state {
  color: #94959f;
  font-size: 28rpx;
}
</style>
