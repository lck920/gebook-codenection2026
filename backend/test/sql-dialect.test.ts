import { describe, expect, it } from "vitest";
import { createDialect } from "../src/infrastructure/persistence/sql/dialect";
import { toMysqlPlaceholders } from "../src/infrastructure/persistence/sql/placeholders";
import { resolveDatabaseProvider } from "../src/infrastructure/persistence/sql/provider";

describe("resolveDatabaseProvider", () => {
  it("defaults to postgres", () => {
    expect(resolveDatabaseProvider(undefined, "postgres://x/y")).toBe("postgres");
    expect(resolveDatabaseProvider(undefined, undefined)).toBe("postgres");
  });

  it("infers mysql from URL scheme", () => {
    expect(resolveDatabaseProvider(undefined, "mysql://u:p@h/db")).toBe("mysql");
    expect(resolveDatabaseProvider(undefined, "mysql2://u:p@h/db")).toBe("mysql");
  });

  it("honours explicit DATABASE_PROVIDER", () => {
    expect(resolveDatabaseProvider("mysql", "postgres://x/y")).toBe("mysql");
    expect(resolveDatabaseProvider("postgres", "mysql://x/y")).toBe("postgres");
  });

  it("rejects unknown providers", () => {
    expect(() => resolveDatabaseProvider("sqlite", "x")).toThrow(/DATABASE_PROVIDER/);
  });
});

describe("toMysqlPlaceholders", () => {
  it("rewrites $n tokens", () => {
    expect(toMysqlPlaceholders("WHERE a = $1 AND b = $2")).toBe(
      "WHERE a = ? AND b = ?",
    );
  });

  it("does not rewrite non-placeholder dollars", () => {
    expect(toMysqlPlaceholders("SELECT $foo, $1")).toBe("SELECT $foo, ?");
  });
});

describe("createDialect", () => {
  it("builds postgres insert-ignore with ON CONFLICT", () => {
    const d = createDialect("postgres");
    expect(d.insertIgnore("t", "a,b", "$1,$2", "a")).toContain("ON CONFLICT");
  });

  it("builds mysql insert-ignore with INSERT IGNORE", () => {
    const d = createDialect("mysql");
    expect(d.insertIgnore("t", "a,b", "$1,$2")).toMatch(/^INSERT IGNORE/);
  });

  it("rewrites EXCLUDED to VALUES for mysql upsert", () => {
    const d = createDialect("mysql");
    const sql = d.upsert(
      "user_preferences",
      "user_id, width",
      "$1,$2",
      "user_id",
      "width = EXCLUDED.width",
    );
    expect(sql).toContain("ON DUPLICATE KEY UPDATE");
    expect(sql).toContain("VALUES(width)");
    expect(sql).not.toContain("EXCLUDED");
  });

  it("expands ANY to IN for mysql", () => {
    const d = createDialect("mysql");
    const { sql, params } = d.anyEqual("trip_id", ["a", "b"], 1);
    expect(sql).toBe("trip_id IN ($1, $2)");
    expect(params).toEqual(["a", "b"]);
  });

  it("uses array param for postgres ANY", () => {
    const d = createDialect("postgres");
    const { sql, params } = d.anyEqual("trip_id", ["a", "b"], 3);
    expect(sql).toBe("trip_id = ANY($3)");
    expect(params).toEqual([["a", "b"]]);
  });
});
