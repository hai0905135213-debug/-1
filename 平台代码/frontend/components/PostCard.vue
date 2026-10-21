<template>
  <view class="post-card"
    ><view class="post-header"
      ><view class="avatar">{{ (post.author?.nickname || "饭")[0] }}</view
      ><view class="author-copy"
        ><text class="author-name">{{ post.author?.nickname || "同学" }}</text
        ><text class="post-time"
          >{{ post.category || "约饭" }} · {{ timeText(post.createdAt) }}</text
        ></view
      ><text class="post-category">{{ post.category || "约饭" }}</text></view
    ><text class="post-content">{{ post.content }}</text
    ><view v-if="post.meal" class="post-venue" @tap="$emit('open', post.mealId)"
      ><view class="venue-icon">饭</view
      ><view class="venue-copy"
        ><text class="venue-name">{{ post.meal.title }} ›</text
        ><text class="venue-address">{{ post.meal.place }}</text></view
      ><text class="venue-people"
        >{{ post.meal.currentPeople }}/{{ post.meal.maxPeople }}人</text
      ></view
    ><view class="post-bottom"
      ><text class="post-tip">{{
        post.mealId ? "通过发起人审批后成为正式队员" : "历史帖子，暂未关联饭局"
      }}</text
      ><button
        v-if="post.mealId"
        class="post-join"
        @tap="$emit('open', post.mealId)"
      >
        查看饭局
      </button></view
    ></view
  >
</template>
<script>
import { localTime } from "../services/time";
export default {
  props: { post: { type: Object, required: true } },
  emits: ["open"],
  methods: { timeText: localTime },
};
</script>
<style scoped>
.post-card {
  padding: 30rpx 0;
  border-bottom: 1rpx solid #eeeef2;
}
.post-header {
  display: flex;
  align-items: center;
  gap: 18rpx;
}
.avatar {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  line-height: 72rpx;
  text-align: center;
  font-size: 28rpx;
  font-weight: 800;
  background: #fff4a8;
}
.author-copy {
  flex: 1;
  min-width: 0;
}
.author-name {
  display: block;
  font-size: 28rpx;
  font-weight: 800;
}
.post-time {
  display: block;
  font-size: 21rpx;
  color: #8e8f98;
  margin-top: 8rpx;
}
.post-category {
  background: #f7f7f9;
  color: #858792;
  border-radius: 10rpx;
  padding: 7rpx 14rpx;
  font-size: 22rpx;
}
.post-content {
  display: block;
  line-height: 1.8;
  font-size: 28rpx;
  margin: 26rpx 0;
  white-space: pre-wrap;
  word-break: break-all;
}
.post-venue {
  display: flex;
  align-items: center;
  gap: 18rpx;
  background: #f7f7f9;
  padding: 22rpx;
  border-radius: 18rpx;
}
.venue-icon {
  height: 66rpx;
  width: 66rpx;
  background: #fff0b1;
  border-radius: 12rpx;
  font-size: 28rpx;
  text-align: center;
  line-height: 66rpx;
  font-weight: 800;
}
.venue-copy {
  flex: 1;
  min-width: 0;
}
.venue-name {
  display: block;
  font-size: 26rpx;
  font-weight: 800;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.venue-address {
  display: block;
  font-size: 22rpx;
  color: #8e8f98;
  margin-top: 9rpx;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.venue-people {
  font-size: 23rpx;
  color: #888b96;
}
.post-bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16rpx;
  margin-top: 22rpx;
}
.post-tip {
  color: #9799a2;
  font-size: 21rpx;
  flex: 1;
}
.post-join {
  background: #fff6b6;
  border-radius: 30rpx;
  font-size: 23rpx;
  padding: 10rpx 22rpx;
  line-height: 1.6;
}
</style>
