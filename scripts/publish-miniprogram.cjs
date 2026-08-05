const fs = require("node:fs");
const path = require("node:path");
const ci = require("miniprogram-ci");

const root = path.resolve(__dirname, "..");
const config = JSON.parse(fs.readFileSync(path.join(root, "project.config.json"), "utf8"));
const action = process.argv[2] || "preview";
const privateKeyPath = process.env.WECHAT_MINI_PRIVATE_KEY_PATH;
const version = process.env.WECHAT_MINI_VERSION || "1.0.0";
const desc = process.env.WECHAT_MINI_DESC || "Hina 微信小程序首个体验版本";

if (!privateKeyPath) {
  throw new Error("Set WECHAT_MINI_PRIVATE_KEY_PATH to the downloaded code-upload private key.");
}
if (!fs.existsSync(privateKeyPath)) throw new Error(`Private key not found: ${privateKeyPath}`);
if (!/^(preview|upload)$/.test(action)) throw new Error("Action must be preview or upload.");

const project = new ci.Project({
  appid: config.appid,
  type: "miniProgram",
  projectPath: root,
  privateKeyPath: path.resolve(privateKeyPath),
  ignores: ["node_modules/**/*", "dist/**/*", ".git/**/*", ".secrets/**/*", "uploads/**/*"],
});

const setting = {
  es6: true,
  es7: true,
  minify: true,
  codeProtect: true,
  autoPrefixWXSS: true,
};

async function main() {
  if (action === "preview") {
    const result = await ci.preview({
      project,
      desc,
      setting,
      qrcodeFormat: "image",
      qrcodeOutputDest: path.join(root, "dist", "hina-mini-preview.png"),
      onProgressUpdate: console.log,
    });
    console.log("Preview generated:", result);
    return;
  }

  const result = await ci.upload({
    project,
    version,
    desc,
    setting,
    onProgressUpdate: console.log,
  });
  console.log("Mini Program uploaded:", result);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
