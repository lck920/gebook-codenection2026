import { describe, expect, it } from "vitest";
import type { UIMessage } from "ai";
import { hasPendingToolApproval } from "./useAgentChat";

function assistant(state: string, extra: Record<string, unknown> = {}): UIMessage {
  return {
    id: "a1",
    role: "assistant",
    parts: [
      { type: "step-start" },
      {
        type: "tool-insertStop",
        toolCallId: "call_1",
        state,
        input: { day: 1, name: "Moraine Lake" },
        ...extra,
      },
    ],
  } as unknown as UIMessage;
}

describe("hasPendingToolApproval", () => {
  it("holds the buffer while the member has not answered", () => {
    const messages = [assistant("approval-requested", { approval: { id: "x" } })];
    expect(hasPendingToolApproval(messages)).toBe(true);
  });

  it("holds the buffer after approving, until the tool actually runs", () => {
    // This is the regression: answering flips the part to approval-responded,
    // which triggers the auto-sent continuation. Clearing here emptied the
    // message list that continuation had to send.
    const messages = [
      assistant("approval-responded", { approval: { id: "x", approved: true } }),
    ];
    expect(hasPendingToolApproval(messages)).toBe(true);
  });

  it("releases the buffer once the tool has output", () => {
    const messages = [assistant("output-available", { output: { ok: true } })];
    expect(hasPendingToolApproval(messages)).toBe(false);
  });

  it("ignores automatic approvals, which need no member action", () => {
    const messages = [
      assistant("approval-requested", {
        approval: { id: "x", isAutomatic: true },
      }),
    ];
    expect(hasPendingToolApproval(messages)).toBe(false);
  });
});
