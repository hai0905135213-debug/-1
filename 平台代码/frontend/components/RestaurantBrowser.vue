<template>
  <view>
    <view class="search-row"
      ><input
        v-model="keyword"
        placeholder="搜索餐厅、菜系、推荐菜"
        @input="scheduleSearch"
        @confirm="reset"
      /><button size="mini" @tap="clear">清空</button></view
    >
    <view class="filters">
      <picker :range="campuses" range-key="name" @change="chooseCampus"
        ><view class="chip">{{ campuses[campusIndex].name }}⌄</view></picker
      >
      <view class="chip" @tap="panel = panel === 'cuisine' ? '' : 'cuisine'"
        >品类⌄</view
      >
      <picker :range="sorts" range-key="name" @change="chooseSort"
        ><view class="chip">{{ sorts[sortIndex].name }}⌄</view></picker
      >
      <view class="chip" @tap="panel = panel === 'filter' ? '' : 'filter'"
        >筛选⌄</view
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
    <text class="muted">{{ total }} 家餐厅 · 距离为直线距离</text>
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
        ><text class="distance">{{ distanceText(item) }}</text
        ><view class="tags"
          ><text
            v-for="tag in (item.tags || []).slice(0, 3)"
            :key="tag"
            class="tag"
            >{{ tag }}</text
          ></view
        ></view
      >
    </view>
    <view class="footer" @tap="loadMore">{{
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
import LazyRestaurantImage from './LazyRestaurantImage.vue';
export default {
  components: { LazyRestaurantImage },
  props: { initialSize: { type: Number, default: 12 } },
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
      placeholder: "/static/restaurant-placeholder.svg",
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
    toggle(list, value) {
      const i = list.indexOf(value);
      if (i < 0) list.push(value);
      else list.splice(i, 1);
    },
    chooseCampus(e) {
      this.campusIndex = Number(e.detail.value);
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
      this.items = [];
      this.page = 1;
      this.hasMore = true;
      return this.loadMore();
    },
    async loadMore() {
      if (this.loading || !this.hasMore) return;
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
          uni.showToast({ title: e.message || "加载失败", icon: "none" });
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
  background: #f5f5f7;
  padding: 16rpx;
  border-radius: 24rpx;
}
.search-row input {
  flex: 1;
  min-width: 0;
}
.filters {
  margin: 28rpx 0;
}
.chip {
  display: inline-block;
  padding: 12rpx 18rpx;
  border: 1px solid #ddd;
  border-radius: 30rpx;
  font-size: 24rpx;
}
.chosen {
  background: #ffe78b;
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
  gap: 20rpx;
  margin: 26rpx 0;
  padding-bottom: 24rpx;
  border-bottom: 1px solid #eee;
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
}
.name {
  display: block;
  font-size: 30rpx;
  font-weight: 700;
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
  color: #b86c25;
  font-size: 24rpx;
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
</style>
