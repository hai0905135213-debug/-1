<template>
  <view class="publish-page"
    ><text class="heading">发布饭局</text
    ><text class="publish-description"
      >把吃什么、几点、哪里、几个人先说清楚。</text
    ><view class="publish-form"
      ><text class="form-label">招募方式</text
      ><picker
        :range="['预约招募', '限时15分钟招募（仍需审批）']"
        :value="recruitIndex"
        @change="recruitIndex = Number($event.detail.value)"
        ><view class="field">{{
          recruitIndex ? "限时15分钟招募（仍需审批）" : "预约招募"
        }}</view></picker
      ><text v-if="recruitIndex" class="muted"
        >服务器自动限制报名截止为发布后15分钟或就餐时间，不是自动派单。</text
      ><text v-if="venue" class="venue">已选：{{ venue.name }}</text
      ><button v-if="venue" size="mini" @tap="venue = null">改为手填地点</button
      ><text class="form-label">饭局标题</text
      ><input
        v-model="form.title"
        placeholder="饭局标题"
        maxlength="100"
      /><text class="form-label">就餐校区</text
      ><picker
        :range="campuses"
        range-key="name"
        :value="campusIndex"
        @change="campusIndex = Number($event.detail.value)"
        ><view class="field">{{ campuses[campusIndex].name }} ⌄</view></picker
      ><text v-if="!venue" class="form-label">餐厅及地点</text
      ><input
        v-if="!venue"
        v-model="form.place"
        placeholder="餐厅及详细地点"
        maxlength="500"
      /><text class="form-label">就餐时间</text
      ><view class="row"
        ><picker
          class="row-item"
          mode="date"
          :value="date"
          @change="date = $event.detail.value"
          ><view class="field">{{ date }}</view></picker
        ><picker
          class="row-item"
          mode="time"
          :value="time"
          @change="time = $event.detail.value"
          ><view class="field">{{ time }}</view></picker
        ></view
      ><view class="deadline-option"
        ><text class="form-label"
          >提前截止报名 <text class="optional">默认就餐时截止</text></text
        ><switch
          :checked="earlyDeadline"
          @change="earlyDeadline = $event.detail.value" /></view
      ><view v-if="earlyDeadline" class="row"
        ><picker
          class="row-item"
          mode="date"
          :value="deadlineDate"
          @change="deadlineDate = $event.detail.value"
          ><view class="field">{{ deadlineDate }}</view></picker
        ><picker
          class="row-item"
          mode="time"
          :value="deadlineTime"
          @change="deadlineTime = $event.detail.value"
          ><view class="field">{{ deadlineTime }}</view></picker
        ></view
      ><text class="form-label"
        >总人数 <text class="optional">2–12人，包含自己</text></text
      ><input
        v-model="form.maxPeople"
        type="number"
        placeholder="总人数 2–12，包含自己"
      /><text class="form-label">每人预算（元）</text
      ><view class="row"
        ><input
          class="row-item"
          v-model="form.budgetMin"
          type="digit"
          placeholder="每人最低预算（元）" /><input
          class="row-item"
          v-model="form.budgetMax"
          type="digit"
          placeholder="每人最高预算（元）" /></view
      ><text class="form-label">聊天氛围</text
      ><picker
        :range="chatModes"
        range-key="name"
        @change="chatIndex = Number($event.detail.value)"
        ><view class="field">{{ chatModes[chatIndex].name }} ⌄</view></picker
      ><text class="form-label"
        >想聊的话题 <text class="optional">选填</text></text
      ><input v-model="topics" placeholder="话题，以逗号分隔，最多5个" /><text
        class="form-label"
        >公开补充说明</text
      ><textarea
        v-model="form.description"
        maxlength="1000"
        placeholder="公开说明：口味、忌口、约饭偏好"
      /><text class="form-label"
        >集合说明 <text class="optional">仅正式队员可见</text></text
      ><textarea
        v-model="form.meetingNote"
        maxlength="500"
        placeholder="集合说明，仅正式队员可见"
      /><button :disabled="busy" class="primary" @tap="submit">
        {{ busy ? "发布中…" : "发布，等待队友申请" }}</button
      ><text class="error">{{ error }}</text></view
    ><AppTabBar active="publish"
  /></view>
