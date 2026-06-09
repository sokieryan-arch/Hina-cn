import fs from "node:fs/promises";
import path from "node:path";

export interface MigrationClient {
  query(sql: string, params?: unknown[]): Promise<{ rows: any[] }>;
}

export interface MigrationResult {
  applied: string[];
  skipped: string[];
}

export async function runMigrations(options: {
  client: MigrationClient;
  migrationsDir: string;
}): Promise<MigrationResult> {
  await options.client.query(`
    create table if not exists schema_migrations (
      name text primary key,
      applied_at timestamptz not null default now()
    )
  `);

  const appliedResult = await options.client.query("select name from schema_migrations");
  const applied = new Set(appliedResult.rows.map((row) => String(row.name)));
  const files = (await fs.readdir(options.migrationsDir))
    .filter((file) => file.endsWith(".sql"))
    .sort();
  const result: MigrationResult = {
    applied: [],
    skipped: [],
  };

  for (const file of files) {
    if (applied.has(file)) {
      result.skipped.push(file);
      continue;
    }

    const sql = await fs.readFile(path.join(options.migrationsDir, file), "utf8");
    await options.client.query("begin");
    try {
      await options.client.query(sql);
      await options.client.query("insert into schema_migrations (name) values ($1)", [file]);
      await options.client.query("commit");
      result.applied.push(file);
    } catch (error) {
      await options.client.query("rollback");
      throw error;
    }
  }

  return result;
}
