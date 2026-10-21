<template>
  <view class="page"
    ><text class="heading">先认识一下你</text
    ><text class="muted"
      >用于队友称呼和推荐，不要求真实姓名、学号或教务密码。体验资格不等于学籍认证。</text
    ><input
      v-model="nickname"
      maxlength="32"
      placeholder="希望队友怎样称呼你"
    /><picker
      :range="['沙河校区', '学院南路校区']"
      :value="campusIndex"
      @change="campusIndex = Number($event.detail.value)"
      ><view class="field">{{
        campusIndex ? "学院南路校区" : "沙河校区"
      }}</view></picker
    ><input v-model="tastes" placeholder="口味偏好，逗号分隔，可留空" /><input
      v-model="budget"
      placeholder="每人预算偏好，如20-40，可留空"
    /><view v-if="policies"
      ><text class="heading small">服务说明</text
      ><text
        v-for="(p, i) in policies.documents.terms"
        :key="'t' + i"
        class="paragraph"
        >{{ p }}</text
      ><text class="heading small">隐私与数据说明</text
      ><text
        v-for="(p, i) in policies.documents.privacy"
        :key="'p' + i"
        class="paragraph"
        >{{ p }}</text
      ><text class="muted"
        >运营：{{ policies.operator }} · 联系：{{ policies.support }}</text
      ><view class="row"
        ><checkbox-group
          @change="accepted = $event.detail.value.includes('yes')"
          ><label
            ><checkbox
              value="yes"
              :checked="accepted"
            />我已阅读并同意本版本服务说明与隐私说明</label
          ></checkbox-group
        ></view
      ><button :disabled="busy || !accepted" @tap="save">
        保存并继续
      </button></view
    ><text class="error">{{ error }}</text
    ><button size="mini" @tap="visitor">暂不确认，返回浏览餐厅</button></view
  >
</template>
<script>
import { request, authApi } from "../../services/api";
import { returnAfterLogin } from "../../services/session";
export default {
  data() {
    return {
      nickname: "",
      campusIndex: 0,
      tastes: "",
      budget: "",
      policies: null,
      accepted: false,
      busy: false,
      error: "",
    };
  },
  async onLoad() {
    try {
      const [p, me] = await Promise.all([request("/policies"), authApi.me()]);
      this.policies = p;
      this.nickname = me.user.nickname === "新同学" ? "" : me.user.nickname;
      this.campusIndex = ["cufe_nanlu", "学院南路校区"].includes(
        me.user.profile?.campus,
      )
        ? 1
        : 0;
      this.tastes = (me.user.profile?.tasteTags || []).join("、");
      this.budget = me.user.profile?.budgetPreference || "";
    } catch (e) {
      this.error = e.message;
    }
  },
  methods: {
    visitor() {
      uni.switchTab({ url: "/pages/home/index" });
    },
    async save() {
      if (this.busy || !this.accepted) return;
      this.busy = true;
      this.error = "";
      try {
        await request("/account/onboarding", {
          method: "POST",
          data: {
            nickname: this.nickname.trim(),
            campus: this.campusIndex ? "cufe_nanlu" : "cufe_shahe",
            tasteTags: this.tastes
              .split(/[,，、]/)
              .map((x) => x.trim())
              .filter(Boolean),
            budgetPreference: this.budget,
            policyVersion: this.policies.version,
            accepted: true,
          },
        });
        const { user } = await authApi.me();
        uni.setStorageSync("currentUser", user);
        uni.setStorageSync("currentProfile", user.profile);
        returnAfterLogin(user);
      } catch (e) {
        this.error = e.message;
      } finally {
        this.busy = false;
      }
    },
  },
};
</script>
<style scoped>
.page {
  padding: 40rpx;
}
.heading {
  display: block;
  font-size: 40rpx;
  font-weight: 800;
  margin: 24rpx 0;
}
.small {
  font-size: 30rpx;
}
.muted,
.paragraph {
  display: block;
  line-height: 1.8;
  margin: 16rpx 0;
  color: #666;
  font-size: 26rpx;
}
.page input,
.field {
  padding: 24rpx;
  background: #faf7ef;
  border-radius: 18rpx;
  margin: 20rpx 0;
}
.page button {
  margin: 26rpx 0;
  background: #ffe388;
  border-radius: 30rpx;
}
.error {
  display: block;
  color: #b33;
  white-space: pre-wrap;
}
</style>
