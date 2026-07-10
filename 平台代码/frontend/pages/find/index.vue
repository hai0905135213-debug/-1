<template>
  <view class="page find-page">
    <view class="find-title-row">
      <text class="page-title">找人</text>
      <text class="muted">本校值得一起吃的饭搭子</text>
    </view>

    <view class="rank-tabs">
      <view
        v-for="tab in rankTabs"
        :key="tab.label"
        :class="activeRankTab === tab.label ? 'rank-tab active' : 'rank-tab'"
        @tap="activeRankTab = tab.label"
      >
        <view :class="'tab-icon ' + tab.color">{{ tab.icon }}</view>
        <view>{{ tab.label }}</view>
      </view>
    </view>

    <view class="pill-row category-row">
      <view
        v-for="category in categories"
        :key="category"
        :class="activeCategory === category ? 'pill active' : 'pill'"
        @tap="activeCategory = category"
      >{{ category }}</view>
    </view>

    <view class="rank-list">
      <view class="rank-item" v-for="person in people" :key="person.id">
        <view class="rank-number" :class="'rank-' + person.rank">{{ person.rank }}</view>
        <image class="avatar" :src="person.avatar" mode="aspectFill" />
        <view class="person-main">
          <view class="person-name">{{ person.name }} <text class="verify">v</text></view>
          <view class="muted">{{ person.desc }}</view>
        </view>
        <view class="person-score">
          <view class="score">{{ person.count }}</view>
          <view class="muted">约饭数</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      rankTabs: [
        { label: '去过', icon: '⚑', color: 'blue' },
        { label: '想去', icon: '♥', color: 'red' },
        { label: '好评', icon: '●', color: 'yellow' }
      ],
      categories: ['全部', '食堂', '夜宵', '咖啡', '清淡', '能聊'],
      activeRankTab: '去过',
      activeCategory: '全部',
      people: [
        {
          id: 1,
          rank: 1,
          name: '米雪食记',
          desc: '食堂窗口发现者',
          count: 36,
          avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=240&q=80'
        },
        {
          id: 2,
          rank: 2,
          name: '不是在吃就是在吃的路上',
          desc: '夜宵响应很快',
          count: 28,
          avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=240&q=80'
        },
        {
          id: 3,
          rank: 3,
          name: '清淡口同学',
          desc: '社恐友好，准时',
          count: 21,
          avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=240&q=80'
        },
        {
          id: 4,
          rank: 4,
          name: 'amor27 的饭路',
          desc: '校门口探索中',
          count: 18,
          avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=240&q=80'
        }
      ]
    }
  }
}
</script>

<style scoped>
.find-page {
  padding-top: 74rpx;
}

.find-title-row {
  display: flex;
  align-items: baseline;
  gap: 18rpx;
  margin-bottom: 54rpx;
}

.rank-tabs {
  display: flex;
  justify-content: space-around;
  border-bottom: 1rpx solid #f0f0f3;
  margin: 0 -30rpx 28rpx;
}

.rank-tab {
  width: 33.33%;
  text-align: center;
  font-size: 30rpx;
  font-weight: 700;
  padding-bottom: 24rpx;
  color: #08091f;
}

.rank-tab.active {
  border-bottom: 6rpx solid #08091f;
}

.tab-icon {
  font-size: 46rpx;
  margin-bottom: 12rpx;
}

.tab-icon.blue {
  color: #4d9af7;
}

.tab-icon.red {
  color: #ff5d68;
}

.tab-icon.yellow {
  color: #e5a900;
}

.category-row {
  margin-bottom: 34rpx;
}

.rank-item {
  display: flex;
  align-items: center;
  gap: 22rpx;
  padding: 28rpx 0;
}

.rank-number {
  width: 52rpx;
  text-align: center;
  font-size: 34rpx;
  font-weight: 900;
  color: #73747d;
}

.rank-1 {
  color: #e5a900;
}

.rank-2 {
  color: #9aa7b5;
}

.rank-3 {
  color: #bd7a3a;
}

.avatar {
  width: 86rpx;
  height: 86rpx;
  border-radius: 43rpx;
  background: #f1f1f3;
}

.person-main {
  flex: 1;
  min-width: 0;
}

.person-name {
  font-size: 32rpx;
  font-weight: 800;
  margin-bottom: 8rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.verify {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30rpx;
  height: 30rpx;
  border-radius: 15rpx;
  background: #ffe733;
  color: #08091f;
  font-size: 20rpx;
}

.person-score {
  text-align: right;
}

.score {
  font-size: 34rpx;
  font-weight: 900;
}
</style>
