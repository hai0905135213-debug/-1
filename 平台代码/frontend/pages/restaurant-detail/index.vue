<template>
  <view class="restaurant-page" v-if="restaurant"
    ><image
      class="hero"
      :src="image"
      mode="aspectFill"
      @error="image = placeholder"
    /><view class="restaurant-panel"
      ><text class="restaurant-eyebrow"
        >群友推荐 · {{ restaurant.cuisine || "校园周边" }}</text
      ><text class="heading">{{ restaurant.name }}</text
      ><picker
        :disabled="loading"
        v-if="restaurant.candidates?.length"
        :range="restaurant.candidates"
        range-key="name"
        @change="branch"
        ><view class="selection"
          >分店：{{ restaurant.selectedCandidate?.name || "选择分店" }} ⌄</view
        ></picker
      ><text class="line">{{
        restaurant.fullAddress || restaurant.location || "地址待补充"
      }}</text
      ><text class="line muted"
        >沙河直线 {{ distance("cufe_shahe") }} · 学院南路直线
        {{ distance("cufe_nanlu") }}</text
      ><view class="recommendation-box"
        ><text class="detail-label">大家推荐的菜</text
        ><text class="recommendation-text">{{
          restaurant.recommendedDishes || "推荐菜待补充"
        }}</text></view
      ><text v-if="restaurant.correctionNote" class="notice-banner"
        >已核验信息：{{
          restaurant.correctionNote
        }}（地址修正后距离待重新补全）</text
      ><view class="info-row"
        ><text class="detail-label">适合人数</text
        ><text>{{ restaurant.partySize || "待补充" }}</text></view
      ><view class="info-row"
        ><text class="detail-label">预约提示</text
        ><text>{{ restaurant.bookingNote || "待补充" }}</text></view
      ><view class="restaurant-actions"
        ><button :disabled="loading" @tap="map">地图 ↗</button
        ><button :disabled="loading" @tap="wishlist">♡ 想去</button
        ><button :disabled="loading" @tap="visited">✓ 去过</button></view
      ><text class="correction-link" @tap="correction"
        >信息有误？反馈纠错 ›</text
      ><text v-if="error" class="notice-banner">{{ error }}</text
      ><text class="heading small">在这家店组队</text
      ><view
        v-for="meal in meals"
        :key="meal.id"
        class="meal"
        @tap="detail(meal.id)"
        >{{ meal.title }} · {{ meal.currentPeople }}/{{
          meal.maxPeople
        }}人</view
      ><view v-if="!meals.length" class="state-box"
        >这家店还没有饭局，约个同学一起吃吧。</view
      ></view
    ><view class="restaurant-bottom"
      ><button :disabled="loading" class="button-primary" @tap="create">
        {{ loading ? "正在切换分店…" : "＋ 在此店发起饭局" }}
      </button></view
    ></view
  ><view v-else class="page"
    ><view class="state-box"
      ><text class="state-title">{{
        error ? "餐厅暂时没有加载出来" : "正在寻找这家店…"
      }}</text
      ><text v-if="error">{{ error }}</text
      ><button v-if="error" class="button-quiet" @tap="load">
        重新加载
      </button></view
    ></view
  >
