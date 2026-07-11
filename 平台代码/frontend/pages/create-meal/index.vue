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
        <input class="input" v-model="form.mealTime" placeholder="例如：2026-07-10 18:30" />
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
      <button class="button-primary" @tap="submit">{{ submitting ? '发布中...' : '发布饭局' }}</button>
    </view>
  </view>
</template>

<script>
import { authApi, mealApi } from '../../services/api'

function parseBudget(text) {
  const numbers = String(text || '').match(/\d+/g) || []
  return {
    budgetMin: Number(numbers[0] || 0),
    budgetMax: Number(numbers[1] || numbers[0] || 0)
  }
}

function parseMealTime(text) {
  const normalized = String(text || '').trim().replace(' ', 'T')
  const date = new Date(normalized)
  if (!Number.isNaN(date.getTime())) return date.toISOString()
  return ''
}

export default {
  data() {
    return {
      submitting: false,
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
    async submit() {
      if (!authApi.token()) {
        uni.navigateTo({ url: '/pages/login/index' })
        return
      }

      const mealTime = parseMealTime(this.form.mealTime)
      if (!this.form.title.trim() || !mealTime || !this.form.location.trim() || !this.form.maxPeople) {
        uni.showToast({ title: '标题、时间、地点、人数要填好', icon: 'none' })
        return
      }

      this.submitting = true
      try {
        const budget = parseBudget(this.form.budget)
        const result = await mealApi.create({
          title: this.form.title.trim(),
          foodType: this.form.title.trim(),
          mealTime,
          place: this.form.location.trim(),
          campus: '主校区',
          maxPeople: Number(this.form.maxPeople),
          ...budget,
          chatMode: 'balanced',
          description: this.form.note.trim()
        })

        uni.showToast({ title: '饭局已创建', icon: 'success' })
        setTimeout(() => {
          uni.navigateTo({ url: `/pages/meal-detail/index?id=${result.meal.id}` })
        }, 400)
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
.publish-desc {
  margin-top: 14rpx;
}

.publish-card {
  padding: 30rpx 0;
}
</style>
