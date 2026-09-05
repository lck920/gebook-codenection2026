import type { AgentMessage } from "../../domain/agent";

/**
 * Which language should the agent answer in?
 *
 * Telling the model to "match the member's language" is not enough on its own.
 * A Taiwan itinerary carries Chinese place names in the snapshot, in tool
 * results, and often in earlier assistant turns, and that weight of context
 * wins: an English question about 九份 came back entirely in Chinese. So the
 * language is decided here, from the member's own words, and stated to the
 * model as a fact rather than left to inference.
 */

/** Scripts we can tell apart cheaply, in the order they are tested. */
const SCRIPTS: { language: string; pattern: RegExp }[] = [
  // Kana first: Japanese text also contains Han characters, Chinese has no kana.
  { language: "Japanese", pattern: /[぀-ゟ゠-ヿ]/g },
  { language: "Korean", pattern: /[가-힯ᄀ-ᇿ]/g },
  { language: "Chinese", pattern: /[一-鿿㐀-䶿]/g },
  { language: "Thai", pattern: /[฀-๿]/g },
  { language: "Arabic", pattern: /[؀-ۿ]/g },
  { language: "Russian", pattern: /[Ѐ-ӿ]/g },
  { language: "English", pattern: /[A-Za-z]/g },
];

/** A place name quoted inside an otherwise English sentence must not flip it. */
const NON_LATIN_DOMINANCE = 0.3;

function countMatches(text: string, pattern: RegExp): number {
  return (text.match(pattern) ?? []).length;
}

/**
 * Name the language of `text`, or null when there is nothing to go on.
 *
 * Latin script only wins on plurality; a non-Latin script wins as soon as it
 * makes up a meaningful share, since "add 九份 to day 5" is an English sentence
 * but "九份老街好玩吗" is not, and both mix scripts.
 */
export function detectLanguage(text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  const counts = SCRIPTS.map((script) => ({
    language: script.language,
    count: countMatches(trimmed, script.pattern),
  }));
  const total = counts.reduce((sum, c) => sum + c.count, 0);
  if (total === 0) return null;

  for (const { language, count } of counts) {
    if (language === "English") continue;
    if (count / total >= NON_LATIN_DOMINANCE) return language;
  }
  const latin = counts.find((c) => c.language === "English")!.count;
  return latin > 0 ? "English" : null;
}

/** The most recent thing a human actually typed, newest first. */
export function latestMemberText(history: AgentMessage[]): string {
  for (let i = history.length - 1; i >= 0; i -= 1) {
    const message = history[i]!;
    if (message.role !== "user") continue;
    const text = message.parts
      .filter((p) => p.type === "text" && typeof p.text === "string")
      .map((p) => (p as { text: string }).text)
      .join("\n")
      .trim();
    if (text) return text;
  }
  return "";
}

/**
 * A system-prompt clause pinning the reply language, or "" when the member's
 * language cannot be told — in which case the prompt's own rule stands.
 */
export function replyLanguageInstruction(history: AgentMessage[]): string {
  const language = detectLanguage(latestMemberText(history));
  if (!language) return "";
  return `\n\nREPLY LANGUAGE: the member is writing in ${language}. Write your entire reply in ${language}, including headings and any generated UI text. Place names may keep their local spelling, but every sentence you write must be in ${language}.`;
}
