import { useMemo, useState } from "react";
import {
  CalendarIcon,
  PercentIcon,
  PlusIcon,
  SparklesIcon,
  TrainFrontIcon,
  UtensilsIcon,
  MapPinIcon,
} from "lucide-react";
import type { StopCategory } from "@/entities/stop";
import type { Trip } from "@/entities/trip";
import { cn } from "@/shared/lib";
import {
  budgetSummary,
  plannedLines,
  type FinanceScope,
  type PlannedLine,
} from "../model/finance";

const CATEGORY_ICON: Partial<Record<StopCategory, typeof MapPinIcon>> = {
  Food: UtensilsIcon,
  Transit: TrainFrontIcon,
  Activity: SparklesIcon,
  Sight: MapPinIcon,
};

/** Filter pills: "All" plus whichever categories the trip actually uses. */
function categoryFilters(lines: PlannedLine[]): (StopCategory | "All")[] {
  const used = [...new Set(lines.map((l) => l.category))];
  return ["All", ...used];
}

export function BudgetView({
  trip,
  scope,
  onScopeChange,
  currentMemberId,
  memberName,
  onAddToPool,
  onAddItem,
  onEditItem,
  money,
  canEdit,
}: {
  trip: Trip;
  scope: FinanceScope;
  onScopeChange: (scope: FinanceScope) => void;
  currentMemberId: string | null;
  memberName: (id: string) => string;
  onAddToPool: () => void;
  onAddItem: () => void;
  /** Standalone budget lines are editable here; stop costs live in the planner. */
  onEditItem: (line: PlannedLine) => void;
  money: {
    display: string;
    converted: boolean;
    loading: boolean;
    unavailable: boolean;
    format: (amount: number, from?: string) => string;
    convert: (amount: number, from?: string) => number | null;
  };
  canEdit: boolean;
}) {
  const [filter, setFilter] = useState<StopCategory | "All">("All");
  const [asPercent, setAsPercent] = useState(false);

  const summary = useMemo(
    () => budgetSummary(trip, scope, currentMemberId),
    [trip, scope, currentMemberId],
  );
  const lines = useMemo(() => plannedLines(trip), [trip]);
  const visible =
    filter === "All" ? lines : lines.filter((l) => l.category === filter);

  const group = scope === "group";
  const memberCount = Math.max(1, trip.members.length);
  const usedPercent = Math.round(summary.usedFraction * 100);
  const leftPercent = Math.max(0, 100 - usedPercent);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3.5">
      <div className="grid shrink-0 gap-3.5 lg:grid-cols-[minmax(0,1fr)_300px]">
        <section className="flex flex-col justify-between rounded-[20px] bg-foreground p-4.5 text-background">
          <div className="flex items-start gap-3">
            <div>
              <p className="text-[11.5px] font-semibold tracking-[0.06em] uppercase opacity-55">
                Budget pool
              </p>
              <p className="mt-1.5 font-heading text-3xl font-bold tracking-tight">
                {money.format(summary.pool)}
              </p>
              <p className="mt-1 text-xs opacity-60">
                {group
                  ? `Trip budget · ${trip.members.length} travellers`
                  : "Your contribution to the shared pool"}
              </p>
            </div>
            <div className="ml-auto inline-flex h-8 items-center gap-0.5 rounded-[11px] bg-background/12 p-0.5">
              {(["individual", "group"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => onScopeChange(option)}
                  aria-pressed={scope === option}
                  className={cn(
                    "wf-interactive inline-flex h-6.5 items-center rounded-lg px-2.5 text-xs font-semibold capitalize",
                    scope === option
                      ? "bg-background text-foreground"
                      : "text-background/60 hover:text-background/85",
                  )}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4.5">
            <div className="flex items-center gap-2.5 text-[11.5px] opacity-60">
              <span>{money.format(summary.planned)} planned</span>
              <span className="ml-auto">
                {money.format(summary.left)} left
              </span>
            </div>
            <div className="mt-1.5 flex h-2 gap-0.5">
              <div
                className="rounded-full bg-brand transition-[width] duration-[var(--dur-base)]"
                style={{ width: `${usedPercent}%` }}
              />
              <div className="flex-1 rounded-full bg-background/16" />
            </div>

            <div className="mt-3.5 flex flex-wrap items-center gap-2.5">
              <span className="text-[11.5px] opacity-60">
                {group
                  ? `${summary.contributorCount} of ${trip.members.length} travellers joined`
                  : `You cover 1/${memberCount} of every shared stop`}
              </span>
              <button
                type="button"
                onClick={onAddToPool}
                disabled={!canEdit}
                className="wf-interactive wf-pressable ml-auto inline-flex h-8.5 items-center gap-1.5 rounded-[11px] bg-background px-3.5 text-xs font-semibold text-foreground disabled:opacity-50"
              >
                <PlusIcon className="size-3.5" aria-hidden="true" />
                Add to pool
              </button>
            </div>
          </div>
        </section>

        <section className="flex flex-col rounded-[20px] bg-muted p-4.5">
          <div className="flex items-center gap-2.5">
            <p className="text-[13.5px] font-bold tracking-tight">
              {group ? "Budget planned" : "Your budget planned"}
            </p>
            <span className="ml-auto font-mono text-[11px] text-muted-foreground">
              OF {money.format(summary.pool)}
            </span>
          </div>

          <div className="mt-3.5 flex flex-1 items-center gap-4">
            <div
              className="relative size-24 shrink-0 rounded-full"
              style={{
                background: `conic-gradient(var(--brand) 0 ${usedPercent}%, var(--border) ${usedPercent}% 100%)`,
              }}
              role="img"
              aria-label={`${usedPercent}% of the pool planned`}
            >
              <div className="absolute inset-2.5 flex flex-col items-center justify-center rounded-full bg-card">
                <span className="font-heading text-xl font-bold tracking-tight">
                  {usedPercent}%
                </span>
                <span className="text-[9.5px] tracking-[0.06em] uppercase text-muted-foreground">
                  planned
                </span>
              </div>
            </div>

            <div className="flex min-w-0 flex-1 flex-col gap-2.5">
              {summary.categories.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Nothing planned yet. Add a cost below, or set costs on stops
                  in the planner.
                </p>
              ) : (
                summary.categories.slice(0, 3).map((entry) => (
                  <div key={entry.category}>
                    <div className="flex items-baseline gap-2">
                      <span className="text-[11.5px] text-muted-foreground">
                        {entry.category}
                      </span>
                      <span className="ml-auto font-mono text-[11px]">
                        {money.format(entry.amount)}
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-border">
                      <div
                        className="h-full bg-brand"
                        style={{ width: `${Math.round(entry.fraction * 100)}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      </div>

      <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[20px] bg-muted p-4.5">
        <div className="flex items-start gap-3">
          <div>
            <p className="text-[11.5px] text-muted-foreground">Budget left</p>
            <p
              className={cn(
                "mt-1 font-heading text-[30px] font-bold tracking-tight",
                summary.left < 0 && "text-destructive-foreground",
              )}
            >
              {asPercent
                ? `${leftPercent}%`
                : money.format(summary.left)}
            </p>
            <p className="mt-0.5 text-[11.5px] text-muted-foreground">
              {summary.pool === 0
                ? "Nothing in the pool yet"
                : asPercent
                  ? `of the ${money.format(summary.pool)} ${group ? "trip budget" : "you put in"} unplanned`
                  : `${leftPercent}% of ${group ? "the trip budget" : "your contribution"} still unplanned`}
            </p>
          </div>
          <button
            type="button"
            onClick={onAddItem}
            disabled={!canEdit}
            className="wf-interactive wf-pressable ml-auto inline-flex h-8 items-center gap-1.5 rounded-[11px] bg-foreground px-3 text-xs font-semibold text-background disabled:opacity-50"
          >
            <PlusIcon className="size-3.5" aria-hidden="true" />
            Add cost
          </button>
          <button
            type="button"
            onClick={() => setAsPercent((v) => !v)}
            className="wf-interactive wf-pressable inline-flex h-8 items-center gap-1.5 rounded-[11px] bg-card px-3 text-xs font-semibold"
          >
            <PercentIcon
              className="size-3.5 text-muted-foreground"
              aria-hidden="true"
            />
            {asPercent ? "View amount" : "View percentage"}
          </button>
        </div>

        <div className="mt-3.5 flex flex-wrap items-center gap-2">
          {categoryFilters(lines).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setFilter(option)}
              aria-pressed={filter === option}
              className={cn(
                "wf-interactive inline-flex h-7.5 items-center rounded-full px-3.5 text-xs font-semibold",
                filter === option
                  ? "bg-foreground text-background"
                  : "bg-card text-muted-foreground hover:text-foreground",
              )}
            >
              {option}
            </button>
          ))}
          <span className="ml-auto font-mono text-[11px] tracking-wide text-muted-foreground uppercase">
            {lines.length} planned {lines.length === 1 ? "cost" : "costs"}
          </span>
        </div>

        <div className="scrollbar-reveal mt-3 flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto">
          {visible.length === 0 ? (
            <p className="m-auto text-sm text-muted-foreground">
              Nothing planned in this category yet.
            </p>
          ) : (
            visible.map((line) => {
              const Icon = CATEGORY_ICON[line.category] ?? MapPinIcon;
              const share = group
                ? line.amount
                : Math.round(line.amount / memberCount);
              const editable = line.kind === "item" && canEdit;
              return (
                <article
                  key={line.id}
                  onClick={editable ? () => onEditItem(line) : undefined}
                  className={cn(
                    "flex shrink-0 items-center gap-3.5 rounded-2xl bg-card px-3.5 py-3",
                    editable && "wf-interactive cursor-pointer hover:bg-accent",
                  )}
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-[11px] bg-muted">
                    <Icon className="size-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[13.5px] font-semibold">
                      {line.label}
                    </p>
                    <p className="mt-0.5 truncate text-[11.5px] text-muted-foreground">
                      {[
                        line.category,
                        line.day != null ? `Day ${line.day}` : "Whole trip",
                        line.area,
                        line.createdBy
                          ? `added by ${memberName(line.createdBy)}`
                          : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  <span className="ml-auto hidden shrink-0 rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold text-muted-foreground sm:inline">
                    {line.kind === "item" ? "Booking" : "Stop"}
                  </span>
                  <p className="shrink-0 font-mono text-[13px] font-semibold">
                    −{money.format(share, line.currency)}
                  </p>
                </article>
              );
            })
          )}
          <button
            type="button"
            onClick={onAddItem}
            disabled={!canEdit}
            className="wf-interactive wf-pressable flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-card text-xs font-semibold text-brand disabled:opacity-50"
          >
            <PlusIcon className="size-3.5" aria-hidden="true" />
            Add flights, hotel or other cost
          </button>
        </div>
      </section>
    </div>
  );
}

/** Empty-state helper shown when a trip has no itinerary costs at all. */
export function BudgetEmptyHint() {
  return (
    <p className="flex items-center gap-2 text-xs text-muted-foreground">
      <CalendarIcon className="size-3.5" aria-hidden="true" />
      Costs come from planned stops — set a cost on a stop in the planner.
    </p>
  );
}
