import type { ReactNode } from "react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  MapIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react";
import { dayDateLabel, type Trip, type TripDay } from "@/entities/trip";
import { cn, formatMoney, interactive } from "@/shared/lib";
import { Input } from "@/shared/ui/input";
import { DayColorPicker } from "@/shared/ui/day-color-picker";
import {
  Popover,
  PopoverPopup,
  PopoverTrigger,
} from "@/shared/ui/popover";
import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogDescription,
  AlertDialogPopup,
  AlertDialogTitle,
} from "@/shared/ui/alert-dialog";
import { Button } from "@/shared/ui/button";

export interface DayCardProps {
  trip: Trip;
  day: TripDay;
  /** Ordinal position, for the move up/down affordances. */
  position: number;
  dayCount: number;
  stopCount: number;
  /** Summed cost of the day's stops, in the trip currency. */
  plannedCost: number;
  /** Summed duration of the day's transit stops, pre-formatted. */
  driveTime: string | null;
  expanded: boolean;
  onToggle: () => void;
  canEdit: boolean;
  children: ReactNode;
  onAddItem: () => void;
  onShowOnMap: () => void;
  onUpdateDay: (patch: { city?: string; color?: string }) => void;
  onDelete: () => void;
  onMove: (direction: -1 | 1) => void;
}

/**
 * One day of the itinerary as an elevated, self-contained card.
 *
 * The header carries the day's own theme colour (`TripDay.color`) as a left
 * border and number badge, so a long trip stays scannable. Management actions
 * are revealed on hover, on keyboard focus, and unconditionally on coarse
 * pointers — hiding them behind hover alone would strand touch users.
 */
