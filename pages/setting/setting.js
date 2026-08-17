Page({
  data: {
    startDate: '',
    totalWeek: 24,
    totalWeekIdx: 23,               // 默认第24周（下标23）
    weekRange: [],                  // 1~40周
  },

  onShow() {
    // 生成周数选项 1~40
    const weekRange = Array.from({ length: 40 }, (_, i) => i + 1);
    this.setData({ weekRange });

    const setting = wx.getStorageSync('timetableSetting') || {};
    const { semesterStart, totalWeek } = setting;
    const total = totalWeek || 24;
    this.setData({
      startDate: semesterStart || '2026-09-01',
      totalWeek: total,
      totalWeekIdx: total - 1,
    });
  },

  onStartDateChange(e) {
    const val = e.detail.value;
    this.setData({ startDate: val });
    this.saveSetting();
  },

  onTotalWeekChange(e) {
    const idx = e.detail.value;
    const total = this.data.weekRange[idx];
    this.setData({ totalWeek: total, totalWeekIdx: idx });
    this.saveSetting();
  },

  saveSetting() {
    const setting = wx.getStorageSync('timetableSetting') || {};
    setting.semesterStart = this.data.startDate;
    setting.totalWeek = this.data.totalWeek;
    wx.setStorageSync('timetableSetting', setting);
    wx.showToast({ title: '已保存' });
  },

  goTimeEdit() {
    wx.navigateTo({ url: '/pages/timeEdit/timeEdit' });
  }
});