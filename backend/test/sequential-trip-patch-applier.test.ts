import { describe, expect, it, vi } from "vitest";
import type { PendingPatch } from "../src/domain/agent";
import { Trip } from "../src/domain/trip";
import { seedTrips } from "../src/infrastructure/persistence/seed-data";
import { applyTripOp } from "../src/application/trip/ops";
import { createSequentialTripPatchApplier } from "../src/application/agent/sequential-trip-patch-applier";

function freshTrip(): Trip {
  return Trip.fromSnapshot(structuredClone(seedTrips()[0]!.snapshot));
}

describe("createSequentialTripPatchApplier", () => {
  it("loads the trip once and accumulates patches so a stale reload cannot wipe prior days", async () => {
    const working = freshTrip();
    working.updateDay(1, { city: "Original Day1" });
    working.updateDay(2, { city: "" });

    const staleMissingDay1 = Trip.fromSnapshot({
      ...working.toSnapshot(),
      days: working.toSnapshot().days.map((d) =>
        d.number === 1 ? { ...d, city: "Original Day1" } : d.number === 2 ? { ...d, city: "" } : d,
      ),
    });

    let findCount = 0;
    const loadEditable = vi.fn(async () => {
      findCount += 1;
      // Simulate Hyperdrive: every reload returns the pre-batch snapshot.
      return findCount === 1 ? working : staleMissingDay1;
    });

    const updatedDays: { number: number; city: string }[] = [];
    const apply = async (trip: Trip, patch: PendingPatch) => {
      const result = await applyTripOp(
        {
          trip,
          actorUserId: trip.toSnapshot().members[0]!.userId ?? "u1",
          tripRepo: {
            async findSummaries() {
              return [];
            },
            async findById() {
              return null;
            },
            async create() {},
            async addMember() {},
            async rename() {},
            async clearAgentSeedPending() {},
            async updateIntake() {},
            async addDay() {},
            async updateDay(_tripId, day) {
              updatedDays.push({ number: day.number, city: day.city });
            },
            async reorderDays() {},
            async deleteDay() {},
            async save() {},
          },
        },
        patch,
      );
      return result;
    };

    const applyPatch = createSequentialTripPatchApplier({
      loadEditable,
      apply,
      toDto: (trip) => trip.toSnapshot(),
    });

    const first = await applyPatch({
      kind: "update_day",
      dayNumber: 1,
      changes: { city: "Ho Chi Minh City" },
    });
    const second = await applyPatch({
      kind: "update_day",
      dayNumber: 2,
      changes: { city: "Mui Ne" },
    });

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    expect(loadEditable).toHaveBeenCalledTimes(1);

    if (!first.ok || !second.ok) return;

    const day1AfterFirst = first.trip.days.find((d) => d.number === 1)?.city;
    const day1AfterSecond = second.trip.days.find((d) => d.number === 1)?.city;
    const day2AfterSecond = second.trip.days.find((d) => d.number === 2)?.city;

    expect(day1AfterFirst).toBe("Ho Chi Minh City");
    expect(day1AfterSecond).toBe("Ho Chi Minh City");
    expect(day2AfterSecond).toBe("Mui Ne");
    expect(updatedDays).toEqual([
      { number: 1, city: "Ho Chi Minh City" },
      { number: 2, city: "Mui Ne" },
    ]);
  });

  it("runs parallel callers strictly in queue order", async () => {
    const trip = freshTrip();
    const order: number[] = [];
    const applyPatch = createSequentialTripPatchApplier({
      loadEditable: async () => trip,
      apply: async (_t, patch) => {
        if (patch.kind !== "update_day") {
          return { ok: false, error: "unexpected" };
        }
        await new Promise((r) => setTimeout(r, patch.dayNumber === 1 ? 30 : 0));
        order.push(patch.dayNumber);
        return { ok: true, summary: `day ${patch.dayNumber}` };
      },
      toDto: (t) => t.toSnapshot(),
    });

    const results = await Promise.all([
      applyPatch({ kind: "update_day", dayNumber: 1, changes: { city: "A" } }),
      applyPatch({ kind: "update_day", dayNumber: 2, changes: { city: "B" } }),
      applyPatch({ kind: "update_day", dayNumber: 3, changes: { city: "C" } }),
    ]);

    expect(results.every((r) => r.ok)).toBe(true);
    expect(order).toEqual([1, 2, 3]);
  });
});
