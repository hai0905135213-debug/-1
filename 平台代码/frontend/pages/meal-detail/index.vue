<template>
  <view class="page-flush detail-page">
    <view class="hero">
      <image class="hero-image food-image" :src="meal.heroImage" mode="aspectFill" />
      <view class="hero-nav">
        <view class="icon-button dark" @tap="goBack">‹</view>
        <view class="icon-button dark" @tap="shareMeal">↗</view>
      </view>
      <view class="hero-quote">
        <image class="hero-avatar" :src="meal.hostAvatar" mode="aspectFill" />
        <view>
          <view class="hero-user">{{ meal.hostName }} <text class="gold">v</text></view>
          <view class="hero-text">“{{ meal.hostQuote }}”</view>
        </view>
      </view>
    </view>

    <view class="detail-panel">
      <view class="detail-title">{{ meal.title }}</view>
      <view class="badge-row">
        <text class="tag">值得一起去吃</text>
        <text class="tag">第 {{ meal.rank }} 校园饭局</text>
      </view>
      <view class="meta-line">{{ meal.category }} ｜ {{ meal.location }} ｜ {{ meal.budget }}</view>

      <view class="info-block">
        <view>
          <view class="info-main">{{ meal.statusText }}</view>
          <view class="muted">{{ meal.time }} · {{ meal.people }}</view>
        </view>
        <view class="side-link">详情›</view>
      </view>

      <view class="info-block">
        <view>
          <view class="info-main">{{ meal.address }}›</view>
          <view class="muted">距离你 {{ meal.distance }} 步行 {{ meal.walkTime }}</view>
        </view>
        <view class="quick-actions">
          <view class="icon-button" @tap="openMap">⌖</view>
          <view class="icon-button yellow" @tap="callHost">☎</view>
        </view>
      </view>

      <view class="section">
        <view class="top-row">
          <view class="section-title">推荐吃法</view>
          <view class="muted">查看全部›</view>
        </view>
        <scroll-view scroll-x class="dish-scroll">
          <view class="dish-card" v-for="dish in dishes" :key="dish.id">
            <image class="dish-image food-image" :src="dish.image" mode="aspectFill" />
            <view class="dish-count">{{ dish.count }} 人推荐</view>
            <view class="dish-name">{{ dish.name }}</view>
          </view>
        </scroll-view>
      </view>

      <view class="section">
        <view class="section-title">饭搭子评价</view>
        <view class="review-card">
          <image class="review-avatar" :src="meal.hostAvatar" mode="aspectFill" />
          <view>
            <view class="review-name">{{ meal.hostName }} <text class="tag">推荐官</text></view>
            <view class="tag">值得专程去吃</view>
            <view class="review-text">{{ meal.review }}</view>
          </view>
        </view>
      </view>
    </view>

    <view class="bottom-actions">
      <button class="button-secondary action-btn" @tap="reviewMeal">评价</button>
      <button class="button-primary action-btn" @tap="joinMeal">{{ joined ? '已加入' : '想去/加入' }}</button>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      meal: {
        id: '',
        title: '一食堂牛肉面饭局',
        category: '米粉面馆',
        location: '一食堂二楼',
        budget: '¥20/人',
        rank: 2,
        statusText: '可加入 今天 18:20',
        time: '今晚饭点',
        people: '2/4 人',
        address: '一食堂二楼靠窗区域',
        distance: '300m',
        walkTime: '4 分钟',
        hostName: '小君毛吃东西',
        hostQuote: '这家出餐快，适合下课后轻松约一顿。',
        review: '面汤稳定，排队不算久。第一次和饭搭子见面选这里比较稳，聊天或者安静吃都不尴尬。',
        hostAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=240&q=80',
        heroImage: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=1000&q=80'
      },
      joined: false,
      dishes: [
        {
          id: 1,
          name: '番茄牛肉面',
          count: 5,
          image: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=400&q=80'
        },
        {
          id: 2,
          name: '炸猪排',
          count: 2,
          image: 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=400&q=80'
        },
        {
          id: 3,
          name: '辣肉臊子',
          count: 1,
          image: 'https://images.unsplash.com/photo-1555126634-323283e090fa?auto=format&fit=crop&w=400&q=80'
        }
      ]
    }
  },
  onLoad(query) {
    this.meal.id = query.id || ''
  },
  methods: {
    goBack() {
      uni.navigateBack()
    },
    joinMeal() {
      this.joined = true
      uni.showToast({ title: '已加入饭局', icon: 'success' })
    },
    reviewMeal() {
      uni.navigateTo({ url: `/pages/create-review/index?mealId=${this.meal.id || 1}&targetUserId=1` })
    },
    shareMeal() {
      uni.showToast({ title: '已复制分享链接', icon: 'success' })
    },
    openMap() {
      uni.showToast({ title: '地图导航下一步接入', icon: 'none' })
    },
    callHost() {
      uni.showToast({ title: '联系发起人下一步接入', icon: 'none' })
    }
  }
}
</script>

