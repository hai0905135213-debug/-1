<template>
  <view class="page"
    ><text class="heading">发起预约饭局</text
    ><text class="muted">报名需你审批，人数包含自己。</text
    ><picker :range="['预约招募','限时15分钟招募（仍需审批）']" :value="recruitIndex" @change="recruitIndex=Number($event.detail.value)"><view class="field">{{recruitIndex?'限时15分钟招募（仍需审批）':'预约招募'}}</view></picker><text v-if="recruitIndex" class="muted">服务器自动限制报名截止为发布后15分钟或就餐时间，不是自动派单。</text><text v-if="venue" class="venue">已选：{{ venue.name }}</text
    ><button v-if="venue" size="mini" @tap="venue = null">改为手填地点</button
    ><input
      v-model="form.title"
      placeholder="饭局标题"
      maxlength="100"
    /><picker
      :range="campuses"
      range-key="name"
      :value="campusIndex"
      @change="campusIndex = Number($event.detail.value)"
      ><view class="field">{{ campuses[campusIndex].name }} ⌄</view></picker
    ><input
      v-if="!venue"
      v-model="form.place"
      placeholder="餐厅及详细地点"
      maxlength="500"
    /><text>就餐时间</text
    ><view class="row"
      ><picker class="row-item" mode="date" :value="date" @change="date = $event.detail.value"
        ><view class="field">{{ date }}</view></picker
      ><picker class="row-item" mode="time" :value="time" @change="time = $event.detail.value"
        ><view class="field">{{ time }}</view></picker
      ></view
    ><text>报名截止（默认就餐时）</text
    ><switch
      :checked="earlyDeadline"
      @change="earlyDeadline = $event.detail.value"
    /><view v-if="earlyDeadline" class="row"
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
    ><input
      v-model="form.maxPeople"
      type="number"
      placeholder="总人数 2–12，包含自己"
    /><view class="row"
      ><input
        class="row-item"
        v-model="form.budgetMin"
        type="digit"
        placeholder="每人最低预算（元）" /><input
        class="row-item"
        v-model="form.budgetMax"
        type="digit"
        placeholder="每人最高预算（元）" /></view
    ><picker
      :range="chatModes"
      range-key="name"
      @change="chatIndex = Number($event.detail.value)"
      ><view class="field">{{ chatModes[chatIndex].name }} ⌄</view></picker
    ><input v-model="topics" placeholder="话题，以逗号分隔，最多5个" /><textarea
      v-model="form.description"
      maxlength="1000"
      placeholder="公开说明：口味、忌口、约饭偏好"
    /><textarea
      v-model="form.meetingNote"
      maxlength="500"
      placeholder="集合说明，仅正式队员可见"
    /><button :disabled="busy" class="primary" @tap="submit">
      {{ busy ? "发布中…" : "发布，等待队友申请" }}</button
    ><text class="error">{{ error }}</text></view
  >
</template>
<script>
import { mealApi } from "../../services/api";
const tomorrow = new Date(Date.now() + 86400000);
const day = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, "0")}-${String(tomorrow.getDate()).padStart(2, "0")}`;
export default {
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
          recruitMode: this.recruitIndex ? 'limited' : 'appointment',
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
.page {
  padding: 40rpx 32rpx;
}
.heading {
  display: block;
  font-size: 40rpx;
  font-weight: 800;
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
  background: #faf7ed;
  border-radius: 14rpx;
  margin: 18rpx 0;
}
.page input,
.page textarea {
  box-sizing: border-box;
  width: 100%;
  padding: 24rpx;
  background: #f5f5f7;
  border-radius: 14rpx;
  margin: 18rpx 0;
}
.page textarea {
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
  background: #ffe388;
}
.error {
  color: #b33;
  display: block;
  margin-top: 24rpx;
}
</style>
