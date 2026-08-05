const { request, setToken } = require("../../utils/api");
const { readableError } = require("../../utils/errors");

const STARTERS = [
  "Tell me one tiny thing about your day.",
  "What English phrase has been living rent-free in your head?",
  "Give me a hot take — tiny Sherlock mode is on.",
];

function normalizeMessages(messages) {
  return (messages || []).map((message, index) => ({
    ...message,
    anchor: `message-${index}-${String(message.id || "local").replace(/[^a-zA-Z0-9_-]/g, "")}`,
    isModel: message.role === "model",
    isTip: message.type === "tip",
    canSpeak: message.role === "model" && message.type !== "tip",
  }));
}

Page({
  data: {
    loading: true,
    sending: false,
    composer: "",
    messages: [],
    billing: null,
    scrollToView: "",
    speakingId: "",
    starters: STARTERS,
    presence: "在纽约醒着 · 随时接梗",
  },

  onLoad() {
    this.audio = null;
    this.loadConversation();
  },

  onUnload() {
    if (this.audio) this.audio.destroy();
  },

  async loadConversation() {
    try {
      const [messageResult, billingResult] = await Promise.all([
        request("/api/messages"),
        request("/api/billing/me"),
      ]);
      const messages = normalizeMessages(messageResult.messages);
      this.setData({
        messages,
        billing: billingResult.billing,
        loading: false,
        scrollToView: messages.length ? messages[messages.length - 1].anchor : "",
      });
    } catch (error) {
      if (error.status === 401) {
        setToken("");
        wx.reLaunch({ url: "/pages/launch/index" });
        return;
      }
      this.setData({ loading: false });
      wx.showToast({ title: readableError(error), icon: "none", duration: 2600 });
    }
  },

  onComposer(event) {
    this.setData({ composer: event.detail.value });
  },

  useStarter(event) {
    this.setData({ composer: event.currentTarget.dataset.text || "" });
  },

  async sendMessage() {
    const text = this.data.composer.trim();
    if (!text || this.data.sending) return;

    const local = {
      id: `local-${Date.now()}`,
      role: "user",
      text,
      type: "response",
      timestamp: Date.now(),
    };
    const optimistic = normalizeMessages([...this.data.messages, local]);
    this.setData({
      messages: optimistic,
      composer: "",
      sending: true,
      scrollToView: optimistic[optimistic.length - 1].anchor,
    });

    try {
      const context = optimistic
        .filter((message) => !message.isTip)
        .slice(-12)
        .map((message) => ({ role: message.role, text: message.text }));
      const result = await request("/api/chat", {
        method: "POST",
        data: { messages: context },
        timeout: 60000,
      });
      const combined = normalizeMessages([...optimistic, ...(result.messages || [])]);
      this.setData({
        messages: combined,
        billing: result.billing,
        sending: false,
        scrollToView: combined[combined.length - 1].anchor,
      });
    } catch (error) {
      const fallback = normalizeMessages([...optimistic, {
        id: `error-${Date.now()}`,
        role: "model",
        text: readableError(error),
        type: "response",
        timestamp: Date.now(),
      }]);
      this.setData({
        messages: fallback,
        sending: false,
        billing: error.data && error.data.billing ? error.data.billing : this.data.billing,
        scrollToView: fallback[fallback.length - 1].anchor,
      });
    }
  },

  async playVoice(event) {
    const { text, id } = event.currentTarget.dataset;
    if (!text || this.data.speakingId) return;
    this.setData({ speakingId: id });
    try {
      const result = await request("/api/tts", { method: "POST", data: { text }, timeout: 60000 });
      if (!result.audio) throw new Error("speech_unavailable");
      const extension = result.mimeType && result.mimeType.includes("wav") ? "wav" : "mp3";
      const filePath = `${wx.env.USER_DATA_PATH}/hina-voice-${Date.now()}.${extension}`;
      await new Promise((resolve, reject) => {
        wx.getFileSystemManager().writeFile({
          filePath,
          data: result.audio,
          encoding: "base64",
          success: resolve,
          fail: reject,
        });
      });
      if (this.audio) this.audio.destroy();
      this.audio = wx.createInnerAudioContext();
      this.audio.src = filePath;
      this.audio.onEnded(() => this.setData({ speakingId: "" }));
      this.audio.onError(() => {
        this.setData({ speakingId: "" });
        wx.showToast({ title: "语音播放失败，请稍后再试。", icon: "none" });
      });
      this.audio.play();
    } catch (_error) {
      this.setData({ speakingId: "" });
      wx.showToast({ title: "语音暂时不可用。", icon: "none" });
    }
  },
});
