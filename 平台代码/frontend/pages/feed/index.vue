<template>
  <view class="page feed-page">
    <view class="feed-tabs">
      <view class="feed-tab muted">关注</view>
      <view class="feed-tab active">推荐</view>
    </view>

    <view class="pill-row scene-row">
      <view class="pill active">全部</view>
      <view class="pill">约饭</view>
      <view class="pill">工作餐</view>
      <view class="pill">团建</view>
      <view class="pill">夜宵</view>
    </view>

    <view class="feed-card" v-for="post in posts" :key="post.id">
      <view class="post-user">
        <image class="avatar" :src="post.avatar" mode="aspectFill" />
        <view>
          <view class="user-name">{{ post.user }} <text class="verify">v</text></view>
          <view class="muted">认为这家适合 {{ post.scene }}</view>
        </view>
      </view>

      <image class="post-image food-image" :src="post.image" mode="aspectFill" />
      <view class="post-text">{{ post.text }}</view>
      <view class="restaurant-box">
        <view>
          <view class="restaurant-name">{{ post.restaurant }} ›</view>
          <view class="muted">{{ post.location }} · {{ post.distance }}</view>
        </view>
        <view class="want-box">
          <view class="want-button">♡</view>
          <text>想去</text>
        </view>
      </view>
      <view class="post-actions">
        <text>♡ {{ post.likes }}</text>
        <text>☻ {{ post.comments }}</text>
        <text class="muted">{{ post.time }}</text>
      </view>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      posts: [
        {
          id: 1,
          user: '米雪食记',
          scene: '饭搭子初见',
          restaurant: '一食堂二楼牛肉面',
          location: '一食堂',
          distance: '300m',
          text: '这家窗口出餐快，适合下课十分钟内集合，聊天压力也不大。',
          likes: 12,
          comments: 3,
          time: '1 天前',
          avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=240&q=80',
          image: 'https://images.unsplash.com/photo-1555126634-323283e090fa?auto=format&fit=crop&w=900&q=80'
        },
        {
          id: 2,
          user: '小马吃吃吃',
          scene: '夜宵拼桌',
          restaurant: '东门麻辣烫',
          location: '东门小吃街',
          distance: '800m',
          text: '四个人拼很舒服，预算能压到 25 左右，适合晚课后一起去。',
          likes: 8,
          comments: 1,
          time: '2 天前',
          avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=240&q=80',
          image: 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=900&q=80'
        }
      ]
    }
  }
}
</script>

<style scoped>
.feed-page {
  padding-top: 72rpx;
}

.feed-tabs {
  display: flex;
  gap: 44rpx;
  align-items: center;
  margin-bottom: 42rpx;
}

.feed-tab {
  font-size: 40rpx;
  font-weight: 800;
  position: relative;
}

.feed-tab.active::after {
  content: '';
  position: absolute;
  left: 6rpx;
  right: 6rpx;
  bottom: -8rpx;
  height: 12rpx;
  border-radius: 6rpx;
  background: #ffe733;
  z-index: -1;
}

.scene-row {
  margin-bottom: 38rpx;
}

.feed-card {
  padding-bottom: 34rpx;
  margin-bottom: 34rpx;
  border-bottom: 1rpx solid #f0f0f3;
}

.post-user {
  display: flex;
  align-items: center;
  gap: 18rpx;
  margin-bottom: 18rpx;
}

.avatar {
  width: 84rpx;
  height: 84rpx;
  border-radius: 42rpx;
}

.user-name {
  font-size: 32rpx;
  font-weight: 900;
  margin-bottom: 6rpx;
}

.verify {
  color: #d59b00;
  font-size: 24rpx;
}

.post-image {
  width: 100%;
  height: 520rpx;
  border-radius: 18rpx;
}

.post-text {
  margin-top: 22rpx;
  font-size: 31rpx;
  line-height: 1.65;
  color: #20212b;
}

.restaurant-box {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20rpx;
  margin-top: 24rpx;
  padding: 22rpx 24rpx;
  border-radius: 16rpx;
  background: #fafafa;
}

.restaurant-name {
  font-size: 30rpx;
  font-weight: 800;
  margin-bottom: 6rpx;
}

.want-box {
  width: 92rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.want-box text {
  display: block;
  font-size: 24rpx;
  margin-top: 4rpx;
}

.post-actions {
  display: flex;
  align-items: center;
  gap: 42rpx;
  margin-top: 26rpx;
  font-size: 28rpx;
}

.post-actions .muted {
  margin-left: auto;
}
</style>
