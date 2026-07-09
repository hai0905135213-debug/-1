<template>
  <view class="page">
    <view class="section">
      <view class="page-title">发布饭局</view>
      <view class="muted publish-desc">把吃什么、几点、哪里、几个人先说清楚。</view>
    </view>

    <view class="publish-card">
      <view class="field">
        <text class="label">饭局标题</text>
        <input class="input" v-model="form.title" placeholder="例如：今晚拼麻辣烫" />
      </view>
      <view class="field">
        <text class="label">时间</text>
        <input class="input" v-model="form.mealTime" placeholder="例如：今天 18:30" />
      </view>
      <view class="field">
        <text class="label">地点</text>
        <input class="input" v-model="form.location" placeholder="例如：一食堂二楼" />
      </view>
      <view class="field">
        <text class="label">人数</text>
        <input class="input" type="number" v-model="form.maxPeople" placeholder="例如：4" />
      </view>
      <view class="field">
        <text class="label">预算</text>
        <input class="input" v-model="form.budget" placeholder="例如：20元以内" />
      </view>
      <view class="field">
        <text class="label">补充说明</text>
        <textarea class="textarea" v-model="form.note" placeholder="口味、忌口、聊天偏好等" />
      </view>
      <button class="button-primary" @tap="submit">发布饭局</button>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      form: {
        title: '',
        mealTime: '',
        location: '',
        maxPeople: '',
        budget: '',
        note: ''
      }
    }
  },
  methods: {
    submit() {
      uni.showToast({ title: '饭局已创建', icon: 'success' })
    }
  }
}
</script>

<style scoped>
.publish-desc {
  margin-top: 14rpx;
}

.publish-card {
  padding: 30rpx 0;
}
</style>