export function DayCard({
  trip,
  day,
  position,
  dayCount,
  stopCount,
  plannedCost,
  driveTime,
  expanded,
  onToggle,
  canEdit,
  children,
  onAddItem,
  onShowOnMap,
  onUpdateDay,
  onDelete,
  onMove,
}: DayCardProps) {
  const { t, i18n } = useTranslation("planner");
  const locale = i18n.resolvedLanguage ?? "en";
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [cityDraft, setCityDraft] = useState(day.city);

  const chips = [
    dayDateLabel(trip, day, locale),
    t("days.stopCount", { count: stopCount }),
    driveTime,
    plannedCost > 0 ? formatMoney(plannedCost, trip.currency) : null,
  ].filter(Boolean) as string[];

  // `pointer-events-none` matters because the cluster overlays the header: at
  // `opacity-0` it is invisible but would still swallow clicks aimed at the
  // title underneath. Focusability is unaffected, so tabbing still reveals it.
  const revealed = cn(
    "pointer-events-none opacity-0 transition-opacity duration-200",
    "group-hover/day:pointer-events-auto group-hover/day:opacity-100",
    "group-focus-within/day:pointer-events-auto group-focus-within/day:opacity-100",
    "pointer-coarse:pointer-events-auto pointer-coarse:opacity-100",
  );
  const actionButton = cn(
    interactive,
    "flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground",
  );

  return (
    <section
      className={cn(
        // `flex-none` is load-bearing: the card is a flex item in the column's
        // scroller, and `overflow-hidden` switches off the automatic
        // `min-height: auto` floor, so without it the card shrinks below its
        // own content and clips the trailing "add item" button.
        "group/day relative flex-none overflow-hidden rounded-2xl border border-border bg-card",
        "shadow-sm transition-all duration-200 hover:shadow-md",
      )}
      style={{ borderLeft: `4px solid ${day.color}` }}
    >
      <div className="p-2.5 sm:p-3">
      <div className="flex items-center gap-2.5">
        <span
          className="flex size-10 flex-none items-center justify-center rounded-xl text-sm font-bold text-white tabular-nums"
          style={{ backgroundColor: day.color }}
          aria-hidden="true"
        >
          {day.number}
        </span>

        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          className="min-w-0 flex-1 text-left"
        >
          <span className="block truncate font-heading text-[15px] font-bold tracking-tight">
            {t("days.day", { n: day.number })}
            {day.city ? ` · ${day.city}` : ""}
          </span>
        </button>

        {canEdit ? (
          // Lifted out of flow. In flow the cluster keeps its width even while
          // faded out, which in a ~300px column either starved the title to an
          // ellipsis or wrapped the header onto an empty extra row. Overlaying
          // costs nothing while hidden, and it only covers the title's tail at
          // the moment the pointer is already on the card.
          <div
            className={cn(
              "absolute top-2.5 right-10 z-10 flex items-center gap-0.5 sm:top-3",
              // Fully opaque, not tinted: it sits on top of the day title, and
              // text showing through behind the icons made both unreadable.
              "rounded-lg border border-border bg-card px-1 shadow-sm",
              revealed,
            )}
          >
            <button
              type="button"
              onClick={onShowOnMap}
              aria-label={t("days.showOnMap", { n: day.number })}
              className={actionButton}
            >
              <MapIcon className="size-3.5" aria-hidden="true" />
            </button>

            <Popover>
              <PopoverTrigger
                render={<button type="button" className={actionButton} />}
                aria-label={t("days.editDay", { n: day.number })}
              >
                <PencilIcon className="size-3.5" aria-hidden="true" />
              </PopoverTrigger>
              <PopoverPopup className="flex w-56 flex-col gap-2">
                <label className="text-xs font-semibold text-muted-foreground">
                  {t("days.cityLabel")}
                </label>
                <Input
                  value={cityDraft}
                  onChange={(event) => setCityDraft(event.target.value)}
                  onBlur={() => {
                    if (cityDraft !== day.city) onUpdateDay({ city: cityDraft });
                  }}
                  placeholder={t("days.cityPlaceholder")}
                  className="rounded-lg"
                />
                <DayColorPicker
                  value={day.color}
                  onChange={(color) => onUpdateDay({ color })}
                  trigger={
                    <button
                      type="button"
                      className={cn(
                        interactive,
                        "flex items-center gap-2 rounded-lg border border-border px-2 py-1.5 text-xs font-semibold",
                      )}
                    >
                      <span
                        className="size-4 rounded-md"
                        style={{ backgroundColor: day.color }}
                        aria-hidden="true"
                      />
                      {t("days.colorLabel")}
                    </button>
                  }
                />
              </PopoverPopup>
            </Popover>

            <button
              type="button"
              onClick={() => onMove(-1)}
              disabled={position === 0}
              aria-label={t("days.moveUp", { n: day.number })}
              className={cn(actionButton, "disabled:pointer-events-none disabled:opacity-30")}
            >
              <ChevronUpIcon className="size-3.5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => onMove(1)}
              disabled={position === dayCount - 1}
              aria-label={t("days.moveDown", { n: day.number })}
              className={cn(actionButton, "disabled:pointer-events-none disabled:opacity-30")}
            >
              <ChevronDownIcon className="size-3.5" aria-hidden="true" />
            </button>

            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              aria-label={t("days.deleteDay", { n: day.number })}
              className={cn(
                interactive,
                "flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive",
              )}
            >
              <Trash2Icon className="size-3.5" aria-hidden="true" />
            </button>
          </div>
        ) : null}

        <button
          type="button"
          onClick={onToggle}
          aria-label={expanded ? t("days.collapse") : t("days.expand")}
          className={cn(actionButton, "flex-none")}
        >
          <ChevronDownIcon
            className={cn(
              "size-4 transition-transform duration-200",
              expanded && "rotate-180",
            )}
            aria-hidden="true"
          />
        </button>
      </div>

      {/* The chips sit on their own row rather than beside the title: the
          action cluster is `opacity-0`, not `hidden`, so it holds its width
          even while invisible, and sharing the header row with it collapsed
          the title to an ellipsis in a narrow column. Indented to line up
          with the title (badge 40px + 10px gap). */}
      {chips.length ? (
        <div className="mt-1.5 flex flex-wrap items-center gap-1 pl-12.5">
          {chips.map((chip) => (
            <span
              key={chip}
              className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-muted-foreground uppercase tabular-nums"
            >
              {chip}
            </span>
          ))}
        </div>
      ) : null}
      </div>

      {expanded ? (
        <div className="flex flex-col gap-2 px-2.5 pb-2.5 sm:px-3 sm:pb-3">
          {children}
          {canEdit ? (
            <button
              type="button"
              onClick={onAddItem}
              className={cn(
                interactive,
                "flex h-10 w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-border-strong text-[12.5px] font-semibold text-muted-foreground",
                "transition-all duration-200 hover:border-solid hover:border-brand hover:bg-brand-muted hover:text-foreground",
              )}
            >
              <PlusIcon className="size-3.5" aria-hidden="true" />
              {t("compose.addToDay", { n: day.number })}
            </button>
          ) : null}
        </div>
      ) : null}

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogPopup>
          <AlertDialogTitle>
            {t("days.deleteDay", { n: day.number })}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t("days.deleteConfirm", { count: stopCount })}
          </AlertDialogDescription>
          <div className="mt-4 flex justify-end gap-2">
            <AlertDialogClose
              render={<Button variant="secondary" size="sm" />}
            >
              {t("days.cancel")}
            </AlertDialogClose>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                setConfirmDelete(false);
                onDelete();
              }}
            >
              {t("days.delete")}
            </Button>
          </div>
        </AlertDialogPopup>
      </AlertDialog>
    </section>
  );
}
