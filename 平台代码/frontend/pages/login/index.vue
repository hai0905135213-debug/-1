<template>
  <view class="page login-page">
    <view class="login-hero">
      <view class="mascot">饭</view>
      <view>
        <view class="page-title">登录饭搭子</view>
        <view class="muted">先让平台知道你是谁，再开始约饭。</view>
      </view>
    </view>

    <view class="form-panel">
      <view class="field">
        <text class="label">昵称</text>
        <input class="input" v-model="form.nickname" placeholder="例如：小林" />
      </view>
      <view class="field">
        <text class="label">学号</text>
        <input class="input" v-model="form.studentNo" placeholder="例如：2026001" />
      </view>
      <view class="field">
        <text class="label">学校</text>
        <input class="input" v-model="form.school" placeholder="例如：示例大学" />
      </view>

      <button class="button-primary" @tap="login">{{ loading ? '登录中...' : '登录 / 注册' }}</button>
      <button class="button-secondary demo-btn" @tap="useDemo">使用示例账号</button>
    </view>
  </view>
</template>

<script>
import { authApi } from '../../services/api'

export default {
  data() {
    return {
      loading: false,
      form: {
        nickname: '',
        studentNo: '',
        school: '示例大学'
      }
    }
  },
  methods: {
    useDemo() {
      this.form = {
        nickname: '小林',
        studentNo: '2026001',
        school: '示例大学'
      }
      this.login()
    },
    async login() {
      if (!this.form.nickname.trim()) {
        uni.showToast({ title: '昵称不能为空', icon: 'none' })
        return
      }

      this.loading = true
      try {
        await authApi.login(this.form)
        uni.showToast({ title: '登录成功', icon: 'success' })
        setTimeout(() => {
          uni.switchTab({ url: '/pages/profile/index' })
        }, 400)
      } catch (error) {
        uni.showToast({ title: error.message || '登录失败', icon: 'none' })
      } finally {
        this.loading = false
      }
    }
  }
}
</script>

<style scoped>
.login-page {
  padding-top: 88rpx;
}

.login-hero {
  display: flex;
  align-items: center;
  gap: 22rpx;
  margin-bottom: 56rpx;
}

.mascot {
  width: 112rpx;
  height: 112rpx;
  border-radius: 56rpx;
  background: #fff4a8;
  color: #08091f;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 42rpx;
  font-weight: 900;
}

.form-panel {
  padding-top: 10rpx;
}

.demo-btn {
  margin-top: 22rpx;
}
</style>
