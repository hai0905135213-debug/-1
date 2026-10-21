<template>
  <view class="page"
    ><text class="heading">报名审批</text
    ><text class="muted">{{ recruitmentText }}</text
    ><text class="muted">申请不占名额；拒绝后该用户本场不能再次申请。</text
    ><button size="mini" :disabled="busy" @tap="load">刷新申请与名额</button
    ><view v-for="item in items" :key="item.id" class="card"
      ><text
        >{{ item.nickname }} · {{ item.profile?.campus || "未填写校区" }}</text
      ><text class="muted"
        >{{ item.profile?.major || "" }} {{ item.profile?.grade || "" }}</text
      ><text>{{ item.note || "没有报名说明" }}</text
      ><text class="muted"
        >口味：{{
          (item.profile?.tasteTags || []).join("、") || "未填写"
        }}</text
      ><text class="muted"
        >聊天/就餐偏好：{{
          (item.profile?.personalityTags || []).join("、") || "未填写"
        }}</text
      ><text class="muted"
        >预算偏好：{{ item.profile?.budgetPreference || "未填写" }}</text
      ><text class="muted">{{ labels[item.status] || item.status }}</text
      ><view v-if="item.status === 'pending' && canDecide" class="row"
        ><button size="mini" :disabled="busy" @tap="decide(item, 'approve')">
          通过</button
        ><button size="mini" :disabled="busy" @tap="decide(item, 'reject')">
          拒绝
        </button></view
      ></view
    ><text v-if="!items.length">暂无申请</text
    ><text class="error">{{ error }}</text></view
  >
</template>
<script>
import { teamApi } from "../../services/team";
import { mealApi } from "../../services/api";
import { recruitmentHint } from "../../services/meal-state.mjs";
export default {
  data() {
    return {
      id: "",
      items: [],
      busy: false,
      error: "",
      meal: null,
      clock: Date.now(),
      timer: null,
      labels: {
        pending: "待审批",
        approved: "已通过",
        rejected: "已拒绝",
        withdrawn: "已撤回",
        closed: "已关闭",
      },
    };
  },
  onLoad(q) {
    this.id = q.id;
  },
  onShow() {
    this.load();
    clearInterval(this.timer);
    this.timer = setInterval(() => {
      this.clock = Date.now();
      if (
        this.meal &&
        this.meal.status === "open" &&
        !this.meal.recruitmentClosed &&
        this.clock >= Date.parse(this.meal.deadline)
      )
        this.load();
    }, 10000);
  },
  onHide() {
    clearInterval(this.timer);
  },
  onUnload() {
    clearInterval(this.timer);
  },
  computed: {
    recruitmentText() {
      return recruitmentHint(this.meal, this.clock);
    },
    canDecide() {
      return (
        this.meal?.status === "open" &&
        !this.meal.recruitmentClosed &&
        this.clock < Date.parse(this.meal.deadline)
      );
    },
  },
  methods: {
    async load() {
      try {
        const [result, detail] = await Promise.all([
          teamApi.applications(this.id),
          mealApi.detail(this.id),
        ]);
        this.items = result.items;
        this.meal = detail.meal;
        this.clock = Date.now();
        this.error = "";
      } catch (e) {
        this.error = e.message;
      }
    },
    async decide(item, decision) {
      if (this.busy || !this.canDecide) return;
      if (decision === "reject") {
        const result = await new Promise((resolve) =>
          uni.showModal({
            title: "拒绝本场申请？",
            content: "拒绝后，对方本场不能重新申请。若只需等待，请暂不处理。",
            success: resolve,
            fail: () => resolve({ confirm: false }),
          }),
        );
        if (!result.confirm) return;
      }
      this.busy = true;
      try {
        await teamApi.decide(this.id, item.id, decision);
        await this.load();
      } catch (e) {
        this.error = e.message;
      } finally {
        this.busy = false;
      }
    },
  },
};
</script>
<style scoped>
.page {
  padding: 36rpx;
}
.heading {
  font-size: 38rpx;
  font-weight: 800;
}
.card {
  padding: 24rpx;
  background: #faf7ef;
  border-radius: 20rpx;
  margin: 24rpx 0;
}
.card text {
  display: block;
  margin: 12rpx 0;
}
.muted {
  font-size: 24rpx;
  color: #888;
}
.row {
  display: flex;
  gap: 20rpx;
}
.error {
  color: #b33;
}
</style>
