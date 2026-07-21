import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SettingsModal } from "./SettingsModal.js";
import type { BillingSummary, CurrentUser, ProactiveSettings } from "../shared/types.js";

const user: CurrentUser = {
  id: "user-1",
  displayName: "Sokie",
  avatarUrl: null,
  hasPassword: true,
  hasWeChat: false,
  createdAt: "2026-06-30T08:00:00.000Z",
};

const billing: BillingSummary = {
  plan: "free",
  isPro: false,
  dailyLimit: 30,
  usedToday: 4,
  remainingToday: 26,
  resetAt: new Date("2026-06-30T16:00:00.000Z").toISOString(),
};

const proactiveSettings: ProactiveSettings = {
  enabled: true,
  minHoursBetweenNudges: 20,
  quietHoursStart: "22:00",
  quietHoursEnd: "08:00",
  favoriteTopics: ["films", "food"],
};

test("settings modal keeps coffee QR codes tucked behind payment choices", () => {
  const markup = renderToStaticMarkup(React.createElement(SettingsModal, {
    isOpen: true,
    onClose: () => {},
    user,
    billing,
    proactiveSettings,
    onUserChange: () => {},
    onBillingChange: () => {},
    onClearHistory: () => {},
    onProactiveSettingsChange: () => {},
    theme: "light",
    onThemeChange: () => {},
    onLogout: async () => {},
  }));

  assert.match(markup, /Buy Hina a cup of coffee/);
  assert.match(markup, /server hosting and maintenance/);
  assert.match(markup, /Choose WeChat or Alipay to reveal a QR code/);
  assert.match(markup, /Appearance/);
  assert.match(markup, /Favorite topics/);
  assert.match(markup, /Films &amp; TV/);
  assert.match(markup, /aria-label="Avatar actions"/);
  assert.match(markup, /aria-label="Add custom topic"/);
  assert.match(markup, /Log out/);
  assert.match(markup, /WeChat/);
  assert.match(markup, /Alipay/);
  assert.doesNotMatch(markup, /Upload Avatar/);
  assert.doesNotMatch(markup, /JPG, PNG, WebP, GIF under 10MB/);
  assert.doesNotMatch(markup, /Save Profile/);
  assert.doesNotMatch(markup, /\/support\/wechat-coffee\.png/);
  assert.doesNotMatch(markup, /\/support\/alipay-coffee\.jpg/);
});
