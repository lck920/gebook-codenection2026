import type { DatabaseProvider, SqlDialect } from "./types";

function postgresDialect(): SqlDialect {
  return {
    provider: "postgres",
    falseLiteral: "false",
    now: "now()",
    insertIgnore(table, columns, values, conflictTarget) {
      const target = conflictTarget ? ` (${conflictTarget})` : "";
      return `INSERT INTO ${table} (${columns}) VALUES (${values}) ON CONFLICT${target} DO NOTHING`;
    },
    upsert(table, columns, values, conflictTarget, updates) {
      return `INSERT INTO ${table} (${columns}) VALUES (${values})
       ON CONFLICT (${conflictTarget})
       DO UPDATE SET ${updates}`;
    },
    anyEqual(column, values, startIndex) {
      // Postgres can take a single array param: col = ANY($n)
      return {
        sql: `${column} = ANY($${startIndex})`,
        params: [values],
      };
    },
  };
}

function mysqlDialect(): SqlDialect {
  return {
    provider: "mysql",
    // TINYINT(1) / BOOLEAN accepts 0/1; bare FALSE is fine in MySQL.
    falseLiteral: "FALSE",
    now: "NOW(6)",
    insertIgnore(table, columns, values) {
      // Requires a unique index on the conflicted columns.
      return `INSERT IGNORE INTO ${table} (${columns}) VALUES (${values})`;
    },
    upsert(table, columns, values, _conflictTarget, updates) {
      // Rewrite Postgres EXCLUDED.col → VALUES(col) for MySQL classic upsert.
      const mysqlUpdates = updates.replace(
        /\bEXCLUDED\.([a-zA-Z_][a-zA-Z0-9_]*)\b/g,
        "VALUES($1)",
      );
      return `INSERT INTO ${table} (${columns}) VALUES (${values})
       ON DUPLICATE KEY UPDATE ${mysqlUpdates}`;
    },
    anyEqual(column, values, startIndex) {
      if (values.length === 0) {
        // Empty IN list is invalid SQL; force no rows.
        return { sql: "FALSE", params: [] };
      }
      const placeholders = values
        .map((_, i) => `$${startIndex + i}`)
        .join(", ");
      return {
        sql: `${column} IN (${placeholders})`,
        params: [...values],
      };
    },
  };
}

export function createDialect(provider: DatabaseProvider): SqlDialect {
  return provider === "mysql" ? mysqlDialect() : postgresDialect();
}
