<template>
  <view class="page-flush profile-page">
    <view class="profile-hero">
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
        <button class="edit-btn" @tap="editProfile">编辑资料</button>
      </view>

      <view class="profile-say">{{ currentUser ? `${currentUser.nickname}，今天吃什么？` : '说点什么吧...' }}</view>
      <button class="taste-chip" @tap="editTasteTags">{{ tasteLabel }}</button>
    </view>

    <view class="profile-panel">
      <view class="section-title">我的课表</view>
      <view class="timetable-sync-card" @tap="goTimetable">
        <view class="sync-left">
          <text class="sync-icon">📅</text>
          <view class="sync-text">
            <text class="sync-title">教务处课表同步</text>
            <text class="sync-desc">{{ hasTimetable ? '已同步真实课表数据' : '导入课表自动识别无课有空时段' }}</text>
          </view>
        </view>
        <text class="sync-arrow">👉</text>
      </view>

      <view class="section-title">我的饭局</view>
      <view class="empty-block">
        <view class="empty-illustration">🍽</view>
        <view class="empty-title">查看你发起和加入的饭局</view>
        <button class="button-primary full-btn" @tap="goMyMeals">我的饭局</button>
        <button class="button-secondary full-btn" @tap="goCreate">新建饭局</button>
      </view>

      <view class="profile-tabs">
        <view
          v-for="tab in tabs"
          :key="tab"
          :class="activeTab === tab ? 'profile-tab active' : 'profile-tab'"
          @tap="activeTab = tab"
        >{{ tab }}</view>
      </view>

      <view class="profile-empty">
        <view class="empty-illustration small">☕</view>
        <view class="empty-text">哪次饭局让你印象深刻</view>
        <button class="button-primary full-btn" @tap="publishReview">发布评价</button>
      </view>

      <button v-if="!currentUser" class="button-secondary full-btn" @tap="goLogin">登录账号</button>
    </view>
  </view>
</template>

<script>
import { timetableApi } from '../../services/api'

export default {
  data() {
    return {
      tabs: ['去过', '想去', '动态', '收藏'],
      activeTab: '去过',
      currentUser: null,
      currentProfile: null,
      hasTimetable: false
    }
  },
  onShow() {
    this.currentUser = uni.getStorageSync('currentUser') || null
    this.currentProfile = uni.getStorageSync('currentProfile') || null
    this.checkTimetable()
  },
  computed: {
    tasteLabel() {
      const tags = this.currentProfile?.tasteTags || []
      return tags.length ? `${tags.join('、')} ＋` : '你的口味标签 ＋'
    }
  },
  methods: {
    async checkTimetable() {
      if (!this.currentUser) return
      try {
        const data = await timetableApi.mine()
        this.hasTimetable = data && data.courses && data.courses.length > 0
      } catch (err) {
        console.error(err)
      }
    },
    goTimetable() {
      if (!this.currentUser) {
        uni.navigateTo({ url: '/pages/login/index' })
        return
      }
      uni.navigateTo({ url: '/pages/timetable-import/index' })
    },
    goLogin() {
      uni.navigateTo({ url: '/pages/login/index' })
    },
    goCreate() {
      uni.switchTab({ url: '/pages/create-meal/index' })
    },
    goMyMeals() {
      if (!this.currentUser) {
        uni.navigateTo({ url: '/pages/login/index' })
        return
      }
      uni.navigateTo({ url: '/pages/my-meals/index' })
    },
    editProfile() {
      uni.navigateTo({ url: '/pages/edit-profile/index' })
    },
    editTasteTags() {
      uni.navigateTo({ url: '/pages/edit-profile/index' })
    },
    publishReview() {
      uni.navigateTo({ url: '/pages/create-review/index?mealId=1&targetUserId=1' })
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
}

.stats-row {
  display: flex;
  align-items: flex-start;
  gap: 46rpx;
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
  justify-content: center;
  margin-top: 28rpx;
  height: 60rpx;
  padding: 0 24rpx;
  border-radius: 30rpx;
  background: #f7f7f887;
  color: #ffffff;
  font-size: 26rpx;
  font-weight: 800;
  border: 0;
}

.profile-panel {
  position: relative;
  margin-top: -26rpx;
  padding: 42rpx 30rpx 130rpx;
  border-radius: 28rpx 28rpx 0 0;
  background: #ffffff;
}

.section-title {
  font-size: 40rpx;
  font-weight: 900;
  margin-bottom: 28rpx;
}

.timetable-sync-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #ffffff;
  border: 2rpx solid #08091f;
  border-radius: 20rpx;
  padding: 24rpx;
  margin-bottom: 36rpx;
}

.sync-left {
  display: flex;
  align-items: center;
  gap: 20rpx;
}

.sync-icon {
  font-size: 40rpx;
}

.sync-text {
  display: flex;
  flex-direction: column;
}

.sync-title {
  font-size: 28rpx;
  font-weight: 800;
  color: #08091f;
}

.sync-desc {
  font-size: 22rpx;
  color: #94959f;
  margin-top: 4rpx;
}

.sync-arrow {
  font-size: 28rpx;
  color: #08091f;
  font-weight: 800;
}

.empty-block,
.profile-empty {
  text-align: center;
  padding: 44rpx 0 58rpx;
}

.empty-illustration {
  font-size: 112rpx;
  margin-bottom: 20rpx;
}

.empty-illustration.small {
  font-size: 96rpx;
}

.empty-title,
.empty-text {
  font-size: 30rpx;
  margin-bottom: 22rpx;
  color: #08091f;
}

.full-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 88rpx;
  border-radius: 48rpx;
  font-weight: 900;
  font-size: 32rpx;
}

.button-primary {
  background: #ffe733;
  color: #08091f;
  box-shadow: 0 12rpx 28rpx rgba(255, 231, 51, 0.28);
  border: 0;
}

.button-secondary {
  border: 2rpx solid #08091f;
  background: #fff;
  color: #08091f;
  margin-top: 24rpx;
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

.profile-empty {
  color: #08091f;
  font-size: 30rpx;
}
</style>
