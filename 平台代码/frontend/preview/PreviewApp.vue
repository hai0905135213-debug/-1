<template>
  <div class="preview-shell">
    <div class="phone-frame">
      <component :is="currentComponent" />
      <div class="preview-tabbar">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          :class="{ active: activeTab === tab.key }"
          @click="activeTab = tab.key"
        >
          <span class="tab-icon">{{ tab.icon }}</span>
          <span>{{ tab.label }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import HomePage from '../pages/home/index.vue'
import FindPage from '../pages/find/index.vue'
import CreateMealPage from '../pages/create-meal/index.vue'
import FeedPage from '../pages/feed/index.vue'
import ProfilePage from '../pages/profile/index.vue'
import MealDetailPage from '../pages/meal-detail/index.vue'

const components = {
  home: HomePage,
  find: FindPage,
  create: CreateMealPage,
  feed: FeedPage,
  profile: ProfilePage,
  detail: MealDetailPage
}

export default {
  data() {
    return {
      activeTab: 'home',
      tabs: [
        { key: 'home', label: '首页', icon: '⌂' },
        { key: 'find', label: '找人', icon: 'v' },
        { key: 'create', label: '发布', icon: '+' },
        { key: 'feed', label: '动态', icon: '▤' },
        { key: 'profile', label: '我的', icon: '◜' }
      ]
    }
  },
  computed: {
    currentComponent() {
      return components[this.activeTab]
    }
  },
  mounted() {
    window.addEventListener('preview:navigate', this.handleNavigate)
    window.addEventListener('preview:back', this.handleBack)
  },
  beforeUnmount() {
    window.removeEventListener('preview:navigate', this.handleNavigate)
    window.removeEventListener('preview:back', this.handleBack)
  },
  methods: {
    handleNavigate(event) {
      const url = event.detail.url || ''

      if (url.includes('meal-detail')) {
        this.activeTab = 'detail'
        return
      }

      if (url.includes('create-meal')) {
        this.activeTab = 'create'
      }
    },
    handleBack() {
      this.activeTab = 'home'
    }
  }
}
</script>
