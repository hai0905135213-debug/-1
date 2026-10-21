<template>
  <view class="page"
    ><text class="heading">一起好好吃饭</text
    ><text class="muted">登录后可以收藏餐厅；组队需管理员通过体验资格。</text
    ><text class="muted" @tap="policy">登录前可先阅读服务与隐私说明 ›</text
    ><button @tap="wechat" :disabled="busy">微信登录</button
    ><view v-if="devLogin"
      ><input v-model="nickname" placeholder="本地测试昵称" /><button
        @tap="dev"
        :disabled="busy"
      >
        开发环境登录
      </button></view
    ><text v-if="error" class="error">{{ error }}</text></view
  >
</template>
<script>
import { authApi } from "../../services/api";
import {returnAfterLogin} from '../../services/session';
export default {
  data() {
    return {
      nickname: "",
      busy: false,
      error: "",
      devLogin:
        import.meta.env.DEV && import.meta.env.VITE_ENABLE_DEV_LOGIN === "true",
    };
  },
  methods: {
    policy(){uni.navigateTo({url:'/pages/support/index?tab=policy'})},
    async run(login) {
      this.busy = true;
      this.error = "";
      try {
        const result=await login();
        returnAfterLogin(result.user);
      } catch (e) {
        this.error = e.message || e.errMsg || "登录失败";
      } finally {
        this.busy = false;
      }
    },
    wechat() {
      this.run(() => authApi.wechat());
    },
    dev() {
      this.run(() => authApi.login({ nickname: this.nickname }));
    },
  },
};
</script>
<style scoped>
.page {
  padding: 100rpx 40rpx;
}
.heading {
  display: block;
  font-size: 44rpx;
  font-weight: 800;
}
.muted {
  display: block;
  color: #888;
  margin: 30rpx 0;
  line-height: 1.7;
}
.page button {
  margin: 24rpx 0;
  background: #ffe733;
  border-radius: 40rpx;
}
.page input {
  padding: 24rpx;
  background: #f5f5f5;
}
.error {
  color: #b33;
}
</style>
