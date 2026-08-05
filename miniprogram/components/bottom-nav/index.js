Component({
  properties: {
    current: {
      type: String,
      value: "chat"
    }
  },
  methods: {
    navigate(event) {
      const target = event.currentTarget.dataset.target;
      if (!target || target === this.data.current) return;
      const paths = {
        chat: "/pages/chat/index",
        notes: "/pages/notes/index",
        profile: "/pages/profile/index",
      };
      wx.redirectTo({ url: paths[target] });
    }
  }
});
