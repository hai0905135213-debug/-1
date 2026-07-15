<template>
  <view class="page find-page">
    <!-- 标题行 -->
    <view class="find-title-row">
      <text class="page-title">找人</text>
      <text class="muted">发现值得一起吃的饭搭子</text>
    </view>

    <!-- 搜索栏 -->
    <view class="find-search">
      <text class="search-icon">🔍</text>
      <text class="search-placeholder">搜索饭搭子...</text>
    </view>

    <!-- 分类胶囊 -->
    <scroll-view scroll-x class="category-scroll">
      <view class="pill-row">
        <view
          v-for="cat in categories"
          :key="cat.name"
          :class="activeCategory === cat.name ? 'pill active' : 'pill'"
          @tap="activeCategory = cat.name"
        >{{ cat.name }}</view>
      </view>
    </scroll-view>

    <!-- 帖子列表 -->
    <view class="post-list">
      <view class="post-card" v-for="post in filteredPosts" :key="post.id" @tap="goDetail(post)">
        <!-- 头部：头像 + 用户信息 -->
        <view class="post-header">
          <image class="post-avatar" :src="post.author.avatar" mode="aspectFill" />
          <view class="post-user-info">
            <view class="post-user-row">
              <text class="post-username">{{ post.author.name }}</text>
              <text class="post-level">Lv.{{ post.author.level }}</text>
              <text class="post-role" :style="{ color: post.author.roleColor || '#D88BB3' }">{{ post.author.role }}</text>
            </view>
            <text class="post-time">{{ post.time }}</text>
          </view>
        </view>

        <!-- 正文：分类标签 + 内容 -->
        <view class="post-body">
          <text
            class="post-category"
            :style="{ borderColor: post.category.color, color: post.category.color }"
          >{{ post.category.name }}</text>
          <text class="post-content">{{ post.content }}</text>
        </view>

        <!-- 底部：等人 + 头像组 + 加入按钮 -->
        <view class="post-footer">
          <text class="post-waiting">等{{ post.waitingCount }}人</text>
          <view class="post-avatars">
            <image
              v-for="(av, idx) in post.joinedAvatars"
              :key="idx"
              class="post-joined-avatar"
              :src="av"
              mode="aspectFill"
            />
          </view>
          <view class="post-spacer"></view>
          <view
            :class="post.joined ? 'post-join joined' : 'post-join'"
            @tap.stop="toggleJoin(post)"
          >{{ post.joined ? '已约' : '+' }}</view>
        </view>
      </view>

      <!-- 空状态 -->
      <view v-if="filteredPosts.length === 0" class="empty-state">
        <text class="empty-icon">🍽</text>
        <text class="muted">该分类下暂无找饭友帖</text>
      </view>
    </view>

    <!-- 悬浮发布按钮 -->
    <view class="fab-wrapper">
      <view class="fab" @tap="tapFab">+</view>
    </view>
  </view>
</template>

<script>
import { postApi } from '../../services/api'

