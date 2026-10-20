<template>
  <view class="page"
    ><text v-if="post" class="content">{{ post.content }}</text
    ><button v-if="post?.mealId" @tap="open">查看饭局并申请加入</button
    ><text v-else>{{
      error || "历史帖子未关联正式饭局，请从找人页选择预约饭局。"
    }}</text></view
  >
</template>
<script>
import { postApi } from "../../services/api";
export default {
  data() {
    return { post: null, error: "" };
  },
  async onLoad(q) {
    try {
      this.post = (await postApi.list()).items.find(
        (x) => String(x.id) === String(q.id),
      );
    } catch (e) {
      this.error = e.message;
    }
  },
  methods: {
    open() {
      uni.navigateTo({
        url: "/pages/meal-detail/index?id=" + this.post.mealId,
      });
    },
  },
};
</script>
<style scoped>
.page {
  padding: 36rpx;
}
.content {
  display: block;
  font-size: 30rpx;
  line-height: 1.8;
  margin-bottom: 30rpx;
}
</style>
