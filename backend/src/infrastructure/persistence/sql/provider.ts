import type { DatabaseProvider } from "./types";

/**
 * Resolve the database provider.
 * Prefer explicit DATABASE_PROVIDER; otherwise infer from DATABASE_URL scheme.
 */
export function resolveDatabaseProvider(
  providerRaw: string | undefined,
  databaseUrl: string | undefined,
): DatabaseProvider {
  const explicit = providerRaw?.trim().toLowerCase();
  if (explicit === "postgres" || explicit === "postgresql") return "postgres";
  if (explicit === "mysql" || explicit === "mariadb") return "mysql";
  if (explicit) {
    throw new Error(
      `DATABASE_PROVIDER must be "postgres" or "mysql" (got "${providerRaw}")`,
    );
  }

  const url = databaseUrl?.trim() ?? "";
  if (
    url.startsWith("mysql://") ||
    url.startsWith("mysql2://") ||
    url.startsWith("mariadb://")
  ) {
    return "mysql";
  }
  // Default (postgres://, postgresql://, Hyperdrive, empty → postgres).
  return "postgres";
}
