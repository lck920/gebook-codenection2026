import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ClockIcon,
  ExternalLinkIcon,
  GlobeIcon,
  ImageOffIcon,
  MapIcon,
  MessageSquareTextIcon,
  StarIcon,
  XIcon,
} from "lucide-react";
import type { Trip } from "@/entities/trip";
import { CategoryIcon, type Stop } from "@/entities/stop";
import type { UpdateStopInput } from "@/shared/api";
import { cn, formatMoney } from "@/shared/lib";
import { Spinner } from "@/shared/ui/spinner";
import { usePlaceInsight, type StopPlaceInfo } from "../model/usePlaceInsight";
import { StopDetail } from "./StopDetail";

type View = "place" | "details";

export interface StopInspectorProps {
  trip: Trip;
  stop: Stop;
  currentUserId: string;
  canEdit: boolean;
  onClose: () => void;
  onToggleVote: (stopId: string) => void;
  onComment: (stopId: string, text: string) => void;
  commentPending?: boolean;
  onUpdateStop: (stopId: string, patch: UpdateStopInput) => void;
  onChangeStopDay: (stopId: string, day: number) => void;
  onExpandNote: (stopId: string) => void;
  onWriteTravelogue: (stopId: string) => void;
  onDeleteStop?: (stopId: string) => void;
}

/**
 * What a member gets when they click a stop: the place itself — a photo, what
 * it is, where it is — over the map, with the editable trip detail one tap
 * behind it.
 *
 * Selecting a stop used to only recolour a map pin, which told nobody anything
 * they did not already know.
 */
