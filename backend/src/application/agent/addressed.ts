import type { AgentMessage } from "../../domain/agent";

/** Words that answer "yes" to a proposal, in the languages the app ships. */
const AFFIRMATION =
  /^(确认|确定|好的?|可以|行|没问题|同意|就这样|就按这个|开始吧|添加吧|加上吧|ok|okay|kk|yes|yeah|yep|yup|ya|sure|confirm(ed)?|do\s*it|go|go\s*ahead|proceed|apply|add\s*it|please\s*do|sounds\s*good|looks\s*good|lgtm|perfect|great|👍|👌)$/i;

/** Leading filler that should not stop an affirmation from being recognised. */
const LEAD_FILLER =
  /^(?:[\s,.!-]*(?:ok(?:ay)?|well|so|and|then|now|alright|right|hmm+|erm|uh|um|yeah|ya|yep|i\s+think|i\s+guess|lets?|let's)\b[\s,.!-]*)+/i;

/** Slightly longer continuations that still clearly answer the agent. */
const CONTINUATION =
  /^(确认|好的?|可以|行).{0,24}$|^(请)?(帮我)?(添加|加上|写入|创建|开始).{0,24}$|^(按|就按)(这个|你的|方案).{0,16}$/i;

/** Phrases an agent uses when it is waiting on the member before acting. */
const AGENT_ASKED =
  /\?|？|reply\s|confirm|let me know|shall i|should i|want me to|would you like|ready|i'?ll set it up|回复|确认|告诉我/i;

/** A reply this short, right after the agent asked something, is an answer. */
const SHORT_REPLY_CHARS = 90;

/** Strip filler and trailing punctuation so "ya sure," reads as "sure". */
function core(text: string): string {
  return text
    .replace(LEAD_FILLER, "")
    .replace(/[\s,.!?！。？]+$/u, "")
    .trim();
}

function textFromParts(parts: AgentMessage["parts"]): string {
  return parts
    .filter((p) => p.type === "text" && typeof p.text === "string")
    .map((p) => (p as { text: string }).text)
    .join("\n")
    .trim();
}

/**
 * True when the latest member message continues the agent's prior turn
 * (e.g. agent asked to reply “确认”, member sent “确认”).
 *
 * `history` must already include the latest user message.
 */
export function looksLikeAgentThreadFollowUp(
  history: AgentMessage[],
  messageText: string,
): boolean {
  const trimmed = messageText.trim();
  if (!trimmed) return false;

  let i = history.length - 1;
  while (i >= 0 && history[i]!.role === "user") i -= 1;
  if (i < 0 || history[i]!.role !== "assistant") return false;

  const prior = textFromParts(history[i]!.parts);
  if (!prior) return false;

  const stripped = core(trimmed);
  if (AFFIRMATION.test(stripped) || CONTINUATION.test(trimmed)) {
    return true;
  }

  // Positional rule: the agent asked for something and this reply is short, so
  // it is the answer — whatever words it uses, and however it is spelled.
  if (AGENT_ASKED.test(prior) && trimmed.length <= SHORT_REPLY_CHARS) {
    return true;
  }

  // Member asks a follow-up question right after the agent spoke — treat as
  // continuing the agent thread even without @agent.
  if (/[?？]/.test(trimmed) || /^(那|然后|另外|还有|能不能|可以|帮我|请)/.test(trimmed)) {
    return true;
  }

  return false;
}
