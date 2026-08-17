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
    slotList: [],
    groupList: [],
    showPicker: false,
    editIndex: -1,
    editSlot: null,
    startTime: '09:00',
    endTime: '09:40'
  },

  onShow() {
    const custom = wx.getStorageSync('customTimeSlots');
    const list = (custom && Array.isArray(custom)) ? custom : JSON.parse(JSON.stringify(DEFAULT_SLOTS));
    this.setData({ slotList: list });
    this.buildGroup(list);
  },

  buildGroup(slots) {
    const groupList = [
      { title: '上午', list: slots.filter(s => s.no >= 1 && s.no <= 4).map(s => ({ ...s, index: slots.indexOf(s) })) },
      { title: '下午', list: slots.filter(s => s.no >= 5 && s.no <= 8).map(s => ({ ...s, index: slots.indexOf(s) })) },
      { title: '晚上', list: slots.filter(s => s.no >= 9 && s.no <= 12).map(s => ({ ...s, index: slots.indexOf(s) })) }
    ];
    this.setData({ groupList });
  },

  openTimePicker(e) {
    const idx = Number(e.currentTarget.dataset.index);
    const slot = this.data.slotList[idx];
    this.setData({
      editIndex: idx,
      editSlot: slot,
      showPicker: true,
      startTime: slot.start,
      endTime: slot.end
    });
  },

  closePicker() {
    this.setData({ showPicker: false });
  },

  stop() {},

  onStartTimeChange(e) {
    this.setData({ startTime: e.detail.value });
  },

  onEndTimeChange(e) {
    this.setData({ endTime: e.detail.value });
  },

  confirmTime() {
    const i = this.data.editIndex;
    const start = this.data.startTime;
    const end = this.data.endTime;
    if (start >= end) {
      wx.showToast({ title: '开始时间必须早于结束', icon: 'none' });
      return;
    }
    let arr = [...this.data.slotList];
    arr[i].start = start;
    arr[i].end = end;
    this.setData({ slotList: arr });
    this.buildGroup(arr);
    this.closePicker();
    wx.showToast({ title: '已更新', icon: 'none' });
  },

  handleClear() {
    wx.showModal({
      title: '确认清空',
      content: '恢复为默认课时时间？',
      success: res => {
        if (res.confirm) {
          const def = JSON.parse(JSON.stringify(DEFAULT_SLOTS));
          this.setData({ slotList: def });
          this.buildGroup(def);
        }
      }
    });
  },

  handleSave() {
    wx.setStorageSync('customTimeSlots', this.data.slotList);
    wx.showToast({ title: '已保存' });
    setTimeout(() => wx.navigateBack(), 800);
  }
});