import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronLeftIcon, ChevronRightIcon, StarIcon } from "lucide-react";
import type { DestinationTemplate } from "@/entities/destination";
import type { TripSummary } from "@/entities/trip";
import { Avatar } from "@/shared/ui/avatar";
import { cn } from "@/shared/lib";

/** Destinations listed before "See more" expands the rail. */
const COLLAPSED_COUNT = 4;

/** Local `YYYY-MM-DD` for a date, avoiding the UTC shift of toISOString(). */
function isoDay(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

interface CalendarCell {
  key: string;
  label: number;
  iso: string;
  outside: boolean;
}

/** Six-week Monday-first grid covering the given month. */
function monthGrid(year: number, month: number): CalendarCell[] {
  const first = new Date(year, month, 1);
  // getDay() is Sunday-first; shift so Monday starts the week.
  const lead = (first.getDay() + 6) % 7;
  const cells: CalendarCell[] = [];
  for (let i = 0; i < 42; i++) {
    const date = new Date(year, month, 1 - lead + i);
    cells.push({
      key: isoDay(date),
      label: date.getDate(),
      iso: isoDay(date),
      outside: date.getMonth() !== month,
    });
  }
  return cells;
}

const MONTHS = [
  "jan", "feb", "mar", "apr", "may", "jun",
  "jul", "aug", "sep", "oct", "nov", "dec",
];

/** Trip dates arrive either as `YYYY-MM-DD` or as a legacy display label such
 * as "Nov 8". Labels carry no year, so they are read against `reference` - the
 * month being drawn - which keeps a range visible when the user pages to it. */
function parseTripDate(value: string, reference: Date): string | null {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const match = /^([A-Za-z]{3,})\.?\s+(\d{1,2})$/.exec(value.trim());
  if (!match) return null;
  const month = MONTHS.indexOf(match[1]!.slice(0, 3).toLowerCase());
  if (month < 0) return null;
  const day = Number(match[2]);
  if (!Number.isFinite(day) || day < 1 || day > 31) return null;
  return isoDay(new Date(reference.getFullYear(), month, day));
}

/** Normalised, ordered date range for a trip, or null when it has no dates. */
function tripRange(
  trip: TripSummary,
  reference: Date,
): { start: string; end: string } | null {
  const start = parseTripDate(trip.startLabel, reference);
  const end = parseTripDate(trip.endLabel, reference);
  if (!start || !end) return null;
  return start <= end ? { start, end } : { start: end, end: start };
}

function TripCalendar({ trips }: { trips: readonly TripSummary[] }) {
  const { t } = useTranslation("trips");
  const { i18n } = useTranslation("common");
  const locale = i18n.resolvedLanguage ?? "en";
  const today = useMemo(() => new Date(), []);
  const [cursor, setCursor] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1),
  );

  const ranges = useMemo(
    () =>
      trips
        .map((trip) => tripRange(trip, cursor))
        .filter((range) => range !== null),
    [trips, cursor],
  );
  const cells = useMemo(
    () => monthGrid(cursor.getFullYear(), cursor.getMonth()),
    [cursor],
  );
  const weekdays = useMemo(() => {
    const format = new Intl.DateTimeFormat(locale, { weekday: "short" });
    // 2024-01-01 was a Monday, so this walks Monday → Sunday.
    return Array.from({ length: 7 }, (_, i) =>
      format.format(new Date(2024, 0, 1 + i)).slice(0, 2),
    );
  }, [locale]);

  const todayIso = isoDay(today);

  function shiftMonth(delta: number) {
    setCursor(
      (current) =>
        new Date(current.getFullYear(), current.getMonth() + delta, 1),
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2.5">
        <h3 className="font-heading text-base font-bold tracking-tight">
          {new Intl.DateTimeFormat(locale, { month: "long" }).format(cursor)}{" "}
          <span className="font-medium text-muted-foreground">
            {cursor.getFullYear()}
          </span>
        </h3>
        <div className="ml-auto flex items-center gap-1.5">
          <button
            type="button"
            aria-label={t("dashboard.rail.prevMonth")}
            onClick={() => shiftMonth(-1)}
            className="wf-interactive wf-pressable flex size-6.5 items-center justify-center rounded-full bg-muted hover:bg-accent"
          >
            <ChevronLeftIcon className="size-3.5" aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label={t("dashboard.rail.nextMonth")}
            onClick={() => shiftMonth(1)}
            className="wf-interactive wf-pressable flex size-6.5 items-center justify-center rounded-full bg-muted hover:bg-accent"
          >
            <ChevronRightIcon className="size-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="mt-3.5 grid grid-cols-7 gap-1 text-center font-mono text-[10.5px] text-muted-foreground">
        {weekdays.map((day, index) => (
          <span key={index}>{day}</span>
        ))}
      </div>
      <div className="mt-1.5 grid grid-cols-7 gap-1 text-center text-xs">
        {cells.map((cell) => {
          const inTrip = ranges.some(
            (range) => cell.iso >= range.start && cell.iso <= range.end,
          );
          const isToday = cell.iso === todayIso;
          return (
            <span
              key={cell.key}
              className={cn(
                "flex h-7 items-center justify-center rounded-full",
                cell.outside && "text-border-strong",
                !cell.outside && !inTrip && !isToday && "text-foreground",
                inTrip && !isToday && "bg-accent font-semibold text-accent-foreground",
                isToday && "bg-brand font-bold text-brand-foreground",
              )}
            >
              {cell.label}
            </span>
          );
        })}
      </div>
    </div>
  );
}

