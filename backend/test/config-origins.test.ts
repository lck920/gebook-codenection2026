import { describe, expect, it } from "vitest";
import { loadConfig } from "../src/infrastructure/config";

const base = {
  BASE_URL: "https://gebook-backend.vercel.app/",
  DATABASE_URL: "postgres://example.test/gebook",
  BETTER_AUTH_SECRET: "a-secure-test-secret-with-32-characters",
  STORAGE_BACKEND: "fs",
  STORAGE_ROOT: "/data",
};

describe("origin normalisation", () => {
  it("strips the trailing slash a dashboard invites you to type", () => {
    // Exactly what was set on Vercel. The browser sends an Origin header with
    // no slash, and Hono's cors matches the list exactly, so the slash alone
    // was enough to block every request from the frontend.
    const config = loadConfig({
      ...base,
      TRUSTED_ORIGINS: "https://gebook-frontend.vercel.app/",
    } as never);
    expect(config.trustedOrigins).toEqual(["https://gebook-frontend.vercel.app"]);
    expect(config.betterAuthUrl).toBe("https://gebook-backend.vercel.app");
  });

  it("keeps the mobile deep-link scheme as written", () => {
    const config = loadConfig({
      ...base,
      TRUSTED_ORIGINS: "https://gebook-frontend.vercel.app/, gebook://",
    } as never);
    expect(config.trustedOrigins).toEqual([
      "https://gebook-frontend.vercel.app",
      "gebook://",
    ]);
  });

  it("derives a slash-free default from BASE_URL", () => {
    const config = loadConfig(base as never);
    expect(config.trustedOrigins[0]).toBe("https://gebook-backend.vercel.app");
  });
});
