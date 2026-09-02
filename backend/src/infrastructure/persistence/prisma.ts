import { PrismaClient } from "@prisma/client";
import type { DatabaseProvider } from "../config";

/**
 * Create a Prisma Client with the correct driver adapter for the SQL backend.
 * Callers must `$disconnect()` on shutdown.
 */
export async function createPrismaClient(
  connectionString: string,
  provider: DatabaseProvider = "postgres",
): Promise<PrismaClient> {
  if (provider === "mysql") {
    const { PrismaMariaDb } = await import("@prisma/adapter-mariadb");
    // MariaDB adapter works with MySQL-compatible servers.
    const adapter = new PrismaMariaDb(connectionString);
    return new PrismaClient({ adapter });
  }

  const { PrismaPg } = await import("@prisma/adapter-pg");
  const pg = await import("pg");
  const pool = new pg.default.Pool({ connectionString, max: 10 });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

export type { PrismaClient };