/** Right-hand rail: who you are, when your trips fall, and where to go next. */
export function DashboardRail({
  userName,
  userImage,
  trips,
  destinations,
  selectedId,
  onSelect,
}: {
  userName: string;
  userImage?: string | null;
  trips: readonly TripSummary[];
  destinations: readonly DestinationTemplate[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const { t } = useTranslation("trips");
  const [expanded, setExpanded] = useState(false);
  const shown = expanded
    ? destinations
    : destinations.slice(0, COLLAPSED_COUNT);

  return (
    <aside className="scrollbar-reveal flex w-[292px] shrink-0 flex-col gap-6 overflow-y-auto px-5 py-5.5 max-xl:hidden">
      <div className="flex items-center gap-2.5">
        <Avatar
          name={userName}
          bg="var(--brand-ice)"
          fg="var(--corn-600)"
          src={userImage}
          seed={userName}
          size={38}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold tracking-tight">{userName}</p>
          <p className="mt-px text-xs text-muted-foreground">
            {t("dashboard.rail.organiser")}
          </p>
        </div>
      </div>

      <TripCalendar trips={trips} />

      <div className="min-h-0 flex-1">
        <div className="flex items-center gap-2.5">
          <h3 className="font-heading text-base font-bold tracking-tight">
            {t("dashboard.rail.more")}
          </h3>
          {destinations.length > COLLAPSED_COUNT ? (
            <button
              type="button"
              onClick={() => setExpanded((open) => !open)}
              className="wf-interactive ml-auto text-xs font-semibold text-brand hover:text-corn-600"
            >
              {expanded
                ? t("dashboard.rail.seeLess")
                : t("dashboard.rail.seeMore", { count: destinations.length })}
            </button>
          ) : null}
        </div>

        <div className="mt-3 flex flex-col gap-2">
          {shown.map((destination) => (
            <button
              key={destination.id}
              type="button"
              onClick={() => onSelect(destination.id)}
              className={cn(
                "wf-interactive wf-pressable flex items-center gap-2.5 rounded-xl p-2 text-left",
                destination.id === selectedId
                  ? "bg-accent"
                  : "bg-muted hover:bg-accent",
              )}
            >
              <img
                src={destination.image}
                alt=""
                loading="lazy"
                className="size-11 shrink-0 rounded-xl object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold">
                  {destination.name}
                </p>
                <p className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                  {destination.country}
                  <span className="inline-flex items-center gap-0.5">
                    <StarIcon
                      className="size-2.5 fill-warning text-warning"
                      aria-hidden="true"
                    />
                    {destination.rating}
                  </span>
                </p>
              </div>
              <p className="shrink-0 text-[12.5px] font-bold">
                {destination.estimatedBudget.split("/")[0]!.trim()}
              </p>
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}
