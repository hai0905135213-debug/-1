<template>
  <view class="page">
    <view class="section">
      <view class="page-title">编辑资料</view>
      <view class="muted">让饭搭子知道你的口味、预算和聊天节奏。</view>
    </view>

    <view class="field"><text class="label">昵称</text><input class="input" v-model="form.nickname" maxlength="32" placeholder="你希望队友怎么称呼你"/></view>
    <view class="field">
      <text class="label">校区</text>
      <picker :range="['沙河校区','学院南路校区']" @change="form.campus=Number($event.detail.value)===0?'cufe_shahe':'cufe_nanlu'"><view class="input">{{form.campus==='cufe_nanlu'?'学院南路校区':'沙河校区'}} ⌄</view></picker>
    </view>
    <view class="field">
      <text class="label">口味标签</text>
      <input class="input" v-model="tasteTagsText" placeholder="川菜、不吃香菜" />
    </view>
    <view class="field">
      <text class="label">性格/吃饭标签</text>
      <input class="input" v-model="personalityTagsText" placeholder="慢热、安静吃饭" />
    </view>
    <view class="field">
      <text class="label">预算偏好</text>
      <input class="input" v-model="form.budgetPreference" placeholder="20-40" />
    </view>
    <view class="field">
      <text class="label">性别展示</text>
      <input class="input" v-model="form.gender" placeholder="unknown" />
    </view>

    <button class="button-primary" @tap="save">{{ saving ? '保存中...' : '保存资料' }}</button>
  </view>
</template>

<script>
import { authApi, profileApi } from '../../services/api'

function splitTags(text) {
  return text
    .split(/[，,、\s]+/)
    .map((item) => item.trim())
    .filter(Boolean)
}

export default {
  data() {
    return {
      saving: false,
      tasteTagsText: '',
      personalityTagsText: '',
      form: {
        nickname: '',
        avatarUrl: '',
        gender: 'unknown',
        campus: 'cufe_shahe',
        budgetPreference: '20-40'
      }
    }
  },
  onShow() {
    this.loadProfile()
  },
  methods: {
    async loadProfile() {
      if (!authApi.token()) {
        uni.navigateTo({ url: '/pages/login/index' })
        return
      }

      try {
        const result = await profileApi.me()
        const profile = result.profile || {}
        this.form = {
          nickname: result.user?.nickname || uni.getStorageSync('currentUser')?.nickname || '',
          avatarUrl: profile.avatarUrl || '',
          gender: profile.gender || 'unknown',
          campus: ['cufe_nanlu','学院南路校区'].includes(profile.campus) ? 'cufe_nanlu' : 'cufe_shahe',
          budgetPreference: profile.budgetPreference || '20-40'
        }
        this.tasteTagsText = (profile.tasteTags || []).join('、')
        this.personalityTagsText = (profile.personalityTags || []).join('、')
      } catch (error) {
        uni.showToast({ title: error.message || '读取资料失败', icon: 'none' })
      }
    },
    async save() {
      this.saving = true
      try {
        await profileApi.update({
          ...this.form,
          tasteTags: splitTags(this.tasteTagsText),
          personalityTags: splitTags(this.personalityTagsText)
        })
        uni.showToast({ title: '资料已保存', icon: 'success' })
        setTimeout(() => uni.switchTab({ url: '/pages/profile/index' }), 400)
      } catch (error) {
        uni.showToast({ title: error.message || '保存失败', icon: 'none' })
      } finally {
        this.saving = false
      }
    }
  }
}
</script>
