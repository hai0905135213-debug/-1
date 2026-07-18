<template>
  <view class="page home-page">
    <view class="home-header">
      <view class="mascot">{{ userInitial }}</view>
      <view class="search-box">
        <text class="city">本校⌄</text>
        <view class="divider"></view>
        <input
          class="search-input"
          v-model="restaurantKeyword"
          confirm-type="search"
          placeholder="火锅 / 清真 / 近沙河"
          @confirm="applyRestaurantSearch"
          @input="queueRestaurantSearch"
        />
        <view v-if="restaurantKeyword" class="search-clear" @tap.stop="clearRestaurantSearch">×</view>
      </view>
      <view class="map-icon" @tap="applyRestaurantSearch">⌕</view>
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

    <!-- 餐厅数据来自独立清洗库；首页只展示 6 家，避免首屏加载过多外部图片。 -->
    <view class="section restaurant-section">
      <view class="restaurant-section-title-row">
        <view>
          <view class="section-title">今天吃什么？</view>
          <view class="muted section-desc">附近好吃的 · 群友推荐 · 按校区距离排序</view>
        </view>
        <view class="more-link" @tap="goRestaurantList">查看全部 ›</view>
      </view>

      <!-- 这排筛选控件直接驱动真实餐厅库；具体标签可在后续继续扩充。 -->
      <view class="pill-row filter-row">
        <view :class="restaurantCampusIndex > 0 ? 'pill active' : 'pill'" @tap="cycleRestaurantCampus">{{ restaurantCampusOptions[restaurantCampusIndex] }} ⌄</view>
        <view :class="restaurantFoodTypeIndex > 0 ? 'pill active' : 'pill'" @tap="cycleRestaurantFoodType">{{ restaurantFoodTypeOptions[restaurantFoodTypeIndex] }} ⌄</view>
        <view :class="restaurantSortIndex > 0 ? 'pill active' : 'pill'" @tap="cycleRestaurantSort">{{ restaurantSortOptions[restaurantSortIndex] }} ⌄</view>
        <view class="pill" @tap="showRestaurantFilterHint">筛选⌄</view>
      </view>

      <view v-if="restaurantLoading && featuredRestaurants.length === 0" class="muted loading-text">附近餐厅加载中...</view>
      <view v-else class="featured-restaurant-list">
        <view
          v-for="restaurant in featuredRestaurants"
          :key="restaurant.id"
          class="featured-restaurant-card"
          @tap="goRestaurantList"
        >
          <!-- lazy-load：图片滚到附近才下载，首页不会同时拉取全部地图图片。 -->
          <image
            class="featured-restaurant-image food-image"
            :src="restaurant.displayImage"
            mode="aspectFill"
            lazy-load
            @error="useRestaurantPlaceholder(restaurant)"
          />
          <view class="featured-restaurant-body">
            <view class="featured-restaurant-name">{{ restaurant.name }}</view>
            <view class="featured-restaurant-address">{{ restaurant.fullAddress || '地址待补充' }}</view>
            <view class="featured-restaurant-footer">
              <text class="featured-distance">距{{ currentRestaurantCampusName }} {{ formatRestaurantDistance(restaurant) }}</text>
              <text class="featured-cuisine">{{ restaurant.cuisine || '餐厅' }}</text>
            </view>
          </view>
        </view>
        <view v-if="featuredRestaurants.length === 0" class="empty-state">附近餐厅正在补充中</view>
        <view v-else-if="restaurantLoadingMore" class="muted loading-text">继续加载 6 家...</view>
        <view v-else-if="!restaurantHasMore" class="muted loading-text">已经到底啦</view>
      </view>
    </view>
  </view>
</template>

<script>
import { mealApi, restaurantApi } from '../../services/api'

