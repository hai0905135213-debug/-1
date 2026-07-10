<template>
  <view class="page home-page">
    <view class="home-header">
      <view class="mascot">饭</view>
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
        <view
          v-for="filter in filters"
          :key="filter"
          :class="activeFilter === filter ? 'pill active' : 'pill'"
          @tap="activeFilter = filter"
        >{{ filter }}</view>
      </view>
    </view>

    <view class="meal-list">
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
      filters: ['全校⌄', '品类⌄', '时间⌄', '筛选⌄'],
      activeFilter: '全校⌄',
      wantedMealIds: [2],
      meals: [
        {
          id: 1,
          title: '今晚一食堂吃面，缺 2 人',
          location: '一食堂二楼',
          distance: '300m',
          budget: '¥20/人',
          recommend: '3 人想去',
          category: '米粉面馆',
          user: '同学A',
          comment: '想找吃饭节奏差不多的，轻松聊天就行。',
          image: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=600&q=80'
        },
        {
          id: 2,
          title: '校门口麻辣烫拼桌',
          location: '东门小吃街',
          distance: '800m',
          budget: '¥30/人',
          recommend: '5 人推荐',
          category: '麻辣烫',
          user: '米雪食记',
          comment: '下课以后去，最好能凑到 3 到 4 个人。',
          image: 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=600&q=80'
        }
      ]
    }
  },
  methods: {
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
</style>
