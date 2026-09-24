Component({
  properties: {
    show: { type: Boolean, value: false },
    editData: { type: Object, value: null }
  },
  data: {
    courseName: '',
    room: '',
    teacher: '',
    dayIndex: 0,
    slotStr: '',
    weekStr: '',
    weekOptions: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
    editId: null,
    isEdit: false
  },
  attached() {
    this.setData({ isEdit: false });
  },
  observers: {
    'editData': function(data) {
      console.log('editData 变化:', data);
      if (data && data.id) {
        const dayIdx = data.day !== undefined ? data.day : 0;
        const slotStr = data.slot ? data.slot + '节' : '';
        let weekStr = '';
        if (data.weekSegments && data.weekSegments.length > 0) {
          weekStr = data.weekSegments.map(seg => {
            if (seg[0] === seg[1]) return seg[0] + '周';
            return seg[0] + '-' + seg[1] + '周';
          }).join(',');
        }
        this.setData({
          courseName: data.name || '',
          room: data.room || '',
          teacher: data.teacher || '',
          dayIndex: dayIdx,
          slotStr: slotStr,
          weekStr: weekStr,
          editId: data.id,
          isEdit: true
        });
      } else {
        this.setData({
          courseName: '',
          room: '',
          teacher: '',
          dayIndex: 0,
          slotStr: '',
          weekStr: '',
          editId: null,
          isEdit: false
        });
      }
    }
  },
  methods: {
    onClose() {
      this.triggerEvent('closeModal');
    },
    stop() {},
    onNameInput(e) { this.setData({ courseName: e.detail.value }); },
    onRoomInput(e) { this.setData({ room: e.detail.value }); },
    onTeacherInput(e) { this.setData({ teacher: e.detail.value }); },
    onDayChange(e) { this.setData({ dayIndex: e.detail.value }); },
    onSlotInput(e) { this.setData({ slotStr: e.detail.value }); },
    onWeekInput(e) { this.setData({ weekStr: e.detail.value }); },
    onClear() {
      this.setData({
        courseName: '',
        room: '',
        teacher: '',
        dayIndex: 0,
        slotStr: '',
        weekStr: ''
      });
      wx.showToast({ title: '已清空', icon: 'none' });
    },
    onConfirm() {
      const { courseName, room, teacher, dayIndex, slotStr, weekStr, editId, isEdit } = this.data;
      if (!courseName.trim()) {
        wx.showToast({ title: '请输入课程名', icon: 'none' });
        return;
      }
      if (!slotStr.trim()) {
        wx.showToast({ title: '请输入节次', icon: 'none' });
        return;
      }
      const weekSegments = this.parseWeekStr(weekStr);
      if (isEdit) {
        const slotNum = parseInt(slotStr);
        if (isNaN(slotNum) || slotNum < 1 || slotNum > 12) {
          wx.showToast({ title: '请输入有效节次（1-12）', icon: 'none' });
          return;
        }
        this.triggerEvent('confirm', {
          id: editId,
          name: courseName.trim(),
          room: room.trim(),
          teacher: teacher.trim(),
          day: dayIndex,
          slot: slotNum,
          weekSegments: weekSegments
        });
        return;
      }
      // 新增模式解析节次范围
      const slotList = this.parseSlotRange(slotStr);
      if (slotList.length === 0) {
        wx.showToast({ title: '节次格式不正确，如：1-4节 或 5,6', icon: 'none' });
        return;
      }
      for (let slot of slotList) {
        this.triggerEvent('confirm', {
          id: null,
          name: courseName.trim(),
          room: room.trim(),
          teacher: teacher.trim(),
          day: dayIndex,
          slot: slot,
          weekSegments: weekSegments
        });
      }
    },
    onDelete() {
      const { editId, courseName } = this.data;
      if (!editId) return;
      wx.showModal({
        title: '确认删除',
        content: `确定删除“${courseName}”吗？`,
        success: (res) => {
          if (res.confirm) {
            this.triggerEvent('delete', { id: editId });
          }
        }
      });
    },
    parseSlotRange(str) {
      if (!str) return [];
      const s = str.trim().replace(/节/g, '').replace(/[，、]/g, ',');
      const parts = s.split(',').filter(p => p.trim());
      const result = [];
      for (let p of parts) {
        p = p.trim();
        const match = p.match(/^(\d+)\s*[-–—]\s*(\d+)$/);
        if (match) {
          const a = parseInt(match[1]);
          const b = parseInt(match[2]);
          if (a < b && a >= 1 && b <= 12) {
            for (let i = a; i <= b; i++) result.push(i);
          }
        } else {
          const num = parseInt(p);
          if (!isNaN(num) && num >= 1 && num <= 12) result.push(num);
        }
      }
      return result;
    },
    parseWeekStr(str) {
      if (!str || !str.trim()) return [];
      const parts = str.split(/[,，、]/).filter(s => s.trim());
      const result = [];
      for (let part of parts) {
        part = part.trim();
        const match = part.match(/^(\d+)\s*[-–—]?\s*(\d*)\s*周?$/);
        if (match) {
          const a = parseInt(match[1]);
          const b = match[2] ? parseInt(match[2]) : a;
          if (a <= b && a >= 1 && b >= 1) result.push([a, b]);
        } else {
          const single = part.match(/^(\d+)\s*周?$/);
          if (single) {
            const n = parseInt(single[1]);
            result.push([n, n]);
          }
        }
      }
      return result;
    }
  }
});