export function StopInspector({
  trip,
  stop,
  currentUserId,
  canEdit,
  onClose,
  onToggleVote,
  onComment,
  commentPending,
  onUpdateStop,
  onChangeStopDay,
  onExpandNote,
  onWriteTravelogue,
  onDeleteStop,
}: StopInspectorProps) {
  const { t } = useTranslation("planner");
  const [view, setView] = useState<View>("place");
  const { details, insight, loading, failed } = usePlaceInsight(stop);

  // A different stop is a different place: never show the previous one's tab.
  useEffect(() => setView("place"), [stop.id]);

  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${stop.name} ${stop.lat},${stop.lng}`,
  )}`;

  return (
    <div
      className={cn(
        "absolute inset-x-3 bottom-3 z-20 flex flex-col overflow-hidden rounded-2xl bg-card shadow-[var(--shadow-border),var(--shadow-lg)]",
        view === "details" ? "top-16" : "max-h-[72%]",
      )}
    >
      <div className="flex flex-none items-center gap-2 border-b border-border px-3.5 py-2.5">
        <CategoryIcon category={stop.category} />
        <p className="min-w-0 flex-1 truncate font-heading text-[13.5px] font-bold tracking-tight">
          {stop.name}
        </p>
        <div className="inline-flex h-7 flex-none items-center gap-0.5 rounded-[9px] bg-muted p-0.5">
          {(["place", "details"] as View[]).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setView(value)}
              aria-pressed={view === value}
              className={cn(
                "wf-interactive inline-flex h-6 items-center rounded-[7px] px-2.5 text-[11px] font-semibold",
                view === value
                  ? "bg-card text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t(value === "place" ? "place.tabPlace" : "place.tabDetails")}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={t("place.close")}
          className="wf-interactive wf-pressable flex size-7 flex-none items-center justify-center rounded-[9px] text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <XIcon className="size-4" aria-hidden="true" />
        </button>
      </div>

      {view === "details" ? (
        <div className="flex min-h-0 flex-1 flex-col">
          <StopDetail
            trip={trip}
            stop={stop}
            currentUserId={currentUserId}
            canEdit={canEdit}
            onClose={onClose}
            onToggleVote={onToggleVote}
            onComment={onComment}
            commentPending={commentPending}
            onUpdateStop={onUpdateStop}
            onChangeStopDay={onChangeStopDay}
            onExpandNote={() => onExpandNote(stop.id)}
            onWriteTravelogue={() => onWriteTravelogue(stop.id)}
            onDeleteStop={
              onDeleteStop ? () => onDeleteStop(stop.id) : undefined
            }
          />
        </div>
      ) : (
        <div className="scrollbar-reveal min-h-0 flex-1 overflow-y-auto">
          <Hero insight={insight} loading={loading} failed={failed} name={stop.name} />

          <div className="flex flex-col gap-2.5 p-3.5">
            <p className="font-mono text-[10.5px] tracking-[0.06em] text-muted-foreground uppercase">
              {[
                t("detail.dayTime", {
                  day: stop.day,
                  time: stop.time,
                  dur: stop.duration,
                }),
                stop.area || null,
                stop.cost
                  ? formatMoney(stop.cost, stop.costCurrency || trip.currency)
                  : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>

            {details?.rating ? (
              <p className="flex items-center gap-1.5 text-[12.5px] font-semibold">
                <StarIcon
                  className="size-3.5 fill-[#f5a524] text-[#f5a524]"
                  aria-hidden="true"
                />
                {details.rating.toFixed(1)}
                {details.ratingCount ? (
                  <span className="font-medium text-muted-foreground">
                    {t("place.ratingCount", { count: details.ratingCount })}
                  </span>
                ) : null}
              </p>
            ) : null}

            {details?.summary ? (
              <p className="text-[12.5px] leading-relaxed text-pretty">
                {details.summary}
              </p>
            ) : null}

            {details?.label ? (
              <p className="text-[12px] leading-relaxed text-muted-foreground">
                {details.label}
              </p>
            ) : null}

            {details?.openingHours?.length ? (
              <details className="group">
                <summary className="wf-interactive flex cursor-pointer list-none items-center gap-1.5 text-[12px] font-semibold text-muted-foreground hover:text-foreground">
                  <ClockIcon className="size-3.5" aria-hidden="true" />
                  {t("place.hours")}
                </summary>
                <ul className="mt-1.5 flex flex-col gap-0.5 pl-5">
                  {details.openingHours.map((line) => (
                    <li key={line} className="text-[11.5px] text-muted-foreground">
                      {line}
                    </li>
                  ))}
                </ul>
              </details>
            ) : null}

            {insight?.extract ? (
              <div>
                {insight.matchedByName ? null : (
                  <p className="mb-1 text-[11px] font-semibold text-muted-foreground">
                    {t("place.nearbyArticle", { title: insight.title })}
                  </p>
                )}
                <p className="text-[12.5px] leading-relaxed text-pretty">
                  {insight.extract}
                </p>
              </div>
            ) : null}

            {insight && insight.photos.length > 0 ? (
              <PhotoStrip insight={insight} />
            ) : null}

            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
              <button
                type="button"
                onClick={() => setView("details")}
                className="wf-interactive wf-pressable inline-flex h-7.5 items-center gap-1.5 rounded-[10px] border border-border px-2.5 text-[12px] font-semibold hover:bg-accent"
              >
                <MessageSquareTextIcon className="size-3.5" aria-hidden="true" />
                {t("place.openDetails")}
              </button>
              <a
                href={mapsUrl}
                target="_blank"
                rel="noreferrer"
                className="wf-interactive wf-pressable inline-flex h-7.5 items-center gap-1.5 rounded-[10px] border border-border px-2.5 text-[12px] font-semibold hover:bg-accent"
              >
                <MapIcon className="size-3.5" aria-hidden="true" />
                {t("place.googleMaps")}
              </a>
              {details?.website ? (
                <a
                  href={details.website}
                  target="_blank"
                  rel="noreferrer"
                  className="wf-interactive wf-pressable inline-flex h-7.5 items-center gap-1.5 rounded-[10px] border border-border px-2.5 text-[12px] font-semibold hover:bg-accent"
                >
                  <GlobeIcon className="size-3.5" aria-hidden="true" />
                  {t("place.website")}
                </a>
              ) : null}
              {insight?.articleUrl ? (
                <a
                  href={insight.articleUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="wf-interactive inline-flex h-7.5 items-center gap-1 rounded-[10px] px-1.5 text-[12px] font-semibold text-muted-foreground hover:text-foreground"
                >
                  {t("place.wikipedia")}
                  <ExternalLinkIcon className="size-3" aria-hidden="true" />
                </a>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Hero({
  insight,
  loading,
  failed,
  name,
}: {
  insight: StopPlaceInfo["insight"];
  loading: boolean;
  failed: boolean;
  name: string;
}) {
  const { t } = useTranslation("planner");
  const src = insight?.heroUrl ?? insight?.photos[0]?.url ?? null;

  if (loading) {
    return (
      <div className="flex aspect-[16/9] items-center justify-center bg-muted">
        <Spinner className="size-4" />
      </div>
    );
  }
  if (!src) {
    return (
      <div className="flex aspect-[16/6] flex-col items-center justify-center gap-1.5 bg-muted text-muted-foreground">
        <ImageOffIcon className="size-4" aria-hidden="true" />
        <p className="px-6 text-center text-[11.5px] text-pretty">
          {failed ? t("place.lookupFailed") : t("place.noBackground", { name })}
        </p>
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={insight?.title ?? name}
      loading="lazy"
      className="aspect-[16/9] w-full object-cover"
    />
  );
}

function PhotoStrip({
  insight,
}: {
  insight: NonNullable<StopPlaceInfo["insight"]>;
}) {
  const { t } = useTranslation("planner");
  return (
    <div>
      <div className="scrollbar-reveal -mx-0.5 flex gap-1.5 overflow-x-auto px-0.5 pb-1">
        {insight.photos.map((photo) => (
          <a
            key={photo.url}
            href={photo.descriptionUrl}
            target="_blank"
            rel="noreferrer"
            title={`${photo.credit}${photo.license ? ` · ${photo.license}` : ""}`}
            className="wf-interactive size-16 flex-none overflow-hidden rounded-lg"
          >
            <img
              src={photo.url}
              alt={photo.credit}
              loading="lazy"
              className="size-full object-cover"
            />
          </a>
        ))}
      </div>
      <p className="mt-1 text-[10.5px] text-muted-foreground">
        {t("place.photoCredit")}
      </p>
    </div>
  );
}
