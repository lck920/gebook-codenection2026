import type {
  CSSProperties,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
} from "react";
import { useTranslation } from "react-i18next";
import type { Trip } from "@/entities/trip";
import { stopDateTime } from "@/entities/trip";
import { CategoryIcon, type Stop } from "@/entities/stop";
import { useWeather } from "@/features/weather";
import { cn, formatMoney } from "@/shared/lib";
import { WeatherIcon } from "@/shared/ui/weather-icon";
import { CheckIcon, GripVertical, StarIcon, TicketCheck } from "lucide-react";

export interface StopCardDragHandleProps {
  onPointerDown: (e: ReactPointerEvent<HTMLElement>) => void;
  onPointerMove: (e: ReactPointerEvent<HTMLElement>) => void;
  onPointerUp: (e: ReactPointerEvent<HTMLElement>) => void;
  onPointerCancel: (e: ReactPointerEvent<HTMLElement>) => void;
  onClickCapture: (e: ReactMouseEvent<HTMLElement>) => void;
}

export interface StopCardProps {
  trip: Trip;
  stop: Stop;
  /** Highlight the card as the active selection. */
  selected?: boolean;
  reservationCount?: number;
  /** Visual and pointer state when the schedule board uses the card as a drag handle. */
  dragging?: boolean;
  dragHandleProps?: StopCardDragHandleProps;
  /** Attach the drag handlers to a small grip instead of the whole card, so the
   *  card body still scrolls under touch. Used by the vertical itinerary list. */
  gripHandle?: boolean;
  className?: string;
  style?: CSSProperties;
  onSelect: (id: string) => void;
}

/** Single itinerary stop rendered as a card. Shared between the schedule board
 * columns and the sidebar list so both surfaces stay visually identical. */
export function StopCard({
  trip,
  stop,
  selected,
  reservationCount = 0,
  dragging = false,
  dragHandleProps,
  gripHandle = false,
  className,
  style,
  onSelect,
}: StopCardProps) {
  const { t } = useTranslation("planner");
  const dateTime = stopDateTime(trip, stop);
  const { data: weather } = useWeather(
    stop.lat,
    stop.lng,
    dateTime?.date,
    dateTime?.time,
    !stop.transit,
  );

  const meta = [
    t(`category.${stop.category}`),
    stop.cost
      ? t("detail.perPerson", {
          amount: formatMoney(stop.cost, stop.costCurrency || trip.currency),
        })
      : null,
    stop.votes.length
      ? t("schedule.voteCount", { count: stop.votes.length })
      : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const asHandle = dragHandleProps && !gripHandle;

  const card = (
    <button
      type="button"
      {...(asHandle ? dragHandleProps : undefined)}
      data-drag-handle={asHandle ? "" : undefined}
      onClick={() => onSelect(stop.id)}
      className={cn(
        "flex flex-col gap-1 rounded-lg bg-card p-2.5 text-left shadow-[var(--shadow-border)] transition-[background-color,box-shadow,scale] duration-[var(--dur-base)] ease-[var(--ease-out)] hover:bg-accent hover:shadow-[var(--shadow-border-hover)] active:scale-[var(--press-scale)]",
        selected && "bg-accent shadow-[var(--shadow-border-hover)]",
        asHandle &&
          (dragging ? "touch-none cursor-grabbing" : "touch-none cursor-grab"),
        gripHandle && dragHandleProps && "pl-7",
        dragging && "opacity-90 shadow-[var(--shadow-lg)] transition-none",
        !gripHandle && className,
      )}
      style={gripHandle ? undefined : style}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-mono text-[11px] text-muted-foreground tabular-nums">
          {stop.time}
        </span>
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-[10.5px] text-muted-foreground tabular-nums">
            {stop.duration}
          </span>
          <WeatherIcon data={weather} size={18} />
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <CategoryIcon category={stop.category} />
        <span
          className={cn(
            "min-w-0 flex-1 text-sm font-medium leading-snug text-pretty",
            stop.done && "text-muted-foreground line-through",
          )}
        >
          {stop.name}
        </span>
        {stop.mustSee ? (
          <StarIcon
            className="size-3.5 flex-none fill-current text-warning"
            aria-label={t("detail.mustSee")}
          />
        ) : null}
        {stop.done ? (
          <CheckIcon
            className="size-3.5 flex-none text-success"
            aria-label={t("detail.done")}
          />
        ) : null}
      </div>
      <span className="pl-7 text-xs text-muted-foreground text-pretty tabular-nums">
        {meta}
      </span>
      {reservationCount > 0 ? (
        <span className="ml-7 inline-flex items-center gap-1 text-[11px] text-corn-600 tabular-nums">
          <TicketCheck className="size-3.5" aria-hidden="true" />
          {reservationCount}
        </span>
      ) : null}
    </button>
  );

  if (gripHandle && dragHandleProps) {
    return (
      <div className={cn("relative", className)} style={style}>
        <span
          {...dragHandleProps}
          data-drag-handle=""
          role="button"
          aria-label={t("detail.moveStop", { name: stop.name })}
          className={cn(
            "absolute left-0.5 top-1/2 z-10 flex -translate-y-1/2 touch-none items-center rounded-md p-1 text-muted-foreground/60 hover:bg-accent hover:text-foreground",
            dragging ? "cursor-grabbing" : "cursor-grab",
          )}
        >
          <GripVertical className="size-4" aria-hidden="true" />
        </span>
        {card}
      </div>
    );
  }

  return card;
}
