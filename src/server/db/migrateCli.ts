import "dotenv/config";
import path from "node:path";
import pg from "pg";
import { runMigrations } from "./migrate.js";

const { Pool } = pg;

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required to run migrations.");
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
    const result = await runMigrations({
      client,
      migrationsDir: path.join(process.cwd(), "migrations"),
    });
    console.log(`Migrations applied: ${result.applied.length ? result.applied.join(", ") : "none"}`);
    console.log(`Migrations skipped: ${result.skipped.length ? result.skipped.join(", ") : "none"}`);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
