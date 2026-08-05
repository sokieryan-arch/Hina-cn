const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const project = JSON.parse(fs.readFileSync(path.join(root, "project.config.json"), "utf8"));
const app = JSON.parse(fs.readFileSync(path.join(root, "miniprogram", "app.json"), "utf8"));
const config = fs.readFileSync(path.join(root, "miniprogram", "config.js"), "utf8");

if (!/^wx[a-z0-9]{16}$/i.test(project.appid)) throw new Error("project.config.json must contain a real Mini Program AppID");
if (project.miniprogramRoot !== "miniprogram/") throw new Error("miniprogramRoot must be miniprogram/");
if (!/API_BASE_URL:\s*"https:\/\//.test(config)) throw new Error("Mini Program API must use HTTPS");
if (/APP_SECRET|WECHAT_MINI_APP_SECRET/.test(config)) throw new Error("Mini Program source must never contain the AppSecret");

const requiredPages = [
  "pages/launch/index",
  "pages/chat/index",
  "pages/notes/index",
  "pages/profile/index",
  "pages/privacy/index",
  "pages/terms/index",
];

for (const page of requiredPages) {
  if (!app.pages.includes(page)) throw new Error(`app.json is missing ${page}`);
  for (const extension of ["js", "json", "wxml", "wxss"]) {
    const file = path.join(root, "miniprogram", `${page}.${extension}`);
    if (!fs.existsSync(file)) throw new Error(`Missing ${path.relative(root, file)}`);
  }
}

console.log(`Mini Program validation passed (${project.appid}, ${requiredPages.length} pages).`);
