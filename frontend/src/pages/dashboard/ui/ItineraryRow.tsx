import { useTranslation } from "react-i18next";
import { ArrowRightIcon, CalendarIcon, MapPinIcon, WalletIcon } from "lucide-react";
import { decorativeRoute, type TripSummary } from "@/entities/trip";
import { Avatar } from "@/shared/ui/avatar";
import { cn } from "@/shared/lib";

/** Max avatars shown before collapsing the rest into a "+N" chip. */
const MAX_AVATARS = 4;

/** Auto-generated titles from the create wizard look like `new-0902-230144`. */
const UNTITLED_PATTERN = /^new-\d{4}-\d{6}$/;

const STATUS_TONE: Record<TripSummary["status"], string> = {
  active: "bg-accent text-accent-foreground",
  planning: "bg-[var(--warn-bg,#fff8ec)] text-[var(--warn-fg,#8a5209)]",
  settled: "bg-[var(--ok-bg,#eefaf4)] text-[var(--ok-fg,#0a6f4d)]",
};

function formatBudget(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}

/** One trip in the dashboard's itinerary list: route sketch, meta, scheduling
 * progress, member cluster, and the two ways into the planner. */
export function ItineraryRow({
  trip,
  onOpen,
}: {
  trip: TripSummary;
  onOpen: () => void;
}) {
  const { t } = useTranslation("trips");

  const route = decorativeRoute(trip);
  const hasDates = Boolean(trip.startLabel && trip.endLabel);
  const untitled = UNTITLED_PATTERN.test(trip.title);
  const shown = trip.members.slice(0, MAX_AVATARS);
  const overflow = trip.members.length - shown.length;

  // Percentage is for the bar only; the count beside it stays exact.
  const scheduled = Math.min(trip.scheduledStopCount, trip.stopCount);
  const percent =
    trip.stopCount > 0 ? Math.round((scheduled / trip.stopCount) * 100) : 0;

  const routeColor =
    trip.status === "settled" ? "var(--ink-400)" : trip.coverColor;

  return (
    <article className="flex gap-3.5 rounded-[18px] bg-card p-3">
      <div className="relative hidden w-24 shrink-0 overflow-hidden rounded-[14px] bg-secondary sm:block">
        <svg
          viewBox="0 0 320 140"
          preserveAspectRatio="none"
          className="absolute inset-0 size-full"
          aria-hidden="true"
        >
          <g stroke="var(--border-strong)" strokeWidth={2} fill="none" opacity={0.7}>
            <path d="M0 40 L320 52" />
            <path d="M0 104 L320 92" />
            <path d="M78 0 L128 140" />
            <path d="M226 0 L262 140" />
          </g>
          <path
            d={route.path}
            fill="none"
            stroke={routeColor}
            strokeWidth={3}
            strokeDasharray="7 5"
            strokeLinecap="round"
          />
          {route.points.map((point, index) => (
            <circle
              key={index}
              cx={point.x}
              cy={point.y}
              r={6}
              fill={routeColor}
            />
          ))}
        </svg>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start gap-2.5">
          <div className="min-w-0">
            <p className="truncate font-heading text-base font-bold tracking-tight">
              {trip.title}
            </p>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {untitled
                ? t("dashboard.row.untitled")
                : t("card.members", { count: trip.memberCount })}
            </p>
          </div>
          <span
            className={cn(
              "ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
              STATUS_TONE[trip.status],
            )}
          >
            <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
            {t(`status.${trip.status}`)}
          </span>
        </div>

        <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs">
          <span
            className={cn(
              "inline-flex items-center gap-1.5",
              hasDates ? "text-foreground" : "text-muted-foreground",
            )}
          >
            <CalendarIcon className="size-3.5 text-muted-foreground" aria-hidden="true" />
            {hasDates
              ? t("card.dates", { start: trip.startLabel, end: trip.endLabel })
              : t("dashboard.row.noDates")}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <MapPinIcon className="size-3.5 text-muted-foreground" aria-hidden="true" />
            {t("card.stops", { count: trip.stopCount })}
          </span>
          {trip.plannedBudget != null ? (
            <span className="inline-flex items-center gap-1.5">
              <WalletIcon className="size-3.5 text-muted-foreground" aria-hidden="true" />
              {t("dashboard.row.planned", {
                amount: formatBudget(
                  trip.plannedBudget,
                  trip.plannedBudgetCurrency ?? trip.currency,
                ),
              })}
            </span>
          ) : null}
        </div>

        <div className="mt-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              {t("dashboard.row.scheduled", {
                scheduled,
                total: trip.stopCount,
              })}
            </span>
            <span className="font-mono text-foreground">{percent}%</span>
          </div>
          <div
            className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-valuenow={percent}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="h-full rounded-full transition-[width] duration-[var(--dur-base)]"
              style={{
                width: `${percent}%`,
                background: percent > 0 ? "var(--brand)" : "var(--border-strong)",
              }}
            />
          </div>
        </div>

        <div className="mt-auto flex flex-wrap items-center gap-2.5 pt-3">
          <div className="flex items-center">
            {shown.map((member, index) => (
              <Avatar
                key={member.id}
                name={member.name}
                bg={member.avatarBg}
                fg={member.avatarFg}
                size={24}
                stackIndex={index}
              />
            ))}
            {overflow > 0 ? (
              <span className="-ml-1.5 inline-flex size-6 items-center justify-center rounded-full bg-secondary text-[10px] font-semibold text-muted-foreground ring-2 ring-card">
                +{overflow}
              </span>
            ) : null}
          </div>

          <button
            type="button"
            onClick={onOpen}
            className="wf-interactive wf-pressable ml-auto inline-flex h-9 items-center rounded-xl border border-border px-3.5 text-xs font-semibold text-foreground hover:bg-accent"
          >
            {hasDates
              ? t("dashboard.row.openMap")
              : t("dashboard.row.setDates")}
          </button>
          <button
            type="button"
            onClick={onOpen}
            className="wf-interactive wf-pressable inline-flex h-9 items-center gap-1.5 rounded-xl bg-foreground px-3.5 text-xs font-semibold text-background hover:bg-foreground/90"
          >
            {t("dashboard.row.continue")}
            <ArrowRightIcon className="size-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </article>
  );
}
