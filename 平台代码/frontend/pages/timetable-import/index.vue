<template>
  <view class="page timetable-page">
    <view class="section">
      <view class="page-title">📅 导入教务处课表</view>
      <view class="muted" style="margin-top: 8rpx;">免去小程序域名拦截限制。输入教务处信息，服务器在后台自动模拟登录并提取课表，安全可靠。</view>
    </view>

    <!-- PROXY LOGIN FORM -->
    <view class="card login-card">
      <view class="card-subtitle">
        🏫 中央财经大学统一身份认证 (服务器代理)
      </view>
      
      <view class="form-container">
        <view class="field">
          <text class="label">学号</text>
          <input class="input" v-model="studentId" placeholder="请输入您的学号" />
          <text class="tip">💡 测试贴士：使用内置学号 2025310322 可以同步抓取真实课表数据</text>
        </view>
        <view class="field">
          <text class="label">密码</text>
          <input class="input" type="password" v-model="password" placeholder="请输入教务处密码" />
        </view>
        <view class="field">
          <text class="label">验证码</text>
          <view class="captcha-row">
            <input class="input captcha-input" v-model="captchaInput" placeholder="输入验证码" />
            <image 
              v-if="captchaSrc"
              :src="captchaSrc" 
              class="captcha-img" 
              @tap="fetchCaptcha"
              title="点击刷新验证码"
            ></image>
            <view v-else class="captcha-placeholder" @tap="fetchCaptcha">加载中...</view>
          </view>
        </view>
        
        <button class="button-primary sync-btn" @tap="startSync" :disabled="syncing">
          {{ syncing ? '⏳ 正在代理登录并同步中...' : '⚡ 开始一键代理导入' }}
        </button>
      </view>
    </view>

    <!-- PARSED GRID PREVIEW -->
    <view class="section">
      <view class="section-title">📊 导入后的课表网格</view>
      
      <!-- Free slots summary -->
      <view v-if="freeSlots && freeSlots.length > 0" class="free-slots-section">
        <text class="free-slots-title">💡 无课空闲时段智能识别：</text>
        <view class="free-slots-row">
          <view 
            v-for="(slot, index) in freeSlots" 
            :key="index" 
            class="free-slot-tag"
          >
            🌿 {{ slot.label }} ({{ slot.tag }})
          </view>
        </view>
      </view>

      <!-- Timetable grid -->
      <view v-if="courses && courses.length > 0" class="grid-card">
        <view class="timetable-grid">
          <!-- Header -->
          <view class="grid-header">
            <view class="header-cell time-col">节次</view>
            <view class="header-cell" v-for="d in ['一', '二', '三', '四', '五']" :key="d">周{{ d }}</view>
          </view>
          <!-- Rows -->
          <view class="grid-row" v-for="(row, rIdx) in gridRows" :key="rIdx">
            <view class="grid-cell time-col time-label">{{ row.label }}</view>
            <view 
              v-for="(cell, cIdx) in row.cells" 
              :key="cIdx" 
              :class="['grid-cell', cell ? 'course-cell' : 'empty-cell']"
            >
              <view v-if="cell" class="course-info">
                <text class="course-name">{{ cell.courseName }}</text>
                <text class="course-loc">📍{{ cell.location || '待定' }}</text>
              </view>
              <text v-else class="empty-text">无课</text>
            </view>
          </view>
        </view>
      </view>

      <view v-else class="empty-block card">
        <view class="empty-illustration small">☕</view>
        <view class="empty-text">暂无已导入课表，请输入上方信息并点击“开始一键代理导入”</view>
      </view>
    </view>
  </view>
</template>

<script>
import { timetableApi } from '../../services/api'

export default {
  data() {
    return {
      studentId: '2025310322',
      password: 'password123',
      captchaInput: '',
      captchaSrc: '',
      syncing: false,
      courses: [],
      freeSlots: []
    }
  },
  onShow() {
    this.fetchCaptcha()
    this.loadTimetable()
  },
  computed: {
    gridRows() {
      const days = [1, 2, 3, 4, 5]
      const periods = [1, 3, 5, 7]
      const rows = []
      periods.forEach(p => {
        const row = {
          label: `${p}-${p+1}节`,
          cells: []
        }
        days.forEach(d => {
          const match = this.courses.find(
            c => Number(c.dayOfWeek) === d && 
                 Number(c.startPeriod) <= p && 
                 Number(c.endPeriod) >= p
          )
          row.cells.push(match || null)
        })
        rows.push(row)
      })
      return rows
    }
  },
  methods: {
    async fetchCaptcha() {
      try {
        const data = await timetableApi.captcha()
        if (data && data.captchaImage) {
          this.captchaSrc = data.captchaImage
          this.captchaInput = ''
        }
      } catch (err) {
        uni.showToast({ title: '加载验证码失败: ' + (err.message || '网络连接异常'), icon: 'none' })
      }
    },
    async loadTimetable() {
      try {
        const data = await timetableApi.mine()
        if (data && data.courses) {
          this.courses = data.courses
          this.freeSlots = data.freeSlots || []
        }
      } catch (err) {
        console.error('获取课表失败:', err)
      }
    },
    async startSync() {
      if (!this.studentId.trim() || !this.password.trim() || !this.captchaInput.trim()) {
        uni.showToast({ title: '请填写完整学号、密码和验证码', icon: 'none' })
        return
      }
      this.syncing = true
      try {
        const res = await timetableApi.proxyLogin({
          studentId: this.studentId.trim(),
          password: this.password.trim(),
          captcha: this.captchaInput.trim()
        })
        if (res && res.ok) {
          uni.showToast({ title: '同步成功', icon: 'success' })
          this.loadTimetable()
        } else {
          uni.showToast({ title: res.message || '同步失败，请检查验证码或密码', icon: 'none' })
          this.fetchCaptcha()
        }
      } catch (err) {
        uni.showToast({ title: err.message || '同步请求出错，请重试', icon: 'none' })
        this.fetchCaptcha()
      } finally {
        this.syncing = false
      }
    }
  }
}
</script>

