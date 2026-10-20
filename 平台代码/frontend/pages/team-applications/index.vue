<template>
  <view class="page"
    ><text class="heading">报名审批</text
    ><view v-for="item in items" :key="item.id" class="card"
      ><text
        >{{ item.nickname }} · {{ item.profile?.campus || "未填写校区" }}</text
      ><text class="muted"
        >{{ item.profile?.major || "" }} {{ item.profile?.grade || "" }}</text
      ><text>{{ item.note || "没有报名说明" }}</text
      ><text class="muted">{{ labels[item.status] || item.status }}</text
      ><view v-if="item.status === 'pending'" class="row"
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
export default {
  data() {
    return {
      id: "",
      items: [],
      busy: false,
      error: "",
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
    this.load();
  },
  methods: {
    async load() {
      try {
        this.items = (await teamApi.applications(this.id)).items;
      } catch (e) {
        this.error = e.message;
      }
    },
    async decide(item, decision) {
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
