import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowRightIcon } from "lucide-react";
import { decorativeRoute, type TripSummary } from "@/entities/trip";
import { Badge } from "@/shared/ui/badge";
import { Card } from "@/shared/ui/card";
import { Avatar } from "@/shared/ui/avatar";
import { cn } from "@/shared/lib";
import { TripMapThumbnail } from "@/shared/ui/map";

/** Max avatars shown before collapsing the rest into a "+N" chip. */
const MAX_AVATARS = 4;

const STATUS_VARIANT = {
  active: "brand",
  planning: "warning",
  settled: "success",
} as const;

export function TripCard({
  trip,
  onOpen,
  featured = false,
}: {
  trip: TripSummary;
  onOpen: () => void;
  featured?: boolean;
}) {
  const { t } = useTranslation("trips");
  const [coverFailed, setCoverFailed] = useState(false);

  const shown = trip.members.slice(0, MAX_AVATARS);
  const overflow = trip.members.length - shown.length;
  const route = decorativeRoute(trip);
  const routeColor = trip.status === "active" ? trip.coverColor : "var(--ink-400)";
  const showMap = Boolean(trip.location);
  const showCover = !showMap && Boolean(trip.coverUrl) && !coverFailed;

  const meta = [
    trip.startLabel && trip.endLabel
      ? t("card.dates", { start: trip.startLabel, end: trip.endLabel })
      : null,
    t("card.stops", { count: trip.stopCount }),
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <Card
      className={cn(
        "wf-enter group cursor-pointer overflow-hidden border border-border p-0 shadow-[var(--shadow-border)] transition-[border-color,box-shadow,scale] duration-[var(--dur-base)] ease-[var(--ease-out)] hover:border-corn-300 hover:shadow-md active:scale-[var(--press-scale)]",
        featured && "md:min-h-[390px]",
      )}
      onClick={onOpen}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
    >
      <div
        className={cn(
          "relative h-[148px] overflow-hidden bg-ink-150",
          featured && "md:h-[210px]",
        )}
      >
        {showMap && trip.location ? (
          <TripMapThumbnail
            lat={trip.location.lat}
            lng={trip.location.lng}
            markerColor={trip.coverColor}
          />
        ) : showCover ? (
          <img
            src={trip.coverUrl!}
            alt={t("card.coverAlt", { title: trip.title })}
            className="absolute inset-0 size-full object-cover outline outline-1 -outline-offset-1 outline-black/10 dark:outline-white/10"
            loading="lazy"
            decoding="async"
            onError={() => setCoverFailed(true)}
          />
        ) : (
          <svg
            viewBox="0 0 320 148"
            className="absolute inset-0 size-full"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            {route.path && (
              <path
                d={route.path}
                fill="none"
                stroke={routeColor}
                strokeWidth="2"
                strokeDasharray="5 4"
                strokeLinecap="round"
              />
            )}
            {route.points.map((p, i) => (
              <circle
                key={i}
                cx={p.x}
                cy={p.y}
                r="5"
                fill={routeColor}
                stroke="white"
                strokeWidth="2"
              />
            ))}
          </svg>
        )}
        {showMap || showCover ? (
          <div
            className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-black/10"
            aria-hidden="true"
          />
        ) : null}
        <Badge
          variant={STATUS_VARIANT[trip.status]}
          className="absolute right-3 top-3 shadow-sm"
        >
          {t(`status.${trip.status}`)}
        </Badge>
      </div>
      <div
        className={cn(
          "flex flex-col gap-3 p-4",
          featured && "md:px-5 md:pb-5",
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <h2
            className={cn(
              "font-heading text-lg font-semibold tracking-tight text-balance",
              featured && "md:text-xl",
            )}
          >
            {trip.title}
          </h2>
        </div>
        {meta && (
          <p className="font-mono text-[11px] leading-5 text-muted-foreground tabular-nums">
            {meta}
          </p>
        )}
        <div className="mt-auto flex items-center justify-between pt-1">
          {shown.length > 0 ? (
            <div className="flex flex-none items-center">
              {shown.map((m, i) => (
                <Avatar
                  key={m.id}
                  name={m.name}
                  bg={m.avatarBg}
                  fg={m.avatarFg}
                  src={m.image}
                  seed={m.id}
                  size={24}
                  stackIndex={i}
                  zIndex={shown.length - i}
                />
              ))}
              {overflow > 0 ? (
                <span
                  className="-ml-[7px] inline-flex size-6 flex-none items-center justify-center rounded-full bg-muted text-[10px] font-semibold tabular-nums text-muted-foreground ring-2 ring-card outline outline-1 -outline-offset-1 outline-black/10 dark:outline-white/10"
                  title={t("card.moreMembers", { count: overflow })}
                >
                  +{overflow}
                </span>
              ) : null}
            </div>
          ) : (
            <span />
          )}
          <span
            className={cn(
              "inline-flex min-h-8 items-center gap-1 text-xs font-semibold text-corn-600",
            )}
          >
            {t(`card.action.${trip.status}`)}
            <ArrowRightIcon
              className="size-3.5 transition-transform duration-150 group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </span>
        </div>
      </div>
    </Card>
  );
}
