import { describe, expect, it } from "vitest";
import { looksLikeAgentThreadFollowUp } from "./agentThreadFollowUp";

const proposal = [
  {
    role: "assistant",
    parts: [
      {
        type: "text",
        text:
          "5 cities confirmed: San Jose (base, 3 days) + San Francisco (1 day). " +
          'Just reply "confirm" with the second member\'s name and I\'ll set it up.',
      },
    ],
  },
];

describe("looksLikeAgentThreadFollowUp", () => {
  it("recognises the exact word the agent asked for", () => {
    // The agent said reply "confirm" — and "confirm" was not in the old list,
    // so the member was told to say a word the router then ignored.
    expect(looksLikeAgentThreadFollowUp(proposal, "confirm")).toBe(true);
  });

  it("recognises an affirmation wrapped in filler and punctuation", () => {
    expect(looksLikeAgentThreadFollowUp(proposal, "ya sure,")).toBe(true);
    expect(looksLikeAgentThreadFollowUp(proposal, "ok, do it")).toBe(true);
    expect(looksLikeAgentThreadFollowUp(proposal, "yeah go ahead!")).toBe(true);
  });

  it("survives a typo, because the agent had just asked", () => {
    expect(looksLikeAgentThreadFollowUp(proposal, "confrim")).toBe(true);
  });

  it("treats any short reply to a question as the answer", () => {
    expect(looksLikeAgentThreadFollowUp(proposal, "Jane and Steven")).toBe(true);
  });

  it("still routes a long unrelated message on its own merits", () => {
    const long =
      "by the way the flight prices to Osaka have gone up a lot this month " +
      "and I was reading that the cherry blossom season is unusually early";
    expect(looksLikeAgentThreadFollowUp(proposal, long)).toBe(false);
  });

  it("needs the agent to have spoken last", () => {
    expect(looksLikeAgentThreadFollowUp([], "confirm")).toBe(false);
    expect(
      looksLikeAgentThreadFollowUp(
        [{ role: "user", parts: [{ type: "text", text: "hi" }] }],
        "confirm",
      ),
    ).toBe(false);
  });

  it("does not fire on a short reply when the agent asked nothing", () => {
    const statement = [
      { role: "assistant", parts: [{ type: "text", text: "Added 3 stops." }] },
    ];
    expect(looksLikeAgentThreadFollowUp(statement, "nice one")).toBe(false);
  });
});
