import { describe, expect, it } from "vitest";
import type { UIMessage } from "ai";
import type { AgentHistory, AgentMessage } from "@/shared/api";
import {
  appendAgentMessageToHistory,
  mergeLiveMessagesIntoHistory,
} from "./useAgentChat";

function msg(id: string, text: string): AgentMessage {
  return {
    id,
    seq: 1,
    role: "user",
    parts: [{ type: "text", text }],
    actorUserId: "u1",
    actorName: "Ada",
    source: "chat",
    mentionedUserIds: [],
    createdAt: "2026-07-11T00:00:00.000Z",
  };
}

function live(
  id: string,
  role: "user" | "assistant",
  text: string,
): UIMessage {
  return {
    id,
    role,
    parts: [{ type: "text", text }],
  };
}

describe("appendAgentMessageToHistory", () => {
  it("creates history when cache is empty", () => {
    const message = msg("am1", "hello");
    expect(appendAgentMessageToHistory(undefined, message)).toEqual({
      messages: [message],
      suggestions: [],
    });
  });

  it("appends a new message", () => {
    const existing = msg("am0", "prior");
    const next = msg("am1", "hello");
    const old: AgentHistory = { messages: [existing], suggestions: [] };
    expect(appendAgentMessageToHistory(old, next).messages.map((m) => m.id)).toEqual([
      "am0",
      "am1",
    ]);
  });

  it("is idempotent for the same message id", () => {
    const message = msg("am1", "hello");
    const old: AgentHistory = { messages: [message], suggestions: [] };
    expect(appendAgentMessageToHistory(old, message)).toBe(old);
  });
});

describe("mergeLiveMessagesIntoHistory", () => {
  it("write-echoes a settled user+assistant turn", () => {
    const merged = mergeLiveMessagesIntoHistory(undefined, [
      live("u1", "user", "@agent hi"),
      live("a1", "assistant", "hello"),
    ]);
    expect(merged.messages.map((m) => m.id)).toEqual(["u1", "a1"]);
    expect(merged.messages[0]?.source).toBe("mention");
    expect(merged.messages[1]?.role).toBe("assistant");
    expect(merged.messages[1]?.seq).toBe(2);
  });

  it("skips ids already in history and empty assistants", () => {
    const existing = msg("u1", "@agent hi");
    const old: AgentHistory = { messages: [existing], suggestions: [] };
    const merged = mergeLiveMessagesIntoHistory(old, [
      live("u1", "user", "@agent hi"),
      { id: "a-empty", role: "assistant", parts: [] },
      live("a1", "assistant", "done"),
    ]);
    expect(merged.messages.map((m) => m.id)).toEqual(["u1", "a1"]);
  });
});
