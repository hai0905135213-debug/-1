<template>
  <view class="page"
    ><view class="row"
      ><text class="heading">消息</text
      ><button size="mini" @tap="read">全部已读</button></view
    ><view v-for="item in items" :key="item.id" class="card" @tap="open(item)"
      ><text>{{ item.read_at ? "" : "● " }}{{ item.content }}</text
      ><text class="muted">{{ item.created_at }}</text></view
    ><button v-if="nextCursor" @tap="more">加载更多</button
    ><text v-if="!items.length">暂无消息</text><text>{{ error }}</text></view
  >
</template>
<script>
import { request } from "../../services/api";
import { teamApi } from "../../services/team";
export default {
  data() {
    return { items: [], nextCursor: null, error: "" };
  },
  onShow() {
    this.load();
  },
  methods: {
    async load() {
      try {
        const data = await teamApi.notifications();
        this.items = data.items;
        this.nextCursor = data.nextCursor;
      } catch (e) {
        this.error = e.message;
      }
    },
    async more() {
      try {
        const data = await request("/notifications?before=" + this.nextCursor);
        this.items.push(...data.items);
        this.nextCursor = data.nextCursor;
      } catch (e) {
        this.error = e.message;
      }
    },
    async read() {
      await teamApi.readNotifications();
      this.load();
    },
    open(item) {
      if (item.meal_id)
        uni.navigateTo({ url: "/pages/meal-detail/index?id=" + item.meal_id });
    },
  },
};
</script>
<style scoped>
.page {
  padding: 36rpx;
}
.row {
  display: flex;
  justify-content: space-between;
}
.heading {
  font-size: 40rpx;
  font-weight: 800;
}
.card {
  padding: 24rpx;
  background: #faf7ef;
  border-radius: 20rpx;
  margin: 24rpx 0;
}
.muted {
  display: block;
  font-size: 22rpx;
  color: #888;
  margin-top: 12rpx;
}
</style>
