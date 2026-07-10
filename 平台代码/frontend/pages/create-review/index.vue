<template>
  <view class="page">
    <view class="section">
      <view class="page-title">发布评价</view>
      <view class="muted">评价这次饭局体验，后面会用来完善信用分。</view>
    </view>

    <view class="field">
      <text class="label">饭局 ID</text>
      <input class="input" type="number" v-model="form.mealId" />
    </view>
    <view class="field">
      <text class="label">评价对象用户 ID</text>
      <input class="input" type="number" v-model="form.targetUserId" />
    </view>
    <view class="field">
      <text class="label">评分</text>
      <view class="rating-row">
        <view
          v-for="score in [1, 2, 3, 4, 5]"
          :key="score"
          :class="Number(form.rating) >= score ? 'rating active' : 'rating'"
          @tap="form.rating = score"
        >★</view>
      </view>
    </view>
    <view class="field">
      <text class="label">评价内容</text>
      <textarea class="textarea" v-model="form.content" placeholder="例如：准时，吃饭体验不错。" />
    </view>

    <button class="button-primary" @tap="submit">{{ submitting ? '提交中...' : '发布评价' }}</button>
  </view>
</template>

<script>
import { authApi, mealApi } from '../../services/api'

export default {
  data() {
    return {
      submitting: false,
      form: {
        mealId: 1,
        targetUserId: 1,
        rating: 5,
        content: ''
      }
    }
  },
  onLoad(query) {
    this.form.mealId = Number(query.mealId || 1)
    this.form.targetUserId = Number(query.targetUserId || 1)
  },
  methods: {
    async submit() {
      if (!authApi.token()) {
        uni.navigateTo({ url: '/pages/login/index' })
        return
      }

      if (!this.form.content.trim()) {
        uni.showToast({ title: '先写一句评价', icon: 'none' })
        return
      }

      this.submitting = true
      try {
        await mealApi.review(this.form.mealId, {
          targetUserId: Number(this.form.targetUserId),
          rating: Number(this.form.rating),
          content: this.form.content
        })
        uni.showToast({ title: '评价已发布', icon: 'success' })
        setTimeout(() => uni.navigateBack(), 400)
      } catch (error) {
        uni.showToast({ title: error.message || '发布失败', icon: 'none' })
      } finally {
        this.submitting = false
      }
    }
  }
}
</script>

<style scoped>
.rating-row {
  display: flex;
  gap: 18rpx;
}

.rating {
  font-size: 52rpx;
  color: #d1d5db;
}

.rating.active {
  color: #ffe733;
  text-shadow: 0 4rpx 10rpx rgba(255, 231, 51, 0.28);
}
</style>
