import { describe, expect, it } from "vitest";
import type { Stop } from "@/entities/stop";
import type { Trip } from "./model";
import { normalizeStop, normalizeTrip } from "./normalize";

const stop = (patch: Partial<Stop> = {}): Stop =>
  ({
    id: "s1",
    day: 1,
    time: "13:00",
    duration: "1h",
    name: "Ichiran Ramen",
    area: "Shinjuku",
    category: "Food",
    lat: 35.69,
    lng: 139.7,
    cost: 1500,
    costCurrency: "JPY",
    createdBy: "m-1",
    transit: false,
    note: "",
    mustSee: false,
    done: false,
    links: [],
    votes: [],
    comments: [],
    ...patch,
  }) as Stop;

/** A stop as older builds persisted it, before the three fields existed. */
const legacyStop = (): Stop => {
  const bare: Record<string, unknown> = { ...stop() };
  delete bare.mustSee;
  delete bare.done;
  delete bare.links;
  return bare as unknown as Stop;
};

describe("normalizeStop", () => {
  it("backfills fields missing from pre-migration payloads", () => {
    const result = normalizeStop(legacyStop());
    expect(result.links).toEqual([]);
    expect(result.mustSee).toBe(false);
    expect(result.done).toBe(false);
  });

  it("preserves values that are already present", () => {
    const links = [{ label: "Menu", url: "https://example.com" }];
    const result = normalizeStop(stop({ mustSee: true, done: true, links }));
    expect(result.links).toBe(links);
    expect(result.mustSee).toBe(true);
    expect(result.done).toBe(true);
  });

  it("returns the same object when nothing needs backfilling", () => {
    const original = stop();
    expect(normalizeStop(original)).toBe(original);
  });
});

describe("normalizeTrip", () => {
  it("normalizes every stop", () => {
    const trip = { stops: [legacyStop(), stop()] } as Trip;
    expect(normalizeTrip(trip).stops.every((s) => Array.isArray(s.links))).toBe(
      true,
    );
  });

  it("tolerates a payload with no stops array at all", () => {
    expect(normalizeTrip({} as Trip).stops).toEqual([]);
  });

  it("returns the same trip when no stop changed", () => {
    const trip = { stops: [stop()] } as Trip;
    expect(normalizeTrip(trip)).toBe(trip);
  });
});
