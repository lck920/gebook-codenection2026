/**
 * Apply the MySQL schema bootstrap file.
 *
 * Usage (from apps/api):
 *   DATABASE_URL=mysql://… pnpm exec tsx --env-file-if-exists=../../.env prisma/mysql/apply-schema.ts
 */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveDatabaseProvider } from "../../src/infrastructure/persistence/sql/provider";
import { createSqlClient } from "../../src/infrastructure/persistence/sql/create-sql-client";

const __dirname = dirname(fileURLToPath(import.meta.url));
const schemaPath = resolve(__dirname, "schema.sql");

function requireDatabaseUrl(): string {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) throw new Error("DATABASE_URL is required");
  return url;
}

const databaseUrl: string = requireDatabaseUrl();

const provider = resolveDatabaseProvider(
  process.env.DATABASE_PROVIDER,
  databaseUrl,
);
if (provider !== "mysql") {
  throw new Error(
    `prisma/mysql/apply-schema.ts is for MySQL only (got provider=${provider})`,
  );
}

async function main() {
  const sql = readFileSync(schemaPath, "utf8");
  // Split on semicolons that end statements; skip empty chunks / comments-only.
  const statements = sql
    .split(/;\s*\n/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.split("\n").every((l) => l.trim().startsWith("--") || !l.trim()));

  const db = createSqlClient("mysql", databaseUrl, { max: 1 });
  try {
    console.log(`Applying MySQL schema (${statements.length} statements)…`);
    for (const statement of statements) {
      // mysql client rewrites $n → ?; these statements have no params.
      await db.query(statement.endsWith(";") ? statement.slice(0, -1) : statement);
    }
    await db.query(
      `INSERT IGNORE INTO schema_migrations (name) VALUES ($1)`,
      ["mysql-bootstrap"],
    );
    console.log("MySQL schema applied.");
  } finally {
    await db.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
