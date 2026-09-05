import { useMemo, useState } from "react";
import { ReceiptIcon } from "lucide-react";
import type { Trip } from "@/entities/trip";
import { Avatar } from "@/shared/ui/avatar";
import { cn } from "@/shared/lib";
import { budgetSummary, groupExpensesByDay } from "../model/finance";

type ExpenseFilter = "all" | "mine" | "shared" | "unsettled";

const FILTERS: { id: ExpenseFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "mine", label: "Mine" },
  { id: "shared", label: "Shared" },
  { id: "unsettled", label: "Unsettled" },
];

export function ExpensesView({
  trip,
  currentMemberId,
  memberName,
  money,
}: {
  trip: Trip;
  currentMemberId: string | null;
  memberName: (id: string) => string;
  money: {
    display: string;
    converted: boolean;
    loading: boolean;
    unavailable: boolean;
    format: (amount: number, from?: string) => string;
    convert: (amount: number, from?: string) => number | null;
  };
}) {
  const [filter, setFilter] = useState<ExpenseFilter>("all");

  const total = trip.budget.total;
  const pool = useMemo(
    () => budgetSummary(trip, "group", currentMemberId).pool,
    [trip, currentMemberId],
  );

  /** Members still owed money, or still owing it, after the split. */
  const unsettled = useMemo(
    () => new Set(trip.budget.settlements.flatMap((s) => [s.from, s.to])),
    [trip.budget.settlements],
  );

  const groups = useMemo(() => {
    const all = groupExpensesByDay(trip);
    if (filter === "all") return all;
    return all
      .map((group) => ({
        ...group,
        expenses: group.expenses.filter((expense) => {
          if (filter === "mine") return expense.payer === currentMemberId;
          if (filter === "shared") return expense.participants.length > 1;
          return unsettled.has(expense.payer);
        }),
      }))
      .filter((group) => group.expenses.length > 0);
  }, [trip, filter, currentMemberId, unsettled]);

  const member = (id: string) => trip.members.find((m) => m.id === id);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3.5">
      <div className="grid shrink-0 gap-3.5 sm:grid-cols-3">
        <StatCard
          label="Total expenses"
          value={money.format(total)}
          note={`Across ${trip.expenses.length} ${trip.expenses.length === 1 ? "transaction" : "transactions"}`}
        />
        <StatCard
          label="Per person"
          value={money.format(trip.budget.perPerson)}
          note={`${trip.members.length} travellers · equal split`}
        />
        <StatCard
          label="Against the pool"
          value={money.format(Math.max(0, pool - total))}
          note={
            pool > 0
              ? "Still available from the budget pool"
              : "No budget pool set for this trip"
          }
          tone="brand"
        />
      </div>

      <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[20px] bg-muted p-4.5">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <h2 className="font-heading text-base font-bold tracking-tight">
              Expenses
            </h2>
            <p className="mt-0.5 text-[11.5px] text-muted-foreground">
              Logged while you travel · grouped by trip day
            </p>
          </div>
          <div className="ml-auto inline-flex h-8 items-center gap-0.5 rounded-xl bg-card p-0.5">
            {FILTERS.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setFilter(option.id)}
                aria-pressed={filter === option.id}
                className={cn(
                  "wf-interactive inline-flex h-7 items-center rounded-[9px] px-2.5 text-xs",
                  filter === option.id
                    ? "bg-foreground font-semibold text-background"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="scrollbar-reveal mt-3.5 flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto">
          {groups.length === 0 ? (
            <p className="m-auto text-sm text-muted-foreground">
              {trip.expenses.length === 0
                ? "No expenses logged yet. Add one once the trip starts."
                : "Nothing matches this filter."}
            </p>
          ) : (
            groups.map((group) => (
              <div key={group.label} className="shrink-0">
                <p className="px-1 pb-1.5 text-[11.5px] font-semibold text-muted-foreground">
                  {group.label}
                </p>
                <div className="flex flex-col gap-2.5">
                  {group.expenses.map((expense) => {
                    const payer = member(expense.payer);
                    return (
                      <article
                        key={expense.id}
                        className="flex items-center gap-3.5 rounded-2xl bg-card px-3.5 py-3"
                      >
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-[11px] bg-muted">
                          <ReceiptIcon className="size-4" aria-hidden="true" />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-[13.5px] font-semibold">
                            {expense.description}
                          </p>
                          <p className="mt-0.5 truncate text-[11.5px] text-muted-foreground">
                            {expense.category} · split {expense.participants.length}{" "}
                            {expense.participants.length === 1 ? "way" : "ways"}
                          </p>
                        </div>
                        <div className="ml-auto hidden shrink-0 items-center gap-2 sm:flex">
                          {payer ? (
                            <Avatar
                              name={payer.name}
                              bg={payer.avatarBg}
                              fg={payer.avatarFg}
                              size={24}
                            />
                          ) : null}
                          <span className="text-[11.5px] text-muted-foreground">
                            {memberName(expense.payer)} paid
                          </span>
                        </div>
                        <p className="shrink-0 font-mono text-[13px] font-semibold">
                          {money.format(expense.amount, expense.currency)}
                        </p>
                      </article>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  note,
  tone,
}: {
  label: string;
  value: string;
  note: string;
  tone?: "brand";
}) {
  return (
    <div
      className={cn(
        "rounded-[20px] p-4.5",
        tone === "brand" ? "bg-accent" : "bg-muted",
      )}
    >
      <p
        className={cn(
          "text-[11.5px] font-medium",
          tone === "brand" ? "text-accent-foreground" : "text-muted-foreground",
        )}
      >
        {label}
      </p>
      <p className="mt-1 font-heading text-2xl font-bold tracking-tight">
        {value}
      </p>
      <p className="mt-1 text-[11px] text-muted-foreground">{note}</p>
    </div>
  );
}
