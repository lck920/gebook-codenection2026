/** Short affirmations / approvals that continue an agent turn without @agent. */
const SHORT_AFFIRMATION =
  /^(确认|好的?|可以|行|没问题|同意|就这样|就按这个|开始吧|添加吧|加上吧|ok|okay|yes|yep|sure|go\s*ahead|please\s*do|lgtm|👍|👌)[.!！。]*$/i;

/** Slightly longer continuations that still clearly answer the agent. */
const CONTINUATION =
  /^(确认|好的?|可以|行).{0,24}$|^(请)?(帮我)?(添加|加上|写入|创建|开始).{0,24}$|^(按|就按)(这个|你的|方案).{0,16}$/i;

type TextPart = { type: string; text?: string };
type RoleMessage = { role: string; parts: TextPart[] };

function textFromParts(parts: TextPart[]): string {
  return parts
    .filter((p) => p.type === "text" && typeof p.text === "string")
    .map((p) => p.text!)
    .join("\n")
    .trim();
}

/**
 * True when `messageText` continues the agent's prior turn (e.g. “确认”
 * after a draft itinerary). History should be the messages already on screen
 * (latest user message not yet appended).
 *
 * Mirrors the API heuristic so confirmations use the streaming chat path
 * (write tools + approval) instead of ambient read-only replies.
 */
export function looksLikeAgentThreadFollowUp(
  history: RoleMessage[],
  messageText: string,
): boolean {
  const trimmed = messageText.trim();
  if (!trimmed) return false;

  let i = history.length - 1;
  while (i >= 0 && history[i]!.role === "user") i -= 1;
  if (i < 0 || history[i]!.role !== "assistant") return false;

  const prior = textFromParts(history[i]!.parts);
  if (!prior) return false;

  if (SHORT_AFFIRMATION.test(trimmed) || CONTINUATION.test(trimmed)) {
    return true;
  }

  if (/[?？]/.test(trimmed) || /^(那|然后|另外|还有|能不能|可以|帮我|请)/.test(trimmed)) {
    return true;
  }

  return false;
}
