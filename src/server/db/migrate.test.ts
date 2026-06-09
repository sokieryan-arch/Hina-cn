import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { runMigrations, type MigrationClient } from "./migrate.js";

class FakeMigrationClient implements MigrationClient {
  applied = new Set<string>();
  executedSql: string[] = [];

  async query(sql: string, params?: unknown[]) {
    this.executedSql.push(sql);

    if (sql.includes("select name from schema_migrations")) {
      return { rows: [...this.applied].map((name) => ({ name })) };
    }

    if (sql.includes("insert into schema_migrations")) {
      this.applied.add(String(params?.[0]));
      return { rows: [] };
    }

    return { rows: [] };
  }
}

test("applies pending migrations once and records them", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "hina-migrations-"));
  await fs.writeFile(path.join(dir, "001_init.sql"), "create table users(id text);");
  await fs.writeFile(path.join(dir, "002_extra.sql"), "alter table users add column name text;");
  const client = new FakeMigrationClient();

  const first = await runMigrations({ client, migrationsDir: dir });
  const second = await runMigrations({ client, migrationsDir: dir });

  assert.deepEqual(first.applied, ["001_init.sql", "002_extra.sql"]);
  assert.deepEqual(second.applied, []);
  assert.equal(client.applied.has("001_init.sql"), true);
  assert.equal(client.applied.has("002_extra.sql"), true);
});