export default {
  data() {
    return {
      activeCategory: '全部',
      categories: [
        { name: '全部' },
        { name: '约饭' },
        { name: '探店' },
        { name: '夜宵' },
        { name: '拼桌' },
        { name: '咖啡' }
      ],
      loading: false,
      posts: []
    }
  },
  computed: {
    filteredPosts() {
      return this.posts
    }
  },
  onShow() {
    this.loadPosts()
  },
  watch: {
    activeCategory() {
      this.loadPosts()
    }
  },
  methods: {
    async loadPosts() {
      this.loading = true
      try {
        const params = {}
        if (this.activeCategory && this.activeCategory !== '全部') {
          params.category = this.activeCategory
        }
        const result = await postApi.list(params)
        this.posts = (result.items || []).map(post => {
          return {
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
        })
      } catch (error) {
        uni.showToast({ title: error.message || '加载找人贴失败', icon: 'none' })
      } finally {
        this.loading = false
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
    async toggleJoin(post) {
      if (!uni.getStorageSync('authToken')) {
        uni.navigateTo({ url: '/pages/login/index' })
        return
      }

      try {
        if (post.joined) {
          await postApi.leave(post.id)
          uni.showToast({ title: '已取消约饭请求', icon: 'none' })
        } else {
          await postApi.join(post.id)
          uni.showToast({ title: '已发送约饭请求', icon: 'none' })
        }
        await this.loadPosts()
      } catch (error) {
        uni.showToast({ title: error.message || '操作失败', icon: 'none' })
      }
    },
    goDetail(post) {
      uni.navigateTo({ url: `/pages/find-detail/index?id=${post.id}` })
    },
    tapFab() {
      uni.switchTab({ url: '/pages/create-meal/index' })
    }
  }
}
</script>

<style scoped>
.find-page {
  padding-top: 74rpx;
}

/* 标题行 */
.find-title-row {
  display: flex;
  align-items: baseline;
  gap: 18rpx;
  margin-bottom: 28rpx;
}

.page-title {
  font-size: 50rpx;
  font-weight: 900;
}

.muted {
  color: #8e8f98;
  font-size: 26rpx;
}

/* 搜索栏 */
.find-search {
  display: flex;
  align-items: center;
  gap: 12rpx;
  height: 72rpx;
  padding: 0 24rpx;
  margin-bottom: 24rpx;
  background: #f5f5f7;
  border-radius: 36rpx;
}

.search-icon {
  font-size: 28rpx;
}

.search-placeholder {
  color: #8e8f98;
  font-size: 28rpx;
}

/* 分类胶囊 */
.category-scroll {
  white-space: nowrap;
  margin-bottom: 28rpx;
}

.pill-row {
  display: flex;
  gap: 16rpx;
}

.pill {
  display: inline-flex;
  align-items: center;
  height: 60rpx;
  padding: 0 28rpx;
  border: 2rpx solid #e6e7ec;
  border-radius: 30rpx;
  background: #fff;
  font-size: 28rpx;
  font-weight: 700;
  white-space: nowrap;
}

.pill.active {
  border-color: #08091f;
  background: #fffdf0;
  box-shadow: inset 0 -6rpx 0 rgba(255, 231, 51, 0.85);
  font-weight: 900;
}

/* 帖子卡片 */
.post-list {
  padding-bottom: 40rpx;
}

.post-card {
  padding: 28rpx 0;
  border-bottom: 1rpx solid #f0f0f3;
}

/* 头部 */
.post-header {
  display: flex;
  align-items: center;
  gap: 18rpx;
  margin-bottom: 20rpx;
}

.post-avatar {
  width: 80rpx;
  height: 80rpx;
  border-radius: 40rpx;
  background: #f1f1f3;
  flex-shrink: 0;
}

.post-user-info {
  flex: 1;
  min-width: 0;
}

.post-user-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 8rpx;
}

.post-username {
  font-size: 30rpx;
  font-weight: 800;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.post-level {
  font-size: 20rpx;
  font-weight: 800;
  padding: 2rpx 10rpx;
  border-radius: 8rpx;
  background: #f0f0f3;
  color: #73747d;
  flex-shrink: 0;
}

.post-role {
  font-size: 22rpx;
  font-weight: 700;
  flex-shrink: 0;
}

.post-time {
  font-size: 22rpx;
  color: #8e8f98;
}

/* 正文 */
.post-body {
  margin-bottom: 20rpx;
}

.post-category {
  display: inline-block;
  padding: 4rpx 18rpx;
  border: 2rpx solid;
  border-radius: 8rpx;
  font-size: 22rpx;
  font-weight: 700;
  margin-bottom: 14rpx;
}

.post-content {
  font-size: 30rpx;
  line-height: 1.6;
  color: #08091f;
  display: block;
}

/* 底部互动 */
.post-footer {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.post-waiting {
  font-size: 24rpx;
  color: #8e8f98;
  font-weight: 700;
}

.post-avatars {
  display: flex;
  flex-shrink: 0;
}

.post-joined-avatar {
  width: 48rpx;
  height: 48rpx;
  border-radius: 24rpx;
  border: 3rpx solid #fff;
  background: #f1f1f3;
  margin-left: -14rpx;
}

.post-joined-avatar:first-child {
  margin-left: 0;
}

.post-spacer {
  flex: 1;
}

.post-join {
  width: 56rpx;
  height: 56rpx;
  border-radius: 28rpx;
  border: 2rpx solid #eeeef2;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32rpx;
  font-weight: 900;
  color: #08091f;
  box-shadow: 0 4rpx 14rpx rgba(8, 9, 31, 0.06);
  flex-shrink: 0;
}

.post-join.joined {
  background: #fff7bd;
  border-color: #ffe733;
  font-size: 18rpx;
  color: #a66b00;
}

/* 悬浮按钮 */
.fab-wrapper {
  position: sticky;
  bottom: 24rpx;
  display: flex;
  justify-content: flex-end;
  margin-top: -80rpx;
  pointer-events: none;
  z-index: 10;
}

.fab {
  width: 96rpx;
  height: 96rpx;
  border-radius: 48rpx;
  background: #ffe733;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 56rpx;
  font-weight: 300;
  color: #08091f;
  box-shadow: 0 12rpx 32rpx rgba(255, 231, 51, 0.4);
  pointer-events: auto;
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 18rpx;
  padding: 80rpx 0;
}

.empty-icon {
  font-size: 56px;
}
</style>
