import { describe, expect, it } from "vitest";
import {
  detectLanguage,
  latestMemberText,
  replyLanguageInstruction,
} from "../src/infrastructure/ai/reply-language";
import type { AgentMessage } from "../src/domain/agent";

function msg(role: "user" | "assistant", text: string, seq = 0): AgentMessage {
  return {
    id: `m${seq}`,
    seq,
    role,
    parts: [{ type: "text", text }],
  } as unknown as AgentMessage;
}

describe("detectLanguage", () => {
  it("reads a plain English ask as English", () => {
    expect(detectLanguage("can u help me to add a stop for sunrise on day 7")).toBe(
      "English",
    );
  });

  it("keeps an English sentence English when it quotes a local place name", () => {
    // The whole point: a Taiwan trip is full of Chinese names, and one inside
    // an English sentence must not flip the reply into Chinese.
    expect(detectLanguage("add 九份 to day 5 please")).toBe("English");
    expect(detectLanguage("book 阿妹茶樓 for lunch, then 逢甲夜市 after")).toBe(
      "English",
    );
  });

  it("reads a genuinely Chinese ask as Chinese", () => {
    expect(detectLanguage("第七天早上想看日出，可以加一个行程吗")).toBe("Chinese");
  });

  it("tells Japanese from Chinese by its kana", () => {
    expect(detectLanguage("7日目に日の出を見たいのですが、追加できますか")).toBe(
      "Japanese",
    );
  });

  it("gives up on text with no letters at all", () => {
    expect(detectLanguage("👍 !!! 123")).toBeNull();
    expect(detectLanguage("   ")).toBeNull();
  });
});

describe("latestMemberText", () => {
  it("takes the newest member message, ignoring the agent's own replies", () => {
    const history = [
      msg("user", "first", 0),
      msg("assistant", "台中：山区民宿与绵羊", 1),
      msg("user", "add a sunrise stop", 2),
      msg("assistant", "sure", 3),
    ];
    expect(latestMemberText(history)).toBe("add a sunrise stop");
  });

  it("is empty when no member has spoken", () => {
    expect(latestMemberText([msg("assistant", "hello", 0)])).toBe("");
  });
});

describe("replyLanguageInstruction", () => {
  it("pins the language even when the agent last spoke Chinese", () => {
    const history = [
      msg("assistant", "台中：山区民宿与绵羊，入住山区Airbnb", 0),
      msg("user", "can u help me to add a stop for sunrise on day 7", 1),
    ];
    expect(replyLanguageInstruction(history)).toContain("English");
    expect(replyLanguageInstruction(history)).not.toContain("Chinese");
  });

  it("says nothing when the member's language cannot be told", () => {
    expect(replyLanguageInstruction([msg("user", "👍", 0)])).toBe("");
  });
});
