const { request, setToken } = require("../../utils/api");
const { readableError } = require("../../utils/errors");
const { APP_VERSION, CONTACT_EMAIL } = require("../../config");

Page({
  data: {
    loading: true,
    user: null,
    billing: null,
    displayName: "",
    email: "",
    code: "",
    linkCodeSent: false,
    feedbackCategory: "bug",
    feedbackMessage: "",
    feedbackContact: "",
    busy: "",
    appVersion: APP_VERSION,
    contactEmail: CONTACT_EMAIL,
  },

  onLoad() {
    this.loadProfile();
  },

  async loadProfile() {
    try {
      const [{ user }, { billing }] = await Promise.all([
        request("/api/auth/me"),
        request("/api/billing/me"),
      ]);
      this.setData({ user, billing, displayName: user ? user.displayName : "", loading: false });
    } catch (error) {
      this.setData({ loading: false });
      wx.showToast({ title: readableError(error), icon: "none" });
    }
  },

  onField(event) {
    this.setData({ [event.currentTarget.dataset.field]: event.detail.value });
  },

  async saveName() {
    const displayName = this.data.displayName.trim();
    if (!displayName) return;
    this.setData({ busy: "name" });
    try {
      const { user } = await request("/api/profile", { method: "PUT", data: { displayName } });
      this.setData({ user, busy: "" });
      wx.showToast({ title: "名字已更新", icon: "success" });
    } catch (error) {
      this.setData({ busy: "" });
      wx.showToast({ title: readableError(error), icon: "none" });
    }
  },

  async sendLinkCode() {
    if (!this.data.email.trim()) return;
    this.setData({ busy: "email" });
    try {
      await request("/api/auth/link/email/send-code", {
        method: "POST",
        data: { email: this.data.email.trim() },
      });
      this.setData({ linkCodeSent: true, busy: "" });
      wx.showToast({ title: "验证码已发送", icon: "success" });
    } catch (error) {
      this.setData({ busy: "" });
      wx.showToast({ title: readableError(error), icon: "none", duration: 2800 });
    }
  },

  async confirmLink() {
    if (!this.data.code.trim()) return;
    this.setData({ busy: "email" });
    try {
      const result = await request("/api/auth/link/email/confirm", {
        method: "POST",
        data: { email: this.data.email.trim(), code: this.data.code.trim() },
      });
      setToken(result.session.token);
      this.setData({ user: result.user, linkCodeSent: false, code: "", busy: "" });
      wx.showToast({ title: "账号已合并", icon: "success" });
    } catch (error) {
      this.setData({ busy: "" });
      wx.showToast({ title: readableError(error), icon: "none", duration: 2800 });
    }
  },

  changeFeedbackCategory(event) {
    this.setData({ feedbackCategory: event.detail.value });
  },

  async sendFeedback() {
    const message = this.data.feedbackMessage.trim();
    if (!message) {
      wx.showToast({ title: "请先写下反馈内容", icon: "none" });
      return;
    }
    this.setData({ busy: "feedback" });
    try {
      await request("/api/feedback", {
        method: "POST",
        data: {
          category: this.data.feedbackCategory,
          message,
          contact: this.data.feedbackContact.trim() || null,
        },
      });
      this.setData({ feedbackMessage: "", busy: "" });
      wx.showToast({ title: "谢谢你告诉我们", icon: "success" });
    } catch (error) {
      this.setData({ busy: "" });
      wx.showToast({ title: readableError(error), icon: "none" });
    }
  },

  async exportData() {
    this.setData({ busy: "export" });
    try {
      const data = await request("/api/account/export");
      const filePath = `${wx.env.USER_DATA_PATH}/hina-data-${Date.now()}.json`;
      await new Promise((resolve, reject) => {
        wx.getFileSystemManager().writeFile({
          filePath,
          data: JSON.stringify(data, null, 2),
          encoding: "utf8",
          success: resolve,
          fail: reject,
        });
      });
      if (wx.shareFileMessage) {
        wx.shareFileMessage({ filePath, fileName: "Hina-data.json" });
      } else {
        wx.setClipboardData({ data: JSON.stringify(data) });
      }
    } catch (error) {
      wx.showToast({ title: readableError(error), icon: "none" });
    } finally {
      this.setData({ busy: "" });
    }
  },

  deleteAccount() {
    wx.showModal({
      title: "永久注销账号？",
      content: "聊天、学习笔记、愿望清单和时间胶囊都会永久删除，无法恢复。",
      confirmText: "继续注销",
      confirmColor: "#A54D52",
      success: ({ confirm }) => {
        if (!confirm) return;
        wx.showModal({
          title: "最后确认",
          content: "确认后会立即删除 Hina 账号及关联数据。",
          confirmText: "永久删除",
          confirmColor: "#A54D52",
          success: async ({ confirm: finalConfirm }) => {
            if (!finalConfirm) return;
            try {
              await request("/api/account", { method: "DELETE", data: { confirmation: "DELETE" } });
              setToken("");
              wx.reLaunch({ url: "/pages/launch/index" });
            } catch (error) {
              wx.showToast({ title: readableError(error), icon: "none" });
            }
          },
        });
      },
    });
  },

  async logout() {
    try { await request("/api/auth/logout", { method: "POST" }); } catch (_error) { /* clear locally */ }
    setToken("");
    wx.reLaunch({ url: "/pages/launch/index" });
  },

  openPrivacy() { wx.navigateTo({ url: "/pages/privacy/index" }); },
  openTerms() { wx.navigateTo({ url: "/pages/terms/index" }); },
});
