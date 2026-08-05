const { getToken, request, setToken } = require("../../utils/api");
const { readableError } = require("../../utils/errors");

function adultDateLimit() {
  const date = new Date();
  date.setFullYear(date.getFullYear() - 18);
  return date.toISOString().slice(0, 10);
}

Page({
  data: {
    mode: "loading",
    busy: false,
    error: "",
    birthDate: "",
    maxBirthDate: adultDateLimit(),
    adultConfirmed: false,
    privacyAccepted: false,
  },

  onLoad() {
    this.bootstrap();
  },

  async bootstrap() {
    this.setData({ mode: "loading", error: "" });
    if (getToken()) {
      try {
        const [{ user }, safety] = await Promise.all([
          request("/api/auth/me"),
          request("/api/account/safety-profile"),
        ]);
        if (user && safety.profile && safety.profile.adultConfirmed
          && safety.profile.privacyVersion === safety.privacyVersion) {
          getApp().globalData.user = user;
          wx.reLaunch({ url: "/pages/chat/index" });
          return;
        }
        if (user) {
          getApp().globalData.user = user;
          this.setData({ mode: "onboarding" });
          return;
        }
      } catch (_error) {
        setToken("");
      }
    }
    await this.loginWithWeChat();
  },

  loginWithWeChat() {
    this.setData({ busy: true, error: "" });
    return new Promise((resolve) => {
      wx.login({
        timeout: 10000,
        success: async ({ code }) => {
          try {
            if (!code) throw new Error("wechat_code_exchange_failed");
            const result = await request("/api/auth/wechat-mini/login", {
              method: "POST",
              data: { code },
              auth: false,
            });
            setToken(result.session.token);
            getApp().globalData.user = result.user;
            if (result.needsOnboarding) {
              this.setData({ mode: "onboarding", busy: false });
            } else {
              wx.reLaunch({ url: "/pages/chat/index" });
            }
          } catch (error) {
            this.setData({ mode: "error", busy: false, error: readableError(error) });
          }
          resolve();
        },
        fail: () => {
          this.setData({ mode: "error", busy: false, error: "微信登录没有完成，请点击重试。" });
          resolve();
        },
      });
    });
  },

  onBirthDate(event) {
    this.setData({ birthDate: event.detail.value });
  },

  onConsentChange(event) {
    const values = event.detail.value || [];
    this.setData({
      adultConfirmed: values.includes("adult"),
      privacyAccepted: values.includes("privacy"),
    });
  },

  openPrivacy() {
    wx.navigateTo({ url: "/pages/privacy/index" });
  },

  openTerms() {
    wx.navigateTo({ url: "/pages/terms/index" });
  },

  async finishOnboarding() {
    if (!this.data.birthDate || !this.data.adultConfirmed || !this.data.privacyAccepted) return;
    this.setData({ busy: true, error: "" });
    try {
      await request("/api/account/safety-profile", {
        method: "PUT",
        data: {
          birthDate: this.data.birthDate,
          adultConfirmed: true,
          privacyAccepted: true,
        },
      });
      wx.reLaunch({ url: "/pages/chat/index" });
    } catch (error) {
      this.setData({ busy: false, error: readableError(error) });
    }
  },
});
