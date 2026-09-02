import { describe, expect, it, vi } from "vitest";
import type { Container } from "../src/infrastructure/composition/container";
import { createApp } from "../src/interfaces/http/app";

function fixture() {
  const authResponse = new Response(JSON.stringify({ session: { id: "s1" } }), {
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": "better-auth.session_token=token; Path=/; HttpOnly",
    },
  });
  const container = {
    config: {
      trustedOrigins: ["https://app.example.test"],
      betterAuthUrl: "https://api.example.test",
      googleOAuth: null,
    },
    auth: {
      api: { getSession: vi.fn(async () => null) },
      handler: vi.fn(async () => authResponse.clone()),
      $Infer: {} as Container["auth"]["$Infer"],
    },
    agentService: null,
    trackDeferred: () => {},
  } as unknown as Container;
  return createApp(container);
}

describe("API response cache policy", () => {
  it("marks ordinary API responses private and non-storable", async () => {
    const response = await fixture().request("https://api.example.test/api/health");

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  });

  it("marks Better Auth responses non-storable without dropping cookies", async () => {
    const response = await fixture().request(
      "https://api.example.test/api/auth/get-session",
      { headers: { Origin: "https://app.example.test" } },
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(response.headers.get("Set-Cookie")).toContain(
      "better-auth.session_token=token",
    );
  });
});
