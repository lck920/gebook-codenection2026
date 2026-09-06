import pg from "pg";
import type { QueryResult, SqlClient, SqlConnection } from "./types";

export interface PgPoolOptions {
  max?: number;
  /** Fail instead of hanging forever when Hyperdrive/origin is stuck (ms). */
  connectionTimeoutMillis?: number;
  idleTimeoutMillis?: number;
}

const DEFAULT_CONNECTION_TIMEOUT_MS = 10_000;
const DEFAULT_IDLE_TIMEOUT_MS = 10_000;

/** Hosts reached over loopback, where TLS is neither available nor needed. */
function isLocalHost(connectionString: string): boolean {
  try {
    const { hostname } = new URL(connectionString);
    return (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "::1" ||
      hostname.endsWith(".local")
    );
  } catch {
    return false;
  }
}

function poolConfig(
  connectionString: string,
  options?: PgPoolOptions,
): pg.PoolConfig {
  // Managed Postgres (Supabase, Neon, RDS) will happily accept *unencrypted*
  // connections, so leaving TLS to the connection string means credentials go
  // over the public internet in the clear whenever `sslmode` is missing. Force
  // it on for every remote host instead.
  //
  // `rejectUnauthorized: false` because Supabase's pooler presents a
  // self-signed chain Node will not verify without their CA bundle: the link is
  // encrypted, but the peer is unauthenticated. To verify properly, download
  // the project CA certificate and pass `ssl: { ca }` here instead.
  const ssl = isLocalHost(connectionString)
    ? undefined
    : { rejectUnauthorized: false };

  return {
    connectionString,
    ...(ssl ? { ssl } : {}),
    max: options?.max ?? 10,
    // Workers hang → CF 1101 with no CORS when TCP never settles. Prefer fail-fast.
    connectionTimeoutMillis:
      options?.connectionTimeoutMillis ?? DEFAULT_CONNECTION_TIMEOUT_MS,
    idleTimeoutMillis: options?.idleTimeoutMillis ?? DEFAULT_IDLE_TIMEOUT_MS,
  };
}

/** Wrap an existing node-postgres Pool as SqlClient (share one pool with Better Auth). */
export function createPostgresClientFromPool(pool: pg.Pool): SqlClient {
  return {
    provider: "postgres",
    async query<T = Record<string, unknown>>(
      text: string,
      params: unknown[] = [],
    ): Promise<QueryResult<T>> {
      const result = await pool.query(text, params);
      return {
        rows: result.rows as T[],
        rowCount: result.rowCount ?? 0,
      };
    },
    async connect(): Promise<SqlConnection> {
      const client = await pool.connect();
      return {
        async query<T = Record<string, unknown>>(
          text: string,
          params: unknown[] = [],
        ): Promise<QueryResult<T>> {
          const result = await client.query(text, params);
          return {
            rows: result.rows as T[],
            rowCount: result.rowCount ?? 0,
          };
        },
        release() {
          client.release();
        },
      };
    },
    async end() {
      await pool.end();
    },
  };
}

export function createPostgresClient(
  connectionString: string,
  options?: PgPoolOptions,
): SqlClient {
  return createPostgresClientFromPool(
    createRawPgPool(connectionString, options),
  );
}

/** Expose the raw pg Pool for Better Auth (expects a node-postgres Pool). */
export function createRawPgPool(
  connectionString: string,
  options?: PgPoolOptions,
): pg.Pool {
  const pool = new pg.Pool(poolConfig(connectionString, options));

  // A pooled client that dies while idle — a pooler recycling it, a NAT or
  // firewall dropping a long-lived TLS connection — emits `error` on the Pool.
  // node-postgres re-throws that as an unhandled 'error' event, which takes the
  // whole process down. The pool discards the broken client on its own, so
  // logging is the correct response: the next query gets a fresh connection.
  pool.on("error", (err) => {
    console.error("[db] idle client error (connection discarded):", err);
  });

  return pool;
}
