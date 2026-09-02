export interface QuoteTarget {
  /** Display name shown in the quote preview and blockquote header. */
  author: string;
  /** Body text being quoted. */
  text: string;
  /**
   * Optional `@`-mention token inserted ahead of the quote so the author is
   * notified (member full name, or `agent`).
   */
  mentionToken?: string;
}

/** Markdown blockquote lines for a quoted snippet (`> Author: …`). */
export function formatQuoteBlock(author: string, text: string): string {
  const lines = text.trim().split("\n");
  if (lines.length === 0 || (lines.length === 1 && !lines[0])) return "";
  const [first, ...rest] = lines;
  return [`> ${author}: ${first}`, ...rest.map((line) => `> ${line}`)].join(
    "\n",
  );
}

/** Compose the outbound message: quote block first, then optional @mention + body. */
export function composeWithQuote(
  quote: QuoteTarget | null | undefined,
  draft: string,
): string {
  const body = draft.trim();
  if (!quote) return body;
  const block = formatQuoteBlock(quote.author, quote.text);
  if (!block) return body;
  const mention = quote.mentionToken ? `@${quote.mentionToken}` : "";
  if (mention && body) return `${block}\n\n${mention} ${body}`.trim();
  if (mention) return `${block}\n\n${mention}`.trim();
  if (body) return `${block}\n\n${body}`.trim();
  return block;
}

export interface ParsedQuote {
  author: string | null;
  text: string;
}

/**
 * Split a leading markdown blockquote (from `composeWithQuote`) off the body
 * so UIs can render a quote chip instead of raw `>` lines.
 */
export function parseLeadingQuote(text: string): {
  quote: ParsedQuote | null;
  body: string;
} {
  const lines = text.split("\n");
  const quoteLines: string[] = [];
  let i = 0;
  while (i < lines.length && /^>\s?/.test(lines[i]!)) {
    quoteLines.push(lines[i]!.replace(/^>\s?/, ""));
    i += 1;
  }
  if (quoteLines.length === 0) return { quote: null, body: text };
  if (i < lines.length && lines[i] === "") i += 1;

  const joined = quoteLines.join("\n");
  const match = joined.match(/^([^:\n]+):\s([\s\S]*)$/);
  const quote: ParsedQuote = match
    ? { author: match[1]!.trim(), text: match[2]! }
    : { author: null, text: joined };

  return { quote, body: lines.slice(i).join("\n") };
}
