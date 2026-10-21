<template>
  <view class="page"
    ><view class="tabs"
      ><text
        v-for="t in visibleTabs"
        :key="t.code"
        :class="{ active: tab === t.code }"
        @tap="change(t.code)"
        >{{ t.name }}</text
      ></view
    ><text v-if="error" class="error">{{ error }}</text>
    <view v-if="tab === 'policy' && policies"
      ><text class="heading">服务与隐私说明</text
      ><text class="muted"
        >版本{{ policies.version }} · {{ policies.operator }} ·
        {{ policies.support }}</text
      ><text class="heading small">服务说明</text
      ><text
        v-for="(p, i) in policies.documents.terms"
        :key="'t' + i"
        class="paragraph"
        >{{ p }}</text
      ><text class="heading small">隐私说明</text
      ><text
        v-for="(p, i) in policies.documents.privacy"
        :key="'p' + i"
        class="paragraph"
        >{{ p }}</text
      ></view
    >
    <view v-if="tab === 'feedback'"
      ><text class="heading">反馈与处理进展</text
      ><picker
        :range="['功能问题', '餐厅信息有误', '处理结果申诉']"
        :value="categoryIndex"
        @change="categoryIndex = Number($event.detail.value)"
        ><view class="field">{{
          ["功能问题", "餐厅信息有误", "处理结果申诉"][categoryIndex]
        }}</view></picker
      ><text v-if="restaurantId" class="muted"
        >已关联餐厅{{ restaurantId }}</text
      ><textarea
        v-model="content"
        maxlength="1000"
        placeholder="说明遇到的问题或申诉编号，不要填写密码、证件或私人联系方式"
      /><button :disabled="busy" @tap="run(submitFeedback)">提交反馈</button
      ><view v-for="f in feedbacks" :key="f.id" class="card"
        ><text>#{{ f.id }} · {{ status(f.status) }}</text
        ><text>{{ f.content }}</text
        ><text class="muted"
          >管理员回复：{{ f.reply || "尚未回复" }}</text
        ></view
      ><button
        v-if="feedbackMore"
        :disabled="busy"
        @tap="run(loadMoreFeedback)"
      >
        更多反馈</button
      ><text class="heading small">我的举报结果</text
      ><view v-for="r in reports" :key="r.id" class="card"
        ><text>举报#{{ r.id }} · {{ status(r.status) }}</text
        ><text>{{ r.resolution_note || "等待核验" }}</text
        ><button
          size="mini"
          @tap="
            categoryIndex = 2;
            content = '对举报#' + r.id + '的处理有异议：';
          "
        >
          提出申诉
        </button></view
      ></view
    >
    <view v-if="tab === 'data'"
      ><text class="heading">我的数据与账号</text
      ><view class="card" v-if="account"
        ><text>昵称：{{ account.user.nickname }}</text
        ><text
          >资料确认版本：{{ account.user.consentVersion || "尚未确认" }}</text
        ><text
          >关联饭局{{ account.counts.meals }}场，当前留言{{
            account.counts.messages
          }}条</text
        ><text class="muted"
          >课表、收藏、历史组队和履约可在相应页面查看。</text
        ></view
      ><button :disabled="busy" @tap="clearTimetable">
        清空当前课表和时间设置</button
      ><text class="muted"
        >注销前须处理未结束饭局。注销会撤销会话并清理当前个人数据，历史组队保留匿名关联；历史备份不保证即时物理抹除，详见隐私说明。</text
      ><input
        v-model="deleteText"
        placeholder="确需注销请输入：注销账号"
      /><button
        class="danger"
        :disabled="busy || deleteText !== '注销账号'"
        @tap="deleteAccount"
      >
        注销我的账号
      </button></view
    >
    <view v-if="tab === 'admin' && isAdmin"
      ><text class="heading">反馈与举报处置</text
      ><button :disabled="busy" @tap="run(loadAdmin)">刷新待处理事项</button
      ><view v-for="f in adminFeedback" :key="'f' + f.id" class="card"
        ><text>反馈#{{ f.id }} · {{ f.nickname }} · {{ status(f.status) }}</text
        ><text>{{ f.content }}</text
        ><textarea
          v-model="f.draftReply"
          maxlength="1000"
          placeholder="处理进展或结论，会通知反馈人"
        /><view class="row"
          ><button
            size="mini"
            :disabled="busy"
            @tap="run(() => replyFeedback(f, 'processing'))"
          >
            处理中</button
          ><button
            size="mini"
            :disabled="busy"
            @tap="run(() => replyFeedback(f, 'resolved'))"
          >
            已解决</button
          ><button
            size="mini"
            :disabled="busy"
            @tap="run(() => replyFeedback(f, 'rejected'))"
          >
            不采纳并说明
          </button></view
        ></view
      ><view v-for="r in adminReports" :key="'r' + r.id" class="card"
        ><text>举报#{{ r.id }} · 饭局#{{ r.meal_id }} · {{ r.status }}</text
        ><text>{{ r.reason }} {{ r.detail }}</text
        ><textarea
          v-model="r.reasonText"
          maxlength="500"
          placeholder="核验情况与处理说明；不要包含私人信息"
        /><view class="row"
          ><button
            size="mini"
            :disabled="busy"
            @tap="run(() => resolveReport(r, 'resolved'))"
          >
            处理完成</button
          ><button
            size="mini"
            :disabled="busy"
            @tap="run(() => resolveReport(r, 'dismissed'))"
          >
            驳回并说明</button
          ><button
            size="mini"
            @tap="
              contentType = 0;
              contentId = String(r.meal_id);
              run(loadContent);
            "
          >
            查看相关饭局
          </button></view
        ></view
      ><text class="heading small">违规内容处置</text
      ><text class="muted"
        >仅为核验举报使用；隐藏饭局会取消仍在招募的饭局并通知队员，不扣信用分。恢复展示不会自动重开。</text
      ><picker
        :range="['饭局', '找人帖子', '队内留言']"
        :value="contentType"
        @change="contentType = Number($event.detail.value)"
        ><view class="field">{{
          ["饭局", "找人帖子", "队内留言"][contentType]
        }}</view></picker
      ><input
        v-model="contentId"
        type="number"
        placeholder="内容编号，建议从举报中获取"
      /><button :disabled="busy" @tap="run(loadContent)">查询内容</button
      ><view v-for="item in adminContent" :key="item.id" class="card"
        ><text>#{{ item.id }} · {{ item.hidden_at ? "已隐藏" : "展示中" }}</text
        ><text
          >{{ item.title || item.content }} {{ item.description || "" }}</text
        ><textarea
          v-model="item.reasonText"
          maxlength="500"
          placeholder="公开处理原因，不含私人信息"
        /><button :disabled="busy" @tap="run(() => moderate(item))">
          {{ item.hidden_at ? "恢复展示" : "隐藏并处置" }}
        </button></view
      ></view
    >
    <view v-if="tab === 'correction' && isAdmin"
      ><text class="heading">核验餐厅地址</text
      ><text class="muted"
        >只改核实后的具体分店地址；旧坐标和距离会停用，待重新补全。已发布饭局地址快照不会改变。</text
      ><input v-model="keyword" placeholder="餐厅名称" /><button
        :disabled="busy"
        @tap="run(searchRestaurants)"
      >
        搜索餐厅</button
      ><picker
        :range="restaurants"
        range-key="name"
        :value="restaurantIndex"
        @change="chooseRestaurant(Number($event.detail.value))"
        ><view class="field">{{
          restaurants[restaurantIndex]?.name || "选择餐厅"
        }}</view></picker
      ><picker
        v-if="branches.length"
        :range="branches"
        range-key="name"
        :value="branchIndex"
        @change="branchIndex = Number($event.detail.value)"
        ><view class="field">{{
          branches[branchIndex]?.name || "选择具体分店"
        }}</view></picker
      ><textarea
        v-model="address"
        maxlength="500"
        placeholder="核实后的完整地址"
      /><input v-model="sourceUrl" placeholder="官方或商家HTTPS来源" /><textarea
        v-model="correctionNote"
        maxlength="500"
        placeholder="公开核验说明，不含私人信息"
      /><view class="row"
        ><switch
          :checked="correctionConfirmed"
          @change="correctionConfirmed = $event.detail.value"
        /><text>确认已核验，停用旧坐标和距离</text></view
      ><button :disabled="busy" @tap="run(saveCorrection)">
        保存核验地址
      </button></view
    >
  </view>
