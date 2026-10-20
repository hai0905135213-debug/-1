<template>
  <!-- 网页用浏览器原生懒加载；小程序用微信image的lazy-load，避免跨端实现差异。 -->
  <!-- #ifdef H5 -->
  <img class="cover" :src="source" loading="lazy" alt="餐厅封面" @error="fallback" />
  <!-- #endif -->
  <!-- #ifndef H5 -->
  <image class="cover" :src="source" mode="aspectFill" lazy-load @error="fallback" />
  <!-- #endif -->
</template>
<script>
export default {
  props: { src: { type: String, default: '' } },
  emits: ['error'],
  data() { return { failed: false } },
  computed: { source() { return this.failed || !this.src ? '/static/restaurant-placeholder.svg' : this.src } },
  watch: { src() { this.failed = false } },
  methods: { fallback() { if (!this.failed) { this.failed = true; this.$emit('error') } } }
}
</script>
<style scoped>
.cover { width:190rpx; height:190rpx; flex-shrink:0; object-fit:cover; border-radius:20rpx; background:#f7f2e8; }
</style>
