const formatDate = (date) => {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
const weekText = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

// 默认课时（作为fallback）
const DEFAULT_SLOTS = [
  { no: 1, start: "09:00", end: "09:40" },
  { no: 2, start: "09:40", end: "10:20" },
  { no: 3, start: "10:40", end: "11:20" },
  { no: 4, start: "11:20", end: "12:00", divider: true },
  { no: 5, start: "14:00", end: "14:40" },
  { no: 6, start: "14:40", end: "15:20" },
  { no: 7, start: "15:40", end: "16:20" },
  { no: 8, start: "16:20", end: "17:00", divider: true },
  { no: 9, start: "18:00", end: "18:40" },
  { no: 10, start: "18:40", end: "19:20" },
  { no: 11, start: "19:40", end: "20:20" },
  { no: 12, start: "20:20", end: "21:00" },
];

Page({
  data: {
    showMenuPanel: false,
    showWeekSelect: false,
    weekTitle: "第1周(未开学)",
    weekList: [],
    weekDays: [],
    modalShow: false,
    // 当前点击的格子位置（用于添加课程）
    editDay: -1,
    editSlot: -1,
    // 课程列表
    courseList: [],
    // 课时列表（从缓存或默认加载）
    timeSlots: DEFAULT_SLOTS,
    setting: null,
  },

  onShow() {
    const setting = wx.getStorageSync('timetableSetting') || {};
    this.setData({ setting });

    // 加载自定义课时，如果没有则用默认
    const custom = wx.getStorageSync('customTimeSlots');
    const timeSlots = (custom && Array.isArray(custom)) ? custom : DEFAULT_SLOTS.slice();
    this.setData({ timeSlots });

    // 加载课程列表
    const courses = wx.getStorageSync('courseList') || [];
    this.setData({ courseList: courses });

    // 构建周列表和头部信息
    this.buildWeekList(setting.totalWeek || 24);
    this.renderWeekInfo(setting.currentWeek || 0, setting.semesterStart || '2026-09-01');
  },

  buildWeekList(total) {
    const cur = this.data.setting ? this.data.setting.currentWeek : 0;
    const arr = [];
    for (let i = 1; i <= total; i++) {
      arr.push({
        label: `第${i}周`,
        val: i,
        active: cur === i
      });
    }
    this.setData({ weekList: arr });
  },

  renderWeekInfo(curWeek, startDateStr) {
    let titleText = "";
    if (curWeek === 0) {
      titleText = "第1周(未开学)";
    } else {
      titleText = `第${curWeek}周`;
    }
    const start = new Date(startDateStr);
    const monday = new Date(start.getTime() + (curWeek - 1) * 7 * 24 * 3600 * 1000);
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday.getTime() + i * 24 * 3600 * 1000);
      days.push({
        week: weekText[i],
        date: `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      });
    }
    this.setData({
      weekTitle: titleText,
      weekDays: days
    });
  },

  toggleWeekPopup() {
    this.setData({
      showWeekSelect: !this.data.showWeekSelect,
      showMenuPanel: false
    });
  },

  closeWeekPopup() {
    this.setData({ showWeekSelect: false });
  },

  stop() { },

  selectWeek(e) {
    const w = Number(e.currentTarget.dataset.week);
    const s = this.data.setting || {};
    s.currentWeek = w;
    wx.setStorageSync('timetableSetting', s);
    this.renderWeekInfo(w, s.semesterStart || '2026-09-01');
    this.buildWeekList(s.totalWeek || 24);
    this.closeWeekPopup();
  },

  showMenu() {
    this.setData({
      showMenuPanel: !this.data.showMenuPanel,
      showWeekSelect: false
    });
  },

  goSetting() {
    this.setData({ showMenuPanel: false });
    wx.navigateTo({ url: "/pages/setting/setting" });
  },

  // ---- 菜单项功能 ----
  importData() {
    this.setData({ showMenuPanel: false });
    wx.getClipboardData({
      success: res => {
        try {
          const data = JSON.parse(res.data);
          if (Array.isArray(data)) {
            wx.setStorageSync('courseList', data);
            this.setData({ courseList: data });
            wx.showToast({ title: '导入成功' });
          } else {
            wx.showToast({ title: '数据格式错误', icon: 'none' });
          }
        } catch (e) {
          wx.showToast({ title: '剪贴板内容非JSON', icon: 'none' });
        }
      },
      fail: () => {
        wx.showToast({ title: '读取剪贴板失败', icon: 'none' });
      }
    });
  },

  scanCode() {
    this.setData({ showMenuPanel: false });
    wx.scanCode({
      success: (res) => {
        // 可在此解析二维码内容，例如JSON课程数据
        console.log('扫码结果:', res.result);
        wx.showToast({ title: '扫码成功，数据：' + res.result, icon: 'none' });
      },
      fail: () => {
        wx.showToast({ title: '扫码取消', icon: 'none' });
      }
    });
  },

  showQRCode() {
    this.setData({ showMenuPanel: false });
    wx.showToast({ title: '功能开发中', icon: 'none' });
  },

  shareTimetable() {
    this.setData({ showMenuPanel: false });
    wx.showToast({ title: '请点击右上角转发', icon: 'none' });
  },
  // --------------------

  tapCell(e) {
    const { day, slot } = e.currentTarget.dataset;
    this.setData({
      modalShow: true,
      editDay: day,
      editSlot: slot
    });
  },

  closeModal() {
    this.setData({ modalShow: false });
  },

  // 接收子组件确认事件
  confirmCourse(e) {
    const { name, room } = e.detail;
    if (!name) {
      wx.showToast({ title: '请输入课程名', icon: 'none' });
      return;
    }
    const newCourse = {
      id: Date.now(),
      name,
      room: room || '',
      day: this.data.editDay,
      slot: this.data.editSlot
    };
    const list = [...this.data.courseList, newCourse];
    wx.setStorageSync('courseList', list);
    this.setData({ courseList: list, modalShow: false });
    wx.showToast({ title: '添加成功' });
  }
});