</template>
<script>
import { request, authApi } from "../../services/api";
import { goLogin } from "../../services/session";
import { refreshUnread } from "../../services/notification-badge";
export default {
  data() {
    return {
      tab: "policy",
      busy: false,
      error: "",
      isAdmin: false,
      tabs: [
        { code: "policy", name: "服务说明" },
        { code: "feedback", name: "反馈申诉" },
        { code: "data", name: "数据账号" },
        { code: "admin", name: "处理中心" },
        { code: "correction", name: "餐厅纠错" },
      ],
      policies: null,
      categoryIndex: 0,
      restaurantId: "",
      content: "",
      feedbacks: [],
      feedbackMore: false,
      feedbackCursor: null,
      reports: [],
      account: null,
      deleteText: "",
      adminFeedback: [],
      adminReports: [],
      contentType: 0,
      contentId: "",
      adminContent: [],
      restaurants: [],
      restaurantIndex: 0,
      branchIndex: 0,
      keyword: "",
      address: "",
      sourceUrl: "",
      correctionNote: "",
      correctionConfirmed: false,
    };
  },
  computed: {
    visibleTabs() {
      return this.tabs.filter(
        (t) => !["admin", "correction"].includes(t.code) || this.isAdmin,
      );
    },
    branches() {
      return this.restaurants[this.restaurantIndex]?.candidates || [];
    },
  },
  onLoad(q) {
    if (this.tabs.some((t) => t.code === q.tab)) this.tab = q.tab;
    if (q.restaurantId) {
      this.restaurantId = q.restaurantId;
      this.categoryIndex = 1;
      this.tab = "feedback";
    }
  },
  async onShow() {
    if (authApi.token())
      try {
        this.isAdmin = (await authApi.me()).user.isAdmin;
      } catch (e) {
        this.error = e.message;
      }
    this.run(() => this.load());
  },
  methods: {
    status(s) {
      return (
        {
          pending: "待处理",
          processing: "处理中",
          resolved: "已处理",
          rejected: "未采纳",
          dismissed: "举报未成立",
        }[s] || s
      );
    },
    async run(fn) {
      if (this.busy) return;
      this.busy = true;
      this.error = "";
      try {
        await fn();
      } catch (e) {
        this.error = e.message || e.errMsg || "操作失败，请重试";
      } finally {
        this.busy = false;
      }
    },
    change(tab) {
      this.tab = tab;
      this.run(() => this.load());
    },
    async load() {
      if (this.tab === "policy") {
        this.policies = await request("/policies");
        return;
      }
      if (!authApi.token()) {
        goLogin();
        return;
      }
      if (this.tab === "feedback") {
        this.feedbacks = [];
        this.feedbackCursor = null;
        await this.loadMoreFeedback();
        this.reports = (await request("/my-reports")).items;
      }
      if (this.tab === "data") this.account = await request("/account/data");
      if (this.tab === "admin") await this.loadAdmin();
      if (this.tab === "correction") await this.searchRestaurants();
    },
    async loadMoreFeedback() {
      const data = await request(
        "/feedback" +
          (this.feedbackCursor ? "?before=" + this.feedbackCursor : ""),
      );
      this.feedbacks.push(...data.items);
      this.feedbackMore = data.hasMore;
      this.feedbackCursor = data.nextCursor;
    },
    async submitFeedback() {
      await request("/feedback", {
        method: "POST",
        data: {
          category: ["issue", "restaurant", "appeal"][this.categoryIndex],
          restaurantId:
            this.categoryIndex === 1
              ? this.restaurantId || undefined
              : undefined,
          content: this.content,
        },
      });
      this.content = "";
      await this.load();
      uni.showToast({ title: "反馈已提交", icon: "none" });
    },
    clearTimetable() {
      uni.showModal({
        title: "清空课表",
        content: "删除当前课程及时间设置，之后不再按这份课表推荐。",
        success: (r) => {
          if (r.confirm)
            this.run(async () => {
              await request("/account/timetable", { method: "DELETE" });
              await this.load();
              uni.showToast({ title: "课表已清空" });
            });
        },
      });
    },
    deleteAccount() {
      uni.showModal({
        title: "确认注销账号",
        content: "操作不可撤销，请先阅读隐私说明并处理未结束饭局。",
        success: (r) => {
          if (r.confirm)
            this.run(async () => {
              await request("/account", {
                method: "DELETE",
                data: { confirmation: this.deleteText },
              });
              authApi.clear();
              uni.removeStorageSync("returnAfterLogin");
              await refreshUnread();
              uni.reLaunch({ url: "/pages/home/index" });
            });
        },
      });
    },
    async loadAdmin() {
      const [f, r] = await Promise.all([
        request("/admin/feedback"),
        request("/admin/reports"),
      ]);
      this.adminFeedback = f.items.map((x) => ({
        ...x,
        draftReply: x.reply || "",
      }));
      this.adminReports = r.items.map((x) => ({
        ...x,
        reasonText: x.resolution_note || "",
      }));
    },
    async replyFeedback(f, status) {
      await request("/admin/feedback/" + f.id, {
        method: "POST",
        data: { status, reply: f.draftReply },
      });
      await this.loadAdmin();
    },
    async resolveReport(r, status) {
      await request("/admin/reports/" + r.id, {
        method: "POST",
        data: { status, reason: r.reasonText },
      });
      await this.loadAdmin();
    },
    async loadContent() {
      this.adminContent = (
        await request(
          "/admin/content?type=" +
            ["meal", "post", "message"][this.contentType] +
            "&id=" +
            encodeURIComponent(this.contentId),
        )
      ).items.map((x) => ({ ...x, reasonText: "" }));
    },
    async moderate(item) {
      await request("/admin/moderation", {
        method: "POST",
        data: {
          type: ["meal", "post", "message"][this.contentType],
          id: item.id,
          hidden: !item.hidden_at,
          reason: item.reasonText,
        },
      });
      await this.loadContent();
    },
    async searchRestaurants() {
      this.restaurants = (
        await request(
          "/restaurants?pageSize=30&keyword=" +
            encodeURIComponent(this.keyword),
        )
      ).items;
      this.restaurantIndex = 0;
      this.branchIndex = 0;
    },
    chooseRestaurant(i) {
      this.restaurantIndex = i;
      this.branchIndex = 0;
    },
    async saveCorrection() {
      await request(
        "/admin/catalog/" +
          encodeURIComponent(this.restaurants[this.restaurantIndex]?.id || ""),
        {
          method: "PUT",
          data: {
            poiId: this.branches[this.branchIndex]?.poiId || "",
            address: this.address,
            sourceUrl: this.sourceUrl,
            note: this.correctionNote,
            confirmed: this.correctionConfirmed,
          },
        },
      );
      uni.showToast({ title: "地址已更新，旧距离已停用", icon: "none" });
    },
  },
};
</script>
<style scoped>
.page {
  padding: 36rpx;
}
.tabs,
.row {
  display: flex;
  gap: 20rpx;
  flex-wrap: wrap;
}
.tabs text {
  padding: 16rpx 0;
  color: #777;
}
.tabs .active {
  border-bottom: 5rpx solid #ffe733;
  color: #08091f;
}
.heading {
  display: block;
  font-size: 38rpx;
  font-weight: 800;
  margin: 28rpx 0;
}
.small {
  font-size: 30rpx;
}
.paragraph,
.muted {
  display: block;
  color: #666;
  line-height: 1.8;
  margin: 20rpx 0;
  font-size: 26rpx;
}
.card,
.field {
  background: #f7f7fa;
  padding: 24rpx;
  border-radius: 18rpx;
  margin: 20rpx 0;
}
.card text {
  display: block;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.page input,
.page textarea {
  box-sizing: border-box;
  width: 100%;
  padding: 20rpx;
  background: #f6f6f6;
  border-radius: 12rpx;
  margin: 20rpx 0;
}
.page button {
  background: #ffe733;
  border-radius: 28rpx;
  margin: 20rpx 0;
}
.page .danger {
  color: #b33;
}
.error {
  display: block;
  color: #b33;
  white-space: pre-wrap;
}
</style>
