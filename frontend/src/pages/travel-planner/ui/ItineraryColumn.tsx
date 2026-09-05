import { useState } from "react";
import { useTranslation } from "react-i18next";
import { MapPinOffIcon, PlusIcon, SparklesIcon } from "lucide-react";
import { dayDateLabel, type Trip } from "@/entities/trip";
import { Input } from "@/shared/ui/input";
import { cn, formatMoney } from "@/shared/lib";
import { DayPills } from "./DayPills";
import { PlaceSearch } from "./PlaceSearch";
import { StopCard } from "./StopCard";
import type { ComposeDraft } from "./ScheduleBoard";

/**
 * The planner's middle column: one day at a time as a vertical timeline.
 *
 * The wide multi-day board (`ScheduleBoard`) needs ~1200px and does not fit
 * beside the chat and the map, so this renders the selected day only — times
 * down the gutter, stops as cards, and an add affordance whether the day is
 * full or empty.
 */
export function ItineraryColumn({
  trip,
  day,
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
}: {
  trip: Trip;
  /** 0 means "all days"; the column then shows every day in order. */
  day: number;
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
}) {
  const { t, i18n } = useTranslation("planner");
  const locale = i18n.resolvedLanguage ?? "en";

  const days = day === 0 ? trip.days : trip.days.filter((d) => d.number === day);
  // A brand-new trip repeated "Add a stop to day N" once per day — nine
  // identical rows saying the same thing. One prompt for the whole trip says it
  // better, and every day header still carries its own Add stop button.
  const tripEmpty = trip.stops.length === 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex-none border-b border-border px-4.5">
        <DayPills trip={trip} day={day} onDayChange={onDayChange} />
      </div>

      <div className="scrollbar-reveal flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-4.5">
        {tripEmpty && days.length > 0 ? (
          <EmptyTripPrompt
            canEdit={canEdit}
            onPlanWithAI={onPlanWithAI}
            onAddStop={() => onOpenCompose(days[0]!.number, 0)}
          />
        ) : null}
        {days.length === 0 ? (
          <p className="m-auto text-sm text-muted-foreground">
            {t("days.all")}
          </p>
        ) : (
          days.map((d) => {
            const stops = trip.stops
              .filter((s) => s.day === d.number)
              .sort((a, b) => a.time.localeCompare(b.time));
            const planned = stops.reduce((sum, s) => sum + s.cost, 0);
            const composing = compose?.day === d.number;

            return (
              <section key={d.number} className="flex flex-col">
                <div className="flex items-center gap-2.5">
                  <div className="min-w-0">
                    <p className="font-heading text-[15px] font-bold tracking-tight">
                      {t("days.day", { n: d.number })}
                      {d.city ? ` · ${d.city}` : ""}
                    </p>
                    <p className="mt-0.5 font-mono text-[10.5px] tracking-[0.06em] text-muted-foreground uppercase">
                      {[
                        dayDateLabel(trip, d, locale),
                        `${stops.length} ${stops.length === 1 ? "stop" : "stops"}`,
                        planned > 0
                          ? `${formatMoney(planned, trip.currency)} planned`
                          : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  {canEdit ? (
                    <button
                      type="button"
                      onClick={() => onOpenCompose(d.number, stops.length)}
                      className="wf-interactive wf-pressable ml-auto inline-flex h-7.5 items-center gap-1.5 rounded-[10px] border border-border bg-card px-3 text-xs font-semibold hover:bg-accent"
                    >
                      <PlusIcon
                        className="size-3.5 text-muted-foreground"
                        aria-hidden="true"
                      />
                      {t("compose.add")}
                    </button>
                  ) : null}
                </div>

                <div className="mt-3 flex flex-col">
                  {stops.map((stop, index) => (
                    <TimelineRow
                      key={stop.id}
                      index={index + 1}
                      time={stop.time}
                      duration={stop.duration}
                      last={index === stops.length - 1 && !composing}
                    >
                      <StopCard
                        trip={trip}
                        stop={stop}
                        selected={stop.id === selectedStopId}
                        onSelect={() => onSelectStop(stop.id)}
                      />
                    </TimelineRow>
                  ))}

                  {composing ? (
                    <TimelineRow
                      index={stops.length + 1}
                      time={compose.time}
                      last
                    >
                      <ComposeRow
                        draft={compose}
                        onChange={onChangeCompose}
                        onConfirm={onConfirmCompose}
                        onCancel={onCancelCompose}
                        onPickOnMap={onPickOnMap}
                        biasLat={biasLat}
                        biasLng={biasLng}
                      />
                    </TimelineRow>
                  ) : null}
                </div>

                {stops.length === 0 && !composing && !tripEmpty && day !== 0 ? (
                  <button
                    type="button"
                    onClick={() => canEdit && onOpenCompose(d.number, 0)}
                    disabled={!canEdit}
                    className="wf-interactive wf-pressable mt-1 flex h-11 items-center justify-center gap-1.5 rounded-2xl border border-dashed border-border-strong text-[12.5px] font-semibold text-muted-foreground hover:border-brand hover:text-foreground disabled:opacity-50"
                  >
                    <PlusIcon className="size-3.5" aria-hidden="true" />
                    {t("compose.addToDay", { n: d.number })}
                  </button>
                ) : null}
              </section>
            );
          })
        )}
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

/** Time gutter + numbered node + connector, wrapping one timeline entry. */
function TimelineRow({
  index,
  time,
  duration,
  last,
  children,
}: {
  index: number;
  time: string;
  duration?: string;
  last: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3">
      <div className="w-11 flex-none pt-3.5 text-right">
        <p className="font-mono text-xs font-semibold">{time || "--:--"}</p>
        {duration ? (
          <p className="mt-0.5 text-[10.5px] text-muted-foreground">
            {duration}
          </p>
        ) : null}
      </div>
      <div className="flex w-5.5 flex-none flex-col items-center pt-4.5">
        <span className="flex size-5.5 items-center justify-center rounded-full bg-foreground text-[10px] font-bold text-background">
          {index}
        </span>
        {last ? null : <span className="w-0.5 flex-1 bg-border" />}
      </div>
      <div className="min-w-0 flex-1 pb-2.5">{children}</div>
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
