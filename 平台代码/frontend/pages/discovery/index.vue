<template>
  <view class="page">
    <view class="tabs"
      ><text
        v-for="tab in visibleTabs"
        :key="tab.code"
        :class="{ active: mode === tab.code }"
        @tap="change(tab.code)"
        >{{ tab.name }}</text
      ></view
    >
    <text class="error" v-if="error">{{ error }}</text>
    <view v-if="mode === 'recommend'">
      <text class="heading">为我推荐</text
      ><text class="muted"
        >规则匹配分不是成功概率；不自动派单，报名仍需审批。</text
      >
      <picker
        :range="campuses"
        range-key="name"
        :value="campusIndex"
        @change="campusIndex = Number($event.detail.value)"
        ><view class="field">{{ campuses[campusIndex].name }}</view></picker
      >
      <input
        v-model="freeMinutes"
        type="number"
        placeholder="手动空闲分钟1–240，留空用课表"
      /><input
        v-model="duration"
        type="number"
        placeholder="饭局预计时长20–180分钟"
      />
      <input v-model="topics" placeholder="想聊的话题，逗号分隔" /><picker
        :range="chatModes"
        range-key="name"
        :value="chatIndex"
        @change="chatIndex = Number($event.detail.value)"
        ><view class="field">{{ chatModes[chatIndex].name }}</view></picker
      ><button :disabled="busy" @tap="run(loadRecommendations)">
        刷新推荐
      </button>
      <view v-if="recommendations"
        ><text class="heading small">{{
          recommendations.availability.source === "unknown"
            ? "空闲时间尚未确认"
            : recommendations.availability.inClass
              ? "课表显示当前在上课"
              : "空闲约" + recommendations.availability.minutes + "分钟"
        }}</text
        ><text class="muted">{{
          recommendations.availability.notes.join("；")
        }}</text>
        <text class="heading small">适合你的饭局</text
        ><view
          v-for="meal in recommendations.meals"
          :key="meal.id"
          class="card"
          @tap="openMeal(meal.id)"
          ><text>{{ meal.title }} · 规则分{{ meal.matchScore }}/100</text
          ><text class="muted">{{ meal.reasons.join("；") }}</text
          ><text>{{ timeText(meal.mealTime) }} · 查看并申请 ›</text></view
        ><text v-if="!recommendations.meals.length" class="muted"
          >暂无合适饭局，可调整条件或自己发起。</text
        >
        <text class="heading small">吃什么推荐</text
        ><view
          v-for="r in recommendations.restaurants"
          :key="r.id"
          class="card"
          @tap="openRestaurant(r.id)"
          ><text>{{ r.name }}</text
          ><text class="muted">{{ r.reasons.join("；") }}</text
          ><text class="muted">{{ r.warnings.join("；") }}</text></view
        ><text v-if="!recommendations.restaurants.length" class="muted"
          >当前时间内没有可判断适合的餐厅，不保证来得及。</text
        >
      </view>
    </view>
    <view v-if="mode === 'schedule'">
      <text class="heading">课表与空闲</text
      ><text class="muted"
        >导入文字版PDF后需核对；示例节次不是学校官方作息。不收集教务密码。</text
      ><button :disabled="busy" @tap="choosePdf">选择PDF并识别</button>
      <view v-for="(course, index) in courses" :key="index" class="card"
        ><input v-model="course.courseName" placeholder="课程名称" /><view
          class="row"
          ><input
            v-model.number="course.dayOfWeek"
            type="number"
            placeholder="星期1–7" /><input
            v-model.number="course.startPeriod"
            type="number"
            placeholder="起始节次" /><input
            v-model.number="course.endPeriod"
            type="number"
            placeholder="结束节次" /></view
        ><input
          v-model="course.weeksText"
          placeholder="周次如1,2,3；留空保守按每周"
        /><picker
          :range="['每周', '单周', '双周']"
          :value="['all', 'odd', 'even'].indexOf(course.weekType || 'all')"
          @change="
            course.weekType = ['all', 'odd', 'even'][
              Number($event.detail.value)
            ]
          "
          ><view class="field">{{
            { all: "每周", odd: "单周", even: "双周" }[course.weekType || "all"]
          }}</view></picker
        ><button size="mini" @tap="courses.splice(index, 1)">
          删除课程
        </button></view
      >
      <button
        size="mini"
        @tap="
          courses.push({
            courseName: '',
            dayOfWeek: 1,
            startPeriod: 1,
            endPeriod: 2,
            weeksText: '',
            weekType: 'all',
          })
        "
      >
        手动添加课程</button
      ><text>第一周周一</text
      ><picker
        mode="date"
        :value="termStartDate"
        @change="termStartDate = $event.detail.value"
        ><view class="field">{{
          termStartDate || "选择第一周周一日期"
        }}</view></picker
      ><text>节次起止时间，每行HH:MM-HH:MM</text
      ><textarea v-model="periodText" class="periods" :maxlength="1000" /><view
        class="row"
        ><switch
          :checked="confirmed"
          @change="confirmed = $event.detail.value"
        /><text>已核对课程、周次和节次时间</text></view
      ><button :disabled="busy" @tap="run(saveSchedule)">
        保存并启用课表推荐
      </button>
    </view>
    <view v-if="mode === 'fulfillment'">
      <text class="heading">履约记录</text
      ><text class="muted"
        >不计算信用分，不凭单方举报扣分；自报到场不等于独立核验。</text
      ><view class="card" v-if="fulfillment"
        ><text
          >完成组队{{ fulfillment.summary.completed }}场 · 退出{{
            fulfillment.summary.left
          }}次 · 发起后取消{{ fulfillment.summary.hostCancelled }}次</text
        ><text
          >收到评价{{ fulfillment.summary.receivedReviews }}条{{
            fulfillment.summary.averageRating === null
              ? ""
              : " · 均分" + fulfillment.summary.averageRating.toFixed(1)
          }}</text
        ></view
      ><view v-for="item in records" :key="item.id" class="card"
        ><text>{{ item.title }}</text
        ><text>{{ item.recordLabel }}</text
        ><text class="muted">{{ item.attendanceLabel }}</text></view
      ><button
        v-if="fulfillment?.hasMore"
        :disabled="busy"
        @tap="run(loadFulfillment)"
      >
        加载更多</button
      ><text v-if="!records.length" class="muted">暂无记录</text>
    </view>
    <view v-if="mode === 'offers'">
      <text class="heading">商家优惠</text
      ><text class="muted">仅信息展示，无在线支付或核销，以商家确认为准。</text
      ><view v-for="offer in offers" :key="offer.id" class="card"
        ><text>{{ offer.title }} · {{ offer.restaurantName }}</text
        ><text>{{ offer.description }}</text
        ><text class="muted">有效至{{ timeText(offer.valid_until) }}</text
        ><button size="mini" @tap="copySource(offer.source_url)">
          复制来源链接以便核对
        </button></view
      ><text v-if="!offers.length" class="muted"
        >暂无核实且有效的优惠，不展示虚构折扣。</text
      >
    </view>
    <view v-if="mode === 'offerAdmin' && isAdmin">
      <text class="heading">优惠信息管理</text
      ><input v-model="restaurantKeyword" placeholder="搜索餐厅名称" /><button
        size="mini"
        @tap="run(loadOfferRestaurants)"
      >
        查找餐厅</button
      ><picker
        :range="offerRestaurants"
        range-key="name"
        :value="offerRestaurantIndex"
        @change="offerRestaurantIndex = Number($event.detail.value)"
        ><view class="field">{{
          offerRestaurants[offerRestaurantIndex]?.name || "先选择餐厅"
        }}</view></picker
      ><input
        v-model="offerForm.title"
        placeholder="优惠标题"
        maxlength="100"
      /><textarea
        v-model="offerForm.description"
        placeholder="真实优惠说明"
        maxlength="1000"
      /><input
        v-model="offerForm.sourceUrl"
        placeholder="来源HTTPS链接"
      /><textarea
        v-model="offerForm.verificationNote"
        placeholder="核验方式和日期，不填私人联系方式"
        maxlength="500"
      /><text>开始日期和时间</text
      ><view class="row"
        ><picker
          mode="date"
          :value="offerFromDate"
          @change="offerFromDate = $event.detail.value"
          ><view class="field">{{ offerFromDate }}</view></picker
        ><picker
          mode="time"
          :value="offerFromTime"
          @change="offerFromTime = $event.detail.value"
          ><view class="field">{{ offerFromTime }}</view></picker
        ></view
      ><text>截止日期和时间</text
      ><view class="row"
        ><picker
          mode="date"
          :value="offerUntilDate"
          @change="offerUntilDate = $event.detail.value"
          ><view class="field">{{ offerUntilDate }}</view></picker
        ><picker
          mode="time"
          :value="offerUntilTime"
          @change="offerUntilTime = $event.detail.value"
          ><view class="field">{{ offerUntilTime }}</view></picker
        ></view
      ><view class="row"
        ><switch
          :checked="offerConfirmed"
          @change="offerConfirmed = $event.detail.value"
        /><text>已向商家或官方来源核验</text></view
      ><button :disabled="busy" @tap="run(() => saveOffer('draft'))">
        保存草稿</button
      ><button :disabled="busy" @tap="run(() => saveOffer('published'))">
        发布优惠</button
      ><view v-for="o in adminOffers" :key="o.id" class="card"
        ><text>{{ o.title }} · {{ o.status }}</text
        ><button
          v-if="o.status !== 'archived'"
          :disabled="busy"
          size="mini"
          @tap="run(() => archiveOffer(o.id))"
        >
          下架
        </button></view
      >
    </view>
  </view>
