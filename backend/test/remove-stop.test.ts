import { describe, expect, it } from "vitest";
import { Trip } from "../src/domain/trip/trip";
import { DomainError } from "../src/domain/shared/errors";

function tripWithStops() {
  const trip = Trip.create({ title: "Canada" }, { id: "u1", name: "Ada" });
  trip.addDay();
  const member = trip.toSnapshot().members[0]!.id;
  const a = trip.insertStop({ day: 1, index: 0, name: "Moraine Lake", time: "08:00" }, member);
  const b = trip.insertStop({ day: 1, index: 1, name: "Lake Louise", time: "11:30" }, member);
  const c = trip.insertStop({ day: 2, index: 0, name: "Banff gondola", time: "10:00" }, member);
  return { trip, a, b, c };
}

describe("Trip.removeStop", () => {
  it("drops the stop and leaves the rest contiguous", () => {
    const { trip, a, b, c } = tripWithStops();
    trip.removeStop(a.id);

    const stops = trip.toSnapshot().stops;
    expect(stops.map((s) => s.id)).toEqual([b.id, c.id]);
    expect(stops.map((s) => s.order)).toEqual([0, 1]);
  });

  it("keeps a later stop movable after an earlier one is removed", () => {
    const { trip, a, b, c } = tripWithStops();
    trip.removeStop(a.id);
    trip.moveStop({ stopId: c.id, day: 1, index: 0 });

    const stops = trip.toSnapshot().stops;
    expect(stops.map((s) => s.id)).toEqual([c.id, b.id]);
    expect(stops.map((s) => s.order)).toEqual([0, 1]);
    expect(stops.every((s) => s.day === 1)).toBe(true);
  });

  it("rejects an unknown stop", () => {
    const { trip } = tripWithStops();
    expect(() => trip.removeStop("nope")).toThrow(DomainError);
  });
});
