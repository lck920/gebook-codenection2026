import { describe, expect, it } from "vitest";
import type { Trip, TripDay } from "@/entities/trip";
import type { Stop } from "@/entities/stop";
import { mergeTripToolEcho } from "./mergeTripToolEcho";
import { tripFromToolOutputs } from "./useAgentChat";
import type { UIMessage } from "ai";

function day(number: number, city: string): TripDay {
  return { number, date: "2026-07-01", dateLabel: "", city, color: "#000000" };
}

function stop(id: string, name: string, dayNum = 1): Stop {
  return {
    id,
    day: dayNum,
    time: "09:00",
    duration: "1h",
    name,
    area: "",
    category: "Sight",
    lat: 0,
    lng: 0,
    cost: 0,
    costCurrency: "",
    createdBy: "m1",
    transit: false,
    note: "",
    votes: [],
    comments: [],
  };
}

function trip(partial: Partial<Trip> & Pick<Trip, "days" | "stops">): Trip {
  return {
    id: "t1",
    title: "Trip",
    status: "planning",
    currency: "USD",
    version: 0,
    startDate: "2026-07-01",
    coverUrl: null,
    intake: null,
    agentSeedPending: false,
    members: [],
    permissions: { isMember: true, canEdit: true, canInvite: true },
    expenses: [],
    budget: { total: 0, perPerson: 0, balances: [], settlements: [] },
    ...partial,
  };
}

describe("mergeTripToolEcho", () => {
  it("overlays only the updated day and keeps sibling cities from prev", () => {
    const prev = trip({
      days: [day(1, "Ho Chi Minh City"), day(2, "Mui Ne"), day(3, "Da Lat")],
      stops: [],
    });
    const staleEcho = trip({
      days: [day(1, "越南 胡志明、美奈"), day(2, "Nha Trang"), day(3, "")],
      stops: [],
    });

    const merged = mergeTripToolEcho(
      prev,
      "updateDay",
      { dayNumber: 2, changes: { city: "Nha Trang" } },
      staleEcho,
    );

    expect(merged.days.map((d) => d.city)).toEqual([
      "Ho Chi Minh City",
      "Nha Trang",
      "Da Lat",
    ]);
  });

  it("appends a newly inserted stop without dropping prev-only stops", () => {
    const prev = trip({
      days: [day(1, "HCMC")],
      stops: [stop("s1", "Airport")],
    });
    const staleEcho = trip({
      days: [day(1, "HCMC")],
      stops: [stop("s2", "Hotel")],
    });

    const merged = mergeTripToolEcho(
      prev,
      "insertStop",
      { day: 1, name: "Hotel" },
      staleEcho,
    );

    expect(merged.stops.map((s) => s.id).sort()).toEqual(["s1", "s2"]);
  });

  it("uses the first echo as the base when prev is null", () => {
    const echo = trip({
      days: [day(1, "HCMC")],
      stops: [],
    });
    expect(mergeTripToolEcho(null, "updateDay", { dayNumber: 1 }, echo)).toBe(echo);
  });
});

describe("tripFromToolOutputs", () => {
  it("folds sequential updateDay echoes without last-wins rollback", () => {
    const cached = trip({
      days: [day(1, "旧 Day1"), day(2, ""), day(3, "Da Lat")],
      stops: [],
    });

    const messages = [
      {
        id: "a1",
        role: "assistant",
        parts: [
          {
            type: "tool-updateDay",
            toolCallId: "c1",
            state: "output-available",
            input: { dayNumber: 1, changes: { city: "Ho Chi Minh City" } },
            output: {
              ok: true,
              trip: trip({
                days: [day(1, "Ho Chi Minh City"), day(2, ""), day(3, "")],
                stops: [],
              }),
            },
          },
          {
            type: "tool-updateDay",
            toolCallId: "c2",
            state: "output-available",
            input: { dayNumber: 2, changes: { city: "Mui Ne" } },
            output: {
              ok: true,
              // Stale sibling day1 — the Hyperdrive failure mode.
              trip: trip({
                days: [day(1, "旧 Day1"), day(2, "Mui Ne"), day(3, "")],
                stops: [],
              }),
            },
          },
        ],
      },
    ] as unknown as UIMessage[];

    const merged = tripFromToolOutputs(messages, cached);
    expect(merged?.days.map((d) => d.city)).toEqual([
      "Ho Chi Minh City",
      "Mui Ne",
      "Da Lat",
    ]);
  });
});