</template>
<script>
import { request, authApi } from "../../services/api";
import { localTime } from "../../services/time";
const PERIODS =
  "08:00-08:45\n08:55-09:40\n10:00-10:45\n10:55-11:40\n13:30-14:15\n14:25-15:10\n15:30-16:15\n16:25-17:10\n18:30-19:15\n19:25-20:10\n20:20-21:05\n21:15-22:00";
const localNow = new Date();
const today = `${localNow.getFullYear()}-${String(localNow.getMonth() + 1).padStart(2, "0")}-${String(localNow.getDate()).padStart(2, "0")}`;
export default {
  data() {
    return {
      mode: "recommend",
      busy: false,
      error: "",
      isAdmin: false,
      tabs: [
        { code: "recommend", name: "推荐" },
        { code: "schedule", name: "课表" },
        { code: "fulfillment", name: "履约" },
        { code: "offers", name: "优惠" },
        { code: "offerAdmin", name: "优惠管理" },
      ],
      campuses: [
        { name: "按资料 / 全校", code: "" },
        { name: "沙河校区", code: "cufe_shahe" },
        { name: "学院南路校区", code: "cufe_nanlu" },
      ],
      campusIndex: 0,
      chatModes: [
        { name: "聊天不限", code: "" },
        { name: "纯干饭少聊天", code: "quiet" },
        { name: "自在吃饭", code: "balanced" },
        { name: "想聊聊天", code: "chatty" },
      ],
      chatIndex: 0,
      topics: "",
      duration: "60",
      freeMinutes: "",
      recommendations: null,
      courses: [],
      termStartDate: "",
      periodText: PERIODS,
      confirmed: false,
      fulfillment: null,
      records: [],
      offers: [],
      adminOffers: [],
      restaurantKeyword: "",
      offerRestaurants: [],
      offerRestaurantIndex: 0,
      offerForm: {
        title: "",
        description: "",
        sourceUrl: "",
        verificationNote: "",
      },
      offerFromDate: today,
      offerFromTime: "00:00",
      offerUntilDate: today,
      offerUntilTime: "23:59",
      offerConfirmed: false,
    };
  },
  computed: {
    visibleTabs() {
      return this.tabs.filter((t) => t.code !== "offerAdmin" || this.isAdmin);
    },
  },
  onLoad(q) {
    this.mode = [
      "recommend",
      "schedule",
      "fulfillment",
      "offers",
      "offerAdmin",
    ].includes(q.tab)
      ? q.tab
      : "recommend";
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
    timeText: localTime,
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
    change(mode) {
      this.mode = mode;
      this.records = [];
      this.fulfillment = null;
      this.run(() => this.load());
    },
    async load() {
      if (this.mode !== "offers" && !authApi.token()) {
        uni.navigateTo({ url: "/pages/login/index" });
        return;
      }
      if (this.mode === "recommend") return this.loadRecommendations();
      if (this.mode === "schedule") {
        const [data, config] = await Promise.all([
          request("/timetable/mine"),
          request("/schedule/settings"),
        ]);
        this.setCourses(data.courses);
        this.termStartDate = config.settings?.termStartDate || "";
        this.periodText =
          config.settings?.periods?.map((p) => p.join("-")).join("\n") ||
          PERIODS;
        this.confirmed = Boolean(config.settings?.confirmed);
      }
      if (this.mode === "fulfillment") await this.loadFulfillment();
      if (this.mode === "offers")
        this.offers = (await request("/offers")).items;
      if (this.mode === "offerAdmin") {
        this.adminOffers = (await request("/admin/offers")).items;
        await this.loadOfferRestaurants();
      }
    },
    async loadRecommendations() {
      const q = [
        `duration=${encodeURIComponent(this.duration)}`,
        `campus=${this.campuses[this.campusIndex].code}`,
        `chatMode=${this.chatModes[this.chatIndex].code}`,
        `topics=${encodeURIComponent(this.topics)}`,
      ];
      if (this.freeMinutes)
        q.push("freeMinutes=" + encodeURIComponent(this.freeMinutes));
      this.recommendations = await request(
        "/discovery/recommendations?" + q.join("&"),
      );
    },
    openMeal(id) {
      uni.navigateTo({ url: "/pages/meal-detail/index?id=" + id });
    },
    openRestaurant(id) {
      uni.navigateTo({
        url: "/pages/restaurant-detail/index?id=" + encodeURIComponent(id),
      });
    },
    setCourses(courses) {
      this.courses = courses.map((c) => ({
        ...c,
        weeksText: (c.weeks || []).join(","),
        weekType: c.weekType || "all",
      }));
    },
    choosePdf() {
      this.run(async () => {
        const result = await new Promise((resolve, reject) =>
          uni.chooseMessageFile({
            count: 1,
            type: "file",
            extension: ["pdf"],
            success: resolve,
            fail: reject,
          }),
        );
        const file = result.tempFiles?.[0];
        if (!file || file.size > 8 * 1024 * 1024)
          throw new Error("请选择8MB以内的文字版PDF");
        const pdfBase64 = await new Promise((resolve, reject) =>
          uni
            .getFileSystemManager()
            .readFile({
              filePath: file.path,
              encoding: "base64",
              success: (r) => resolve(r.data),
              fail: reject,
            }),
        );
        const data = await request("/timetable/pdf-import", {
          method: "POST",
          data: { fileName: file.name, pdfBase64 },
        });
        this.setCourses(data.courses);
        this.confirmed = false;
        uni.showToast({ title: "已识别，请核对后确认", icon: "none" });
      });
    },
    async saveSchedule() {
      const courses = this.courses.map((c) => ({
        courseName: c.courseName,
        dayOfWeek: Number(c.dayOfWeek),
        startPeriod: Number(c.startPeriod),
        endPeriod: Number(c.endPeriod),
        weeks: c.weeksText
          .split(/[,，、]/)
          .filter((x) => x.trim())
          .map(Number),
        weekType: c.weekType,
      }));
      await request("/timetable/import", { method: "POST", data: { courses } });
      await request("/schedule/settings", {
        method: "PUT",
        data: {
          termStartDate: this.termStartDate,
          periods: this.periodText
            .split("\n")
            .filter((x) => x.trim())
            .map((x) => x.trim().split("-")),
          confirmed: this.confirmed,
        },
      });
      uni.showToast({ title: "课表推荐已启用", icon: "none" });
    },
    async loadFulfillment() {
      const data = await request(
        "/profile/fulfillment" +
          (this.fulfillment?.nextCursor
            ? "?before=" + this.fulfillment.nextCursor
            : ""),
      );
      this.records.push(...data.items);
      this.fulfillment = data;
    },
    copySource(url) {
      uni.setClipboardData({ data: url });
    },
    async loadOfferRestaurants() {
      this.offerRestaurants = (
        await request(
          "/restaurants?pageSize=30&keyword=" +
            encodeURIComponent(this.restaurantKeyword),
        )
      ).items;
      this.offerRestaurantIndex = 0;
    },
    async saveOffer(status) {
      await request("/admin/offers", {
        method: "POST",
        data: {
          ...this.offerForm,
          restaurantId: this.offerRestaurants[this.offerRestaurantIndex]?.id,
          status,
          confirmed: this.offerConfirmed,
          validFrom: new Date(
            this.offerFromDate + "T" + this.offerFromTime + ":00",
          ).toISOString(),
          validUntil: new Date(
            this.offerUntilDate + "T" + this.offerUntilTime + ":00",
          ).toISOString(),
        },
      });
      this.adminOffers = (await request("/admin/offers")).items;
      uni.showToast({ title: "已保存", icon: "none" });
    },
    async archiveOffer(id) {
      await request("/admin/offers/" + id + "/archive", { method: "POST" });
      this.adminOffers = (await request("/admin/offers")).items;
    },
  },
};
</script>
<style scoped>
.page {
  padding: 32rpx;
}
.tabs,
.row {
  display: flex;
  gap: 16rpx;
  flex-wrap: wrap;
}
.tabs text {
  padding: 16rpx 0;
  color: #777;
}
.tabs .active {
  color: #08091f;
  border-bottom: 5rpx solid #ffe733;
}
.heading {
  display: block;
  font-size: 40rpx;
  font-weight: 800;
  margin: 24rpx 0;
}
.heading.small {
  font-size: 30rpx;
}
.muted {
  display: block;
  color: #888;
  font-size: 25rpx;
  line-height: 1.7;
  margin: 14rpx 0;
}
.card,
.field {
  padding: 24rpx;
  border-radius: 18rpx;
  background: #f7f7fa;
  margin: 20rpx 0;
}
.card text {
  display: block;
}
.page input,
.page textarea {
  box-sizing: border-box;
  width: 100%;
  background: #f6f6f6;
  padding: 20rpx;
  border-radius: 12rpx;
  margin: 16rpx 0;
}
.row input {
  width: 28%;
}
.page .periods {
  height: 480rpx;
}
.page button {
  margin: 20rpx 0;
  background: #ffe733;
  border-radius: 28rpx;
}
.error {
  display: block;
  color: #b33;
  white-space: pre-wrap;
}
</style>
