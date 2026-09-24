const XLSX = require('../../utils/xlsx.mini.min.js');
const weekText = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

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

const COLORS = [
  '#e3f2fd', '#e8f5e9', '#fff3e0', '#fce4ec', '#f3e5f5',
  '#e0f7fa', '#f1f8e9', '#fbe9e7', '#ede7f6', '#f9fbe7',
  '#e0f2f1', '#f3e5f5', '#ffebee', '#e8eaf6', '#fff8e1'
];

Page({
  data: {
    showMenuPanel: false,
    showWeekSelect: false,
    weekTitle: "第1周(未开学)",
    weekList: [],
    weekDays: [],
    modalShow: false,
    courseList: [],
    mergedCourses: [],
    timeSlots: DEFAULT_SLOTS,
    setting: null,
    isSharedMode: false,
    sharedCourses: [],
    editCourseData: null,
    deleteOriginList: null, // 方案2新增：保存待删除整组原始课程数组
  },

  onLoad(options) {
    if (options.shared) {
      try {
        let jsonStr = '';
        if (options.shared.includes('%')) {
          jsonStr = decodeURIComponent(options.shared);
        } else {
          const buffer = wx.base64ToArrayBuffer(options.shared);
          jsonStr = new TextDecoder('utf-8').decode(buffer);
        }
        const shareCourses = JSON.parse(jsonStr);
        const courses = shareCourses.map(c => ({
          name: c.n,
          room: c.r || '',
          teacher: c.t || '',
          day: c.d,
          slot: c.s,
          weekSegments: c.w || [],
          color: COLORS[Math.floor(Math.random() * COLORS.length)]
        }));
        this.setData({ sharedCourses: courses, isSharedMode: true });
        const setting = wx.getStorageSync('timetableSetting') || {};
        this.setData({ setting });
        this.buildWeekList(setting.totalWeek || 24);
        this.renderWeekInfo(setting.currentWeek || 1, setting.semesterStart || '2026-09-01');
        this.filterSharedCourses();
        wx.showToast({ title: '📤 正在查看好友课表', icon: 'none', duration: 2000 });
      } catch (e) {
        console.error('解析分享数据失败', e);
        wx.showToast({ title: '分享链接已失效', icon: 'none' });
      }
    }
  },

  onShow() {
    if (this.data.isSharedMode) return;
    const setting = wx.getStorageSync('timetableSetting') || {};
    this.setData({ setting });
    const custom = wx.getStorageSync('customTimeSlots');
    const timeSlots = (custom && Array.isArray(custom)) ? custom : DEFAULT_SLOTS.slice();
    this.setData({ timeSlots });
    const courses = wx.getStorageSync('courseList') || [];
    this.setData({ courseList: courses });
    this.buildWeekList(setting.totalWeek || 24);
    this.renderWeekInfo(setting.currentWeek || 0, setting.semesterStart || '2026-09-01');
    this.filterCourseByCurrentWeek();
  },

  buildWeekList(total) {
    const cur = this.data.setting ? this.data.setting.currentWeek : 0;
    const arr = [];
    for (let i = 1; i <= total; i++) {
      arr.push({ label: `第${i}周`, val: i, active: cur === i });
    }
    this.setData({ weekList: arr });
  },

  renderWeekInfo(curWeek, startDateStr) {
    let titleText = curWeek === 0 ? "第1周(未开学)" : `第${curWeek}周`;
    const start = new Date(startDateStr);
    const monday = new Date(start.getTime() + (curWeek - 1) * 7 * 24 * 3600 * 1000);
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday.getTime() + i * 24 * 3600 * 1000);
      const month = d.getMonth() + 1;
      const day = d.getDate();
      days.push({
        week: weekText[i],
        date: `${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
        dateShort: `${month}/${day}`
      });
    }
    this.setData({ weekTitle: titleText, weekDays: days });
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
    if (this.data.isSharedMode) {
      this.filterSharedCourses();
    } else {
      this.filterCourseByCurrentWeek();
    }
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

  exitShareMode() {
    this.setData({
      isSharedMode: false,
      sharedCourses: [],
      showMenuPanel: false
    });
    wx.showToast({ title: '已返回我的课表', icon: 'none' });
    this.onShow();
  },

  onShareAppMessage() {
    const { courseList, setting } = this.data;
    const curWeek = setting?.currentWeek || 1;
    const weekCourses = courseList.filter(c => this.isCourseInWeek(c, curWeek));

    let shareData = [];
    if (weekCourses.length > 0) {
      shareData = weekCourses.map(c => ({
        n: c.name,
        r: c.room || '',
        t: c.teacher || '',
        d: c.day,
        s: c.slot,
        w: c.weekSegments || []
      }));
    } else {
      shareData = [{ n: '本周暂无课程', r: '', t: '', d: 0, s: 0, w: [] }];
    }

    let encoded = '';
    try {
      const jsonStr = JSON.stringify(shareData);
      const buffer = new TextEncoder().encode(jsonStr);
      encoded = wx.arrayBufferToBase64(buffer);
    } catch (e) {
      encoded = encodeURIComponent(JSON.stringify(shareData));
    }

    const path = `/pages/schedule/schedule?shared=${encoded}`;
    const weekLabel = curWeek === 0 ? '未开学' : `第${curWeek}周`;
    const courseCount = weekCourses.length;
    const title = courseCount > 0 ? `我的${weekLabel}课表（${courseCount}门课），来看看吧！` : `我的${weekLabel}课表`;

    return {
      title: title,
      path: path,
      imageUrl: ''
    };
  },

  filterSharedCourses() {
    const { sharedCourses, setting } = this.data;
    const curWeek = setting?.currentWeek || 1;
    let filtered = [];
    if (curWeek === 0 || sharedCourses.length === 0) {
      filtered = sharedCourses;
    } else {
      filtered = sharedCourses.filter(c => {
        if (c.name === '本周暂无课程') return true;
        return this.isCourseInWeek(c, curWeek);
      });
    }
    const merged = this.mergeConsecutiveCourses(filtered);
    this.setData({ mergedCourses: merged });
  },

  // ========== 导入Excel ==========
  importData() {
    this.setData({ showMenuPanel: false });
    wx.showActionSheet({
      itemList: ['下载模板', '上传Excel'],
      success: (res) => {
        if (res.tapIndex === 0) this.downloadTemplate();
        else if (res.tapIndex === 1) this.uploadExcel();
      }
    });
  },

  parseSlotRange(slotStr) {
    if (!slotStr) return [];
    let str = String(slotStr).trim()
      .replace(/[—–\-－]/g, '-')
      .replace(/节/g, '');
    const rangeMatch = str.match(/^(\d+)\s*[-]\s*(\d+)$/);
    if (rangeMatch) {
      const start = parseInt(rangeMatch[1]);
      const end = parseInt(rangeMatch[2]);
      if (start < end && start >= 1 && end <= 12) {
        const arr = [];
        for (let i = start; i <= end; i++) arr.push(i);
        return arr;
      }
    }
    if (str.includes(',')) {
      const parts = str.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n) && n >= 1 && n <= 12);
      if (parts.length > 0) return parts;
    }
    const num = parseInt(str);
    if (!isNaN(num) && num >= 1 && num <= 12) return [num];
    return [];
  },

  downloadTemplate() {
    wx.showLoading({ title: '生成模板中...' });
    const fs = wx.getFileSystemManager();
    const timestamp = Date.now();
    const fileName = `课表模板_${timestamp}.xlsx`;
    const filePath = `${wx.env.USER_DATA_PATH}/${fileName}`;
    try {
      const wb = XLSX.utils.book_new();
      const data = [
        ['星期', '节次', '课程名', '教室', '教师', '周次'],
        ['周一', '1', '示例单节课程', '101', '张老师', '1-3周'],
        ['周二', '9-12节', 'VUE实战项目开发', '凤凰楼403', '张松林', '1-5周'],
        ['周三', '3,4', '示例多节离散', '102', '李老师', ''],
      ];
      const ws = XLSX.utils.aoa_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, '课表');
      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      fs.writeFile({
        filePath,
        data: wbout,
        success: () => {
          wx.hideLoading();
          wx.showModal({
            title: '模板已生成',
            content: '• 节次可填：单个数字（如1）、范围（如9-12节）、逗号分隔（如3,4）。\n• 周次可填：1-3周、1-3、1-3周,6-7周，留空表示全周。\n• 教室、教师为选填。\n文件已保存，请打开查看。',
            confirmText: '打开',
            success: (modalRes) => {
              if (modalRes.confirm) {
                wx.openDocument({
                  filePath,
                  success: () => wx.showToast({ title: '请另存为模板', icon: 'none' }),
                  fail: () => wx.showToast({ title: '打开失败', icon: 'none' })
                });
              }
            }
          });
        },
        fail: (err) => {
          wx.hideLoading();
          wx.showToast({ title: '保存模板失败: ' + err.errMsg, icon: 'none' });
          console.error(err);
        }
      });
    } catch (e) {
      wx.hideLoading();
      wx.showToast({ title: '生成模板失败', icon: 'none' });
      console.error(e);
    }
  },

  uploadExcel() {
    wx.chooseMessageFile({
      count: 1,
      type: 'file',
      extension: ['xlsx', 'xls'],
      success: (res) => {
        const file = res.tempFiles[0];
        this.parseTemplateExcel(file.path);
      },
      fail: (err) => {
        wx.showToast({ title: '选择文件取消或失败', icon: 'none' });
        console.error(err);
      }
    });
  },

  parseTemplateExcel(filePath) {
    wx.showLoading({ title: '解析中...' });
    const fs = wx.getFileSystemManager();
    fs.readFile({
      filePath,
      success: (res) => {
        try {
          const data = new Uint8Array(res.data);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheet = workbook.Sheets[workbook.SheetNames[0]];
          const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

          if (rows.length < 2) {
            wx.hideLoading();
            wx.showToast({ title: '模板为空', icon: 'none' });
            return;
          }

          const header = rows[0].map(cell => String(cell).trim());
          const weekIdx = header.indexOf('星期');
          const slotIdx = header.indexOf('节次');
          const nameIdx = header.indexOf('课程名');
          if (weekIdx === -1 || slotIdx === -1 || nameIdx === -1) {
            wx.hideLoading();
            wx.showToast({ title: '模板缺少必要列（星期、节次、课程名）', icon: 'none' });
            console.error('表头:', header);
            return;
          }
          const roomIdx = header.indexOf('教室');
          const teacherIdx = header.indexOf('教师');
          const weekRangeIdx = header.indexOf('周次');

          const weekMap = {
            '周一': 0, '周二': 1, '周三': 2, '周四': 3, '周五': 4, '周六': 5, '周日': 6
          };
          const courses = [];
          const baseId = Date.now();

          for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            const dayStr = String(row[weekIdx] || '').trim();
            const slotRaw = String(row[slotIdx] || '').trim();
            const name = String(row[nameIdx] || '').trim();
            const room = roomIdx !== -1 ? String(row[roomIdx] || '').trim() : '';
            const teacher = teacherIdx !== -1 ? String(row[teacherIdx] || '').trim() : '';
            const weekRange = weekRangeIdx !== -1 ? String(row[weekRangeIdx] || '').trim() : '';

            if (!name) continue;
            const day = weekMap[dayStr];
            if (day === undefined) {
              console.warn(`第${i + 1}行星期无效: "${dayStr}"`);
              continue;
            }

            const slotList = this.parseSlotRange(slotRaw);
            if (slotList.length === 0) {
              console.warn(`第${i + 1}行节次无效: "${slotRaw}"`);
              continue;
            }

            const weekSegments = this.parseWeekSegments(weekRange);
            if (weekRange && weekSegments.length === 0) {
              console.warn(`第${i + 1}行周次解析为空: "${weekRange}"`);
            }

            for (const slot of slotList) {
              courses.push({
                name,
                room,
                teacher,
                day,
                slot,
                weekSegments
              });
            }
          }

          if (courses.length === 0) {
            wx.hideLoading();
            wx.showToast({ title: '未解析到有效课程', icon: 'none' });
            console.error('解析到的课程为空，请检查模板格式');
            return;
          }

          const colorMap = {};
          let colorIdx = 0;
          courses.forEach(c => {
            if (!colorMap[c.name]) {
              colorMap[c.name] = COLORS[colorIdx % COLORS.length];
              colorIdx++;
            }
          });

          const finalCourses = courses.map((c, idx) => ({
            id: baseId + idx,
            name: c.name,
            room: c.room,
            teacher: c.teacher,
            day: c.day,
            slot: c.slot,
            weekSegments: c.weekSegments,
            color: colorMap[c.name] || '#e8f5e9'
          }));

          this._finishImport(finalCourses);
        } catch (e) {
          wx.hideLoading();
          wx.showToast({ title: '解析失败：' + e.message, icon: 'none' });
          console.error(e);
        }
      },
      fail: (err) => {
        wx.hideLoading();
        wx.showToast({ title: '读取文件失败', icon: 'none' });
        console.error(err);
      }
    });
  },

  _finishImport(courses) {
    wx.hideLoading();
    let suggestedWeek = 1;
    for (let c of courses) {
      if (c.weekSegments && c.weekSegments.length > 0) {
        suggestedWeek = c.weekSegments[0][0];
        break;
      }
    }

    wx.showModal({
      title: '导入课程',
      content: `解析到 ${courses.length} 门课程，是否覆盖现有课表？\n（取消则追加）`,
      success: (modalRes) => {
        let finalList = [];
        if (modalRes.confirm) {
          finalList = courses;
        } else {
          const existing = wx.getStorageSync('courseList') || [];
          finalList = existing.concat(courses);
        }
        wx.setStorageSync('courseList', finalList);
        this.setData({ courseList: finalList });

        const setting = wx.getStorageSync('timetableSetting') || {};
        const curWeek = setting.currentWeek || 0;
        let hasCourseInCurWeek = false;
        for (let c of finalList) {
          if (this.isCourseInWeek(c, curWeek)) { hasCourseInCurWeek = true; break; }
        }
        if (!hasCourseInCurWeek && curWeek !== suggestedWeek) {
          setting.currentWeek = suggestedWeek;
          wx.setStorageSync('timetableSetting', setting);
          this.setData({ setting });
          this.renderWeekInfo(suggestedWeek, setting.semesterStart || '2026-09-01');
          this.buildWeekList(setting.totalWeek || 24);
        }
        this.filterCourseByCurrentWeek();
        wx.showToast({ title: `导入成功，当前显示第${setting.currentWeek || suggestedWeek}周` });
      }
    });
  },

  parseWeekSegments(weekStr) {
    if (!weekStr) return [];
    let str = weekStr.replace(/[，、]/g, ',').trim();
    const result = [];
    const parts = str.split(',').filter(p => p.trim() !== '');
    for (const part of parts) {
      const trimmed = part.trim();
      const match = trimmed.match(/^(\d+)\s*[-–—]\s*(\d+)\s*周?$/);
      if (match) {
        const a = parseInt(match[1]);
        const b = parseInt(match[2]);
        if (a <= b) result.push([a, b]);
      } else {
        const single = trimmed.match(/^(\d+)\s*周?$/);
        if (single) {
          const n = parseInt(single[1]);
          result.push([n, n]);
        } else {
          console.warn('无法解析的周次片段:', trimmed);
        }
      }
    }
    return result;
  },

  // =========【修复】合并连续课程，移除虚拟id，保存原始数组 _originList =========
  mergeConsecutiveCourses(courses) {
    if (!courses || courses.length === 0) return [];
    const groups = {};
    courses.forEach(c => {
      const weekKey = c.weekSegments ? JSON.stringify(c.weekSegments) : '[]';
      const key = `${c.day}_${c.name}_${c.room || ''}_${c.teacher || ''}_${weekKey}`;
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(c);
    });

    const merged = [];
    for (const key in groups) {
      const items = groups[key];
      items.sort((a, b) => a.slot - b.slot);
      let current = null;
      for (const item of items) {
        if (!current) {
          current = {
            ...item,
            slotStart: item.slot,
            slotEnd: item.slot,
            _originList: [...items]
          };
        } else if (item.slot === current.slotEnd + 1) {
          current.slotEnd = item.slot;
        } else {
          merged.push(current);
          current = {
            ...item,
            slotStart: item.slot,
            slotEnd: item.slot,
            _originList: [...items]
          };
        }
      }
      if (current) merged.push(current);
    }

    const colorMap = {};
    let colorIdx = 0;
    merged.forEach(c => {
      if (!colorMap[c.name]) {
        colorMap[c.name] = COLORS[colorIdx % COLORS.length];
        colorIdx++;
      }
      c.color = colorMap[c.name];
      // 不再生成临时虚假id
    });
    return merged;
  },

  filterCourseByCurrentWeek() {
    if (this.data.isSharedMode && this.data.sharedCourses.length > 0) {
      this.filterSharedCourses();
      return;
    }
    const { courseList, setting } = this.data;
    const curWeek = setting?.currentWeek || 0;
    let filtered = [];
    if (curWeek === 0) {
      filtered = courseList;
    } else {
      filtered = courseList.filter(course => this.isCourseInWeek(course, curWeek));
    }
    const merged = this.mergeConsecutiveCourses(filtered);
    this.setData({ mergedCourses: merged });
  },

  isCourseInWeek(course, targetWeek) {
    if (!course.weekSegments || course.weekSegments.length === 0) return true;
    for (const [startW, endW] of course.weekSegments) {
      if (targetWeek >= startW && targetWeek <= endW) return true;
    }
    return false;
  },

  // ========== 点击空白格子 -> 新增课程 ==========
  tapCell(e) {
    if (this.data.isSharedMode) {
      wx.showToast({ title: '分享模式暂不支持添加', icon: 'none' });
      return;
    }
    this.setData({
      editCourseData: null,
      deleteOriginList: null,
      modalShow: true
    });
  },

  // ========== 点击课程卡片 -> 编辑课程 ==========
  tapCourse(e) {
    const course = e.currentTarget.dataset.course;
    if (!course) return;
    if (this.data.isSharedMode) {
      wx.showToast({ title: '分享模式不可编辑', icon: 'none' });
      return;
    }
    const realCourse = course._originList[0];
    this.setData({
      editCourseData: {
        id: realCourse.id,
        name: realCourse.name,
        room: realCourse.room || '',
        teacher: realCourse.teacher || '',
        day: realCourse.day,
        slot: realCourse.slot,
        weekSegments: realCourse.weekSegments || [],
        color: realCourse.color
      },
      deleteOriginList: course._originList, //保存整组原始课程
      modalShow: true
    });
  },

  // ========== 确认保存（新增或更新） ==========
  confirmCourse(e) {
    const data = e.detail;
    const { id, name, room, teacher, day, slot, weekSegments } = data;
    if (!name.trim()) {
      wx.showToast({ title: '请输入课程名', icon: 'none' });
      return;
    }
    if (!slot || slot < 1 || slot > 12) {
      wx.showToast({ title: '节次无效', icon: 'none' });
      return;
    }
    let list = wx.getStorageSync('courseList') || [];
    if (id) {
      //编辑模式仅修改第一条（当前逻辑，如需批量修改多节可后续扩展）
      const index = list.findIndex(c => c.id === id);
      if (index !== -1) {
        list[index].name = name.trim();
        list[index].room = room.trim();
        list[index].teacher = teacher.trim();
        list[index].day = day;
        list[index].slot = slot;
        list[index].weekSegments = weekSegments;
      } else {
        wx.showToast({ title: '课程不存在', icon: 'none' });
        return;
      }
    } else {
      // 新增模式：直接添加（组件已拆分为单条）
      const newCourse = {
        id: Date.now() + Math.random() * 1000,
        name: name.trim(),
        room: room.trim(),
        teacher: teacher.trim(),
        day: day,
        slot: slot,
        weekSegments: weekSegments,
        color: COLORS[Math.floor(Math.random() * COLORS.length)]
      };
      list.push(newCourse);
    }
    wx.setStorageSync('courseList', list);
    this.setData({ courseList: list });
    this.filterCourseByCurrentWeek();
    wx.showToast({ title: id ? '修改成功' : '添加成功', icon: 'success' });
    this.closeModal();
  },

  // ==========【方案2】批量删除本组全部课程 ==========
  deleteCourseById(e) {
    const delList = this.data.deleteOriginList;
    if (!delList || !Array.isArray(delList)) {
      wx.showToast({ title: "删除失败", icon: "none" });
      return;
    }
    const delIds = delList.map(item => item.id);

    let list = wx.getStorageSync('courseList') || [];
    list = list.filter(c => !delIds.includes(c.id));

    wx.setStorageSync('courseList', list);
    this.setData({
      courseList: list,
      deleteOriginList: null
    });
    this.filterCourseByCurrentWeek();
    wx.showToast({ title: '已删除', icon: 'success' });
    this.closeModal();
  },

  // ========== 关闭弹窗 ==========
  closeModal() {
    this.setData({
      modalShow: false,
      editCourseData: null,
      deleteOriginList: null
    });
  }
});
