App({
  onLaunch() {
    // 初始化本地默认配置
    const setting = wx.getStorageSync('timetableSetting')
    if (!setting) {
      const defaultSetting = {
        currentSemester:"2026-2027 第1学期",
        semesterStart:"2026-09-01",
        totalWeek:24,
        currentWeek:0, // 0=未开学，1~24对应周数
        alertEnable:false
      }
      wx.setStorageSync('timetableSetting', defaultSetting)
    }
    // 课程数据
    if(!wx.getStorageSync('courseList')){
      wx.setStorageSync('courseList', [])
    }
  },
  globalData:{

  }
})
