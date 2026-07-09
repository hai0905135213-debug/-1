<template>
  <view class="page-flush profile-page">
    <view class="profile-hero">
      <view class="profile-tools">
        <text>⚙</text>
        <view>
          <text>♡</text>
          <text class="tool-gap">↗</text>
        </view>
      </view>

      <view class="stats-row">
        <view>
          <view class="stat-num">3</view>
          <view class="stat-label">关注</view>
        </view>
        <view>
          <view class="stat-num">2</view>
          <view class="stat-label">饭搭子</view>
        </view>
        <view>
          <view class="stat-num">8</view>
          <view class="stat-label">好评与想去</view>
        </view>
        <button class="edit-btn">编辑资料</button>
      </view>

      <view class="profile-say">说点什么吧...</view>
      <view class="taste-chip">你的口味标签 ＋</view>
      <view class="profile-mascot">饭</view>
    </view>

    <view class="profile-panel">
      <view class="section-title">我的饭局</view>
      <view class="empty-block">
        <view class="empty-illustration">🍽</view>
        <view class="empty-title">还没有发起饭局，快去创建一个吧</view>
        <button class="button-primary mini-btn" @tap="goCreate">新建饭局</button>
      </view>

      <view class="profile-tabs">
        <view class="profile-tab active">去过</view>
        <view class="profile-tab">想去</view>
        <view class="profile-tab">动态</view>
        <view class="profile-tab">收藏</view>
      </view>

      <view class="sort-row">
        <text></text>
        <text>☰ 最新评价</text>
      </view>

      <view class="profile-empty">
        <view class="empty-illustration small">☕</view>
        <view>哪次饭局让你印象深刻</view>
        <button class="button-primary mini-btn">发布评价</button>
      </view>
    </view>
  </view>
</template>

<script>
export default {
  methods: {
    goCreate() {
      uni.switchTab({ url: '/pages/create-meal/index' })
    }
  }
}
</script>

<style scoped>
.profile-hero {
  position: relative;
  min-height: 430rpx;
  padding: 66rpx 36rpx 54rpx;
  background: #18849a;
  color: #ffffff;
  box-sizing: border-box;
  overflow: hidden;
}

.profile-tools {
  display: flex;
  justify-content: space-between;
  font-size: 44rpx;
  margin-bottom: 34rpx;
}

.tool-gap {
  margin-left: 34rpx;
}

.stats-row {
  display: flex;
  align-items: flex-start;
  gap: 46rpx;
  position: relative;
  z-index: 2;
}

.stat-num {
  font-size: 38rpx;
  font-weight: 900;
}

.stat-label {
  margin-top: 6rpx;
  color: rgba(255, 255, 255, 0.72);
  font-size: 25rpx;
}

.edit-btn {
  margin-left: auto;
  width: 180rpx;
  height: 70rpx;
  line-height: 70rpx;
  border-radius: 36rpx;
  color: #ffffff;
  border: 2rpx solid rgba(255, 255, 255, 0.8);
  background: transparent;
  font-size: 28rpx;
  font-weight: 900;
}

.edit-btn:active {
  background: rgba(255, 255, 255, 0.16);
}

.profile-say {
  margin-top: 44rpx;
  font-size: 32rpx;
  font-weight: 700;
}

.taste-chip {
  display: inline-flex;
  align-items: center;
  margin-top: 28rpx;
  height: 60rpx;
  padding: 0 24rpx;
  border-radius: 30rpx;
  background: rgba(255, 255, 255, 0.15);
  font-size: 26rpx;
}

.profile-mascot {
  position: absolute;
  right: 56rpx;
  bottom: -10rpx;
  width: 132rpx;
  height: 132rpx;
  border-radius: 66rpx;
  background: #fff4a8;
  color: #08091f;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 42rpx;
  font-weight: 900;
}

.profile-panel {
  position: relative;
  margin-top: -26rpx;
  padding: 42rpx 30rpx 130rpx;
  border-radius: 28rpx 28rpx 0 0;
  background: #ffffff;
}

.empty-block,
.profile-empty {
  text-align: center;
  padding: 44rpx 0 58rpx;
}

.empty-illustration {
  font-size: 96rpx;
  margin-bottom: 20rpx;
}

.empty-illustration.small {
  font-size: 78rpx;
}

.empty-title {
  font-size: 30rpx;
  margin-bottom: 22rpx;
}

.mini-btn {
  display: inline-block;
  width: 210rpx;
  height: 72rpx;
  line-height: 72rpx;
  font-size: 28rpx;
}

.profile-tabs {
  display: flex;
  gap: 48rpx;
  margin-top: 16rpx;
  margin-bottom: 34rpx;
}

.profile-tab {
  font-size: 36rpx;
  font-weight: 800;
  color: #94959f;
  padding-bottom: 12rpx;
}

.profile-tab.active {
  color: #08091f;
  border-bottom: 6rpx solid #08091f;
}

.sort-row {
  display: flex;
  justify-content: space-between;
  color: #64656d;
  font-size: 28rpx;
}

.profile-empty {
  color: #08091f;
  font-size: 30rpx;
}
</style>
