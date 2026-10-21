<template>
  <view>
    <view v-if="showSearch" class="search-row"
      ><input
        v-model="keyword"
        placeholder="搜索餐厅、菜系、推荐菜"
        @input="scheduleSearch"
        @confirm="reset"
      /><button size="mini" @tap="clear">清空</button></view
    >
    <view class="browser-heading"
      ><view
        ><text class="browser-title">今天吃什么？</text
        ><text class="browser-subtitle"
          >附近好吃的 · 群友推荐 ·
          {{ sortIndex ? "按直线距离排序" : "按群内热度排序" }}</text
        ></view
      ><text class="browser-more" @tap="allRestaurants">全部 ›</text></view
    >
    <view class="filters">
      <picker :range="campuses" range-key="name" @change="chooseCampus"
        ><view :class="['chip', { chosen: campusIndex === 0 }]"
          >{{ campuses[campusIndex].name }}⌄</view
        ></picker
      >
      <view class="chip" @tap="panel = panel === 'cuisine' ? '' : 'cuisine'"
        >{{ cuisines.length ? "品类(" + cuisines.length + ")" : "品类" }}⌄</view
      >
      <picker :range="sorts" range-key="name" @change="chooseSort"
        ><view class="chip"
          >{{ sortIndex ? "距离最近" : "排序" }}⌄</view
        ></picker
      >
      <view class="chip" @tap="panel = panel === 'filter' ? '' : 'filter'"
        >{{ tags.length || maxDistance ? "已筛选" : "筛选" }}⌄</view
      >
    </view>
    <view v-if="panel" class="filter-panel">
      <text v-if="panel === 'cuisine'">菜系（可多选）</text>
      <view class="tags" v-if="panel === 'cuisine'"
        ><text
          v-for="value in facets.cuisines"
          :key="value"
          :class="['chip', { chosen: cuisines.includes(value) }]"
          @tap="toggle(cuisines, value)"
          >{{ value }}</text
        ></view
      >
      <view v-else>
        <text>直线距离</text
        ><view class="tags"
          ><text
            v-for="distance in [0, 1, 3, 5, 10, 20]"
            :key="distance"
            :class="['chip', { chosen: maxDistance === distance }]"
            @tap="maxDistance = distance"
            >{{ distance ? distance + "km以内" : "不限" }}</text
          ></view
        >
        <text>就餐场景（可多选）</text
        ><view class="tags"
          ><text
            v-for="tag in facets.tags.scene"
            :key="tag"
            :class="['chip', { chosen: tags.includes(tag) }]"
            @tap="toggle(tags, tag)"
            >{{ tag }}</text
          ></view
        >
      </view>
      <button size="mini" @tap="applyFilters">应用</button
      ><button size="mini" @tap="resetFilters">重置筛选</button>
    </view>
    <text class="result-count" v-if="!loading && !error"
      >{{ total }} 家餐厅 · {{ campuses[campusIndex].name }} ·
      距离为直线距离</text
    >
    <view v-if="loading && !items.length" class="skeleton-list"
      ><view v-for="n in 3" :key="n" class="skeleton-card"
        ><view class="skeleton-image" /><view class="skeleton-lines"
          ><view /><view /><view /></view></view
    ></view>
    <view
      v-for="item in items"
      :key="item.id"
      class="restaurant"
      @tap="open(item)"
    >
      <LazyRestaurantImage
        :src="item.image"
        @error="item.image = placeholder"
      />
      <view class="info"
        ><text class="name">{{ item.name }}</text
        ><text class="muted address">{{
          item.fullAddress || "地址待补充"
        }}</text
        ><view class="card-footer"
          ><text class="distance">{{ distanceText(item) }}</text
          ><text class="cuisine">{{ item.cuisine || "群友推荐" }}</text></view
        ></view
      >
    </view>
    <view v-if="error && !items.length" class="browser-empty"
      ><view class="empty-symbol">!</view
      ><text class="empty-title">餐厅暂时没有加载出来</text
      ><text class="empty-description"
        >请确认后端已启动，再检查接口地址和微信工具的本地网络设置。</text
      ><button class="retry-button" @tap="loadMore(true)">
        重新加载
      </button></view
    >
    <view v-else-if="!loading && !error && !items.length" class="browser-empty"
      ><view class="empty-symbol">⌕</view
      ><text class="empty-title">没找到符合条件的餐厅</text
      ><text class="empty-description">换个关键词，或放宽距离和品类试试。</text
      ><button class="retry-button" @tap="clearAll">
        清空搜索与筛选
      </button></view
    >
    <view v-if="items.length" class="footer" @tap="loadMore(true)">{{
      loading
        ? "加载中…"
        : error
          ? "加载失败，点击重试"
          : hasMore
            ? "下滑或点击加载更多"
            : "已经到底啦"
    }}</view>
  </view>
