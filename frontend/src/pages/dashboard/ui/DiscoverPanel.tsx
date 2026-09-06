import { useTranslation } from "react-i18next";
import { ClockIcon, MapPinIcon, StarIcon, XIcon } from "lucide-react";
import type { DestinationTemplate } from "@/entities/destination";
import { cn } from "@/shared/lib";

/** The three destination tiles across the top of the dashboard. */
export function DiscoverTiles({
  destinations,
  selectedId,
  onSelect,
}: {
  destinations: readonly DestinationTemplate[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="grid shrink-0 grid-cols-1 gap-3.5 sm:grid-cols-3 sm:h-[196px]">
      {destinations.map((destination) => {
        const selected = destination.id === selectedId;
        return (
          <button
            key={destination.id}
            type="button"
            aria-pressed={selected}
            onClick={() => onSelect(destination.id)}
            className={cn(
              "wf-interactive wf-pressable relative overflow-hidden rounded-2xl bg-muted text-left transition-shadow max-sm:h-36",
              selected
                ? "ring-2 ring-brand ring-offset-2 ring-offset-background"
                : "hover:ring-2 hover:ring-border-strong hover:ring-offset-2 hover:ring-offset-background",
            )}
          >
            <img
              src={destination.image}
              alt=""
              loading="lazy"
              className="absolute inset-0 size-full object-cover"
            />
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(to top, rgba(2,13,51,0.78), rgba(2,13,51,0) 62%)",
              }}
              aria-hidden="true"
            />
            <div className="absolute inset-x-0 bottom-0 p-3.5">
              <p className="font-heading text-[15px] font-bold tracking-tight text-white">
                {destination.name}
              </p>
              <div className="mt-1 flex items-center gap-3 text-[11.5px] text-white/85">
                <span className="inline-flex items-center gap-1">
                  <MapPinIcon className="size-3" aria-hidden="true" />
                  {destination.country}
                </span>
                <span className="inline-flex items-center gap-1">
                  <StarIcon className="size-3 fill-current" aria-hidden="true" />
                  {destination.rating}
                </span>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

/** Detail panel for the picked destination; opens beside the itinerary list. */
export function DestinationDetail({
  destination,
  onClose,
  onPlan,
}: {
  destination: DestinationTemplate;
  onClose: () => void;
  onPlan: () => void;
}) {
  const { t } = useTranslation("trips");

  return (
    <aside className="flex flex-col overflow-hidden rounded-2xl bg-card shadow-[var(--shadow-border)] ring-1 ring-border">
      <div className="relative min-h-[132px] flex-1 p-2.5 pb-0">
        <img
          src={destination.image}
          alt=""
          className="size-full rounded-xl object-cover"
        />
        <button
          type="button"
          onClick={onClose}
          aria-label={t("dashboard.discover.close")}
          className="wf-interactive absolute top-4.5 right-4.5 flex size-7 items-center justify-center rounded-full bg-[rgba(2,13,51,0.55)] text-white hover:bg-[rgba(2,13,51,0.75)]"
        >
          <XIcon className="size-3.5" aria-hidden="true" />
        </button>
      </div>

      <div className="flex shrink-0 flex-col p-3.5">
        <div className="flex items-center gap-2.5">
          <h3 className="font-heading text-lg font-bold tracking-tight">
            {destination.name}
          </h3>
          <span className="ml-auto inline-flex items-baseline gap-1">
            <StarIcon
              className="size-3.5 translate-y-px fill-warning text-warning"
              aria-hidden="true"
            />
            <span className="text-sm font-bold">{destination.rating}</span>
            <span className="text-[11px] text-muted-foreground">/5</span>
          </span>
        </div>

        <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
          {destination.description}
        </p>

        <div className="mt-3.5 flex flex-col gap-2.5">
          <div className="flex items-center gap-2">
            <span className="flex size-5.5 shrink-0 items-center justify-center rounded-full bg-muted">
              <MapPinIcon className="size-3" aria-hidden="true" />
            </span>
            <span className="text-xs font-medium">{destination.country}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex size-5.5 shrink-0 items-center justify-center rounded-full bg-muted">
              <ClockIcon className="size-3" aria-hidden="true" />
            </span>
            <span className="text-xs font-medium">
              {t("dashboard.discover.days", { count: destination.days })}
            </span>
            <span className="h-3 w-px bg-border" aria-hidden="true" />
            <span className="truncate text-xs font-medium text-muted-foreground">
              {destination.tags.join(" · ")}
            </span>
          </div>
          <p className="text-sm font-bold">{destination.estimatedBudget}</p>
        </div>

        <p className="mt-3 text-[10.5px] text-muted-foreground">
          {t("dashboard.discover.credit", {
            artist: destination.credit.artist,
            license: destination.credit.license,
          })}
        </p>

        <button
          type="button"
          onClick={onPlan}
          className="wf-interactive wf-pressable mt-4 inline-flex h-10 items-center justify-center rounded-xl bg-foreground text-xs font-semibold text-background hover:bg-foreground/90"
        >
          {t("dashboard.discover.plan")}
        </button>
      </div>
    </aside>
  );
}
