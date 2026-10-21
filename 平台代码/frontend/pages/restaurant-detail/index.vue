<template>
  <view class="page" v-if="restaurant"
    ><image
      class="hero"
      :src="image"
      mode="aspectFill"
      @error="image = placeholder"
    /><text class="heading">{{ restaurant.name }}</text
    ><picker
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
    ><text class="line"
      >推荐菜：{{ restaurant.recommendedDishes || "待补充" }}</text
    ><text v-if="restaurant.correctionNote" class="line">已核验信息：{{restaurant.correctionNote}}（地址修正后距离待重新补全）</text><text class="line">人数建议：{{ restaurant.partySize || "待补充" }}</text
    ><text class="line">预约提示：{{ restaurant.bookingNote || "待补充" }}</text
    ><button @tap="correction">餐厅信息有误？反馈纠错</button><button @tap="map">查看地图</button
    ><button @tap="wishlist">想去 / 取消想去</button
    ><button @tap="visited">记录去过</button
    ><button class="primary" @tap="create">在此店发起饭局</button
    ><text class="heading small">在这家店组队</text
    ><view
      v-for="meal in meals"
      :key="meal.id"
      class="meal"
      @tap="detail(meal.id)"
      >{{ meal.title }} · {{ meal.currentPeople }}/{{ meal.maxPeople }}人</view
    ></view
  ><view v-else class="page" @tap="load">{{ error || "加载中…" }}</view>
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
      image: "",
      placeholder: "/static/restaurant-placeholder.svg",
    };
  },
  onLoad(q) {
    this.id = q.id;
    this.campus = q.campus || "cufe_shahe";
    this.load();
  },
  methods: {
    correction(){uni.navigateTo({url:'/pages/support/index?tab=feedback&restaurantId='+encodeURIComponent(this.id)})},
    async load() {
      try {
        const data = await request(
          `/restaurants/${encodeURIComponent(this.id)}?campus=${this.campus}${this.poiId ? "&poiId=" + encodeURIComponent(this.poiId) : ""}`,
        );
        this.restaurant = data.restaurant;
        this.image = this.restaurant.photoUrl || this.placeholder;
        this.meals = (
          await request("/meals?restaurantId=" + encodeURIComponent(this.id))
        ).items;
      } catch (e) {
        this.error = e.message || "加载失败，点击重试";
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
.page {
  padding: 32rpx;
}
.hero {
  width: 100%;
  height: 360rpx;
  border-radius: 24rpx;
  background: #f7f2e8;
}
.heading {
  display: block;
  font-size: 40rpx;
  font-weight: 700;
  margin: 24rpx 0;
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
  background: #faf7ed;
  margin: 20rpx 0;
  border-radius: 16rpx;
}
.primary {
  background: #ffe388;
}
.page button {
  margin: 18rpx 0;
}
</style>