</template>
<script>
import { mealApi } from "../../services/api";
import AppTabBar from "../../components/AppTabBar.vue";
const tomorrow = new Date(Date.now() + 86400000);
const day = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, "0")}-${String(tomorrow.getDate()).padStart(2, "0")}`;
export default {
  components: { AppTabBar },
  data() {
    return {
      venue: null,
      recruitIndex: 0,
      campuses: [
        { name: "沙河校区", code: "cufe_shahe" },
        { name: "学院南路校区", code: "cufe_nanlu" },
      ],
      campusIndex: 0,
      chatModes: [
        { name: "自在吃饭", code: "balanced" },
        { name: "纯干饭少聊天", code: "quiet" },
        { name: "想聊聊天", code: "chatty" },
      ],
      chatIndex: 0,
      date: day,
      time: "18:00",
      earlyDeadline: false,
      deadlineDate: day,
      deadlineTime: "17:00",
      topics: "",
      busy: false,
      error: "",
      form: {
        title: "",
        place: "",
        maxPeople: "4",
        budgetMin: "",
        budgetMax: "",
        description: "",
        meetingNote: "",
      },
    };
  },
  onShow() {
    uni.hideTabBar({ animation: false, fail: () => {} });
    const draft = uni.getStorageSync("mealDraftVenue");
    if (draft) {
      this.venue = draft;
      this.form.title = "一起吃" + draft.name;
      this.campusIndex = draft.campus === "cufe_nanlu" ? 1 : 0;
      uni.removeStorageSync("mealDraftVenue");
    }
  },
  methods: {
    async submit() {
      if (this.busy) return;
      this.busy = true;
      this.error = "";
      try {
        const mealTime = new Date(`${this.date}T${this.time}:00`).toISOString();
        const deadline = this.earlyDeadline
          ? new Date(
              `${this.deadlineDate}T${this.deadlineTime}:00`,
            ).toISOString()
          : mealTime;
        const data = await mealApi.create({
          ...this.form,
          recruitMode: this.recruitIndex ? "limited" : "appointment",
          maxPeople: Number(this.form.maxPeople),
          budgetMin: Number(this.form.budgetMin),
          budgetMax: Number(this.form.budgetMax),
          mealTime,
          deadline,
          campus: this.campuses[this.campusIndex].code,
          chatMode: this.chatModes[this.chatIndex].code,
          topicTags: this.topics
            .split(/[,，、]/)
            .map((x) => x.trim())
            .filter(Boolean),
          restaurantId: this.venue?.restaurantId,
          poiId: this.venue?.poiId,
        });
        uni.navigateTo({ url: "/pages/meal-detail/index?id=" + data.meal.id });
      } catch (e) {
        this.error = e.message || "时间格式无效";
      } finally {
        this.busy = false;
      }
    },
  },
};
</script>
<style scoped>
.publish-page {
  padding: 46rpx 36rpx calc(180rpx + env(safe-area-inset-bottom));
}
.heading {
  display: block;
  font-size: 48rpx;
  font-weight: 900;
}
.muted {
  display: block;
  color: #888;
  margin: 16rpx 0;
}
.venue,
.field {
  display: block;
  padding: 22rpx;
  background: #fff;
  border: 1rpx solid #e7e7ec;
  border-radius: 18rpx;
  margin: 12rpx 0 28rpx;
  font-size: 27rpx;
}
.publish-form input,
.publish-form textarea {
  box-sizing: border-box;
  width: 100%;
  padding: 24rpx;
  background: #fff;
  border: 1rpx solid #e7e7ec;
  border-radius: 18rpx;
  margin: 12rpx 0 28rpx;
  font-size: 27rpx;
  min-height: 82rpx;
}
.publish-form textarea {
  height: 150rpx;
}
.row {
  display: flex;
  gap: 16rpx;
}
.row-item {
  flex: 1;
  min-width: 0;
}
.primary {
  background: #ffe733;
  border-radius: 44rpx;
  height: 88rpx;
  line-height: 88rpx;
  font-size: 29rpx;
  font-weight: 900;
  margin-top: 22rpx;
}
.publish-form button {
  border: 1rpx solid #e7e7ec;
  border-radius: 30rpx;
  background: #fff;
  font-size: 25rpx;
  line-height: 1.8;
  padding: 10rpx 22rpx;
}
.publish-form .primary {
  background: #ffe733;
  border-color: #ffe733;
  border-radius: 44rpx;
  padding: 0;
  font-size: 29rpx;
  line-height: 88rpx;
}
.error {
  color: #b33;
  display: block;
  margin-top: 24rpx;
}
.publish-description {
  display: block;
  font-size: 26rpx;
  line-height: 1.7;
  color: #8e8f98;
  margin: 16rpx 0 40rpx;
}
.form-label {
  display: block;
  font-size: 27rpx;
  font-weight: 700;
  line-height: 1.7;
}
.optional {
  font-size: 22rpx;
  color: #9a9ca7;
  font-weight: 400;
  margin-left: 12rpx;
}
.deadline-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 10rpx 0 30rpx;
}
.deadline-option .form-label {
  margin: 0;
}
</style>
