export interface ActiveMention {
  /** Index of the triggering `@` in the draft. */
  start: number;
  /** Text between `@` and the caret. */
  query: string;
}

/**
 * Find an active `@mention` token ending at the caret. Returns null when the
 * caret is not inside a mention: no preceding `@`, the `@` is not at a word
 * boundary (start-of-text or after whitespace), or whitespace already closed
 * the token.
 */
export function detectMention(
  value: string,
  caret: number,
): ActiveMention | null {
  for (let i = caret - 1; i >= 0; i--) {
    const ch = value[i]!;
    if (ch === "@") {
      const before = i === 0 ? "" : value[i - 1]!;
      if (before === "" || /\s/.test(before)) {
        return { start: i, query: value.slice(i + 1, caret) };
      }
      return null;
    }
    if (/\s/.test(ch)) return null;
  }
  return null;
}
