/** Supported SQL backends. Selected via DATABASE_PROVIDER or inferred from DATABASE_URL. */
export type DatabaseProvider = "postgres" | "mysql";

export interface QueryResult<T = Record<string, unknown>> {
  rows: T[];
  rowCount: number;
}

/**
 * Dialect-agnostic SQL surface used by repositories and Better Auth wiring.
 * Callers write PostgreSQL-style `$1` placeholders; the MySQL driver rewrites
 * them to `?` before execution.
 */
export interface SqlClient {
  readonly provider: DatabaseProvider;
  query<T = Record<string, unknown>>(
    text: string,
    params?: unknown[],
  ): Promise<QueryResult<T>>;
  /** Borrow a connection for multi-statement transactions. */
  connect(): Promise<SqlConnection>;
  end(): Promise<void>;
}

export interface SqlConnection {
  query<T = Record<string, unknown>>(
    text: string,
    params?: unknown[],
  ): Promise<QueryResult<T>>;
  release(): void;
}

/** Dialect helpers for constructs that differ between Postgres and MySQL. */
export interface SqlDialect {
  readonly provider: DatabaseProvider;
  /** `false` literal that works for boolean columns on both backends. */
  readonly falseLiteral: string;
  /** Current timestamp expression. */
  readonly now: string;
  /**
   * Insert that ignores unique conflicts on the given columns.
   * `columns` / `values` are already-parameterized fragments (e.g. `$1,$2`).
   */
  insertIgnore(
    table: string,
    columns: string,
    values: string,
    conflictTarget?: string,
  ): string;
  /**
   * Upsert: insert or update listed columns on conflict.
   * `updates` is a SQL fragment like `a = EXCLUDED.a` (Postgres style);
   * MySQL rewrites EXCLUDED.col → VALUES(col).
   */
  upsert(
    table: string,
    columns: string,
    values: string,
    conflictTarget: string,
    updates: string,
  ): string;
  /**
   * `col = ANY($n)` (Postgres) or expand to `col IN (?,?,…)` for MySQL.
   * Returns `{ sql, params }` to splice into a larger query.
   */
  anyEqual(
    column: string,
    values: readonly unknown[],
    startIndex: number,
  ): { sql: string; params: unknown[] };
}
