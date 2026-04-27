import fs from "node:fs/promises";
import path from "node:path";
import { execute } from "../lib/db";

async function run() {
  const migrationPath = path.resolve(process.cwd(), "migrations", "001_init.sql");
  const sql = await fs.readFile(migrationPath, "utf8");
  const statements = sql
    .split(";")
    .map((x) => x.trim())
    .filter(Boolean);

  for (const statement of statements) {
    await execute(statement);
  }

  console.log(`Applied migration: ${migrationPath}`);
}

run().catch((err) => {
  console.error("Migration failed", err);
  process.exit(1);
});

