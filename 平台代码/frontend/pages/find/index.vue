<template>
  <view class="find-page"
    ><view class="find-top"
      ><text class="page-title">找人</text
      ><text class="muted">发现值得一起吃的饭搭子</text></view
    ><view class="find-search"
      ><text class="search-mark">⌕</text
      ><input v-model="keyword" placeholder="搜索饭局、地点或找人帖子" /></view
    ><view class="find-tabs"
      ><text :class="{ selected: mode === 'meals' }" @tap="mode = 'meals'"
        >预约组队</text
      ><text :class="{ selected: mode === 'posts' }" @tap="mode = 'posts'"
        >找人帖子</text
      ><text class="mine-link" @tap="mine">我的报名 ›</text></view
    ><scroll-view scroll-x class="category-scroll"
      ><view class="category-row"
        ><view
          v-for="c in categories"
          :key="c"
          :class="['pill', { active: category === c }]"
          @tap="category = c"
          >{{ c }}</view
        ></view
      ></scroll-view
    ><view v-if="chatMode === 'quiet'" class="quiet-filter" @tap="chatMode = ''"
      >安静吃饭 · 点击清除 ×</view
    ><view v-if="loading" class="state-box">正在找好饭局…</view
    ><view v-else-if="error" class="state-box"
      ><text class="state-title">暂时没连上</text><text>{{ error }}</text
      ><button class="button-quiet" @tap="load">重新加载</button></view
    ><view v-else-if="mode === 'meals'"
      ><MealCard
        v-for="meal in filteredMeals"
        :key="meal.id"
        :meal="meal"
        @open="open"
      /><view v-if="!filteredMeals.length" class="state-box"
        ><text class="state-title">还没有合适的饭局</text
        ><text>可以换个关键词，或发起自己想吃的那顿饭。</text
        ><button class="button-quiet" @tap="create">发起饭局</button></view
      ></view
    ><view v-else
      ><PostCard
        v-for="post in filteredPosts"
        :key="post.id"
        :post="post"
        @open="open"
      /><view v-if="!filteredPosts.length" class="state-box"
        ><text class="state-title">这里还没有找人帖子</text
        ><text>发布饭局后，可以从详情页分享到找人。</text></view
      ></view
    ><view class="find-fab" @tap="create">＋</view><AppTabBar active="find"
  /></view>
</template>
<script>
import { mealApi, postApi } from "../../services/api";
import MealCard from "../../components/MealCard.vue";
import PostCard from "../../components/PostCard.vue";
import AppTabBar from "../../components/AppTabBar.vue";
export default {
  components: { MealCard, PostCard, AppTabBar },
  data() {
    return {
      meals: [],
      posts: [],
      mode: "meals",
      chatMode: "",
      keyword: "",
      category: "全部",
      loading: false,
      error: "",
      categories: ["全部", "约饭", "探店", "夜宵", "拼桌", "咖啡"],
    };
  },
  computed: {
    filteredMeals() {
      const key = this.keyword.trim().toLowerCase();
      return this.meals.filter(
        (m) =>
          (!this.chatMode || m.chatMode === this.chatMode) &&
          (!key ||
            [m.title, m.place, ...(m.topicTags || [])]
              .join(" ")
              .toLowerCase()
              .includes(key)) &&
          (this.category === "全部" ||
            this.category === "约饭" ||
            (m.topicTags || []).includes(this.category)),
      );
    },
    filteredPosts() {
      const key = this.keyword.trim().toLowerCase();
      return this.posts.filter(
        (p) =>
          (this.category === "全部" || p.category === this.category) &&
          (!key ||
            [p.content, p.author?.nickname, p.meal?.title, p.meal?.place]
              .join(" ")
              .toLowerCase()
              .includes(key)),
      );
    },
  },
  onShow() {
    uni.hideTabBar({ animation: false, fail: () => {} });
    if (uni.getStorageSync("findChatMode") === "quiet") {
      this.chatMode = "quiet";
      this.mode = "meals";
      uni.removeStorageSync("findChatMode");
    }
    this.load();
  },
  onPullDownRefresh() {
    this.load().finally(() => uni.stopPullDownRefresh());
  },
  methods: {
    async load() {
      if (this.loading) return;
      this.loading = true;
      this.error = "";
      try {
        const [m, p] = await Promise.all([
          mealApi.list({ onlyAvailable: "true" }),
          postApi.list(),
        ]);
        this.meals = m.items;
        this.posts = p.items;
      } catch (e) {
        this.error = e.message || "检查后端连接后重试";
      } finally {
        this.loading = false;
      }
    },
    open(id) {
      uni.navigateTo({ url: "/pages/meal-detail/index?id=" + id });
    },
    mine() {
      uni.navigateTo({ url: "/pages/my-meals/index" });
    },
    create() {
      uni.switchTab({ url: "/pages/create-meal/index" });
    },
  },
};
</script>
<style scoped>
.find-page {
  padding: 46rpx 36rpx calc(180rpx + env(safe-area-inset-bottom));
  min-height: 100vh;
  box-sizing: border-box;
}
.find-top {
  display: flex;
  align-items: baseline;
  gap: 24rpx;
  margin-bottom: 35rpx;
}
.find-top .muted {
  font-size: 23rpx;
}
.find-search {
  display: flex;
  align-items: center;
  gap: 18rpx;
  border-radius: 28rpx;
  background: #f5f5f8;
  padding: 19rpx 24rpx;
}
.find-search input {
  font-size: 26rpx;
  flex: 1;
}
.search-mark {
  font-size: 34rpx;
  color: #8e8f98;
}
.find-tabs {
  display: flex;
  align-items: center;
  gap: 32rpx;
  margin: 34rpx 0 24rpx;
  font-size: 28rpx;
  color: #8e8f98;
}
.find-tabs .selected {
  color: #08091f;
  font-weight: 800;
  border-bottom: 6rpx solid #ffe733;
  padding-bottom: 10rpx;
}
.mine-link {
  margin-left: auto;
  font-size: 23rpx;
  color: #737581;
}
.category-scroll {
  white-space: nowrap;
  margin-bottom: 26rpx;
}
.category-row {
  display: flex;
  gap: 16rpx;
  padding-bottom: 8rpx;
}
.category-row .pill {
  min-width: 100rpx;
  padding: 0 22rpx;
  font-size: 24rpx;
  height: 60rpx;
  flex-shrink: 0;
}
.find-fab {
  position: fixed;
  right: 34rpx;
  bottom: calc(180rpx + env(safe-area-inset-bottom));
  width: 92rpx;
  height: 92rpx;
  border-radius: 50%;
  background: #ffe733;
  border: 6rpx solid #fff;
  box-shadow: 0 10rpx 30rpx rgba(8, 9, 31, 0.13);
  font-size: 48rpx;
  text-align: center;
  line-height: 90rpx;
  z-index: 30;
}
.quiet-filter {
  padding: 18rpx 24rpx;
  background: #fff9dc;
  border-radius: 16rpx;
  margin-bottom: 24rpx;
  font-size: 24rpx;
  color: #8d7738;
}
</style>
