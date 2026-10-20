<template>
  <view class="page"
    ><view class="top"
      ><text class="heading">找个饭搭子</text
      ><text @tap="mine">我的报名 ›</text></view
    ><view class="tabs"
      ><text :class="{ active: mode === 'meals' }" @tap="mode = 'meals'"
        >预约组队</text
      ><text :class="{ active: mode === 'posts' }" @tap="mode = 'posts'"
        >找人帖子</text
      ></view
    ><view v-if="mode === 'meals'"
      ><view
        v-for="meal in meals"
        :key="meal.id"
        class="card"
        @tap="open(meal.id)"
        ><text class="name">{{ meal.title }}</text
        ><text>{{ meal.place }}</text
        ><text class="muted"
          >{{ timeText(meal.mealTime) }} · {{ meal.currentPeople }}/{{
            meal.maxPeople
          }}人</text
        ><text class="badge">报名后由发起人审批</text></view
      ></view
    ><view v-else
      ><view
        v-for="post in posts"
        :key="post.id"
        class="card"
        @tap="post.mealId ? open(post.mealId) : null"
        ><text class="name">{{ post.author?.nickname || "同学" }}</text
        ><text>{{ post.content }}</text
        ><text class="muted">{{
          post.mealId ? "查看关联饭局并申请 ›" : "历史帖子，未关联预约饭局"
        }}</text></view
      ></view
    ><button @tap="create">发起我的饭局</button
    ><text class="error">{{ error }}</text></view
  >
</template>
<script>
import { mealApi, postApi } from "../../services/api";
import { localTime } from '../../services/time';
export default {
  data() {
    return { meals: [], posts: [], mode: "meals", error: "" };
  },
  async onShow() {
    try {
      this.meals = (await mealApi.list({ onlyAvailable: "true" })).items;
      this.posts = (await postApi.list()).items;
    } catch (e) {
      this.error = e.message;
    }
  },
  methods: {
    timeText: localTime,
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
.page {
  padding: 50rpx 32rpx;
}
.top,
.tabs {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 28rpx;
}
.heading {
  font-size: 40rpx;
  font-weight: 800;
}
.tabs {
  justify-content: flex-start;
  gap: 32rpx;
}
.active {
  border-bottom: 6rpx solid #ffe388;
}
.card {
  padding: 26rpx;
  border-radius: 20rpx;
  background: #faf7ef;
  margin: 24rpx 0;
}
.card text {
  display: block;
  margin: 12rpx 0;
  line-height: 1.6;
}
.name {
  font-size: 30rpx;
  font-weight: 700;
}
.muted {
  font-size: 24rpx;
  color: #888;
}
.badge {
  color: #a56c1f;
  font-size: 24rpx;
}
.error {
  color: #b33;
}
</style>