</template>
<script>
import { request } from "../services/api";
import LazyRestaurantImage from "./LazyRestaurantImage.vue";
export default {
  components: { LazyRestaurantImage },
  props: {
    initialSize: { type: Number, default: 12 },
    showSearch: { type: Boolean, default: true },
  },
  emits: ["campus-change", "keyword-clear"],
  data() {
    return {
      keyword: "",
      campusIndex: 0,
      sortIndex: 0,
      cuisines: [],
      tags: [],
      maxDistance: 0,
      panel: "",
      page: 1,
      items: [],
      total: 0,
      hasMore: true,
      loading: false,
      error: false,
      sequence: 0,
      timer: null,
      placeholder: "/static/restaurant-placeholder.png",
      facets: { cuisines: [], tags: { scene: [] } },
      campuses: [
        { name: "全校", code: "" },
        { name: "沙河校区", code: "cufe_shahe" },
        { name: "学院南路校区", code: "cufe_nanlu" },
      ],
      sorts: [
        { name: "群内热度", code: "mention-desc" },
        { name: "距离最近", code: "distance-asc" },
      ],
    };
  },
  async mounted() {
    try {
      this.facets = await request("/restaurants/facets");
    } catch {}
    this.reset();
  },
  beforeUnmount() {
    clearTimeout(this.timer);
    this.sequence++;
  },
  methods: {
    allRestaurants() {
      uni.navigateTo({ url: "/pages/restaurant-list/index" });
    },
    setKeyword(value, immediate = false) {
      this.keyword = value;
      if (immediate) this.reset();
      else this.scheduleSearch();
    },
    cycleCampus() {
      this.campusIndex = (this.campusIndex + 1) % this.campuses.length;
      this.$emit("campus-change", this.campuses[this.campusIndex].name);
      this.reset();
    },
    setSort(index) {
      this.sortIndex = index;
      this.reset();
    },
    clearAll() {
      this.keyword = "";
      this.cuisines = [];
      this.tags = [];
      this.maxDistance = 0;
      this.$emit("keyword-clear");
      this.reset();
    },
    toggle(list, value) {
      const i = list.indexOf(value);
      if (i < 0) list.push(value);
      else list.splice(i, 1);
    },
    chooseCampus(e) {
      this.campusIndex = Number(e.detail.value);
      this.$emit("campus-change", this.campuses[this.campusIndex].name);
      this.reset();
    },
    chooseSort(e) {
      this.sortIndex = Number(e.detail.value);
      this.reset();
    },
    applyFilters() {
      this.panel = "";
      this.reset();
    },
    resetFilters() {
      this.cuisines = [];
      this.tags = [];
      this.maxDistance = 0;
      this.applyFilters();
    },
    scheduleSearch() {
      clearTimeout(this.timer);
      this.sequence++;
      this.loading = false;
      this.timer = setTimeout(() => this.reset(), 300);
    },
    clear() {
      this.keyword = "";
      this.reset();
    },
    reset() {
      clearTimeout(this.timer);
      this.sequence++;
      this.loading = false;
      this.error = false;
      this.items = [];
      this.page = 1;
      this.hasMore = true;
      return this.loadMore();
    },
    async loadMore(force = false) {
      if (this.loading || !this.hasMore || (this.error && !force)) return;
      const sequence = this.sequence;
      this.loading = true;
      this.error = false;
      const size = this.page === 1 ? this.initialSize : 12;
      // 首页固定6条一页，完整列表固定12条一页；同一列表不能中途换页大小，否则会跳过记录。
      const params = [
        `page=${this.page}`,
        `pageSize=${this.initialSize === 6 ? 6 : size}`,
        `campus=${this.campuses[this.campusIndex].code}`,
        `sortBy=${this.sorts[this.sortIndex].code}`,
        `keyword=${encodeURIComponent(this.keyword)}`,
      ];
      this.cuisines.forEach((x) =>
        params.push(`cuisine=${encodeURIComponent(x)}`),
      );
      this.tags.forEach((x) => params.push(`tag=${encodeURIComponent(x)}`));
      if (this.maxDistance) params.push(`maxDistance=${this.maxDistance}`);
      try {
        const data = await request("/restaurants?" + params.join("&"));
        if (sequence !== this.sequence) return;
        this.items.push(
          ...data.items.map((x) => ({
            ...x,
            image: x.photoUrl || this.placeholder,
          })),
        );
        this.total = data.total;
        this.hasMore = data.hasMore;
        this.page++;
      } catch (e) {
        if (sequence === this.sequence) {
          this.error = true;
        }
      } finally {
        if (sequence === this.sequence) this.loading = false;
      }
    },
    distanceText(item) {
      const code = this.campuses[this.campusIndex].code;
      const values = Object.values(item.distanceKm || {}).filter(
        Number.isFinite,
      );
      const distance = code
        ? item.distanceKm?.[code]
        : values.length
          ? Math.min(...values)
          : null;
      return Number.isFinite(distance)
        ? `直线 ${distance.toFixed(1)} km`
        : "距离待补充";
    },
    open(item) {
      uni.navigateTo({
        url: `/pages/restaurant-detail/index?id=${encodeURIComponent(item.id)}&campus=${this.campuses[this.campusIndex].code}`,
      });
    },
  },
};
</script>
<style scoped>
.search-row,
.filters,
.tags {
  display: flex;
  gap: 16rpx;
  align-items: center;
}
.search-row {
  border: 1rpx solid #ededf2;
  padding: 18rpx 22rpx;
  border-radius: 44rpx;
  margin-bottom: 36rpx;
}
.search-row input {
  flex: 1;
  min-width: 0;
}
.filters {
  margin: 28rpx 0 20rpx;
  gap: 18rpx;
}
.chip {
  display: inline-block;
  padding: 15rpx 24rpx;
  border: 1rpx solid #e6e7ec;
  border-radius: 28rpx;
  font-size: 24rpx;
  font-weight: 700;
}
.chosen {
  background: #fffdf0;
  border-color: #08091f;
  box-shadow: inset 0 -5rpx 0 rgba(255, 231, 51, 0.8);
}
.filter-panel {
  padding: 24rpx;
  background: #faf7f0;
  border-radius: 18rpx;
  margin-bottom: 20rpx;
}
.tags {
  flex-wrap: wrap;
  margin: 12rpx 0;
}
.restaurant {
  display: flex;
  gap: 0;
  margin: 0 0 20rpx;
  border: 1rpx solid #f0f0f5;
  border-radius: 24rpx;
  overflow: hidden;
  box-shadow: 0 7rpx 22rpx rgba(8, 9, 31, 0.04);
}
.restaurant image {
  width: 190rpx;
  height: 190rpx;
  border-radius: 20rpx;
  background: #f7f2e8;
  flex-shrink: 0;
}
.info {
  min-width: 0;
  flex: 1;
  padding: 22rpx;
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.name {
  display: block;
  font-size: 28rpx;
  font-weight: 800;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.muted {
  font-size: 24rpx;
  color: #888;
}
.address {
  display: block;
  margin: 12rpx 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.distance {
  color: #e6782f;
  font-size: 22rpx;
  font-weight: 700;
}
.tag {
  background: #fff4cf;
  padding: 4rpx 10rpx;
  font-size: 21rpx;
  border-radius: 8rpx;
}
.footer {
  text-align: center;
  padding: 36rpx;
  color: #888;
  font-size: 26rpx;
}
.browser-heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.browser-title {
  display: block;
  font-size: 38rpx;
  font-weight: 900;
  line-height: 1.4;
}
.browser-subtitle {
  display: block;
  margin-top: 10rpx;
  font-size: 24rpx;
  color: #8e8f98;
}
.browser-more {
  font-size: 24rpx;
  color: #737581;
  padding: 12rpx;
}
.result-count {
  display: block;
  color: #a0a1aa;
  font-size: 21rpx;
  margin: 8rpx 0 22rpx;
}
.card-footer {
  display: flex;
  justify-content: space-between;
  gap: 12rpx;
  margin-top: 14rpx;
}
.cuisine {
  color: #777984;
  font-size: 22rpx;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  max-width: 40%;
}
.browser-empty {
  text-align: center;
  padding: 50rpx 28rpx 60rpx;
  background: #fafafc;
  border-radius: 24rpx;
  margin: 28rpx 0;
}
.empty-symbol {
  font-size: 36rpx;
  font-weight: 800;
  border: 2rpx solid #dcdde4;
  width: 68rpx;
  height: 68rpx;
  border-radius: 50%;
  line-height: 68rpx;
  color: #9a9ca8;
  margin: 0 auto 22rpx;
}
.empty-title {
  display: block;
  font-size: 29rpx;
  font-weight: 700;
}
.empty-description {
  display: block;
  font-size: 24rpx;
  color: #8e8f98;
  line-height: 1.7;
  margin: 16rpx 0 28rpx;
}
.retry-button {
  font-size: 25rpx;
  background: #fff;
  border: 1rpx solid #dedee7;
  border-radius: 35rpx;
  padding: 15rpx 30rpx;
  display: inline-flex;
}
.skeleton-card {
  display: flex;
  gap: 24rpx;
  margin: 20rpx 0;
  height: 180rpx;
  border: 1rpx solid #f0f0f5;
  border-radius: 24rpx;
  overflow: hidden;
}
.skeleton-image {
  width: 204rpx;
  background: #f0f0f4;
}
.skeleton-lines {
  padding: 25rpx 0;
  flex: 1;
}
.skeleton-lines view {
  height: 20rpx;
  border-radius: 8rpx;
  background: #f3f3f6;
  width: 80%;
  margin: 0 0 20rpx;
}
.skeleton-lines view:last-child {
  width: 50%;
}
</style>
