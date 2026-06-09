import "dotenv/config";
import express from "express";
import fs from "fs";
import path from "path";
import { registerApiRoutes } from "./src/server/api.js";
import { createRuntime } from "./src/server/runtime.js";

const PORT = Number.parseInt(process.env.PORT || "3000", 10);

async function startServer() {
  const app = express();
  const runtime = await createRuntime();

  app.use(express.json({ limit: "1mb" }));
  registerApiRoutes({ app, ...runtime });

  const distPath = path.join(process.cwd(), "dist");
  const indexPath = path.join(distPath, "index.html");
  if (fs.existsSync(indexPath)) {
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(indexPath);
    });
  } else {
    app.get("*", (_req, res) => {
      res.status(503).send("Run npm run build before starting Hina CN.");
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Hina CN running on http://localhost:${PORT}`);
  });
}

startServer().catch((error) => {
  console.error(error);
  process.exit(1);
});
