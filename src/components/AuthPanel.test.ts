import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AuthPanel, readableError } from "./AuthPanel.js";

test("auth panel renders readable Chinese login copy", () => {
  const markup = renderToStaticMarkup(React.createElement(AuthPanel, {
    onAuthed: () => {},
  }));

  assert.match(markup, /登录/);
  assert.match(markup, /注册/);
  assert.match(markup, /忘记密码/);
  assert.match(markup, /手机号或邮箱/);
  assert.match(markup, /进入 Hina/);
  assert.match(markup, /微信登录/);
  assert.doesNotMatch(markup, /�|璐|楠|鎵|寰/);
});

test("auth panel maps unavailable production auth services to clear Chinese messages", () => {
  assert.equal(readableError("email_not_configured"), "邮箱验证码还没有配置好，请稍后再试。");
  assert.equal(readableError("phone_verification_unavailable"), "手机验证码暂未开放，请先使用邮箱注册。");
  assert.equal(readableError("missing_wechat_credentials"), "微信登录还没有配置好。");
});
