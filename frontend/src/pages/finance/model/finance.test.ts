import { describe, expect, it } from "vitest";
import type { Stop } from "@/entities/stop";
import type { Trip } from "@/entities/trip";
import {
  budgetSummary,
  groupExpensesByDay,
  personalShare,
  plannedLines,
} from "./finance";

function stop(partial: Partial<Stop> & { id: string; cost: number }): Stop {
  return {
    day: 1,
    time: "",
    duration: "",
    name: partial.id,
    area: "",
    category: "Plan",
    lat: 0,
    lng: 0,
    costCurrency: "JPY",
    createdBy: "m1",
    transit: false,
    note: "",
    votes: [],
    comments: [],
    ...partial,
  };
}

function trip(partial: Partial<Trip> = {}): Trip {
  return {
    id: "t1",
    title: "Japan",
    status: "planning",
    currency: "JPY",
    version: 0,
    startDate: "2025-10-12",
    coverUrl: null,
    intake: null,
    agentSeedPending: false,
    members: [],
    permissions: { isMember: true, canEdit: true, canInvite: true },
    days: [],
    stops: [],
    expenses: [],
    contributions: [],
    budgetItems: [],
    budget: { total: 0, perPerson: 0, balances: [], settlements: [] },
    ...partial,
  };
}

const THREE_MEMBERS = [
  { id: "m1" },
  { id: "m2" },
  { id: "m3" },
] as unknown as Trip["members"];

describe("budgetSummary", () => {
  it("sums every contribution for the group scope", () => {
    const result = budgetSummary(
      trip({
        members: THREE_MEMBERS,
        contributions: [
          { memberId: "m1", amount: 100_000, currency: "JPY" },
          { memberId: "m2", amount: 100_000, currency: "JPY" },
        ],
        stops: [stop({ id: "s1", cost: 12_000, category: "Food" })],
      }),
      "group",
      "m1",
    );

    expect(result.pool).toBe(200_000);
    expect(result.planned).toBe(12_000);
    expect(result.left).toBe(188_000);
    expect(result.contributorCount).toBe(2);
  });

  it("scopes the pool to your stake and splits planned spend per member", () => {
    const result = budgetSummary(
      trip({
        members: THREE_MEMBERS,
        contributions: [
          { memberId: "m1", amount: 100_000, currency: "JPY" },
          { memberId: "m2", amount: 100_000, currency: "JPY" },
        ],
        stops: [stop({ id: "s1", cost: 30_000, category: "Food" })],
      }),
      "individual",
      "m1",
    );

    expect(result.pool).toBe(100_000);
    expect(result.planned).toBe(10_000);
    expect(result.categories[0]).toMatchObject({
      category: "Food",
      amount: 10_000,
    });
  });

  it("reports no usage rather than dividing by an empty pool", () => {
    const result = budgetSummary(
      trip({ members: THREE_MEMBERS, stops: [stop({ id: "s1", cost: 5_000 })] }),
      "group",
      "m1",
    );

    expect(result.pool).toBe(0);
    expect(result.usedFraction).toBe(0);
    expect(result.left).toBe(-5_000);
  });

  it("orders categories by size and ignores free stops", () => {
    const result = budgetSummary(
      trip({
        members: THREE_MEMBERS,
        contributions: [{ memberId: "m1", amount: 90_000, currency: "JPY" }],
        stops: [
          stop({ id: "s1", cost: 6_000, category: "Food" }),
          stop({ id: "s2", cost: 15_000, category: "Activity" }),
          stop({ id: "s3", cost: 0, category: "Sight" }),
        ],
      }),
      "group",
      "m1",
    );

    expect(result.categories.map((c) => c.category)).toEqual([
      "Activity",
      "Food",
    ]);
  });
});

describe("plannedLines", () => {
  it("counts standalone budget items alongside stop costs", () => {
    const result = budgetSummary(
      trip({
        members: THREE_MEMBERS,
        contributions: [{ memberId: "m1", amount: 10_000, currency: "MYR" }],
        stops: [stop({ id: "s1", cost: 500, category: "Food" })],
        budgetItems: [
          {
            id: "bi1",
            label: "Flights",
            category: "Transit",
            amount: 1_800,
            currency: "MYR",
            createdBy: "m1",
          },
        ],
      }),
      "group",
      "m1",
    );

    expect(result.planned).toBe(2_300);
    expect(result.categories.map((c) => c.category)).toEqual([
      "Transit",
      "Food",
    ]);
  });

  it("lists trip-wide costs before day-scoped stops", () => {
    const lines = plannedLines(
      trip({
        stops: [stop({ id: "s1", cost: 500, day: 1, name: "Ramen" })],
        budgetItems: [
          {
            id: "bi1",
            label: "Hotel",
            category: "Stay",
            amount: 1_200,
            currency: "MYR",
            createdBy: "m1",
          },
        ],
      }),
    );

    expect(lines.map((l) => l.kind)).toEqual(["item", "stop"]);
    expect(lines[0]!.day).toBeNull();
    expect(lines[1]!.label).toBe("Ramen");
  });
});

describe("personalShare", () => {
  it("nets your contribution against your split of planned spend", () => {
    const result = personalShare(
      trip({
        members: THREE_MEMBERS,
        contributions: [{ memberId: "m2", amount: 100_000, currency: "JPY" }],
        stops: [stop({ id: "s1", cost: 30_000 })],
      }),
      "m2",
    );

    expect(result).toEqual({
      contributed: 100_000,
      plannedShare: 10_000,
      remaining: 90_000,
    });
  });
});

describe("groupExpensesByDay", () => {
  it("groups by the day in the label and keeps undated expenses last", () => {
    const groups = groupExpensesByDay(
      trip({
        days: [
          { number: 2, date: "2025-10-13", dateLabel: "13 Oct", city: "Tokyo", color: "#000" },
        ],
        expenses: [
          {
            id: "e1",
            description: "Pocket wifi",
            payer: "m1",
            amount: 9_600,
            currency: "JPY",
            category: "Plan",
            participants: ["m1"],
            whenLabel: "Pre-trip",
          },
          {
            id: "e2",
            description: "teamLab",
            payer: "m2",
            amount: 11_400,
            currency: "JPY",
            category: "Activity",
            participants: ["m1", "m2"],
            whenLabel: "Day 2",
          },
        ],
      }),
    );

    expect(groups.map((g) => g.day)).toEqual([2, null]);
    expect(groups[0]!.label).toBe("Day 2 · 13 Oct · Tokyo");
    expect(groups[0]!.total).toBe(11_400);
    expect(groups[1]!.label).toBe("Pre-trip");
  });
});
