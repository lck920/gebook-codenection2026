import { describe, expect, it } from "vitest";
import type { AgentMessage } from "../src/domain/agent";
import { looksLikeAgentThreadFollowUp } from "../src/application/agent/addressed";

function msg(
  role: AgentMessage["role"],
  text: string,
  seq = 1,
): AgentMessage {
  return {
    id: `am-${seq}`,
    tripId: "t1",
    seq,
    role,
    parts: [{ type: "text", text }],
    actorUserId: role === "user" ? "u1" : null,
    source: role === "assistant" ? "chat" : "chat",
    tripVersion: 0,
    createdAt: new Date().toISOString(),
  };
}

describe("looksLikeAgentThreadFollowUp", () => {
  it("treats 确认 after an agent plan as a follow-up", () => {
    const history = [
      msg("assistant", "如需添加请回复“确认”", 1),
      msg("user", "确认", 2),
    ];
    expect(looksLikeAgentThreadFollowUp(history, "确认")).toBe(true);
  });

  it("treats follow-up questions after an agent turn as addressed", () => {
    const history = [
      msg("assistant", "这是三天行程草案。", 1),
      msg("user", "那第一天午餐换个地方？", 2),
    ];
    expect(looksLikeAgentThreadFollowUp(history, "那第一天午餐换个地方？")).toBe(
      true,
    );
  });

  it("returns false when there is no prior assistant turn", () => {
    const history = [msg("user", "确认", 1)];
    expect(looksLikeAgentThreadFollowUp(history, "确认")).toBe(false);
  });

  it("returns false for empty text", () => {
    const history = [
      msg("assistant", "hello", 1),
      msg("user", "   ", 2),
    ];
    expect(looksLikeAgentThreadFollowUp(history, "   ")).toBe(false);
  });
});
