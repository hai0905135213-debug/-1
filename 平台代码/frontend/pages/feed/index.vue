<template>
  <view class="feed-page"
    ><view class="feed-title-row"
      ><text class="page-title">动态</text
      ><text class="muted" @tap="load">刷新 ↻</text></view
    ><view class="feed-tabs"
      ><text class="feed-selected">校园推荐</text
      ><text class="muted">同学真实发布的找人动态</text></view
    ><scroll-view scroll-x class="feed-categories"
      ><view class="pill-row"
        ><view
          v-for="c in categories"
          :key="c"
          :class="['pill', { active: category === c }]"
          @tap="category = c"
          >{{ c }}</view
        ></view
      ></scroll-view
    ><view v-if="loading && !posts.length" class="state-box"
      >正在加载校园动态…</view
    ><view v-if="error" class="state-box"
      ><text class="state-title">动态暂时没有加载出来</text
      ><text>{{ error }}</text
      ><button class="button-quiet" @tap="load">重新加载</button></view
    ><view v-for="p in filtered" :key="p.id"
      ><PostCard v-if="p && p.id != null" :post="p" @open="open" /></view
    ><view v-if="!loading && !error && !filtered.length" class="state-box"
      ><text class="state-title">第一顿饭，从你开始</text
      ><text>还没有真实动态。发起饭局后，可以在详情页发布到找人。</text
      ><button class="button-primary" @tap="create">发起一场饭局</button></view
    ><AppTabBar active="feed"
  /></view>
</template>
<script>
import { request } from "../../services/api";
import AppTabBar from "../../components/AppTabBar.vue";
import PostCard from "../../components/PostCard.vue";
export default {
  components: { AppTabBar, PostCard },
  data() {
    return { posts: [], category: "全部", loading: false, error: "" };
  },
  computed: {
    categories() {
      return [
        "全部",
        ...new Set(this.posts.map((p) => p.category).filter(Boolean)),
      ];
    },
    filtered() {
      return this.category === "全部"
        ? this.posts
        : this.posts.filter((p) => p.category === this.category);
    },
  },
  onShow() {
    uni.hideTabBar({ animation: false, fail: () => {} });
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
        this.posts = (await request("/posts")).items;
        if (!this.categories.includes(this.category)) this.category = "全部";
      } catch (e) {
        this.error = e.message || "加载失败，请重试";
      } finally {
        this.loading = false;
      }
    },
    open(id) {
      uni.navigateTo({ url: "/pages/meal-detail/index?id=" + id });
    },
    create() {
      uni.switchTab({ url: "/pages/create-meal/index" });
    },
  },
};
</script>
<style scoped>
.feed-page {
  padding: 46rpx 36rpx calc(180rpx + env(safe-area-inset-bottom));
  min-height: 100vh;
  box-sizing: border-box;
}
.feed-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 35rpx;
}
.feed-title-row .muted {
  font-size: 24rpx;
}
.feed-tabs {
  display: flex;
  align-items: center;
  gap: 30rpx;
  margin-bottom: 28rpx;
}
.feed-selected {
  font-size: 34rpx;
  font-weight: 900;
  padding: 0 0 12rpx;
  border-bottom: 7rpx solid #ffe733;
}
.feed-tabs .muted {
  font-size: 22rpx;
}
.feed-categories {
  white-space: nowrap;
  margin: 10rpx 0;
}
.feed-categories .pill {
  font-size: 24rpx;
  min-width: 102rpx;
  height: 60rpx;
  padding: 0 22rpx;
}
</style>