<style scoped>
.hero {
  position: relative;
  height: 520rpx;
}

.hero-image {
  width: 100%;
  height: 520rpx;
}

.hero::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 220rpx;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.62), rgba(0, 0, 0, 0));
}

.hero-nav {
  position: absolute;
  left: 28rpx;
  right: 28rpx;
  top: 58rpx;
  display: flex;
  justify-content: space-between;
  z-index: 2;
}

.hero-quote {
  position: absolute;
  left: 30rpx;
  right: 30rpx;
  bottom: 58rpx;
  display: flex;
  align-items: center;
  gap: 16rpx;
  color: #ffffff;
  z-index: 2;
}

.hero-avatar {
  width: 72rpx;
  height: 72rpx;
  border-radius: 36rpx;
}

.hero-user {
  font-size: 30rpx;
  font-weight: 800;
}

.hero-text {
  margin-top: 8rpx;
  font-size: 28rpx;
}

.gold {
  color: #ffe733;
}

.detail-panel {
  position: relative;
  margin-top: -28rpx;
  padding: 42rpx 30rpx 160rpx;
  background: #ffffff;
  border-radius: 28rpx 28rpx 0 0;
  z-index: 3;
}

.detail-title {
  font-size: 46rpx;
  font-weight: 900;
  margin-bottom: 20rpx;
}

.badge-row {
  margin-bottom: 30rpx;
}

.meta-line {
  font-size: 32rpx;
  color: #08091f;
  margin-bottom: 30rpx;
}

.info-block {
  display: flex;
  justify-content: space-between;
  gap: 24rpx;
  padding: 24rpx 0;
  border-top: 1rpx solid #f0f0f3;
}

.info-main {
  font-size: 30rpx;
  font-weight: 800;
  margin-bottom: 8rpx;
}

.side-link {
  color: #94959f;
  font-size: 28rpx;
}

.quick-actions {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.dish-scroll {
  white-space: nowrap;
}

.dish-card {
  display: inline-block;
  width: 210rpx;
  margin-right: 22rpx;
  vertical-align: top;
}

.dish-image {
  width: 210rpx;
  height: 150rpx;
  border-radius: 16rpx;
}

.dish-count {
  margin-top: -44rpx;
  height: 44rpx;
  line-height: 44rpx;
  padding-left: 14rpx;
  color: #ffffff;
  background: rgba(0, 0, 0, 0.42);
  border-radius: 0 0 16rpx 16rpx;
  font-size: 24rpx;
  position: relative;
}

.dish-name {
  margin-top: 14rpx;
  font-size: 28rpx;
}

.review-card {
  display: flex;
  gap: 18rpx;
}

.review-avatar {
  width: 82rpx;
  height: 82rpx;
  border-radius: 41rpx;
  flex-shrink: 0;
}

.review-name {
  font-size: 32rpx;
  font-weight: 900;
  margin-bottom: 10rpx;
}

.review-text {
  margin-top: 16rpx;
  font-size: 29rpx;
  line-height: 1.6;
  color: #44454e;
}

.action-btn {
  flex: 1;
}
</style>
