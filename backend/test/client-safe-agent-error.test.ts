import { describe, expect, it } from "vitest";
import { clientSafeAgentError } from "../src/infrastructure/ai/agent-model.ai-sdk";

describe("clientSafeAgentError", () => {
  it("names quota as the cause so the member knows to wait", () => {
    // The exact shape Gemini returns once the free tier's request budget is
    // spent — previously logged server-side and shown to nobody.
    const error = Object.assign(new Error(
      "You exceeded your current quota. Quota exceeded for metric: " +
        "generativelanguage.googleapis.com/generate_content_free_tier_requests, limit: 20",
    ), { name: "AI_APICallError", statusCode: 429 });

    const text = clientSafeAgentError(error);
    expect(text).toMatch(/quota/i);
    expect(text).toContain("limit: 20");
  });

  it("recognises a quota failure from the status alone", () => {
    const error = Object.assign(new Error(""), { statusCode: 429 });
    expect(clientSafeAgentError(error)).toMatch(/quota/i);
  });

  it("passes through other provider failures", () => {
    const error = Object.assign(new Error("model is overloaded"), {
      statusCode: 503,
    });
    expect(clientSafeAgentError(error)).toContain("model is overloaded");
  });

  it("degrades to a generic line for something uninspectable", () => {
    expect(clientSafeAgentError(undefined)).toBe(
      "The AI provider failed this turn.",
    );
  });
});
