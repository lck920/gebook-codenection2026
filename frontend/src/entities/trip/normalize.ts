import type { Stop, StopLink } from "@/entities/stop";
import type { Trip } from "./model";

/**
 * Backfills stop fields that older payloads predate.
 *
 * `mustSee`, `done` and `links` were added to `Stop` after trips were already
 * being persisted, so three sources can still hand us a stop without them: a
 * browser holding a trip cached in localStorage from an earlier build, a
 * database that has not had the `stop_flags_links` migration applied, and any
 * client running against an older API. `links` is the dangerous one — the UI
 * reads `stop.links.length`, so an absent array threw and took the whole
 * planner down behind the error boundary rather than degrading.
 *
 * Applied at the API boundary so every consumer downstream can trust the type.
 */
export function normalizeStop(stop: Stop): Stop {
  const links: StopLink[] = Array.isArray(stop.links) ? stop.links : [];
  if (
    links === stop.links &&
    typeof stop.mustSee === "boolean" &&
    typeof stop.done === "boolean"
  ) {
    return stop;
  }
  return {
    ...stop,
    mustSee: stop.mustSee ?? false,
    done: stop.done ?? false,
    links,
  };
}

/** Returns the same object when nothing needed backfilling. */
export function normalizeTrip(trip: Trip): Trip {
  if (!Array.isArray(trip.stops)) return { ...trip, stops: [] };
  const stops = trip.stops.map(normalizeStop);
  const changed = stops.some((stop, i) => stop !== trip.stops[i]);
  return changed ? { ...trip, stops } : trip;
}
