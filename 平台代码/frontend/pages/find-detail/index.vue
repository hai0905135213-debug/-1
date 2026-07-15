<template>
  <view class="page find-detail-page">
    <!-- 顶部返回 -->
    <view class="back-link" @tap="goBack">‹ 找人</view>

    <view v-if="post">
      <!-- 帖子内容区域 -->
      <view class="detail-card">
        <view class="detail-header">
          <image class="detail-avatar" :src="post.author.avatar" mode="aspectFill" />
          <view class="detail-user-info">
            <view class="detail-user-row">
              <text class="detail-username">{{ post.author.name }}</text>
              <text class="detail-level">Lv.{{ post.author.level }}</text>
              <text class="detail-role" :style="{ color: post.author.roleColor || '#D88BB3' }">{{ post.author.role }}</text>
            </view>
            <text class="detail-time">{{ post.time }} 发布</text>
          </view>
        </view>
        <text class="detail-category" :style="{ borderColor: post.category.color, color: post.category.color }">{{ post.category.name }}</text>
        <text class="detail-content">{{ post.content }}</text>
        <view class="detail-meta">
          <text>等 <text class="bold">{{ post.waitingCount }}</text> 人</text>
          <text v-if="post.joinedAvatars.length" style="margin-left:32rpx">已加入：</text>
          <image
            v-for="(av, idx) in post.joinedAvatars"
            :key="idx"
            class="detail-mini-avatar"
            :src="av"
            mode="aspectFill"
          />
        </view>
      </view>

      <!-- 发起人信息卡片 -->
      <view class="detail-card">
        <view class="section-title">发起人</view>
        <view class="author-profile">
          <view class="author-top">
            <image class="author-big-avatar" :src="post.author.avatar" mode="aspectFill" />
            <view class="author-summary">
              <view class="author-name-row">
                <text class="author-name-text">{{ post.author.name }}</text>
                <text class="author-level">Lv.{{ post.author.level }}</text>
                <text class="author-role" :style="{ color: post.author.roleColor || '#D88BB3' }">{{ post.author.role }}</text>
              </view>
              <view class="detail-tags">
                <text
                  v-for="t in post.author.tasteTags"
                  :key="t"
                  class="detail-tag taste"
                >{{ t }}</text>
                <text
                  v-for="t in post.author.personalityTags"
                  :key="t"
                  class="detail-tag personality"
                >{{ t }}</text>
              </view>
            </view>
          </view>

          <text class="author-desc">{{ post.author.desc }}</text>

          <view class="credit-section">
            <view class="credit-score">
              <text class="credit-label">信用分</text>
              <text class="credit-value high">{{ post.author.creditScore }}</text>
              <text class="credit-sub">信用优秀</text>
            </view>
            <view class="credit-stats">
              <view class="credit-stat">
                <text class="credit-stat-num">{{ post.author.mealCount }}</text>
                <text class="credit-stat-label">历史约饭</text>
              </view>
              <view class="credit-stat">
                <text class="credit-stat-num">{{ post.author.reviewCount }}</text>
                <text class="credit-stat-label">获得评价</text>
              </view>
              <view class="credit-stat">
                <text class="credit-stat-num">0</text>
                <text class="credit-stat-label">爽约次数</text>
              </view>
            </view>
            <view class="credit-info-row">
              <text class="credit-item"><text class="bold">校区</text> {{ post.author.campus }}</text>
              <text class="credit-item"><text class="bold">预算</text> ¥{{ post.author.budgetPreference }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 餐厅信息卡片 -->
      <view class="detail-card" v-if="post.restaurant">
        <view class="section-title">推荐餐厅</view>
        <view class="restaurant-card-detail">
          <image
            class="restaurant-hero-img"
            :src="post.restaurant.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80'"
            mode="aspectFill"
          />
          <view class="restaurant-info-detail">
            <view class="restaurant-name-row">
              <text class="restaurant-name-text">{{ post.restaurant.name }}</text>
              <text class="detail-category" style="border-color:#FF9F43;color:#FF9F43">{{ post.restaurant.foodType }}</text>
            </view>
            <view class="restaurant-meta">
              <text>⭐ {{ post.restaurant.rating }}</text>
              <text>📍 {{ post.restaurant.location }}</text>
              <text>💰 ¥{{ (post.restaurant.avgPrice / 100).toFixed(0) }}/人</text>
            </view>
            <view class="detail-tags">
              <text
                v-for="t in post.restaurant.tags"
                :key="t"
                class="detail-tag rest"
              >{{ t }}</text>
            </view>
            <view class="restaurant-desc">{{ post.restaurant.description }}</view>
          </view>
        </view>
      </view>

      <!-- 底部操作 -->
      <view class="detail-bottom-actions">
        <button class="detail-btn secondary" @tap="tapReview">评价</button>
        <button
          class="detail-btn primary"
          :class="{ joined: post.joined }"
          @tap="toggleJoin"
        >{{ post.joined ? '已约' : '约 TA' }}</button>
      </view>

      <view style="height:48rpx"></view>
    </view>

<script>
import { postApi } from '../../services/api'

export default {
  data() {
    return {
      post: null
    }
  },
  async onLoad(options) {
    const id = Number(options.id)
    await this.loadPost(id)
  },
  methods: {
    async loadPost(id) {
      try {
        const result = await postApi.detail(id)
        const post = result.post
        this.post = {
          id: post.id,
          author: {
            name: post.author?.nickname || '同学',
            avatar: post.author?.profile?.avatarUrl || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=240&q=80',
            level: 5,
            role: '大学',
            roleColor: '#D88BB3',
            campus: post.author?.profile?.campus || '主校区',
            creditScore: post.author?.creditScore || 95,
            mealCount: 10,
            reviewCount: 5,
            tasteTags: post.author?.profile?.tasteTags || [],
            personalityTags: post.author?.profile?.personalityTags || [],
            budgetPreference: post.author?.profile?.budgetPreference || '20-40',
            desc: post.author?.profile?.description || '这家伙很懒，什么都没写。'
          },
          time: post.createdAt ? this.formatPostTime(post.createdAt) : '刚刚',
          category: { name: post.category, color: this.getCategoryColor(post.category) },
          content: post.content,
          waitingCount: post.waitingCount || 0,
          joinedAvatars: post.joinedAvatars || [],
          joined: post.joined || false,
          restaurant: post.restaurant
        }
      } catch (error) {
        uni.showToast({ title: error.message || '加载详情失败', icon: 'none' })
      }
    },
    formatPostTime(value) {
      const date = new Date(value)
      if (Number.isNaN(date.getTime())) return '刚刚'
      return `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
    },
    getCategoryColor(category) {
      const colors = {
        '约饭': '#FF9F43',
        '探店': '#8FD4D2',
        '夜宵': '#7C5CBF',
        '拼桌': '#54A0FF',
        '咖啡': '#D88BB3'
      }
      return colors[category] || '#FF9F43'
    },
    goBack() {
      uni.navigateBack()
    },
    async toggleJoin() {
      if (!this.post) return
      if (!uni.getStorageSync('authToken')) {
        uni.navigateTo({ url: '/pages/login/index' })
        return
      }

      try {
        if (this.post.joined) {
          await postApi.leave(this.post.id)
          uni.showToast({ title: '已取消约饭请求', icon: 'none' })
        } else {
          await postApi.join(this.post.id)
          uni.showToast({ title: '已发送约饭请求', icon: 'none' })
        }
        await this.loadPost(this.post.id)
      } catch (error) {
        uni.showToast({ title: error.message || '操作失败', icon: 'none' })
      }
    },
    tapReview() {
      uni.showToast({
        title: '评价功能即将上线',
        icon: 'none',
        duration: 1500
      })
    }
  }
}
</script>

<style scoped>
.find-detail-page {
  padding: 48rpx 30rpx 160rpx;
}

.back-link {
  display: inline-flex;
  align-items: center;
  gap: 8rpx;
  font-size: 30rpx;
  font-weight: 800;
  color: #8e8f98;
  margin-bottom: 40rpx;
}

/* 卡片 */
.detail-card {
  background: #fff;
  border-radius: 32rpx;
  padding: 40rpx;
  margin-bottom: 32rpx;
  box-shadow: 0 4rpx 16rpx rgba(8, 9, 31, 0.04);
}

.section-title {
  font-size: 36rpx;
  font-weight: 900;
  margin-bottom: 24rpx;
}

/* 帖子头部 */
.detail-header {
  display: flex;
  align-items: center;
  gap: 24rpx;
  margin-bottom: 32rpx;
}

.detail-avatar {
  width: 96rpx;
  height: 96rpx;
  border-radius: 48rpx;
  background: #f1f1f3;
  flex-shrink: 0;
}

.detail-user-info {
  flex: 1;
  min-width: 0;
}

.detail-user-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 8rpx;
}

.detail-username {
  font-size: 32rpx;
  font-weight: 800;
}

.detail-level {
  font-size: 22rpx;
  font-weight: 800;
  padding: 2rpx 12rpx;
  border-radius: 10rpx;
  background: #f0f0f3;
  color: #73747d;
  flex-shrink: 0;
}

.detail-role {
  font-size: 24rpx;
  font-weight: 700;
  flex-shrink: 0;
}

.detail-time {
  font-size: 24rpx;
  color: #8e8f98;
}

/* 帖子正文 */
.detail-category {
  display: inline-block;
  padding: 6rpx 20rpx;
  border: 4rpx solid;
  border-radius: 12rpx;
  font-size: 24rpx;
  font-weight: 700;
  margin-bottom: 24rpx;
}

.detail-content {
  font-size: 32rpx;
  line-height: 1.7;
  color: #08091f;
  display: block;
  margin-bottom: 28rpx;
}

.detail-meta {
  font-size: 26rpx;
  color: #8e8f98;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12rpx;
}

.bold {
  font-weight: 800;
  color: #08091f;
}

.detail-mini-avatar {
  width: 44rpx;
  height: 44rpx;
  border-radius: 22rpx;
  border: 4rpx solid #fff;
  background: #f1f1f3;
  margin-left: -12rpx;
}

.detail-mini-avatar:first-child {
  margin-left: 8rpx;
}

/* 发起人 */
.author-profile {
  margin-top: 24rpx;
}

.author-top {
  display: flex;
  gap: 28rpx;
  margin-bottom: 28rpx;
}

.author-big-avatar {
  width: 128rpx;
  height: 128rpx;
  border-radius: 64rpx;
  background: #f1f1f3;
  flex-shrink: 0;
}

.author-summary {
  flex: 1;
  min-width: 0;
}

.author-name-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 16rpx;
}

.author-name-text {
  font-size: 34rpx;
  font-weight: 800;
}

.author-level {
  font-size: 22rpx;
  font-weight: 800;
  padding: 2rpx 12rpx;
  border-radius: 10rpx;
  background: #f0f0f3;
  color: #73747d;
}

.author-role {
  font-size: 24rpx;
  font-weight: 700;
}

.author-desc {
  font-size: 28rpx;
  line-height: 1.6;
  color: #5f6069;
  display: block;
  margin-bottom: 32rpx;
}

/* 标签 */
.detail-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}

.detail-tag {
  display: inline-block;
  padding: 6rpx 20rpx;
  border-radius: 24rpx;
  font-size: 24rpx;
  font-weight: 700;
}

.detail-tag.taste {
  background: #fff6da;
  color: #a66b00;
}

.detail-tag.personality {
  background: #eef0ff;
  color: #4d5ec1;
}

.detail-tag.rest {
  background: #e8f8f2;
  color: #2d7d5f;
}

/* 信用分 */
.credit-section {
  margin-top: 32rpx;
  padding-top: 32rpx;
  border-top: 2rpx solid #f0f0f3;
}

.credit-score {
  display: flex;
  align-items: center;
  gap: 20rpx;
  margin-bottom: 28rpx;
}

.credit-label {
  font-size: 28rpx;
  font-weight: 800;
  color: #5f6069;
}

.credit-value {
  font-size: 72rpx;
  font-weight: 900;
}

.credit-value.high {
  color: #2d7d5f;
}

.credit-sub {
  font-size: 24rpx;
  font-weight: 700;
  padding: 4rpx 16rpx;
  border-radius: 16rpx;
  background: #e8f8f2;
  color: #2d7d5f;
}

.credit-stats {
  display: flex;
  gap: 0;
  margin-bottom: 28rpx;
  border-radius: 20rpx;
  background: #fafafa;
  padding: 24rpx 0;
}

.credit-stat {
  flex: 1;
  text-align: center;
}

.credit-stat-num {
  display: block;
  font-size: 44rpx;
  font-weight: 900;
  color: #08091f;
}

.credit-stat-label {
  display: block;
  margin-top: 8rpx;
  font-size: 24rpx;
  color: #8e8f98;
}

.credit-info-row {
  display: flex;
  gap: 48rpx;
}

.credit-item {
  font-size: 26rpx;
  color: #5f6069;
}

.credit-item .bold {
  color: #08091f;
}

/* 餐厅 */
.restaurant-card-detail {
  margin-top: 24rpx;
}

.restaurant-hero-img {
  width: 100%;
  height: 320rpx;
  border-radius: 20rpx;
  margin-bottom: 28rpx;
}

.restaurant-info-detail {
  flex: 1;
}

.restaurant-name-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20rpx;
}

.restaurant-name-text {
  font-size: 34rpx;
  font-weight: 800;
}

.restaurant-meta {
  display: flex;
  gap: 32rpx;
  font-size: 26rpx;
  color: #5f6069;
  margin-bottom: 20rpx;
  flex-wrap: wrap;
}

.restaurant-desc {
  margin-top: 20rpx;
  font-size: 26rpx;
  line-height: 1.55;
  color: #777984;
  padding: 20rpx;
  border-radius: 18rpx;
  background: #fafafa;
}

/* 底部操作 */
.detail-bottom-actions {
  display: flex;
  gap: 24rpx;
  position: sticky;
  bottom: 0;
  z-index: 10;
  padding: 32rpx 30rpx;
  background: #fff;
  border-top: 2rpx solid #f0f0f3;
}

.detail-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  height: 88rpx;
  border-radius: 44rpx;
  font-weight: 900;
  font-size: 30rpx;
}

.detail-btn.primary {
  background: #ffe733;
  color: #08091f;
  border: 0;
  box-shadow: 0 12rpx 28rpx rgba(255, 231, 51, 0.28);
}

.detail-btn.secondary {
  border: 2rpx solid #08091f;
  background: #fff;
  color: #08091f;
}

.detail-btn.joined {
  background: #fff7bd;
  font-size: 24rpx;
}

.detail-btn:active {
  transform: scale(0.98);
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24rpx;
  padding: 160rpx 0;
}

.empty-icon {
  font-size: 96rpx;
}

.empty-text {
  font-size: 30rpx;
  color: #8e8f98;
}
</style>
