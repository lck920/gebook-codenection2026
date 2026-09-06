/**
 * Does this message continue the agent's previous turn?
 *
 * Getting this wrong is expensive: a "no" sends the message down the read-only
 * ambient path, where the agent answers that it cannot edit the trip — even
 * when it has just asked the member to confirm a plan it drafted. That loop
 * (agent says "reply confirm", member replies "confirm", agent says it cannot
 * write) is what a word list produces, because it can only recognise the
 * phrasings someone thought to list. "confirm" itself was missing from it.
 *
 * So the primary rule is positional rather than lexical: if the agent just
 * spoke and asked for something, a short reply is aimed at the agent, whatever
 * words it uses and however it is spelled.
 */

/** Words that answer "yes" to a proposal, in the languages the app ships. */
const AFFIRMATION =
  /^(确认|确定|好的?|可以|行|没问题|同意|就这样|就按这个|开始吧|添加吧|加上吧|ok|okay|kk|yes|yeah|yep|yup|ya|sure|confirm(ed)?|do\s*it|go|go\s*ahead|proceed|apply|add\s*it|please\s*do|sounds\s*good|looks\s*good|lgtm|perfect|great|👍|👌)$/i;

/** Leading filler that should not stop an affirmation from being recognised. */
const LEAD_FILLER =
  /^(?:[\s,.!-]*(?:ok(?:ay)?|well|so|and|then|now|alright|right|hmm+|erm|uh|um|yeah|ya|yep|i\s+think|i\s+guess|lets?|let's)\b[\s,.!-]*)+/i;

/** Longer continuations that still clearly answer the agent. */
const CONTINUATION =
  /^(确认|好的?|可以|行).{0,24}$|^(请)?(帮我)?(添加|加上|写入|创建|开始).{0,24}$|^(按|就按)(这个|你的|方案).{0,16}$/i;

/** Phrases an agent uses when it is waiting on the member before acting. */
const AGENT_ASKED =
  /\?|？|reply\s|confirm|let me know|shall i|should i|want me to|would you like|ready|i'?ll set it up|回复|确认|告诉我/i;

/** A reply this short, right after the agent asked something, is an answer. */
const SHORT_REPLY_CHARS = 90;

type TextPart = { type: string; text?: string };
type RoleMessage = { role: string; parts: TextPart[] };

function textFromParts(parts: TextPart[]): string {
  return parts
    .filter((p) => p.type === "text" && typeof p.text === "string")
    .map((p) => p.text!)
    .join("\n")
    .trim();
}

/** Strip filler and trailing punctuation so "ya sure," reads as "sure". */
function core(text: string): string {
  return text
    .replace(LEAD_FILLER, "")
    .replace(/[\s,.!?！。？]+$/u, "")
    .trim();
}

/**
 * True when `messageText` continues the agent's prior turn.
 *
 * `history` should be the messages already on screen, with the new message not
 * yet appended. Mirrors the API heuristic so confirmations take the streaming
 * chat path (write tools + approval) rather than an ambient read-only reply.
 */
export function looksLikeAgentThreadFollowUp(
  history: RoleMessage[],
  messageText: string,
): boolean {
  const trimmed = messageText.trim();
  if (!trimmed) return false;

  // Walk back over the member's own messages to the agent's last turn.
  let i = history.length - 1;
  while (i >= 0 && history[i]!.role === "user") i -= 1;
  if (i < 0 || history[i]!.role !== "assistant") return false;

  const prior = textFromParts(history[i]!.parts);
  if (!prior) return false;

  const stripped = core(trimmed);
  if (AFFIRMATION.test(stripped) || CONTINUATION.test(trimmed)) return true;

  // The positional rule: the agent asked, this is short, so it is the answer.
  // Covers typos ("confrim"), phrasings no list would have, and other languages.
  if (AGENT_ASKED.test(prior) && trimmed.length <= SHORT_REPLY_CHARS) {
    return true;
  }

  if (/[?？]/.test(trimmed) || /^(那|然后|另外|还有|能不能|可以|帮我|请)/.test(trimmed)) {
    return true;
  }

  return false;
}
