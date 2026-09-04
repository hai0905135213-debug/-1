<template>
  <view class="page timetable-page">
    <view class="section">
      <view class="page-title">📅 上传 PDF 课表</view>
      <view class="muted" style="margin-top: 8rpx;">选择教务处导出的文字版 PDF，系统会自动识别课程并保存到你的课表。</view>
    </view>

    <view class="card login-card">
      <view class="card-subtitle">
        📄 PDF 扫描导入
      </view>
      
      <view class="form-container">
        <view class="pdf-upload-box" @tap="choosePdf">
          <view class="pdf-icon">PDF</view>
          <view class="pdf-copy">
            <text class="pdf-title">{{ selectedPdfName || '选择课表 PDF' }}</text>
            <text class="pdf-desc">支持 8MB 以内的文字版 PDF；图片扫描件后续再接 OCR。</text>
          </view>
        </view>
        
        <button class="button-primary sync-btn" @tap="importPdf" :disabled="syncing || !selectedPdf">
          {{ syncing ? '⏳ 正在识别并导入...' : '⚡ 上传并扫描课表' }}
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
        <view class="empty-text">暂无已导入课表，请先上传 PDF 课表。</view>
      </view>
    </view>
  </view>
</template>

<script>
import { timetableApi } from '../../services/api'

export default {
  data() {
    return {
      selectedPdf: null,
      selectedPdfName: '',
      syncing: false,
      courses: [],
      freeSlots: []
    }
  },
  onShow() {
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
    async choosePdf() {
      try {
        const file = await this.pickPdfFile()
        if (!file) return
        this.selectedPdf = file
        this.selectedPdfName = file.name || '课表.pdf'
      } catch (err) {
        uni.showToast({ title: err.message || '选择 PDF 失败', icon: 'none' })
      }
    },
    pickPdfFile() {
      return new Promise((resolve, reject) => {
        if (typeof wx !== 'undefined' && wx.chooseMessageFile) {
          wx.chooseMessageFile({
            count: 1,
            type: 'file',
            extension: ['pdf'],
            success: res => resolve(res.tempFiles?.[0]),
            fail: reject
          })
          return
        }
        if (uni.chooseFile) {
          uni.chooseFile({
            count: 1,
            extension: ['.pdf'],
            success: res => resolve(res.tempFiles?.[0]),
            fail: reject
          })
          return
        }
        reject(new Error('当前端暂不支持文件选择'))
      })
    },
    readPdfBase64(file) {
      return new Promise((resolve, reject) => {
        const filePath = file.path || file.tempFilePath
        const fs = typeof wx !== 'undefined' && wx.getFileSystemManager
          ? wx.getFileSystemManager()
          : null
        if (!fs || !filePath) {
          reject(new Error('当前端暂不支持读取文件，请先用本地预览页测试'))
          return
        }
        fs.readFile({
          filePath,
          encoding: 'base64',
          success: res => resolve(res.data),
          fail: reject
        })
      })
    },
    async importPdf() {
      if (!this.selectedPdf) {
        uni.showToast({ title: '请先选择 PDF', icon: 'none' })
        return
      }
      this.syncing = true
      try {
        const pdfBase64 = await this.readPdfBase64(this.selectedPdf)
        const res = await timetableApi.pdfImport({
          fileName: this.selectedPdfName,
          pdfBase64
        })
        if (res && res.ok) {
          uni.showToast({ title: '导入成功', icon: 'success' })
          this.loadTimetable()
        } else {
          uni.showToast({ title: res.message || '导入失败', icon: 'none' })
        }
      } catch (err) {
        uni.showToast({ title: err.message || 'PDF 导入失败', icon: 'none' })
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

.pdf-upload-box {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 24rpx;
  border: 2rpx dashed #d8d9e3;
  border-radius: 24rpx;
  background: #fafafa;
}

.pdf-icon {
  width: 92rpx;
  height: 92rpx;
  border-radius: 20rpx;
  background: #08091f;
  color: #ffea35;
  font-size: 28rpx;
  font-weight: 900;
  display: flex;
  align-items: center;
  justify-content: center;
}

.pdf-copy {
  flex: 1;
  min-width: 0;
}

.pdf-title {
  display: block;
  font-size: 30rpx;
  font-weight: 900;
  color: #08091f;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pdf-desc {
  display: block;
  margin-top: 8rpx;
  font-size: 22rpx;
  color: #8e8f98;
  line-height: 1.5;
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
