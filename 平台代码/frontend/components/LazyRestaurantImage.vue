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
  computed: { source() { return this.failed || !this.src ? '/static/restaurant-placeholder.png' : this.src } },
  watch: { src() { this.failed = false } },
  methods: { fallback() { if (!this.failed) { this.failed = true; this.$emit('error') } } }
}
</script>
<style scoped>
.cover { display:block;width:204rpx; height:188rpx; flex-shrink:0; object-fit:cover; border-radius:0; background:#f1f2f5; }
</style>
