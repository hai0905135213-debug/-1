<template>
  <view class="page"
    ><text class="heading">体验资格管理</text
    ><view v-for="user in users" :key="user.id" class="card"
      ><text>{{ user.id }} · {{ user.nickname }} · {{ user.accessStatus }}</text
      ><view class="row"
        ><button size="mini" @tap="access(user, 'approved')">通过</button
        ><button size="mini" @tap="access(user, 'blocked')">停用</button></view
      ></view
    ><text class="heading">举报待处理</text
    ><view v-for="report in reports" :key="report.id" class="card"
      ><text>{{ report.reason }} · {{ report.status }}</text
      ><text>{{ report.detail }}</text
      ><view class="row" v-if="report.status === 'pending'"
        ><button size="mini" @tap="resolve(report, 'resolved')">处理完成</button
        ><button size="mini" @tap="resolve(report, 'dismissed')">
          驳回举报
        </button></view
      ></view
    ><text>{{ error }}</text></view
  >
</template>
<script>
import { teamApi } from "../../services/team";
export default {
  data() {
    return { users: [], reports: [], error: "" };
  },
  onShow() {
    this.load();
  },
  methods: {
    async load() {
      try {
        this.users = (await teamApi.adminUsers()).items;
        this.reports = (await teamApi.reports()).items;
      } catch (e) {
        this.error = e.message;
      }
    },
    async access(user, status) {
      try {
        await teamApi.access(user.id, status);
        this.load();
      } catch (e) {
        this.error = e.message;
      }
    },
    async resolve(report, status) {
      uni.navigateTo({url:'/pages/support/index?tab=admin'});
    },
  },
};
</script>
<style scoped>
.page {
  padding: 36rpx;
}
.heading {
  display: block;
  font-size: 34rpx;
  font-weight: 800;
  margin: 24rpx 0;
}
.card {
  padding: 24rpx;
  background: #fff;
  border:1rpx solid #ededf2;
  border-radius: 20rpx;
  margin: 24rpx 0;
}
.row {
  display: flex;
  margin-top: 20rpx;
}
.card text {
  display: block;
}
</style>
