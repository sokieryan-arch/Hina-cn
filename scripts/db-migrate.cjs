const { spawnSync } = require("node:child_process");
const fs = require("node:fs");

const command = process.execPath;
const args = fs.existsSync("dist/migrate.cjs")
  ? ["dist/migrate.cjs"]
  : ["node_modules/tsx/dist/cli.mjs", "src/server/db/migrateCli.ts"];

const result = spawnSync(command, args, {
  stdio: "inherit",
  env: process.env,
  shell: false,
});

process.exit(result.status ?? 1);