const foodImages = [
  'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80'
]
const RESTAURANT_PLACEHOLDER = 'https://images.unsplash.com/photo-1515003197210-e0cd71810b5f?auto=format&fit=crop&w=480&q=70'
const RESTAURANT_PAGE_SIZE = 6

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
      meals: [],
      // 正式餐厅库只用这两个校区代码计算距离；“全校”会显示两个校区中更近的距离。
      restaurantCampusOptions: ['全校', '沙河校区', '学院南路校区'],
      restaurantCampusIndex: 0,
      restaurantFoodTypeOptions: ['全部品类', '火锅', '湘菜', '烧烤', '米线'],
      restaurantFoodTypeIndex: 0,
      restaurantSortOptions: ['智能排序', '距离最近', '群内最热'],
      restaurantSortIndex: 0,
      restaurantLoading: false,
      restaurantLoadingMore: false,
      restaurantPage: 1,
      restaurantHasMore: true,
      restaurantKeyword: '',
      restaurantSearchTimer: null,
      featuredRestaurants: []
    }
  },
  computed: {
    userInitial() {
      const nickname = this.currentUser?.nickname?.trim()
      return nickname ? Array.from(nickname)[0] : '饭'
    },
    currentRestaurantCampusName() {
      return this.restaurantCampusOptions[this.restaurantCampusIndex] === '全校'
        ? '最近校区'
        : this.restaurantCampusOptions[this.restaurantCampusIndex]
    }
  },
  onShow() {
    this.currentUser = uni.getStorageSync('currentUser') || null
    this.loadMeals()
    this.resetFeaturedRestaurants()
  },
  onReachBottom() {
    this.loadMoreFeaturedRestaurants()
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
    async resetFeaturedRestaurants() {
      this.restaurantPage = 1
      this.restaurantHasMore = true
      this.featuredRestaurants = []
      await this.loadFeaturedRestaurants()
    },
    async loadMoreFeaturedRestaurants() {
      await this.loadFeaturedRestaurants()
    },
    async loadFeaturedRestaurants() {
      if (this.restaurantLoading || this.restaurantLoadingMore || !this.restaurantHasMore) return
      const isFirstPage = this.restaurantPage === 1
      if (isFirstPage) this.restaurantLoading = true
      else this.restaurantLoadingMore = true
      try {
        // 首页按 6 家一页加载；用户滑到底后继续追加下一页。
        const result = await restaurantApi.list({
          page: this.restaurantPage,
          pageSize: RESTAURANT_PAGE_SIZE,
          campus: this.getSelectedRestaurantCampusCode(),
          keyword: this.restaurantKeyword.trim() || undefined,
          foodType: this.restaurantFoodTypeIndex > 0 ? this.restaurantFoodTypeOptions[this.restaurantFoodTypeIndex] : undefined,
          sortBy: this.restaurantSortIndex === 2 ? 'mention-desc' : undefined
        })
        const items = (result.items || []).map(item => ({
          id: item.id,
          name: item.name || '未命名餐厅',
          cuisine: item.cuisine || item.foodType || '',
          fullAddress: item.fullAddress || item.address || item.location || '',
          displayImage: item.photoUrl || RESTAURANT_PLACEHOLDER,
          distanceKm: item.distanceKm || {},
          tags: item.tags || []
        }))
        this.featuredRestaurants = [...this.featuredRestaurants, ...items]
        this.restaurantHasMore = typeof result.hasMore === 'boolean' ? result.hasMore : items.length === RESTAURANT_PAGE_SIZE
        if (items.length > 0) this.restaurantPage += 1
      } catch (error) {
        uni.showToast({ title: error.message || '餐厅加载失败', icon: 'none' })
      } finally {
        this.restaurantLoading = false
        this.restaurantLoadingMore = false
      }
    },
    getSelectedRestaurantCampusCode() {
      const campusCodeMap = { '沙河校区': 'cufe_shahe', '学院南路校区': 'cufe_nanlu' }
      return campusCodeMap[this.restaurantCampusOptions[this.restaurantCampusIndex]] || undefined
    },
    cycleRestaurantCampus() {
      this.restaurantCampusIndex = (this.restaurantCampusIndex + 1) % this.restaurantCampusOptions.length
      this.resetFeaturedRestaurants()
    },
    cycleRestaurantFoodType() {
      this.restaurantFoodTypeIndex = (this.restaurantFoodTypeIndex + 1) % this.restaurantFoodTypeOptions.length
      this.resetFeaturedRestaurants()
    },
    cycleRestaurantSort() {
      this.restaurantSortIndex = (this.restaurantSortIndex + 1) % this.restaurantSortOptions.length
      this.resetFeaturedRestaurants()
    },
    queueRestaurantSearch() {
      if (this.restaurantSearchTimer) clearTimeout(this.restaurantSearchTimer)
      this.restaurantSearchTimer = setTimeout(() => {
        this.applyRestaurantSearch()
      }, 360)
    },
    applyRestaurantSearch() {
      if (this.restaurantSearchTimer) {
        clearTimeout(this.restaurantSearchTimer)
        this.restaurantSearchTimer = null
      }
      this.resetFeaturedRestaurants()
    },
    clearRestaurantSearch() {
      this.restaurantKeyword = ''
      this.applyRestaurantSearch()
    },
    formatRestaurantDistance(restaurant) {
      const distances = restaurant.distanceKm || {}
      const selectedCampusCode = this.getSelectedRestaurantCampusCode()
      const campusCode = selectedCampusCode || Object.keys(distances).sort((a, b) => distances[a] - distances[b])[0]
      const distance = distances[campusCode]
      return Number.isFinite(distance) ? `${distance.toFixed(1)} km` : '待计算'
    },
    showRestaurantFilterHint() {
      uni.showToast({ title: '标签和高级筛选等你确定规则后接入', icon: 'none' })
    },
    useRestaurantPlaceholder(restaurant) {
      // 只替换失败的这一张图片，不影响其他餐厅卡片，也不会阻塞页面滚动。
      restaurant.displayImage = RESTAURANT_PLACEHOLDER
    },
    goRestaurantList() {
      uni.navigateTo({ url: '/pages/restaurant-list/index' })
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

.search-input {
  flex: 1;
  min-width: 0;
  color: #a1a2aa;
  font-size: 30rpx;
  line-height: 40rpx;
}

.search-clear {
  width: 42rpx;
  height: 42rpx;
  border-radius: 21rpx;
  background: #f1f2f5;
  color: #8e8f98;
  text-align: center;
  font-size: 32rpx;
  line-height: 40rpx;
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

.restaurant-section { margin-top: 44rpx; padding-bottom: 44rpx; }
.restaurant-section-title-row { display: flex; align-items: center; justify-content: space-between; }
.more-link { color: #e6782f; font-size: 26rpx; font-weight: 700; }
.featured-restaurant-list { display: flex; flex-direction: column; gap: 18rpx; }
.featured-restaurant-card { display: flex; min-height: 166rpx; overflow: hidden; border-radius: 20rpx; background: #fff; box-shadow: 0 8rpx 22rpx rgba(8, 9, 31, .07); }
.featured-restaurant-image { width: 190rpx; height: 166rpx; flex: none; background: #f1f2f5; }
.featured-restaurant-body { display: flex; min-width: 0; flex: 1; flex-direction: column; padding: 18rpx; }
.featured-restaurant-name { overflow: hidden; color: #08091f; font-size: 30rpx; font-weight: 800; text-overflow: ellipsis; white-space: nowrap; }
.featured-restaurant-address { overflow: hidden; margin-top: 9rpx; color: #8e8f98; font-size: 23rpx; text-overflow: ellipsis; white-space: nowrap; }
.featured-restaurant-footer { display: flex; justify-content: space-between; gap: 12rpx; margin-top: auto; }
.featured-distance { color: #e6782f; font-size: 23rpx; font-weight: 700; }
.featured-cuisine { overflow: hidden; max-width: 160rpx; color: #666875; font-size: 23rpx; text-overflow: ellipsis; white-space: nowrap; }

.album-card {
  display: inline-block;
  width: 214rpx;
  margin-right: 22rpx;
  vertical-align: top;
}

.album-card:last-child {
  margin-right: 0;
}

.album-image {
  width: 214rpx;
  height: 214rpx;
  border-radius: 18rpx;
  background: #f1f2f5;
}

.album-overlay {
  margin-top: -142rpx;
  padding-left: 20rpx;
  height: 128rpx;
  color: #ffffff;
  font-size: 42rpx;
  font-weight: 900;
  text-shadow: 0 4rpx 10rpx rgba(0, 0, 0, 0.28);
  position: relative;
}

.album-title {
  margin-top: 18rpx;
  overflow: hidden;
  font-size: 30rpx;
  font-weight: 800;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.album-subtitle {
  overflow: hidden;
  color: #94959f;
  font-size: 26rpx;
  margin-top: 6rpx;
  text-overflow: ellipsis;
  white-space: nowrap;
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
