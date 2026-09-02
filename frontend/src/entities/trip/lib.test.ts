import { describe, expect, it } from "vitest";
import { upsertTripSummary } from "./lib";
import type { Trip, TripSummary } from "./model";

function trip(id: string, title: string): Trip {
  return {
    id,
    title,
    status: "planning",
    currency: "JPY",
    version: 0,
    startDate: "2026-07-11",
    coverUrl: null,
    intake: null,
    agentSeedPending: false,
    members: [],
    permissions: { isMember: true, canEdit: true, canInvite: true },
    days: [],
    stops: [],
    expenses: [],
    budget: { total: 0, perPerson: 0, balances: [], settlements: [] },
  };
}

describe("upsertTripSummary", () => {
  it("prepends a new mutation echo without mutating the previous list", () => {
    const previous: TripSummary[] = [];
    const result = upsertTripSummary(previous, trip("t1", "Kyoto"));

    expect(result).toHaveLength(1);
    expect(result?.[0]?.id).toBe("t1");
    expect(previous).toEqual([]);
  });

  it("replaces an existing summary and preserves its creation timestamp", () => {
    const createdAt = "2026-01-01T00:00:00.000Z";
    const previous = upsertTripSummary([], trip("t1", "Old"))!;
    previous[0] = { ...previous[0]!, createdAt };

    const result = upsertTripSummary(previous, trip("t1", "New"));

    expect(result?.[0]?.title).toBe("New");
    expect(result?.[0]?.createdAt).toBe(createdAt);
    expect(result).not.toBe(previous);
  });

  it("does not create a list cache that has never been loaded", () => {
    expect(upsertTripSummary(undefined, trip("t1", "Kyoto"))).toBeUndefined();
  });
});
