import type { ReactNode } from "react";
import { ArrowLeftIcon, CheckIcon, UsersIcon, WalletIcon, ZapIcon } from "lucide-react";
import type { Trip } from "@/entities/trip";
import { Avatar } from "@/shared/ui/avatar";
import { cn, formatMoney } from "@/shared/lib";

const STATUS_TONE: Record<Trip["status"], string> = {
  planning: "bg-[var(--warn-bg,#fff8ec)] text-[var(--warn-fg,#8a5209)]",
  active: "bg-accent text-accent-foreground",
  settled: "bg-[var(--ok-bg,#eefaf4)] text-[var(--ok-fg,#0a6f4d)]",
};

const STATUS_LABEL: Record<Trip["status"], string> = {
  planning: "Planning",
  active: "Active",
  settled: "Settled",
};

/** Planned spend and the pool it draws from, for the header's budget chip. */
function budgetChip(trip: Trip): { planned: number; pool: number } {
  const stops = trip.stops.reduce((sum, stop) => sum + stop.cost, 0);
  const items = (trip.budgetItems ?? []).reduce((sum, i) => sum + i.amount, 0);
  const pool = (trip.contributions ?? []).reduce((sum, c) => sum + c.amount, 0);
  return { planned: stops + items, pool };
}

/**
 * Planner top bar: where the trip is, who is on it, what it costs, and the one
 * action that moves it forward.
 */
export function PlannerHeader({
  trip,
  subtitle,
  onBack,
  inviteSlot,
  onToggleStatus,
  statusPending,
  onOpenGroupPreferences,
  onOpenRePlan,
}: {
  trip: Trip;
  subtitle: string;
  onBack: () => void;
  /** The shared InviteDialog, which brings its own trigger button. */
  inviteSlot: ReactNode;
  onToggleStatus: () => void;
  statusPending: boolean;
  onOpenGroupPreferences: () => void;
  onOpenRePlan: () => void;
}) {
  const { planned, pool } = budgetChip(trip);
  const locked = trip.status !== "planning";

  return (
    <header className="flex h-15 flex-none items-center gap-3.5 border-b border-border px-4.5">
      <button
        type="button"
        onClick={onBack}
        aria-label="Back to trips"
        className="wf-interactive wf-pressable flex size-7.5 items-center justify-center rounded-[9px] bg-muted text-foreground hover:bg-accent"
      >
        <ArrowLeftIcon className="size-4" aria-hidden="true" />
      </button>

      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <h1 className="truncate font-heading text-[15px] font-bold tracking-tight">
            {trip.title}
          </h1>
          <span
            className={cn(
              "inline-flex h-5 shrink-0 items-center rounded-full px-2 text-[11px] font-semibold",
              STATUS_TONE[trip.status],
            )}
          >
            {STATUS_LABEL[trip.status]}
          </span>
        </div>
        <p className="mt-0.5 truncate font-mono text-[10.5px] tracking-[0.05em] text-muted-foreground uppercase">
          {subtitle}
        </p>
      </div>

      <div className="ml-auto flex items-center gap-3">
        <div className="flex items-center max-lg:hidden">
          {trip.members.slice(0, 4).map((member, index) => (
            <Avatar
              key={member.id}
              name={member.name}
              bg={member.avatarBg}
              fg={member.avatarFg}
              size={28}
              stackIndex={index}
            />
          ))}
        </div>

        <div className="max-lg:hidden">{inviteSlot}</div>

        <button
          type="button"
          onClick={onOpenGroupPreferences}
          aria-label="Group preferences"
          className="wf-interactive wf-pressable flex size-7.5 items-center justify-center rounded-[9px] bg-muted text-foreground hover:bg-accent max-lg:hidden"
        >
          <UsersIcon className="size-3.5" aria-hidden="true" />
        </button>

        <button
          type="button"
          onClick={onOpenRePlan}
          aria-label="Re-plan on the fly"
          className="wf-interactive wf-pressable flex size-7.5 items-center justify-center rounded-[9px] bg-muted text-foreground hover:bg-accent max-lg:hidden"
        >
          <ZapIcon className="size-3.5" aria-hidden="true" />
        </button>

        <span className="h-5.5 w-px bg-border max-lg:hidden" aria-hidden="true" />

        <span className="inline-flex h-8.5 items-center gap-1.5 rounded-[10px] bg-muted px-3 text-[12.5px] font-semibold max-md:hidden">
          <WalletIcon
            className="size-3.5 text-muted-foreground"
            aria-hidden="true"
          />
          {formatMoney(planned, trip.currency)}
          <span className="font-medium text-muted-foreground">
            of {formatMoney(pool, trip.currency)}
          </span>
        </span>

        <button
          type="button"
          onClick={onToggleStatus}
          disabled={!trip.permissions.canEdit || statusPending}
          className={cn(
            "wf-interactive wf-pressable inline-flex h-8.5 items-center gap-1.5 rounded-[10px] px-3.5 text-[12.5px] font-semibold disabled:opacity-50",
            locked
              ? "border border-border text-foreground hover:bg-accent"
              : "bg-foreground text-background hover:bg-foreground/90",
          )}
        >
          {locked ? null : <CheckIcon className="size-3.5" aria-hidden="true" />}
          {statusPending ? "Saving…" : locked ? "Reopen plan" : "Lock plan"}
        </button>
      </div>
    </header>
  );
}
