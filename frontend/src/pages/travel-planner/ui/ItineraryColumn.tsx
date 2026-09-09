import { Fragment, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { MapPinOffIcon, PlusIcon, SparklesIcon } from "lucide-react";
import type { Reservation } from "@/entities/reservation";
import { formatDuration, parseDurationMinutes } from "@/entities/stop";
import type { Trip } from "@/entities/trip";
import { fetchReservations, type UpdateTripDayInput } from "@/shared/api";
import { queryKeys } from "@/shared/config";
import { Input } from "@/shared/ui/input";
import { cn, interactive } from "@/shared/lib";
import { DayCard } from "./itinerary/DayCard";
import { ItineraryItemCard } from "./itinerary/ItineraryItemCard";
import { ItineraryDropLine } from "./itinerary/ItineraryDropLine";
import {
  useItineraryStopDrag,
  type ItineraryStopMoveInput,
} from "./itinerary/useItineraryStopDrag";
import { PlaceSearch } from "./PlaceSearch";
import type { ComposeDraft } from "./ScheduleBoard";

/**
 * The planner's middle column: the whole trip as a vertical stack of day cards.
 *
 * Each day is its own elevated card that folds open and shut, so a long trip
 * stays navigable inside a ~600px column without a separate day selector. The
 * wide multi-day board (`ScheduleBoard`) needs ~1200px and cannot fit here.
 */
export function ItineraryColumn({
  trip,
  onDayChange,
  selectedStopId,
  onSelectStop,
  compose,
  onOpenCompose,
  onChangeCompose,
  onConfirmCompose,
  onCancelCompose,
  canEdit,
  onPlanWithAI,
  onPickOnMap,
  biasLat,
  biasLng,
  onAddDay,
  onUpdateDay,
  onDeleteDay,
  onReorderDays,
  onDeleteStop,
  onMoveStop,
}: {
  trip: Trip;
  /** Focuses the map on a day; the day cards drive this via their Map action. */
  onDayChange: (day: number) => void;
  selectedStopId: string | null;
  onSelectStop: (stopId: string) => void;
  compose: ComposeDraft | null;
  onOpenCompose: (day: number, index: number) => void;
  onChangeCompose: (patch: Partial<ComposeDraft>) => void;
  onConfirmCompose: () => void;
  onCancelCompose: () => void;
  canEdit: boolean;
  /** Seed the agent composer with a "plan this trip" draft. */
  onPlanWithAI?: () => void;
  /** Switch to the map so the member can drop a pin for the new stop. */
  onPickOnMap?: () => void;
  /** Bias search results towards where the trip actually is. */
  biasLat?: number;
  biasLng?: number;
  onAddDay: () => void;
  onUpdateDay: (dayNumber: number, patch: UpdateTripDayInput) => void;
  onDeleteDay: (dayNumber: number) => void;
  onReorderDays: (order: number[]) => void;
  onDeleteStop: (stopId: string) => void;
  /** Move a stop to another day, or reorder it within its day. */
  onMoveStop?: (input: ItineraryStopMoveInput) => void;
}) {
  const { t } = useTranslation("planner");

  // The board shows a ticket badge on stops that have a booking attached; the
  // timeline rendered the same card without the count, so the badge could never
  // appear on desktop. Same query key as the board, so they share one fetch.
  const { data: reservations = [] } = useQuery<Reservation[]>({
    queryKey: queryKeys.reservations(trip.id),
    queryFn: () => fetchReservations(trip.id),
  });
  const reservationCountByStop = useMemo(() => {
    const counts = new Map<string, number>();
    for (const reservation of reservations) {
      if (!reservation.stopId) continue;
      counts.set(reservation.stopId, (counts.get(reservation.stopId) ?? 0) + 1);
    }
    return counts;
  }, [reservations]);

  // Collapsed days are tracked rather than expanded ones, so a day added later
  // starts open instead of silently appearing shut.
  const [collapsed, setCollapsed] = useState<ReadonlySet<number>>(new Set());
  const toggleDay = (dayNumber: number) =>
    setCollapsed((current) => {
      const next = new Set(current);
      if (next.has(dayNumber)) next.delete(dayNumber);
      else next.add(dayNumber);
      return next;
    });

  const tripEmpty = trip.stops.length === 0;

  const stopDrag = useItineraryStopDrag(
    trip,
    canEdit ? onMoveStop : undefined,
  );

  // Dragging a stop onto a folded day opens it so the drop position is visible.
  const hoverDay = stopDrag.hoverDay;
  useEffect(() => {
    if (hoverDay == null) return;
    setCollapsed((current) => {
      if (!current.has(hoverDay)) return current;
      const next = new Set(current);
      next.delete(hoverDay);
      return next;
    });
  }, [hoverDay]);

  const moveDay = (index: number, direction: -1 | 1) => {
    const order = trip.days.map((d) => d.number);
    const target = index + direction;
    if (target < 0 || target >= order.length) return;
    const current = order[index];
    const swap = order[target];
    if (current == null || swap == null) return;
    order[index] = swap;
    order[target] = current;
    onReorderDays(order);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="scrollbar-reveal flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3 sm:p-4.5">
        {tripEmpty && trip.days.length > 0 ? (
          <EmptyTripPrompt
            canEdit={canEdit}
            onPlanWithAI={onPlanWithAI}
            onAddStop={() => onOpenCompose(trip.days[0]!.number, 0)}
          />
        ) : null}

        {trip.days.length === 0 ? (
          <p className="m-auto text-sm text-muted-foreground">{t("days.all")}</p>
        ) : (
          trip.days.map((d, index) => {
            const stops = trip.stops
              .filter((s) => s.day === d.number)
              .sort((a, b) => a.time.localeCompare(b.time));
            const composing = compose?.day === d.number;
            const plannedCost = stops.reduce((sum, s) => sum + s.cost, 0);

            // Drive time is the sum of the day's transit legs; a duration that
            // cannot be parsed is skipped rather than counted as zero.
            const driveMinutes = stops
              .filter((s) => s.transit || s.category === "Transit")
              .reduce(
                (sum, s) => sum + (parseDurationMinutes(s.duration) ?? 0),
                0,
              );

            // The rail badge numbers activities only — a transit leg shows its
            // category icon instead, so counting it would make the visible
            // sequence skip (icon, 2, 3 rather than icon, 1, 2).
            let activityNumber = 0;
            const railNumbers = stops.map((s) =>
              s.transit || s.category === "Transit" ? 0 : ++activityNumber,
            );

            const dropIndex =
              stopDrag.dropSlot?.day === d.number
                ? stopDrag.dropSlot.index
                : null;

            return (
              <div
                key={d.number}
                ref={stopDrag.registerDay(d.number)}
                className="flex-none"
              >
              <DayCard
                trip={trip}
                day={d}
                position={index}
                dayCount={trip.days.length}
                stopCount={stops.length}
                plannedCost={plannedCost}
                driveTime={
                  driveMinutes > 0 ? formatDuration(driveMinutes) : null
                }
                expanded={!collapsed.has(d.number)}
                onToggle={() => toggleDay(d.number)}
                canEdit={canEdit}
                onAddItem={() => onOpenCompose(d.number, stops.length)}
                onShowOnMap={() => onDayChange(d.number)}
                onUpdateDay={(patch) => onUpdateDay(d.number, patch)}
                onDelete={() => onDeleteDay(d.number)}
                onMove={(direction) => moveDay(index, direction)}
              >
                {stops.length === 0 && !composing && dropIndex == null ? (
                  <p className="px-1 py-2 text-xs text-muted-foreground">
                    {t("days.emptyDay")}
                  </p>
                ) : null}

                {stops.map((stop, stopIndex) => (
                  <Fragment key={stop.id}>
                    {dropIndex === stopIndex ? <ItineraryDropLine /> : null}
                    <div ref={stopDrag.registerStop(stop.id)}>
                      <ItineraryItemCard
                        trip={trip}
                        stop={stop}
                        index={railNumbers[stopIndex] ?? stopIndex + 1}
                        last={stopIndex === stops.length - 1 && !composing}
                        selected={stop.id === selectedStopId}
                        reservationCount={
                          reservationCountByStop.get(stop.id) ?? 0
                        }
                        canEdit={canEdit}
                        onSelect={() => onSelectStop(stop.id)}
                        onDelete={() => onDeleteStop(stop.id)}
                        dragHandleProps={
                          canEdit && onMoveStop
                            ? stopDrag.handleProps(stop.id, d.number)
                            : undefined
                        }
                        dragging={stopDrag.draggedStopId === stop.id}
                        style={stopDrag.stopStyle(stop.id)}
                      />
                    </div>
                  </Fragment>
                ))}

                {dropIndex != null && dropIndex >= stops.length ? (
                  <ItineraryDropLine />
                ) : null}

                {composing ? (
                  <div className="ml-10">
                    <ComposeRow
                      draft={compose}
                      onChange={onChangeCompose}
                      onConfirm={onConfirmCompose}
                      onCancel={onCancelCompose}
                      onPickOnMap={onPickOnMap}
                      biasLat={biasLat}
                      biasLng={biasLng}
                    />
                  </div>
                ) : null}
              </DayCard>
              </div>
            );
          })
        )}

        {canEdit && trip.days.length > 0 ? (
          <button
            type="button"
            onClick={onAddDay}
            className={cn(
              interactive,
              "flex h-11 w-full flex-none items-center justify-center gap-1.5 rounded-2xl border border-dashed border-border-strong text-[12.5px] font-semibold text-muted-foreground",
              "transition-all duration-200 hover:border-solid hover:border-brand hover:bg-brand-muted hover:text-foreground",
            )}
          >
            <PlusIcon className="size-4" aria-hidden="true" />
            {t("days.addDay")}
          </button>
        ) : null}
      </div>
    </div>
  );
}

/** One prompt for an untouched trip, in place of an add button on every day. */
function EmptyTripPrompt({
  canEdit,
  onPlanWithAI,
  onAddStop,
}: {
  canEdit: boolean;
  onPlanWithAI?: () => void;
  onAddStop: () => void;
}) {
  const { t } = useTranslation("planner");

  return (
    <div className="flex flex-col items-center gap-1 rounded-2xl border border-dashed border-border-strong px-5 py-6 text-center">
      <p className="font-heading text-[14px] font-bold tracking-tight">
        {t("emptyTrip.title")}
      </p>
      <p className="max-w-[34ch] text-[12.5px] text-pretty text-muted-foreground">
        {t("emptyTrip.body")}
      </p>
      {canEdit ? (
        <div className="mt-2.5 flex flex-wrap items-center justify-center gap-1.5">
          {onPlanWithAI ? (
            <button
              type="button"
              onClick={onPlanWithAI}
              className="wf-interactive wf-pressable inline-flex h-8.5 items-center gap-1.5 rounded-[10px] bg-brand px-3.5 text-[12.5px] font-semibold text-brand-foreground"
            >
              <SparklesIcon className="size-3.5" aria-hidden="true" />
              {t("emptyTrip.planWithAi")}
            </button>
          ) : null}
          <button
            type="button"
            onClick={onAddStop}
            className="wf-interactive wf-pressable inline-flex h-8.5 items-center gap-1.5 rounded-[10px] border border-border px-3 text-[12.5px] font-semibold hover:bg-accent"
          >
            <PlusIcon className="size-3.5" aria-hidden="true" />
            {t("emptyTrip.addManually")}
          </button>
        </div>
      ) : null}
    </div>
  );
}

/**
 * Inline add form.
 *
 * The name field searches real places, because a free-text name is geocoded
 * afterwards and quietly resolves to whichever namesake ranks first — how
 * "JiuFen" became a street on the wrong continent. Picking a result attaches
 * its coordinates. Somewhere genuinely unlisted (a friend's flat, a stall with
 * no entry) can still be typed in by hand.
 */
function ComposeRow({
  draft,
  onChange,
  onConfirm,
  onCancel,
  onPickOnMap,
  biasLat,
  biasLng,
}: {
  draft: ComposeDraft;
  onChange: (patch: Partial<ComposeDraft>) => void;
  onConfirm: () => void;
  onCancel: () => void;
  onPickOnMap?: () => void;
  biasLat?: number;
  biasLng?: number;
}) {
  const { t } = useTranslation("planner");
  const [manual, setManual] = useState(false);
  const located = draft.lat != null && draft.lng != null;
  const ready = draft.name.trim().length > 0 && (manual || located);

  return (
    <form
      className="flex flex-col gap-2 rounded-2xl border border-brand bg-card p-3 shadow-[0_0_0_3px_rgba(17,106,248,0.12)]"
      onSubmit={(event) => {
        event.preventDefault();
        if (ready) onConfirm();
      }}
    >
      {manual ? (
        <Input
          autoFocus
          value={draft.name}
          onChange={(event) => onChange({ name: event.target.value })}
          placeholder={t("compose.namePlaceholder")}
          aria-label={t("compose.namePlaceholder")}
        />
      ) : (
        <PlaceSearch
          autoFocus
          value={draft.name}
          onValueChange={(name) =>
            // Typing past a chosen place drops its coordinates: the text no
            // longer describes the place that was picked.
            onChange({ name, lat: undefined, lng: undefined, area: undefined })
          }
          onSelectPlace={(place) =>
            onChange({
              name: place.label,
              lat: place.lat,
              lng: place.lng,
              area: place.secondary || undefined,
            })
          }
          onPickOnMap={() => onPickOnMap?.()}
          onSubmit={() => ready && onConfirm()}
          onCancel={onCancel}
          placeholder={t("compose.namePlaceholder")}
          biasLat={biasLat}
          biasLng={biasLng}
        />
      )}

      {located && !manual ? (
        <p className="truncate text-[11px] text-muted-foreground">
          {draft.area ||
            `${draft.lat!.toFixed(4)}, ${draft.lng!.toFixed(4)}`}
        </p>
      ) : (
        <button
          type="button"
          onClick={() => setManual((current) => !current)}
          className="wf-interactive inline-flex items-center gap-1.5 self-start text-[11px] font-semibold text-muted-foreground hover:text-foreground"
        >
          <MapPinOffIcon className="size-3" aria-hidden="true" />
          {manual ? t("compose.backToSearch") : t("compose.notOnMap")}
        </button>
      )}

      <div className="flex items-center gap-2">
        <Input
          value={draft.time}
          onChange={(event) => onChange({ time: event.target.value })}
          placeholder="10:00"
          aria-label={t("compose.timePlaceholder")}
          className="w-24 font-mono"
        />
        <button
          type="button"
          onClick={onCancel}
          className="wf-interactive ml-auto h-8 rounded-[10px] px-3 text-xs font-semibold text-muted-foreground hover:text-foreground"
        >
          {t("compose.cancel")}
        </button>
        <button
          type="submit"
          disabled={!ready}
          className={cn(
            "wf-interactive wf-pressable h-8 rounded-[10px] bg-brand px-3.5 text-xs font-semibold text-brand-foreground",
            !ready && "opacity-50",
          )}
        >
          {t("compose.confirm")}
        </button>
      </div>
    </form>
  );
}
