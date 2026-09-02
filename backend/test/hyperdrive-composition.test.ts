import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

describe("Hyperdrive consistency composition", () => {
  it("binds consistency-critical repositories to the fresh client", () => {
    const source = readFileSync(
      resolve(root, "backend/src/infrastructure/composition/container.ts"),
      "utf8",
    );

    expect(source).toContain("new SqlTripRepository(poolFresh)");
    expect(source).toContain("new SqlTripInviteRepository(poolFresh)");
    expect(source).toContain("new SqlUserPreferenceRepository(poolFresh)");
    expect(source).toContain("new SqlAgentSessionRepository(poolFresh)");
    expect(source).not.toContain("new SqlTripRepository(pool)");
  });

  it("rejects a cached Hyperdrive deployment without its fresh binding", () => {
    const source = readFileSync(resolve(root, "backend/src/worker.ts"), "utf8");

    expect(source).toContain("HYPERDRIVE_CACHE_DISABLED is required");
    expect(source).toContain("Database consistency binding is not configured");
  });
});
