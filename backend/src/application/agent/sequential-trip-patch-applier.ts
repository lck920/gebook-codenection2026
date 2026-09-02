import type { PendingPatch } from "../../domain/agent";
import type { Trip } from "../../domain/trip";

export type TripPatchApplyResult<TDto> =
  | { ok: true; summary: string; trip: TDto }
  | { ok: false; error: string };

/**
 * Serialize AI SDK parallel tool executes onto one in-memory Trip for the
 * lifetime of a single chat request.
 *
 * Hyperdrive can serve a stale SELECT for ~60s after a write. Reloading the
 * trip between patches in the same turn would echo a half-old aggregate
 * (e.g. Day 1 city “rolls back” while Day 2 updates). Load once, accumulate.
 */
export function createSequentialTripPatchApplier<TDto>(options: {
  loadEditable: () => Promise<Trip>;
  apply: (
    trip: Trip,
    patch: PendingPatch,
  ) => Promise<{ ok: true; summary: string } | { ok: false; error: string }>;
  toDto: (trip: Trip) => TDto;
}): (patch: PendingPatch) => Promise<TripPatchApplyResult<TDto>> {
  let working: Trip | null = null;
  let patchQueue: Promise<void> = Promise.resolve();

  return (patch: PendingPatch) => {
    const run = async (): Promise<TripPatchApplyResult<TDto>> => {
      try {
        if (!working) {
          working = await options.loadEditable();
        }
        const result = await options.apply(working, patch);
        if (!result.ok) return result;
        return {
          ok: true,
          summary: result.summary,
          trip: options.toDto(working),
        };
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to apply trip change";
        return { ok: false, error: message };
      }
    };

    const result = patchQueue.then(run, run);
    patchQueue = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  };
}
