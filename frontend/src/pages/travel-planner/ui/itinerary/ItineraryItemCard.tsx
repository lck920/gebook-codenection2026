import type { CSSProperties, ReactNode } from "react";
import { useTranslation } from "react-i18next";
import {
  GripVerticalIcon,
  PencilIcon,
  TicketCheck,
  Trash2Icon,
} from "lucide-react";
import { CategoryIcon, type Stop, type StopCategory } from "@/entities/stop";
import type { Trip } from "@/entities/trip";
import { cn, formatMoney, interactive } from "@/shared/lib";
import type { ItineraryStopDragHandleProps } from "./useItineraryStopDrag";

/**
 * Very light per-category tints. These sit *behind* body text, so they stay
 * close to the card background rather than becoming a colour block — the
 * category is already carried by the rail icon, this is only a secondary cue.
 */
const CATEGORY_TINT: Partial<Record<StopCategory, string>> = {
  Stay: "bg-[color-mix(in_oklab,var(--brand)_6%,var(--card))]",
  Food: "bg-[color-mix(in_oklab,var(--warning)_7%,var(--card))]",
  Activity: "bg-[color-mix(in_oklab,var(--success)_6%,var(--card))]",
  Plan: "bg-[color-mix(in_oklab,var(--info)_6%,var(--card))]",
};

const CHIP_TONES = {
  muted: "bg-muted text-muted-foreground",
  // `text-brand` rather than a fixed shade: the brand hue is redefined per
  // theme, so a hardcoded one goes dim on the dark card background.
  brand: "bg-brand-muted text-brand",
  warning: "bg-[color-mix(in_oklab,var(--warning)_18%,transparent)] text-warning",
  success: "bg-[color-mix(in_oklab,var(--success)_18%,transparent)] text-success",
} as const;

/** Small uppercase metadata pill. */
function Chip({
  children,
  tone = "muted",
}: {
  children: ReactNode;
  tone?: keyof typeof CHIP_TONES;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold tracking-wide uppercase tabular-nums",
        CHIP_TONES[tone],
      )}
    >
      {children}
    </span>
  );
}

/** Falls back to the host name when a link carries no label. */
function linkLabel(link: { label: string; url: string }): string {
  if (link.label.trim()) return link.label;
  try {
    return new URL(link.url).host.replace(/^www\./, "");
  } catch {
    return link.url;
  }
}

export interface ItineraryItemCardProps {
  trip: Trip;
  stop: Stop;
  /** Position in the day, shown in the rail badge for non-transit stops. */
  index: number;
  /** Draws the connector down to the next row. */
  last: boolean;
  selected: boolean;
  reservationCount: number;
  canEdit: boolean;
  onSelect: () => void;
  onDelete: () => void;
  /** When set, the grip becomes a drag handle for moving the stop between days. */
  dragHandleProps?: ItineraryStopDragHandleProps;
  /** This card is the one currently being dragged. */
  dragging?: boolean;
  /** Lift transform applied while dragging. */
  style?: CSSProperties;
}

/**
 * One itinerary entry: a timeline rail on the left, the activity box on the
 * right. Quick actions reveal on hover *and* on keyboard focus, and stay
 * permanently visible on coarse pointers — a hover-only control is unreachable
 * on a touch screen.
 */
