import { describe, expect, it } from "vitest";
import {
  createTripChange,
  normalizeTripChangeScopes,
} from "../src/domain/realtime";

describe("realtime domain", () => {
  it("deduplicates scopes in stable protocol order", () => {
    expect(
      normalizeTripChangeScopes([
        "comments",
        "stops",
        "comments",
        "trip",
      ]),
    ).toEqual(["trip", "stops", "comments"]);
  });

  it("constructs a canonical trip change", () => {
    expect(
      createTripChange({
        eventId: " event-1 ",
        tripId: " trip-1 ",
        revision: 4,
        actorId: " user-1 ",
        occurredAt: "2026-07-12T08:15:00+08:00",
        scopes: ["reservations", "trip", "reservations"],
      }),
    ).toEqual({
      eventId: "event-1",
      tripId: "trip-1",
      revision: 4,
      actorId: "user-1",
      occurredAt: "2026-07-12T00:15:00.000Z",
      scopes: ["trip", "reservations"],
    });
  });

  it.each([
    { field: "eventId", value: "" },
    { field: "tripId", value: "  " },
    { field: "actorId", value: "" },
  ])("rejects a missing $field", ({ field, value }) => {
    expect(() =>
      createTripChange({
        eventId: field === "eventId" ? value : "event-1",
        tripId: field === "tripId" ? value : "trip-1",
        revision: 1,
        actorId: field === "actorId" ? value : "user-1",
        occurredAt: "2026-07-12T00:00:00.000Z",
        scopes: ["trip"],
      }),
    ).toThrow();
  });

  it("rejects invalid revisions, dates, and empty scopes", () => {
    const base = {
      eventId: "event-1",
      tripId: "trip-1",
      actorId: "user-1",
      occurredAt: "2026-07-12T00:00:00.000Z",
      scopes: ["trip"] as const,
    };
    expect(() => createTripChange({ ...base, revision: -1 })).toThrow();
    expect(() =>
      createTripChange({ ...base, revision: 1, occurredAt: "not-a-date" }),
    ).toThrow();
    expect(() =>
      createTripChange({ ...base, revision: 1, scopes: [] }),
    ).toThrow();
  });
});
