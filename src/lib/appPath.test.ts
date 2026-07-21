import assert from "node:assert/strict";
import test from "node:test";
import { getAppMountPath, withAppBase } from "./appPath.js";

test("detects the Hina path mount", () => {
  assert.equal(getAppMountPath("/hina/"), "/hina");
  assert.equal(getAppMountPath("/hina/settings"), "/hina");
  assert.equal(getAppMountPath("/"), "");
});

test("prefixes root-relative resources only when mounted below /hina", () => {
  assert.equal(withAppBase("/api/auth/me", "/hina/"), "/hina/api/auth/me");
  assert.equal(withAppBase("/uploads/avatars/user.png", "/hina/"), "/hina/uploads/avatars/user.png");
  assert.equal(withAppBase("/api/auth/me", "/"), "/api/auth/me");
  assert.equal(withAppBase("blob:preview", "/hina/"), "blob:preview");
  assert.equal(withAppBase("https://example.com/avatar.png", "/hina/"), "https://example.com/avatar.png");
});
