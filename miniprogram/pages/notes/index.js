const { request } = require("../../utils/api");
const { readableError } = require("../../utils/errors");

const FILTERS = [
  { key: "all", label: "全部" },
  { key: "grammar", label: "语法" },
  { key: "vocabulary", label: "词汇" },
  { key: "expression", label: "表达" },
  { key: "culture", label: "文化" },
];

Page({
  data: {
    loading: true,
    active: "all",
    filters: FILTERS,
    notes: [],
  },

  onLoad() {
    this.loadNotes();
  },

  async loadNotes() {
    this.setData({ loading: true });
    try {
      const query = this.data.active === "all" ? "" : `?category=${this.data.active}`;
      const result = await request(`/api/space/notes${query}`);
      this.setData({ notes: result.notes || [], loading: false });
    } catch (error) {
      this.setData({ loading: false });
      wx.showToast({ title: readableError(error), icon: "none" });
    }
  },

  changeFilter(event) {
    const active = event.currentTarget.dataset.key;
    if (active === this.data.active) return;
    this.setData({ active }, () => this.loadNotes());
  },

  deleteNote(event) {
    const id = event.currentTarget.dataset.id;
    wx.showModal({
      title: "移除这条笔记？",
      content: "这不会删除原来的聊天内容。",
      confirmText: "移除",
      confirmColor: "#A54D52",
      success: async ({ confirm }) => {
        if (!confirm) return;
        try {
          await request(`/api/space/notes/${encodeURIComponent(id)}`, { method: "DELETE" });
          this.setData({ notes: this.data.notes.filter((note) => note.id !== id) });
        } catch (error) {
          wx.showToast({ title: readableError(error), icon: "none" });
        }
      },
    });
  },
});
