<template>
  <view class="page restaurant-page">
    <view class="restaurant-header">
      <view>
        <text class="page-title">附近好吃的</text>
        <text class="page-subtitle">按校区查看距离，慢慢往下滑继续加载</text>
      </view>
    </view>

    <!-- 这里选择的不是筛掉餐厅，而是决定页面展示「到哪个校区的距离」。 -->
    <view class="campus-switch">
      <view
        v-for="campus in campuses"
        :key="campus.code"
        :class="selectedCampus === campus.code ? 'campus-pill active' : 'campus-pill'"
        @tap="changeCampus(campus.code)"
      >{{ campus.name }}</view>
    </view>

    <view class="restaurant-list">
      <!-- image 的 lazy-load 会让屏幕外图片暂不请求，避免一次加载很多地图图片。 -->
      <view v-for="restaurant in restaurants" :key="restaurant.id" class="restaurant-card">
        <image
          class="restaurant-image"
          :src="restaurant.displayImage"
          mode="aspectFill"
          lazy-load
          @error="usePlaceholder(restaurant)"
        />
        <view class="restaurant-content">
          <view class="restaurant-name">{{ restaurant.name }}</view>
          <view class="restaurant-meta">{{ restaurant.cuisine || '餐厅' }} · {{ restaurant.address || '地址待补充' }}</view>
          <view class="restaurant-bottom">
            <text class="distance">距{{ currentCampusName }} {{ formatDistance(restaurant) }}</text>
            <text class="recommend">{{ restaurant.recommendedDishes || '群友持续补充中' }}</text>
          </view>
        </view>
      </view>
    </view>

    <view v-if="loading && restaurants.length === 0" class="list-state">餐厅加载中…</view>
    <view v-else-if="restaurants.length === 0" class="list-state">暂时没有符合条件的餐厅</view>
    <view v-else-if="loadingMore" class="list-state">正在加载下一页…</view>
    <view v-else-if="!hasMore" class="list-state">已经到底啦</view>
  </view>
</template>

<script>
import { restaurantApi } from '../../services/api'

// 不依赖外部图片时也能正常显示；地图图片慢或失效时会回退到这张占位图。
const PLACEHOLDER_IMAGE = 'https://images.unsplash.com/photo-1515003197210-e0cd71810b5f?auto=format&fit=crop&w=480&q=70'
const PAGE_SIZE = 6