</template>
<script>
import { request } from "../../services/api";
export default {
  data() {
    return {
      id: "",
      campus: "cufe_shahe",
      poiId: "",
      restaurant: null,
      meals: [],
      error: "",
      loading: false,
      sequence: 0,
      image: "",
      placeholder: "/static/restaurant-placeholder.png",
    };
  },
  onLoad(q) {
    this.id = q.id;
    this.campus = q.campus || "cufe_shahe";
    this.load();
  },
  methods: {
    correction() {
      uni.navigateTo({
        url:
          "/pages/support/index?tab=feedback&restaurantId=" +
          encodeURIComponent(this.id),
      });
    },
    async load() {
      const sequence = ++this.sequence;
      this.loading = true;
      this.error = "";
      try {
        const data = await request(
          `/restaurants/${encodeURIComponent(this.id)}?campus=${this.campus}${this.poiId ? "&poiId=" + encodeURIComponent(this.poiId) : ""}`,
        );
        if (sequence !== this.sequence) return;
        this.restaurant = data.restaurant;
        this.image = this.restaurant.photoUrl || this.placeholder;
        const meals = await request(
          "/meals?restaurantId=" + encodeURIComponent(this.id),
        );
        if (sequence === this.sequence) this.meals = meals.items;
      } catch (e) {
        if (sequence === this.sequence)
          this.error = e.message || "加载失败，点击重试";
      } finally {
        if (sequence === this.sequence) this.loading = false;
      }
    },
    branch(e) {
      this.poiId = this.restaurant.candidates[Number(e.detail.value)].poiId;
      this.load();
    },
    distance(code) {
      const n = this.restaurant.distanceKm?.[code];
      return Number.isFinite(n) ? n.toFixed(1) + "km" : "待补充";
    },
    map() {
      const [longitude, latitude] = String(
        this.restaurant.selectedCandidate?.location || "",
      )
        .split(",")
        .map(Number);
      if (!Number.isFinite(longitude) || !Number.isFinite(latitude))
        return uni.showToast({ title: "坐标待补充", icon: "none" });
      uni.openLocation({
        longitude,
        latitude,
        name: this.restaurant.selectedCandidate?.name || this.restaurant.name,
        address: this.restaurant.fullAddress,
      });
    },
    async wishlist() {
      try {
        await request("/profile/wishlist", {
          method: "POST",
          data: { restaurantId: this.id, restaurantName: this.restaurant.name },
        });
        uni.showToast({ title: "已更新想去", icon: "none" });
      } catch (e) {
        uni.showToast({ title: e.message, icon: "none" });
      }
    },
    async visited() {
      try {
        await request("/profile/visited", {
          method: "POST",
          data: { restaurantId: this.id, restaurantName: this.restaurant.name },
        });
        uni.showToast({ title: "已记录去过" });
      } catch (e) {
        uni.showToast({ title: e.message, icon: "none" });
      }
    },
    create() {
      if (this.loading) return;
      uni.setStorageSync("mealDraftVenue", {
        restaurantId: this.id,
        poiId: this.restaurant.selectedCandidate?.poiId,
        campus: this.campus,
        name: this.restaurant.name,
      });
      uni.switchTab({ url: "/pages/create-meal/index" });
    },
    detail(id) {
      uni.navigateTo({ url: "/pages/meal-detail/index?id=" + id });
    },
  },
};
</script>
<style scoped>
.restaurant-page {
  padding: 0 0 calc(150rpx + env(safe-area-inset-bottom));
}
.hero {
  width: 100%;
  height: 430rpx;
  display: block;
  background: #f1f2f5;
}
.heading {
  display: block;
  font-size: 44rpx;
  font-weight: 900;
  margin: 18rpx 0 26rpx;
}
.small {
  font-size: 30rpx;
}
.line {
  display: block;
  margin: 24rpx 0;
  line-height: 1.7;
}
.muted {
  color: #888;
  font-size: 25rpx;
}
.selection,
.meal {
  padding: 24rpx;
  background: #f7f7fa;
  margin: 20rpx 0;
  border-radius: 16rpx;
}
.primary {
  background: #ffe733;
}
.page button {
  margin: 18rpx 0;
}
.restaurant-panel {
  position: relative;
  border-radius: 36rpx 36rpx 0 0;
  margin-top: -26rpx;
  background: #fff;
  padding: 36rpx;
}
.restaurant-eyebrow {
  font-size: 23rpx;
  color: #8e8f98;
}
.recommendation-box {
  background: #fffbed;
  padding: 26rpx;
  border-radius: 22rpx;
  margin: 30rpx 0;
}
.detail-label {
  font-size: 24rpx;
  color: #8e8f98;
  display: block;
  margin-bottom: 12rpx;
}
.recommendation-text {
  font-size: 29rpx;
  font-weight: 700;
  line-height: 1.8;
}
.info-row {
  display: flex;
  gap: 30rpx;
  font-size: 27rpx;
  line-height: 1.8;
  padding: 22rpx 0;
  border-bottom: 1rpx solid #f0f0f5;
}
.info-row .detail-label {
  min-width: 110rpx;
  flex-shrink: 0;
  margin: 0;
}
.restaurant-actions {
  display: flex;
  gap: 18rpx;
  margin: 32rpx 0 24rpx;
}
.restaurant-actions button {
  flex: 1;
  font-size: 25rpx;
  line-height: 2.6;
  border: 1rpx solid #e5e6ed;
  border-radius: 34rpx;
  background: #fff;
}
.correction-link {
  display: block;
  text-align: right;
  color: #94959f;
  font-size: 23rpx;
  margin-bottom: 40rpx;
}
.restaurant-bottom {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 20rpx 36rpx calc(20rpx + env(safe-area-inset-bottom));
  background: #fff;
  border-top: 1rpx solid #f0f0f5;
  z-index: 25;
}
.restaurant-bottom .button-primary {
  box-shadow: none;
}
</style>
