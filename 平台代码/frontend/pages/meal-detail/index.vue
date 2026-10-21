<template>
  <view v-if="meal" class="page meal-detail-page"
    ><view class="meal-cover"
      ><text class="cover-eyebrow">饭饭之交 · 预约组队</text
      ><text class="cover-title">约一顿好饭</text
      ><text class="cover-caption">和合拍的人，把饭吃好。</text
      ><view class="cover-plate"><view class="plate-inner" /></view></view
    ><view class="meal-body"
      ><text class="heading">{{ meal.title }}</text
      ><text class="badge"
        >{{
          meal.status === "open" && meal.recruitmentClosed
            ? "报名已截止"
            : statusName(meal.status)
        }}
        · {{ meal.currentPeople }}/{{ meal.maxPeople }}人</text
      ><text class="line">{{ meal.place }}</text
      ><text class="line">就餐：{{ timeText(meal.mealTime) }}</text
      ><text class="line">报名截止：{{ timeText(meal.deadline) }}</text
      ><text class="line muted">{{ recruitmentText }}</text
      ><text class="muted" v-if="meal.recruitMode === 'limited'"
        >限时15分钟招募 ·
        {{ meal.recruitmentClosed ? "报名已截止" : "仍需发起人审批" }}</text
      ><text class="line"
        >预算：每人 {{ meal.budgetMin }}–{{ meal.budgetMax }} 元</text
      ><text class="line">{{ meal.description }}</text
      ><view class="tags"
        ><text v-for="tag in meal.topicTags" :key="tag">{{ tag }} </text></view
      ><text class="line"
        >队友：{{ meal.participants.map((p) => p.nickname).join("、") }}</text
      ><text v-if="meal.joined" class="line"
        >集合说明：{{ meal.meetingNote || "发起人尚未补充" }}</text
      >
      <view class="actions">
        <button open-type="share" v-if="!meal.moderated">
          邀请同学查看这个饭局</button
        ><text v-if="meal.moderated" class="error"
          >管理员处置：{{ meal.moderationReason }}</text
        >
        <template v-if="isHost"
          ><button v-if="active" @tap="goApplications">
            管理申请（{{ meal.pendingCount }}）</button
          ><button
            v-if="active"
            @tap="confirmAction('cancel', '确定取消饭局？')"
          >
            取消饭局</button
          ><button
            v-if="
              active &&
              Date.now() >= Date.parse(meal.mealTime) &&
              meal.currentPeople >= 2
            "
            @tap="confirmAction('finish', '确认已完成就餐？')"
          >
            标记完成
          </button></template
        >
        <template v-else
          ><view v-if="canApply && meal.applicationStatus !== 'pending'">
            <textarea
              v-model="applicationNote"
              maxlength="200"
              placeholder="报名说明（选填）：介绍口味、希望的聊天氛围，勿填私人联系方式"
            />
            <text class="muted"
              >{{ applicationNote.length }}/200 ·
              发起人审批后才成为正式成员</text
            > </view
          ><button
            v-if="meal.applicationStatus === 'pending'"
            @tap="act('withdraw')"
            :disabled="acting"
          >
            撤回申请</button
          ><button
            v-else-if="
              meal.joined && active && Date.now() < Date.parse(meal.mealTime)
            "
            @tap="confirmAction('leave', '确定退出饭局？')"
            :disabled="acting"
          >
            退出饭局</button
          ><button
            v-else-if="canApply"
            class="primary"
            @tap="apply"
            :disabled="acting"
          >
            申请加入</button
          ><text v-if="meal.applicationStatus === 'rejected'"
            >本场申请未通过</text
          ></template
        >
        <button v-if="isHost && active" @tap="publishPost">发到找人帖子</button
        ><button @tap="act('save')">收藏 / 取消收藏</button
        ><button v-if="!isHost" @tap="report">举报问题</button>
      </view>
      <view v-if="meal.joined" class="message-area"
        ><button v-if="meal.status !== 'cancelled'" @tap="checkIn">
          本人自报到场</button
        ><text class="muted"
          >仅就餐前30分钟至开始后4小时；非GPS核验，不影响信用分。</text
        ><text class="section">队内留言</text
        ><view v-for="message in messages" :key="message.id" class="message"
          ><text class="muted"
            >{{ message.nickname }} · {{ timeText(message.created_at) }}</text
          ><text>{{ message.content }}</text></view
        ><button v-if="moreMessages" size="mini" @tap="loadMessages">
          加载后续留言</button
        ><view v-if="active">
          <textarea
            v-model="messageText"
            maxlength="500"
            placeholder="集合、点菜或到达时间（最多500字）"
          /><button :disabled="sending" @tap="sendMessage">
            发送留言
          </button></view
        ><text v-else class="muted">饭局已结束，留言只读。</text></view
      >
      <view v-if="meal.status === 'finished' && meal.joined"
        ><text class="section">评价队友</text
        ><picker
          :range="reviewTargets"
          range-key="nickname"
          @change="reviewIndex = Number($event.detail.value)"
          ><view class="field"
            >{{
              reviewTargets[reviewIndex]?.nickname || "没有可评价成员"
            }}
            ⌄</view
          ></picker
        ><picker
          :range="[1, 2, 3, 4, 5]"
          :value="rating - 1"
          @change="rating = Number($event.detail.value) + 1"
          ><view class="field">{{ rating }} 星 ⌄</view></picker
        ><textarea
          v-model="reviewContent"
          maxlength="500"
          placeholder="就餐体验"
        /><button @tap="review">提交评价</button></view
      >
      <text class="error">{{ error }}</text></view
    ></view
  ><view v-else class="page" @tap="load">{{ error || "加载中…" }}</view>