export function ItineraryItemCard({
  trip,
  stop,
  index,
  last,
  selected,
  reservationCount,
  canEdit,
  onSelect,
  onDelete,
  dragHandleProps,
  dragging = false,
  style,
}: ItineraryItemCardProps) {
  const { t } = useTranslation("planner");
  const isDrive = stop.transit || stop.category === "Transit";
  const cost = stop.cost
    ? formatMoney(stop.cost, stop.costCurrency || trip.currency)
    : null;

  return (
    <div
      className={cn(
        "group/item flex gap-2",
        dragging && "opacity-90 [&_*]:!cursor-grabbing",
      )}
      style={style}
    >
      <div className="flex w-8 flex-none flex-col items-center">
        <span
          className={cn(
            "flex size-8 flex-none items-center justify-center rounded-full text-[11px] font-bold ring-1",
            isDrive
              ? "bg-muted text-muted-foreground ring-border"
              : "bg-card text-foreground ring-border-strong",
            stop.done && "opacity-55",
          )}
        >
          {isDrive ? (
            <CategoryIcon category={stop.category} />
          ) : (
            <span className="tabular-nums">{index}</span>
          )}
        </span>
        {last ? null : <span className="w-0.5 flex-1 rounded bg-border" />}
      </div>

      <div className={cn("min-w-0 flex-1 pb-2.5", stop.done && "opacity-55")}>
        <div
          className={cn(
            "relative flex gap-2 rounded-xl border p-2.5 transition-all duration-200 sm:p-3",
            isDrive
              ? "border-dashed border-border bg-muted/40"
              : cn("border-border", CATEGORY_TINT[stop.category] ?? "bg-card"),
            selected
              ? "border-brand shadow-[0_0_0_3px_var(--brand-muted)]"
              : "shadow-xs hover:shadow-md",
          )}
        >
          {canEdit && dragHandleProps ? (
            <button
              type="button"
              {...dragHandleProps}
              data-drag-handle=""
              aria-label={t("detail.moveStop", { name: stop.name })}
              className={cn(
                "-my-1 -ml-1 flex flex-none touch-none items-start rounded-md px-0.5 py-1 text-muted-foreground/60",
                "hover:bg-accent hover:text-foreground",
                dragging ? "cursor-grabbing" : "cursor-grab",
              )}
            >
              <GripVerticalIcon className="mt-0.5 size-4" aria-hidden="true" />
            </button>
          ) : canEdit ? (
            <GripVerticalIcon
              className="mt-0.5 size-4 flex-none text-muted-foreground/50"
              aria-hidden="true"
            />
          ) : null}

          <button
            type="button"
            onClick={onSelect}
            className="min-w-0 flex-1 space-y-1 text-left"
          >
            <span className="flex flex-wrap items-center gap-1">
              {stop.time ? <Chip>{stop.time}</Chip> : null}
              {stop.duration ? <Chip>{stop.duration}</Chip> : null}
              {cost ? <Chip tone="brand">{cost}</Chip> : null}
              {stop.mustSee ? (
                <Chip tone="warning">{t("detail.mustSee")}</Chip>
              ) : null}
              {stop.done ? <Chip tone="success">{t("detail.done")}</Chip> : null}
              {reservationCount > 0 ? (
                <Chip>
                  <TicketCheck className="size-3" aria-hidden="true" />
                  {reservationCount}
                </Chip>
              ) : null}
            </span>

            <span
              className={cn(
                "block text-sm leading-snug font-semibold text-pretty",
                stop.done && "line-through",
              )}
            >
              {stop.name}
            </span>

            {stop.area && stop.area !== "TBD" ? (
              <span className="block truncate text-xs text-muted-foreground">
                {stop.area}
              </span>
            ) : null}

            {stop.note ? (
              <span className="line-clamp-2 block text-xs text-pretty text-muted-foreground">
                {stop.note}
              </span>
            ) : null}
          </button>

          {canEdit ? (
            <div
              className={cn(
                "flex flex-none flex-col gap-1 opacity-0 transition-opacity duration-200",
                "group-hover/item:opacity-100 group-focus-within/item:opacity-100",
                "pointer-coarse:opacity-100",
              )}
            >
              <button
                type="button"
                onClick={onSelect}
                aria-label={t("detail.editStop", { name: stop.name })}
                className={cn(
                  interactive,
                  "flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                <PencilIcon className="size-3.5" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={onDelete}
                aria-label={t("detail.deleteStop", { name: stop.name })}
                className={cn(
                  interactive,
                  "flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive",
                )}
              >
                <Trash2Icon className="size-3.5" aria-hidden="true" />
              </button>
            </div>
          ) : null}
        </div>

        {stop.links.length ? (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {stop.links.map((link, i) => (
              <a
                key={`${link.url}-${i}`}
                href={link.url}
                target="_blank"
                rel="noreferrer noopener"
                className={cn(
                  interactive,
                  "inline-flex max-w-40 items-center truncate rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                {linkLabel(link)}
              </a>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
