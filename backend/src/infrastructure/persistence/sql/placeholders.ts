/**
 * Convert PostgreSQL-style `$1` placeholders to MySQL `?`.
 * Only replaces standalone `$n` tokens (not `$foo` identifiers).
 */
export function toMysqlPlaceholders(text: string): string {
  return text.replace(/\$(\d+)\b/g, "?");
}

/**
 * Infer the next free `$n` index from a SQL fragment that already contains
 * placeholders (1-based, matching Postgres).
 */
export function nextPlaceholderIndex(text: string): number {
  let max = 0;
  for (const m of text.matchAll(/\$(\d+)\b/g)) {
    max = Math.max(max, Number(m[1]));
  }
  return max + 1;
}
