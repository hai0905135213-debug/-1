<template><view class="page"><text class="heading">评价队友</text><text>请从已完成饭局中选择真实队友评价，不需要填写用户编号。</text><button @tap="mine">打开我的饭局</button></view></template>
<script>export default{onLoad(q){if(q.mealId&&/^\d+$/.test(q.mealId))uni.redirectTo({url:'/pages/meal-detail/index?id='+q.mealId})},methods:{mine(){uni.redirectTo({url:'/pages/my-meals/index'})}}}</script>
<style scoped>.page{padding:40rpx;line-height:1.8}.heading{display:block;font-size:38rpx;font-weight:800;margin-bottom:30rpx}button{margin-top:30rpx;background:#ffe388}</style>
