/**
 * Stop durations are stored as a short human string — "45m", "1h", "1.5h",
 * "1h 30m" — because that is the vocabulary the itinerary, the seed data and
 * the AI agent's tool schemas all already speak. The editor wants minutes, so
 * these two functions are the only place the two representations meet.
 *
 * `formatDuration` deliberately reproduces the existing vocabulary rather than
 * normalising everything to one shape, so editing an unrelated field never
 * silently rewrites "1.5h" into "1h 30m" for every other reader.
 */

/** Minutes for a stored duration, or null when it cannot be understood. */
export function parseDurationMinutes(value: string): number | null {
  const text = value.trim().toLowerCase();
  if (!text) return null;

  // "1h 30m" / "1h30m"
  const combined = /^(\d+(?:\.\d+)?)\s*h\s*(\d+)\s*m$/.exec(text);
  if (combined) {
    return Math.round(Number(combined[1]) * 60 + Number(combined[2]));
  }
  // "1h" / "1.5h"
  const hours = /^(\d+(?:\.\d+)?)\s*h$/.exec(text);
  if (hours) return Math.round(Number(hours[1]) * 60);
  // "45m" / "90 min"
  const minutes = /^(\d+(?:\.\d+)?)\s*m(?:in)?$/.exec(text);
  if (minutes) return Math.round(Number(minutes[1]));
  // Bare number is read as minutes, which is what the editor submits.
  const bare = /^(\d+(?:\.\d+)?)$/.exec(text);
  if (bare) return Math.round(Number(bare[1]));

  return null;
}

/** Renders minutes back into the stored vocabulary. */
export function formatDuration(minutes: number): string {
  const total = Math.max(0, Math.round(minutes));
  if (total === 0) return "0m";
  if (total < 60) return `${total}m`;

  const hours = Math.floor(total / 60);
  const rest = total % 60;
  if (rest === 0) return `${hours}h`;
  // Half hours keep the "1.5h" spelling the existing data uses.
  if (rest === 30) return `${hours + 0.5}h`;
  return `${hours}h ${rest}m`;
}