export default {
  data() {
    return {
      campuses: [
        { code: 'cufe_shahe', name: '沙河校区' },
        { code: 'cufe_nanlu', name: '学院南路校区' }
      ],
      selectedCampus: 'cufe_shahe',
      restaurants: [],
      page: 1,
      hasMore: true,
      loading: false,
      loadingMore: false
    }
  },
  computed: {
    currentCampusName() {
      return this.campuses.find(campus => campus.code === this.selectedCampus)?.name || '当前校区'
    }
  },
  onShow() {
    this.resetAndLoad()
  },
  // uni-app 页面滚动到底时触发。不会因为图片渲染慢而提前多次请求。
  onReachBottom() {
    this.loadNextPage()
  },
  methods: {
    async changeCampus(campusCode) {
      if (this.selectedCampus === campusCode) return
      this.selectedCampus = campusCode
      // 校区切换只影响距离展示；重新从第 1 页请求，保证后端若按距离排序时也是正确的。
      await this.resetAndLoad()
    },
    async resetAndLoad() {
      this.page = 1
      this.hasMore = true
      this.restaurants = []
      await this.loadNextPage()
    },
    async loadNextPage() {
      // 三个保护：正在请求、不再有下一页、首屏加载时，都不会重复发请求。
      if (this.loading || this.loadingMore || !this.hasMore) return
      const isFirstPage = this.page === 1
      if (isFirstPage) this.loading = true
      else this.loadingMore = true

      try {
        // 正式接数据库后，后端只需支持 page、pageSize、campus 参数。
        const result = await restaurantApi.list({
          page: this.page,
          pageSize: PAGE_SIZE,
          campus: this.selectedCampus
        })
        const items = (result.items || []).map(item => this.normalizeRestaurant(item))
        this.restaurants = [...this.restaurants, ...items]
        // 优先听后端的 hasMore；没提供时根据本页数量做兼容判断。
        this.hasMore = typeof result.hasMore === 'boolean' ? result.hasMore : items.length === PAGE_SIZE
        if (items.length > 0) this.page += 1
      } catch (error) {
        uni.showToast({ title: error.message || '餐厅加载失败', icon: 'none' })
      } finally {
        this.loading = false
        this.loadingMore = false
      }
    },
    normalizeRestaurant(item) {
      return {
        id: item.id,
        name: item.name || '未命名餐厅',
        cuisine: item.cuisine || item.foodType || '',
        address: item.fullAddress || item.address || item.location || '',
        recommendedDishes: item.recommendedDishes || '',
        // photoUrl 是我们数据库导出的高德封面图链接；不要一次性预加载所有图片。
        displayImage: item.photoUrl || item.coverImageUrl || PLACEHOLDER_IMAGE,
        // 后端可直接返回 distanceKm，也可按 campus 参数只返回一个 distanceKm 数值。
        distanceKm: item.distanceKm || {}
      }
    },
    formatDistance(restaurant) {
      const distance = typeof restaurant.distanceKm === 'number'
        ? restaurant.distanceKm
        : restaurant.distanceKm[this.selectedCampus]
      return Number.isFinite(distance) ? `${distance.toFixed(1)} km` : '待计算'
    },
    usePlaceholder(restaurant) {
      // 外部图片链接失效时只替换当前一张，不会影响列表其他项或阻塞滚动。
      restaurant.displayImage = PLACEHOLDER_IMAGE
    }
  }
}
</script>

<style scoped>
.restaurant-page { padding-top: 42rpx; }
.restaurant-header { margin-bottom: 24rpx; }
.page-title { display: block; font-size: 48rpx; font-weight: 900; color: #08091f; }
.page-subtitle { display: block; margin-top: 8rpx; color: #8e8f98; font-size: 25rpx; }
.campus-switch { display: flex; gap: 16rpx; margin-bottom: 28rpx; }
.campus-pill { padding: 14rpx 24rpx; border-radius: 99rpx; background: #f1f2f5; color: #656773; font-size: 26rpx; }
.campus-pill.active { background: #08091f; color: #fff; font-weight: 700; }
.restaurant-list { display: flex; flex-direction: column; gap: 20rpx; }
.restaurant-card { display: flex; min-height: 184rpx; overflow: hidden; border-radius: 20rpx; background: #fff; box-shadow: 0 8rpx 26rpx rgba(8, 9, 31, .07); }
.restaurant-image { width: 210rpx; height: 184rpx; flex: none; background: #f1f2f5; }
.restaurant-content { display: flex; flex: 1; min-width: 0; flex-direction: column; padding: 20rpx; }
.restaurant-name { overflow: hidden; color: #08091f; font-size: 31rpx; font-weight: 800; text-overflow: ellipsis; white-space: nowrap; }
.restaurant-meta { overflow: hidden; margin-top: 10rpx; color: #8e8f98; font-size: 24rpx; text-overflow: ellipsis; white-space: nowrap; }
.restaurant-bottom { display: flex; justify-content: space-between; gap: 12rpx; margin-top: auto; }
.distance { color: #e6782f; font-size: 24rpx; font-weight: 700; }
.recommend { overflow: hidden; max-width: 260rpx; color: #666875; font-size: 23rpx; text-overflow: ellipsis; white-space: nowrap; }
.list-state { padding: 36rpx 0 52rpx; color: #8e8f98; font-size: 26rpx; text-align: center; }
</style>
