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

    <view v-else class="empty-state">
      <text class="empty-icon">🔍</text>
      <text class="empty-text">帖子未找到</text>
    </view>
  </view>
</template>

<script>
const POSTS = [
  {
    id: 1,
    author: {
      name: '米雪食记',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=240&q=80',
      level: 6,
      role: '大学',
      roleColor: '#D88BB3',
      campus: '主校区',
      creditScore: 98,
      mealCount: 36,
      reviewCount: 22,
      tasteTags: ['川菜', '火锅', '麻辣'],
      personalityTags: ['健谈', '吃得快', '准时不鸽'],
      budgetPreference: '20-40',
      desc: '食堂窗口发现者，二食堂二楼老常客。每次约饭都会提前到，从不爽约。饭量大，节奏快，适合不想拖沓的饭友。'
    },
    time: '07-09 18:35',
    category: { name: '约饭', color: '#FF9F43' },
    content: '蹲蹲今晚一食堂吃麻辣香锅的uu，本人女生～最好是口味偏辣的！大概7点左右去。',
    waitingCount: 2,
    joinedAvatars: [
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=240&q=80',
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=240&q=80'
    ],
    joined: false,
    restaurant: {
      name: '二食堂麻辣香锅',
      foodType: '川菜',
      campus: '主校区',
      location: '二食堂二楼靠窗区域',
      avgPrice: 2200,
      rating: 4.7,
      tags: ['麻辣香锅', '出餐快', '分量足'],
      description: '窗口出餐快，适合下课十分钟内集合。排队不算久，面汤稳定，第一次和饭搭子见面选这里比较稳。',
      image: 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=800&q=80'
    }
  },
  {
    id: 2,
    author: {
      name: '怎么什么用户名都在',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=240&q=80',
      level: 6,
      role: '大学',
      roleColor: '#D88BB3',
      campus: '主校区',
      creditScore: 95,
      mealCount: 28,
      reviewCount: 16,
      tasteTags: ['韩料', '日料', '探店'],
      personalityTags: ['爱拍照', '慢节奏', 'AA记账'],
      budgetPreference: '40-80',
      desc: '校门口新店活地图，拍照修图一条龙。吃饭节奏偏慢，喜欢边吃边聊，特别适合想放松吃的饭友。'
    },
    time: '07-09 12:14',
    category: { name: '探店', color: '#8FD4D2' },
    content: '有没有uu想一起去校门口新开的韩料店探店！本人喜欢拍照，最好是也爱拍照的姐妹～',
    waitingCount: 1,
    joinedAvatars: [
      'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=240&q=80'
    ],
    joined: false,
    restaurant: {
      name: '东门新韩式料理',
      foodType: '韩料',
      campus: '主校区',
      location: '东门外步行街南侧',
      avgPrice: 4500,
      rating: 4.4,
      tags: ['新店', '部队锅', '拍照好看'],
      description: '新开一个月，用餐环境干净明亮。部队锅分量大，建议凑 2-3 人一起吃。炸鸡出片率高。',
      image: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=800&q=80'
    }
  },
  {
    id: 3,
    author: {
      name: '小马吃吃吃',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=240&q=80',
      level: 5,
      role: '实习',
      roleColor: '#D88BB3',
      campus: '东校区',
      creditScore: 92,
      mealCount: 21,
      reviewCount: 11,
      tasteTags: ['烧烤', '夜宵', '啤酒'],
      personalityTags: ['夜猫子', '随性', '不拘束'],
      budgetPreference: '20-50',
      desc: '晚课结束后必约夜宵，东门烧烤摊资深品鉴师。比较随性，不挑食不挑环境，主打一个吃得开心。'
    },
    time: '07-08 21:10',
    category: { name: '夜宵', color: '#7C5CBF' },
    content: '晚课结束后想吃夜宵，东门烧烤摊常驻选手，缺一个饭搭子！AA制，大概22点出发。',
    waitingCount: 3,
    joinedAvatars: [
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=240&q=80',
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=240&q=80',
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=240&q=80'
    ],
    joined: false,
    restaurant: {
      name: '东门烧烤摊',
      foodType: '烧烤',
      campus: '主校区',
      location: '东门小吃街最里面',
      avgPrice: 3000,
      rating: 4.5,
      tags: ['露天', '深夜营业', '性价比高'],
      description: '开到凌晨 1 点，四个人拼很舒服，预算能压到 25 左右。羊肉串和烤茄子口碑很好，人多能多点几样。',
      image: 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=800&q=80'
    }
  },
  {
    id: 4,
    author: {
      name: '清淡口同学',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=240&q=80',
      level: 4,
      role: '大学',
      roleColor: '#D88BB3',
      campus: '主校区',
      creditScore: 99,
      mealCount: 18,
      reviewCount: 10,
      tasteTags: ['轻食', '清淡', '沙拉'],
      personalityTags: ['社恐友好', '安静吃饭', '准时'],
      budgetPreference: '15-25',
      desc: '长期驻扎三食堂轻食窗口，口味非常清淡。社恐友好型饭搭子——不尬聊、不勉强、准时到、吃完走。'
    },
    time: '07-08 15:42',
    category: { name: '拼桌', color: '#54A0FF' },
    content: '三食堂轻食窗口长期拼桌，本人吃得很清淡，偏好安静吃饭不尬聊的氛围～',
    waitingCount: 1,
    joinedAvatars: [],
    joined: false,
    restaurant: {
      name: '三食堂轻食窗口',
      foodType: '轻食',
      campus: '主校区',
      location: '三食堂一楼右侧',
      avgPrice: 1500,
      rating: 4.3,
      tags: ['低脂', '高蛋白', '现做'],
      description: '每周换菜单，食材新鲜。鸡胸肉沙拉和荞麦面是招牌，适合减脂期同学。座位充足，不用抢位。',
      image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80'
    }
  },
  {
    id: 5,
    author: {
      name: 'amor27的饭路',
      avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=240&q=80',
      level: 7,
      role: '大学',
      roleColor: '#D88BB3',
      campus: '主校区',
      creditScore: 96,
      mealCount: 42,
      reviewCount: 30,
      tasteTags: ['酸菜鱼', '火锅', '湘菜'],
      personalityTags: ['组织能手', 'AA精确到分', '饭后逛街'],
      budgetPreference: '40-100',
      desc: '校园约饭天花板选手，人均 60 的酸菜鱼局能组织 6 人成行。AA 精确到分值得信赖，吃完总会安排饭后逛逛消食。'
    },
    time: '07-07 11:20',
    category: { name: '约饭', color: '#FF9F43' },
    content: '周末想去市区吃那家很火的酸菜鱼，有没有人一起！AA，大概人均60，吃完还可以逛逛。',
    waitingCount: 2,
    joinedAvatars: [
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=240&q=80',
      'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=240&q=80'
    ],
    joined: false,
    restaurant: {
      name: '市区太二酸菜鱼',
      foodType: '川菜',
      campus: '市区',
      location: '解放路步行街 3 楼',
      avgPrice: 6000,
      rating: 4.8,
      tags: ['网红店', '酸菜鱼', '适合多人'],
      description: '市区口碑很好的酸菜鱼店，人均 60 左右。建议 3-4 人成行，能点多几道菜。周末排队约 20 分钟，可提前取号。',
      image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=800&q=80'
    }
  }
]

export default {
  data() {
    return {
      post: null
    }
  },
  onLoad(options) {
    const id = Number(options.id)
    this.post = POSTS.find(p => p.id === id) || null
  },
  methods: {
    goBack() {
      uni.navigateBack()
    },
    toggleJoin() {
      if (!this.post) return
      this.post.joined = !this.post.joined
      uni.showToast({
        title: this.post.joined ? '已发送约饭请求' : '已取消约饭请求',
        icon: 'none',
        duration: 1500
      })
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

/* 返回 */
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
