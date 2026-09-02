import type { Trip, TripDay } from "@/entities/trip";
import type { Stop } from "@/entities/stop";
import type { Expense } from "@/entities/expense";

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") return null;
  return value as Record<string, unknown>;
}

function numberField(record: Record<string, unknown> | null, key: string): number | null {
  if (!record) return null;
  const value = record[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function stringField(record: Record<string, unknown> | null, key: string): string | null {
  if (!record) return null;
  const value = record[key];
  return typeof value === "string" && value.length > 0 ? value : null;
}

function replaceDay(days: TripDay[], day: TripDay): TripDay[] {
  const exists = days.some((d) => d.number === day.number);
  if (!exists) return [...days, day].sort((a, b) => a.number - b.number);
  return days.map((d) => (d.number === day.number ? day : d));
}

function upsertStop(stops: Stop[], stop: Stop): Stop[] {
  const index = stops.findIndex((s) => s.id === stop.id);
  if (index < 0) return [...stops, stop];
  const next = stops.slice();
  next[index] = stop;
  return next;
}

function upsertExpense(expenses: Expense[], expense: Expense): Expense[] {
  const index = expenses.findIndex((e) => e.id === expense.id);
  if (index < 0) return [...expenses, expense];
  const next = expenses.slice();
  next[index] = expense;
  return next;
}

/**
 * Merge one write-tool trip echo into the planner cache.
 *
 * Full-trip last-wins is unsafe under Hyperdrive: a later parallel updateDay
 * echo can carry sibling days from a stale SELECT and wipe earlier writes.
 * Only overlay the entity this tool mutated; keep the rest from `prev`.
 */
export function mergeTripToolEcho(
  prev: Trip | null,
  toolName: string,
  input: unknown,
  echo: Trip,
): Trip {
  if (!prev) return echo;

  const inputRecord = asRecord(input);

  switch (toolName) {
    case "renameTrip":
      return { ...prev, title: echo.title };

    case "updateDay": {
      const dayNumber = numberField(inputRecord, "dayNumber");
      if (dayNumber === null) return prev;
      const day = echo.days.find((d) => d.number === dayNumber);
      if (!day) return prev;
      return { ...prev, days: replaceDay(prev.days, day) };
    }

    case "addDay": {
      const maxPrev = prev.days.reduce((m, d) => Math.max(m, d.number), 0);
      const added = echo.days.find((d) => d.number > maxPrev);
      if (!added) return prev;
      return { ...prev, days: replaceDay(prev.days, added) };
    }

    case "deleteDay":
    case "reorderDays":
      // Renumbering reshapes the whole day/stop layout — trust the echo for
      // those collections, but keep members/budget/title from prev.
      return {
        ...prev,
        days: echo.days,
        stops: echo.stops,
      };

    case "insertStop": {
      const prevIds = new Set(prev.stops.map((s) => s.id));
      const added = echo.stops.filter((s) => !prevIds.has(s.id));
      if (added.length === 0) return prev;
      // Preserve relative order from echo when it includes the full set;
      // otherwise append new stops after prev.
      const echoIds = new Set(echo.stops.map((s) => s.id));
      const echoHasAllPrev = prev.stops.every((s) => echoIds.has(s.id));
      if (echoHasAllPrev) {
        return { ...prev, stops: echo.stops };
      }
      let stops = prev.stops;
      for (const stop of added) stops = upsertStop(stops, stop);
      return { ...prev, stops };
    }

    case "updateStop":
    case "moveStop": {
      const stopId = stringField(inputRecord, "stopId");
      if (!stopId) return prev;
      const stop = echo.stops.find((s) => s.id === stopId);
      if (!stop) return prev;
      if (toolName === "moveStop") {
        const echoIds = new Set(echo.stops.map((s) => s.id));
        const echoHasAllPrev = prev.stops.every((s) => echoIds.has(s.id));
        if (echoHasAllPrev) {
          return { ...prev, stops: echo.stops };
        }
      }
      return { ...prev, stops: upsertStop(prev.stops, stop) };
    }

    case "addExpense": {
      const prevIds = new Set(prev.expenses.map((e) => e.id));
      const added = echo.expenses.filter((e) => !prevIds.has(e.id));
      if (added.length === 0) {
        return { ...prev, budget: echo.budget };
      }
      let expenses = prev.expenses;
      for (const expense of added) expenses = upsertExpense(expenses, expense);
      return { ...prev, expenses, budget: echo.budget };
    }

    case "updateExpense": {
      const expenseId = stringField(inputRecord, "expenseId");
      if (!expenseId) return prev;
      const expense = echo.expenses.find((e) => e.id === expenseId);
      if (!expense) return prev;
      return {
        ...prev,
        expenses: upsertExpense(prev.expenses, expense),
        budget: echo.budget,
      };
    }

    default:
      // Unknown write tool: fall back to echo (same as historical last-wins).
      return echo;
  }
}
