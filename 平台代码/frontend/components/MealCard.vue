<template>
  <view class="meal-card" @tap="$emit('open', meal.id)"
    ><view class="meal-card-top"
      ><view class="meal-author"
        ><view class="avatar-initial">{{
          (meal.creator?.nickname || meal.creatorName || "饭")[0]
        }}</view
        ><text>{{
          meal.creator?.nickname || meal.creatorName || "同学发起"
        }}</text></view
      ><text :class="['meal-status', meal.status]">{{
        labels[meal.status] || meal.status
      }}</text></view
    ><text class="meal-title">{{ meal.title }}</text
    ><text class="meal-location">{{ meal.place }}</text
    ><view class="meal-meta"
      ><text>{{ timeText(meal.mealTime) }}</text
      ><text>{{ meal.currentPeople }}/{{ meal.maxPeople }} 人</text></view
    ><view class="meal-card-bottom"
      ><text class="meal-budget">{{ budget }}</text
      ><text class="meal-link"
        >{{
          meal.applicationStatus === "pending"
            ? "等待审批"
            : meal.status === "open"
              ? "查看饭局 · 申请加入"
              : "查看饭局"
        }}
        ›</text
      ></view
    ><view v-if="meal.pendingCount" class="pending-tip"
      >{{ meal.pendingCount }} 位同学等待审批</view
    ></view
  >
</template>
<script>
import { localTime } from "../services/time";
export default {
  props: { meal: { type: Object, required: true } },
  emits: ["open"],
  data() {
    return {
      labels: {
        open: "招募中",
        matched: "已成局",
        cancelled: "已取消",
        finished: "已完成",
      },
    };
  },
  computed: {
    budget() {
      const m = this.meal;
      return Number.isFinite(m.budgetMin) && Number.isFinite(m.budgetMax)
        ? `每人 ¥${m.budgetMin}–${m.budgetMax}`
        : "预算待确认";
    },
  },
  methods: { timeText: localTime },
};
</script>
<style scoped>
.meal-card {
  padding: 28rpx;
  margin: 0 0 22rpx;
  border: 1rpx solid #ededf2;
  border-radius: 26rpx;
  background: #fff;
  box-shadow: 0 7rpx 22rpx rgba(8, 9, 31, 0.035);
}
.meal-card-top,
.meal-author,
.meal-meta,
.meal-card-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.meal-author {
  justify-content: flex-start;
  gap: 12rpx;
  color: #737581;
  font-size: 24rpx;
}
.avatar-initial {
  width: 46rpx;
  height: 46rpx;
  background: #fff4a8;
  border-radius: 50%;
  text-align: center;
  line-height: 46rpx;
  color: #08091f;
  font-weight: 800;
}
.meal-status {
  font-size: 22rpx;
  background: #f4f4f7;
  padding: 6rpx 14rpx;
  border-radius: 12rpx;
  color: #737581;
}
.meal-status.open {
  color: #856b12;
  background: #fff7ca;
}
.meal-status.matched {
  color: #18849a;
  background: #eaf7f8;
}
.meal-title {
  display: block;
  font-size: 35rpx;
  line-height: 1.5;
  font-weight: 800;
  margin: 24rpx 0 10rpx;
}
.meal-location {
  display: block;
  color: #737581;
  font-size: 25rpx;
  line-height: 1.6;
}
.meal-meta {
  font-size: 23rpx;
  color: #8e8f98;
  margin: 17rpx 0 24rpx;
}
.meal-card-bottom {
  padding-top: 20rpx;
  border-top: 1rpx solid #f0f0f5;
}
.meal-budget {
  font-size: 24rpx;
  font-weight: 700;
  color: #e6782f;
}
.meal-link {
  font-size: 24rpx;
  font-weight: 700;
}
.pending-tip {
  font-size: 23rpx;
  color: #18849a;
  margin-top: 18rpx;
}
</style>
