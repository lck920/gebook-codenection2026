import { spawn } from "node:child_process";
import { resolveDatabaseProvider } from "../src/infrastructure/persistence/sql/provider";
import { createSqlClient } from "../src/infrastructure/persistence/sql/create-sql-client";

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

function run(command: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: "inherit", env: process.env });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else
        reject(
          new Error(
            `"${command} ${args.join(" ")}" exited with code ${code ?? "unknown"}`,
          ),
        );
    });
  });
}

async function dropAll() {
  const db = createSqlClient(provider, databaseUrl, { max: 1 });
  try {
    if (provider === "mysql") {
      console.log("dropping all MySQL tables…");
      // Disable FK checks so we can drop in any order.
      await db.query("SET FOREIGN_KEY_CHECKS = 0");
      const { rows } = await db.query<{ table_name: string }>(
        `SELECT table_name AS table_name
         FROM information_schema.tables
         WHERE table_schema = DATABASE() AND table_type = 'BASE TABLE'`,
      );
      for (const row of rows) {
        const name = row.table_name ?? (row as { TABLE_NAME?: string }).TABLE_NAME;
        if (!name) continue;
        await db.query(`DROP TABLE IF EXISTS \`${name}\``);
      }
      await db.query("SET FOREIGN_KEY_CHECKS = 1");
    } else {
      console.log("dropping Postgres public schema…");
      await db.query('DROP SCHEMA IF EXISTS "public" CASCADE');
      await db.query('CREATE SCHEMA "public"');
      await db.query('GRANT ALL ON SCHEMA "public" TO public');
    }
  } finally {
    await db.end();
  }
}

async function main() {
  console.log(`Resetting database (provider=${provider})`);
  await dropAll();

  if (provider === "mysql") {
    // MySQL schema is a single SQL bootstrap file (Prisma migrations are Postgres).
    await run("pnpm", [
      "exec",
      "tsx",
      "--env-file-if-exists=../../.env",
      "prisma/mysql/apply-schema.ts",
    ]);
  } else {
    await run("pnpm", ["exec", "prisma", "generate"]);
    await run("pnpm", ["exec", "prisma", "migrate", "deploy"]);
  }

  await run("pnpm", ["exec", "tsx", "--env-file-if-exists=../../.env", "prisma/seed.ts"]);
  console.log("database reset complete");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
