/**
 * Does this chat line ask the agent to change the trip?
 *
 * The planner chat is shared by every member, so plain messages go to the
 * read-only ambient path and only `@agent` turns get write tools. That left a
 * dead end: "can u add that to the schedule" reads as ambient, and the agent
 * answers that it cannot write — asking the member to retype with @agent.
 *
 * A line that asks for an edit *and* is aimed at the assistant is routed to the
 * write-capable stream instead. Nothing is applied silently: write tools still
 * pause on the approval card.
 */

/** Verbs that change the trip rather than ask about it. */
const EDIT_VERB =
  /\b(add|adds|adding|insert|put|append|schedule|rebook|book|plan|remove|removes|delete|drop|clear|move|reorder|reschedule|shift|rename|change|update|edit|set|swap|replace|fill|split)\b/i;

const EDIT_VERB_ZH =
  /(添加|加上|加入|加进|写入|录入|记一笔|删除|移除|去掉|移动|挪到|改到|改成|修改|更新|安排|规划|排一下|填上|替换)/;

/** Framing that points the request at the assistant rather than the room. */
const ASKING_ASSISTANT =
  /\b(can|could|would|will)\s+(you|u|ya)\b|\b(please|pls|plz)\b|\blet'?s\b|\b(i|we)\s+(want|need|would\s+like|wanna)\b|\bgo\s+ahead\b|\bfor\s+me\b/i;

const ASKING_ASSISTANT_ZH = /(帮我|帮忙|请|麻烦|能不能|可以吗|你来|替我)/;

/** Leading filler to skip before testing for a bare imperative. */
const LEAD_FILLER =
  /^(?:[\s,.!-]*(?:ok(?:ay)?|kk|yeah|yea|yep|yup|yes|sure|sc|alright|right|cool|nice|great|and|also|then|now|so|but|hey|hi|hmm+|well|actually|maybe|just|next|@agent)\b[\s,.!-]*)+/i;

/** `@Name` for someone other than the agent — that line is for a person. */
function mentionsAnotherMember(text: string, memberNames: string[]): boolean {
  return memberNames.some((name) => {
    const trimmed = name.trim();
    if (!trimmed) return false;
    const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`@${escaped}(?=\\s|$|[.,!?;:])`, "i").test(text);
  });
}

export function looksLikeTripWriteRequest(
  text: string,
  memberNames: string[] = [],
): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;

  // Addressed to a teammate by name: leave it to them, not the agent.
  if (!/@agent\b/i.test(trimmed) && mentionsAnotherMember(trimmed, memberNames)) {
    return false;
  }

  const hasEditVerb = EDIT_VERB.test(trimmed) || EDIT_VERB_ZH.test(trimmed);
  if (!hasEditVerb) return false;

  if (ASKING_ASSISTANT.test(trimmed) || ASKING_ASSISTANT_ZH.test(trimmed)) {
    return true;
  }

  // Bare imperative: "add Moraine Lake to day 2", "yeah, and move lunch to 13:00".
  const withoutFiller = trimmed.replace(LEAD_FILLER, "");
  if (EDIT_VERB.test(withoutFiller.split(/\s+/, 1)[0] ?? "")) return true;
  return new RegExp(`^(?:${EDIT_VERB_ZH.source})`).test(withoutFiller);
}
