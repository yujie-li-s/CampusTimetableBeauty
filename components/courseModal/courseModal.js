Component({
  properties: {
    show: {
      type: Boolean,
      value: false
    }
  },
  data: {
    courseName: '',
    room: ''
  },
  methods: {
    onClose() {
      this.triggerEvent('closeModal');
      // 清空输入
      this.setData({ courseName: '', room: '' });
    },
    stop() { },
    // 输入监听
    onNameInput(e) {
      this.setData({ courseName: e.detail.value });
    },
    onRoomInput(e) {
      this.setData({ room: e.detail.value });
    },
    // 确认添加
    onConfirm() {
      const { courseName, room } = this.data;
      this.triggerEvent('confirm', { name: courseName, room: room });
      // 清空输入（父组件关闭弹窗后，这里也会清空，但最好在onClose中清空）
      this.setData({ courseName: '', room: '' });
    }
  }
});