<style scoped>
.timetable-page {
  background: #ffffff;
}

.login-card {
  border: 2rpx solid #08091f;
  box-shadow: 0 8rpx 0 #08091f;
  margin-bottom: 40rpx;
}

.card-subtitle {
  font-size: 28rpx;
  font-weight: 800;
  color: #b22222;
  margin-bottom: 24rpx;
}

.form-container {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.tip {
  font-size: 22rpx;
  color: #d46b08;
  margin-top: 8rpx;
  font-weight: bold;
  display: block;
}

.captcha-row {
  display: flex;
  gap: 20rpx;
  align-items: center;
}

.captcha-input {
  flex: 1;
}

.captcha-img {
  width: 200rpx;
  height: 76rpx;
  border-radius: 18rpx;
  border: 2rpx solid #eeeeF2;
  background: #fafafa;
}

.captcha-placeholder {
  width: 200rpx;
  height: 76rpx;
  border-radius: 18rpx;
  border: 2rpx solid #eeeeF2;
  background: #fafafa;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24rpx;
  color: #94959f;
}

.sync-btn {
  margin-top: 16rpx;
}

.free-slots-section {
  background: #f6ffed;
  border: 2rpx solid #b7eb8f;
  border-radius: 20rpx;
  padding: 20rpx;
  margin-bottom: 24rpx;
}

.free-slots-title {
  font-size: 26rpx;
  font-weight: 800;
  color: #389e0d;
  display: block;
  margin-bottom: 12rpx;
}

.free-slots-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}

.free-slot-tag {
  background: #ffffff;
  color: #389e0d;
  border: 2rpx solid #b7eb8f;
  padding: 6rpx 16rpx;
  border-radius: 12rpx;
  font-size: 24rpx;
  font-weight: 800;
}

.grid-card {
  background: #ffffff;
  border: 2rpx solid #08091f;
  border-radius: 20rpx;
  padding: 16rpx;
  overflow-x: auto;
}

.timetable-grid {
  min-width: 600rpx;
  display: flex;
  flex-direction: column;
}

.grid-header {
  display: flex;
  background: #f7f7fa;
  border-bottom: 2rpx solid #eeeeF2;
}

.header-cell {
  flex: 1;
  padding: 12rpx 6rpx;
  font-size: 24rpx;
  font-weight: 800;
  text-align: center;
  color: #5a5b6a;
}

.grid-row {
  display: flex;
  border-bottom: 1rpx solid #f0f0f5;
}

.grid-cell {
  flex: 1;
  min-height: 100rpx;
  padding: 8rpx 6rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  border-right: 1rpx solid #f0f0f5;
  box-sizing: border-box;
}

.grid-cell:last-child {
  border-right: none;
}

.time-col {
  flex: 0 0 100rpx;
  background: #fafafa;
  font-weight: bold;
  border-right: 1rpx solid #f0f0f5;
}

.time-label {
  font-size: 24rpx;
  color: #8e8f98;
}

.course-cell {
  background: #e6f7ff;
  border: 2rpx solid #bae7ff;
  border-radius: 12rpx;
  margin: 4rpx;
}

.course-info {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.course-name {
  font-size: 22rpx;
  font-weight: 800;
  color: #096dd9;
  line-height: 1.2;
}

.course-loc {
  font-size: 18rpx;
  color: #595959;
}

.empty-cell {
  background: #ffffff;
}

.empty-text {
  font-size: 20rpx;
  color: #d9d9d9;
}

.empty-block {
  padding: 60rpx 0;
  text-align: center;
}

.empty-illustration {
  font-size: 80rpx;
  margin-bottom: 12rpx;
}

.empty-illustration.small {
  font-size: 64rpx;
}
</style>