</template>
<script>
import { mealApi, request } from "../../services/api";
import { teamApi } from "../../services/team";
import { localTime } from "../../services/time";
import { recruitmentHint } from "../../services/meal-state.mjs";
export default {
  data() {
    return {
      id: "",
      meal: null,
      currentUser: null,
      error: "",
      messages: [],
      cursor: 0,
      moreMessages: false,
      messageText: "",
      sending: false,
      acting: false,
      applicationNote: "",
      clock: Date.now(),
      poll: null,
      reviewIndex: 0,
      rating: 5,
      reviewContent: "",
    };
  },
  computed: {
    recruitmentText() {
      return recruitmentHint(this.meal, this.clock);
    },
    canApply() {
      return (
        this.meal?.status === "open" &&
        !this.meal.recruitmentClosed &&
        this.clock < Date.parse(this.meal.deadline) &&
        !this.meal.joined &&
        this.meal.applicationStatus !== "rejected"
      );
    },
    isHost() {
      return this.meal?.creatorId === this.currentUser?.id;
    },
    active() {
      return ["open", "matched"].includes(this.meal?.status);
    },
    reviewTargets() {
      return (this.meal?.participants || []).filter(
        (p) => p.id !== this.currentUser?.id,
      );
    },
  },
  onLoad(q) {
    this.id = q.id;
  },
  onShow() {
    this.currentUser = uni.getStorageSync("currentUser") || null;
    this.load();
    clearInterval(this.poll);
    this.clock = Date.now();
    this.poll = setInterval(() => {
      this.clock = Date.now();
      this.refreshMessages();
    }, 5000);
  },
  onHide() {
    clearInterval(this.poll);
  },
  onUnload() {
    clearInterval(this.poll);
  },
  onShareAppMessage() {
    return {
      title:
        this.meal && !this.meal.moderated
          ? this.meal.title
          : "饭饭之交·一起吃饭",
      path: "/pages/meal-detail/index?id=" + encodeURIComponent(this.id),
    };
  },
  methods: {
    async checkIn() {
      try {
        const result = await request(`/meals/${this.id}/check-in`, {
          method: "POST",
        });
        uni.showToast({ title: result.label, icon: "none" });
      } catch (e) {
        this.error = e.message;
      }
    },
    statusName(s) {
      return (
        {
          open: "招募中",
          matched: "已成局",
          cancelled: "已取消",
          finished: "已完成",
        }[s] || s
      );
    },
    timeText: localTime,
    async load() {
      try {
        this.meal = (await mealApi.detail(this.id)).meal;
        this.error = "";
        if (this.meal.joined) await this.loadMessages();
      } catch (e) {
        this.error = e.message;
      }
    },
    async apply() {
      if (this.acting) return;
      this.acting = true;
      try {
        await teamApi.apply(this.id, this.applicationNote.trim());
        this.applicationNote = "";
        uni.showToast({ title: "已申请，等待审批", icon: "none" });
        await this.load();
      } catch (e) {
        this.error = e.message;
      } finally {
        this.acting = false;
      }
    },
    async publishPost() {
      try {
        await request("/posts", {
          method: "POST",
          data: {
            mealId: this.id,
            content: this.meal.description || this.meal.title,
          },
        });
        uni.showToast({ title: "已发到找人" });
      } catch (e) {
        this.error = e.message;
      }
    },
    async act(action) {
      if (this.acting) return;
      this.acting = true;
      try {
        await teamApi.action(this.id, action);
        await this.load();
      } catch (e) {
        this.error = e.message;
      } finally {
        this.acting = false;
      }
    },
    confirmAction(action, content) {
      uni.showModal({
        title: "确认操作",
        content,
        success: (r) => {
          if (r.confirm) this.act(action);
        },
      });
    },
    goApplications() {
      uni.navigateTo({ url: "/pages/team-applications/index?id=" + this.id });
    },
    async refreshMessages() {
      try {
        const latest = (await mealApi.detail(this.id)).meal;
        this.meal = latest;
        if (!latest.joined) {
          this.messages = [];
          this.cursor = 0;
          return;
        }
        if (this.active) await this.loadMessages();
      } catch {}
    },
    async loadMessages() {
      if (!this.meal?.joined) return;
      try {
        const result = await teamApi.messages(this.id, this.cursor);
        this.messages.push(
          ...result.items.filter(
            (x) => !this.messages.some((m) => m.id === x.id),
          ),
        );
        this.cursor = result.nextCursor;
        this.moreMessages = result.hasMore;
      } catch (e) {
        this.messages = [];
        this.error = e.message;
      }
    },
    async sendMessage() {
      if (this.sending) return;
      this.sending = true;
      try {
        await teamApi.message(this.id, this.messageText);
        this.messageText = "";
        await this.loadMessages();
      } catch (e) {
        this.error = e.message;
      } finally {
        this.sending = false;
      }
    },
    async review() {
      try {
        await mealApi.review(this.id, {
          targetUserId: this.reviewTargets[this.reviewIndex]?.id,
          rating: this.rating,
          content: this.reviewContent,
        });
        uni.showToast({ title: "评价已提交" });
      } catch (e) {
        this.error = e.message;
      }
    },
    report() {
      uni.showModal({
        title: "举报原因",
        editable: true,
        placeholderText: "描述问题",
        success: async (r) => {
          if (!r.confirm) return;
          try {
            await request(`/meals/${this.id}/reports`, {
              method: "POST",
              data: { targetUserId: this.meal.creatorId, reason: r.content },
            });
            uni.showToast({ title: "已提交管理员" });
          } catch (e) {
            this.error = e.message;
          }
        },
      });
    },
  },
};
</script>
<style scoped>
.page {
  padding: 36rpx 32rpx;
}
.meal-detail-page {
  padding: 0 0 50rpx;
}
.meal-cover {
  position: relative;
  overflow: hidden;
  padding: 40rpx 36rpx 60rpx;
  background: #fff6c9;
  min-height: 245rpx;
  box-sizing: border-box;
}
.cover-eyebrow {
  display: block;
  font-size: 22rpx;
  color: #93814a;
}
.cover-title {
  display: block;
  font-size: 48rpx;
  font-weight: 900;
  margin: 18rpx 0 10rpx;
}
.cover-caption {
  font-size: 24rpx;
  color: #998956;
}
.cover-plate {
  position: absolute;
  width: 225rpx;
  height: 225rpx;
  right: -28rpx;
  top: 46rpx;
  border: 12rpx solid rgba(255, 255, 255, 0.7);
  border-radius: 50%;
  background: #fff9e3;
  transform: rotate(-18deg);
}
.plate-inner {
  margin: 28rpx;
  border: 2rpx solid #eedfa5;
  border-radius: 50%;
  width: 140rpx;
  height: 140rpx;
}
.meal-body {
  position: relative;
  margin-top: -24rpx;
  border-radius: 32rpx 32rpx 0 0;
  background: #fff;
  padding: 36rpx;
}
.heading {
  display: block;
  font-size: 42rpx;
  font-weight: 800;
  margin-bottom: 20rpx;
}
.badge {
  background: #fff0bc;
  padding: 10rpx 20rpx;
  border-radius: 20rpx;
}
.line {
  display: block;
  margin: 24rpx 0;
  line-height: 1.7;
}
.actions button {
  margin: 16rpx 0;
  border: 1rpx solid #e6e7ec;
  border-radius: 32rpx;
  padding: 14rpx 24rpx;
  font-size: 26rpx;
  line-height: 1.8;
  background: #fff;
}
.primary {
  background: #ffe733;
}
.actions button.primary {
  background: #ffe733;
  border-color: #ffe733;
  font-weight: 800;
}
.section {
  display: block;
  font-size: 32rpx;
  font-weight: 700;
  margin: 36rpx 0 20rpx;
}
.message {
  background: #f7f7fa;
  padding: 20rpx;
  border-radius: 16rpx;
  margin: 14rpx 0;
}
.message text {
  display: block;
  white-space: pre-wrap;
  word-break: break-all;
}
.muted {
  color: #888;
  font-size: 24rpx;
}
.page textarea {
  box-sizing: border-box;
  width: 100%;
  height: 150rpx;
  padding: 22rpx;
  background: #fff;
  border: 1rpx solid #e6e7ec;
  border-radius: 18rpx;
  margin: 20rpx 0;
}
.field {
  padding: 20rpx;
  background: #f7f7f7;
  margin: 16rpx 0;
}
.message-area {
  margin-top: 36rpx;
  border-top: 1rpx solid #eeeef2;
}
.message-area button {
  font-size: 25rpx;
  line-height: 1.8;
  border: 1rpx solid #e7e7ee;
  border-radius: 28rpx;
  padding: 13rpx 20rpx;
  margin: 20rpx 0;
}
.message-area button:last-child {
  background: #ffe733;
  border-color: #ffe733;
  font-weight: 800;
}
.tags text {
  display: inline-block;
  padding: 8rpx 15rpx;
  background: #fff8d9;
  border-radius: 12rpx;
  font-size: 23rpx;
  color: #958035;
  margin-right: 12rpx;
}
.error {
  display: block;
  color: #b33;
  margin: 24rpx 0;
}
</style>
