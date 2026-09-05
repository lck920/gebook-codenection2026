import type { Stop, StopCategory } from "@/entities/stop";
import type { Trip } from "@/entities/trip";

/** Which half of the page is showing: planning money, or money already spent. */
export type FinanceMode = "budget" | "expenses";

/** Whose money the budget figures describe. */
export type FinanceScope = "individual" | "group";

export interface CategoryTotal {
  category: StopCategory;
  amount: number;
  /** Share of the planned total, 0-1. Zero when nothing is planned. */
  fraction: number;
}

export interface BudgetSummary {
  /** Money committed to the pool: everyone's, or just yours. */
  pool: number;
  /** Cost of planned stops: the whole trip's, or your split of it. */
  planned: number;
  /** `pool - planned`, floored at nothing — can be negative when overcommitted. */
  left: number;
  /** Planned as a fraction of the pool, 0-1. Zero when the pool is empty. */
  usedFraction: number;
  /** Descending category totals, largest first, zero-cost categories dropped. */
  categories: CategoryTotal[];
  /** Travellers who have put something in. */
  contributorCount: number;
}

/** One planned cost, from either an itinerary stop or a standalone budget line. */
export interface PlannedLine {
  id: string;
  /** `item` lines can be edited and deleted here; `stop` lines belong to the
   * itinerary and are edited in the planner. */
  kind: "stop" | "item";
  label: string;
  category: StopCategory;
  /** Whole-trip amount, before any per-person split. */
  amount: number;
  currency: string;
  createdBy: string;
  /** Itinerary day for stops; null for trip-wide costs like flights. */
  day: number | null;
  area: string;
}

/** Everything the trip plans to spend: stop costs plus standalone lines. */
export function plannedLines(trip: Trip): PlannedLine[] {
  const fromStops: PlannedLine[] = trip.stops
    .filter((stop) => stop.cost > 0)
    .map((stop) => ({
      id: stop.id,
      kind: "stop",
      label: stop.name,
      category: stop.category,
      amount: stop.cost,
      currency: stop.costCurrency || trip.currency,
      createdBy: stop.createdBy,
      day: stop.day,
      area: stop.area,
    }));

  const fromItems: PlannedLine[] = (trip.budgetItems ?? []).map((item) => ({
    id: item.id,
    kind: "item",
    label: item.label,
    category: item.category,
    amount: item.amount,
    currency: item.currency || trip.currency,
    createdBy: item.createdBy,
    day: null,
    area: "",
  }));

  // Trip-wide lines first — flights and lodging are booked before day one.
  return [...fromItems, ...fromStops].sort((a, b) => {
    if (a.day == null && b.day == null) return b.amount - a.amount;
    if (a.day == null) return -1;
    if (b.day == null) return 1;
    return a.day - b.day || a.label.localeCompare(b.label);
  });
}

/** Stops carrying a cost, which are the ones the budget is planned against. */
export function plannedStops(trip: Trip): Stop[] {
  return trip.stops
    .filter((stop) => stop.cost > 0)
    .sort((a, b) => a.day - b.day || a.name.localeCompare(b.name));
}

/**
 * Derive the budget figures for one scope.
 *
 * Group totals are the trip's. Individual totals are the signed-in member's
 * contribution set against an equal split of planned spend — the same
 * assumption `computeBudget` makes on the server for expenses, so the two
 * halves of the page stay consistent.
 */
export function budgetSummary(
  trip: Trip,
  scope: FinanceScope,
  currentMemberId: string | null,
): BudgetSummary {
  const contributions = trip.contributions ?? [];
  const groupPool = contributions.reduce((sum, c) => sum + c.amount, 0);
  const mine = contributions.find((c) => c.memberId === currentMemberId);

  const memberCount = Math.max(1, trip.members.length);
  const lines = plannedLines(trip);
  const groupPlanned = lines.reduce((sum, line) => sum + line.amount, 0);

  const group = scope === "group";
  const pool = group ? groupPool : (mine?.amount ?? 0);
  const planned = group ? groupPlanned : Math.round(groupPlanned / memberCount);

  const byCategory = new Map<StopCategory, number>();
  for (const line of lines) {
    const share = group ? line.amount : line.amount / memberCount;
    byCategory.set(
      line.category,
      (byCategory.get(line.category) ?? 0) + Math.round(share),
    );
  }

  const categories: CategoryTotal[] = [...byCategory.entries()]
    .map(([category, amount]) => ({
      category,
      amount,
      fraction: planned > 0 ? amount / planned : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  return {
    pool,
    planned,
    left: pool - planned,
    usedFraction: pool > 0 ? Math.min(1, planned / pool) : 0,
    categories,
    contributorCount: contributions.filter((c) => c.amount > 0).length,
  };
}

/** A traveller's own slice of the pool, for the "Your share" panel. */
export function personalShare(
  trip: Trip,
  currentMemberId: string | null,
): { contributed: number; plannedShare: number; remaining: number } {
  const contributed =
    (trip.contributions ?? []).find((c) => c.memberId === currentMemberId)
      ?.amount ?? 0;
  const memberCount = Math.max(1, trip.members.length);
  const plannedShare = Math.round(
    plannedLines(trip).reduce((sum, line) => sum + line.amount, 0) / memberCount,
  );
  return { contributed, plannedShare, remaining: contributed - plannedShare };
}

export interface ExpenseDayGroup {
  /** Day number the expense was labelled with, or null when unscheduled. */
  day: number | null;
  label: string;
  expenses: Trip["expenses"];
  total: number;
}

/**
 * Group expenses under their trip day, the way the design lists them.
 *
 * `whenLabel` is free text ("Day 2", "Pre-trip", "Just added"), so anything
 * without a day number falls into one trailing group rather than being dropped.
 */
export function groupExpensesByDay(trip: Trip): ExpenseDayGroup[] {
  const groups = new Map<number | null, ExpenseDayGroup>();

  for (const expense of trip.expenses) {
    const match = /day\s*(\d+)/i.exec(expense.whenLabel);
    const day = match ? Number(match[1]) : null;
    const existing = groups.get(day);
    if (existing) {
      existing.expenses.push(expense);
      existing.total += expense.amount;
      continue;
    }
    groups.set(day, {
      day,
      label: day != null ? dayLabel(trip, day) : expense.whenLabel || "Other",
      expenses: [expense],
      total: expense.amount,
    });
  }

  return [...groups.values()].sort((a, b) => {
    if (a.day == null) return 1;
    if (b.day == null) return -1;
    return a.day - b.day;
  });
}

/** "Day 2 · 13 Oct · Tokyo", using whatever the itinerary day actually knows. */
function dayLabel(trip: Trip, day: number): string {
  const match = trip.days.find((d) => d.number === day);
  const parts = [`Day ${day}`];
  if (match?.dateLabel) parts.push(match.dateLabel);
  if (match?.city) parts.push(match.city);
  return parts.join(" · ");
}
