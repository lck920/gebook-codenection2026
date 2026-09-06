import { useState } from "react";
import {
  POPULAR_DESTINATIONS,
  type DestinationTemplate,
} from "@/entities/destination";
import { Badge } from "@/shared/ui/badge";


interface PopularDestinationsCarouselProps {
  onSelectDestination?: (destination: DestinationTemplate) => void;
}

export function PopularDestinationsCarousel({
  onSelectDestination,
}: PopularDestinationsCarouselProps) {
  const [activeCard, setActiveCard] = useState<string>(POPULAR_DESTINATIONS[0]!.id);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading text-lg font-bold text-foreground">
            Popular Destinations
          </h2>
          <p className="text-xs text-muted-foreground">
            Curated escapes with smart ready-to-use itineraries
          </p>
        </div>
        <Badge
          variant="outline"
          className="border-brand/30 bg-brand/10 text-xs font-semibold text-brand"
        >
          ✨ AI Ready
        </Badge>
      </div>

      {/* Featured Big Hero Card */}
      {(() => {
        const featured = POPULAR_DESTINATIONS.find((d) => d.id === activeCard) ?? POPULAR_DESTINATIONS[0]!;
        return (
          <div
            className="group relative h-48 overflow-hidden rounded-3xl border border-border/70 shadow-sm transition-all sm:h-56"
            style={{
              backgroundImage: `linear-gradient(to top, rgba(2, 13, 51, 0.9) 0%, rgba(2, 13, 51, 0.2) 60%, rgba(0,0,0,0.1) 100%), url(${featured.image})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            <div className="absolute top-4 left-4 flex items-center gap-2">
              {featured.badge && (
                <span className="rounded-full bg-brand-midnight/80 px-3 py-1 text-xs font-bold text-brand-sky backdrop-blur-md">
                  {featured.badge}
                </span>
              )}
              <span className="flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-1 text-xs font-bold text-amber-300 backdrop-blur-md">
                ★ {featured.rating}
              </span>
            </div>

            <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
              <div className="max-w-md">
                <p className="text-xs font-medium text-brand-sky">
                  {featured.country} · {featured.days} Days · {featured.estimatedBudget}
                </p>
                <h3 className="font-heading text-xl font-bold text-white sm:text-2xl">
                  {featured.name}
                </h3>
                <p className="line-clamp-1 text-xs text-white/80">
                  {featured.description}
                </p>
              </div>

              {onSelectDestination && (
                <button
                  type="button"
                  onClick={() => onSelectDestination(featured)}
                  className="wf-tactile-btn shrink-0 rounded-2xl bg-brand px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-brand/90"
                >
                  Plan This Trip →
                </button>
              )}
            </div>
          </div>
        );
      })()}

      {/* Thumbnails Row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {POPULAR_DESTINATIONS.map((dest) => {
          const isSelected = dest.id === activeCard;
          return (
            <button
              key={dest.id}
              type="button"
              onClick={() => setActiveCard(dest.id)}
              className={`wf-tactile-card group relative overflow-hidden rounded-2xl border p-2.5 text-left transition-all ${
                isSelected
                  ? "border-brand bg-brand-ice/30 ring-2 ring-brand/30 dark:bg-brand-midnight"
                  : "border-border/80 bg-card hover:border-brand/50"
              }`}
            >
              <div
                className="h-20 w-full rounded-xl bg-cover bg-center"
                style={{ backgroundImage: `url(${dest.image})` }}
              >
                <div className="flex justify-end p-1.5">
                  <span className="rounded-full bg-black/70 px-1.5 py-0.5 text-[10px] font-bold text-amber-300">
                    ★ {dest.rating}
                  </span>
                </div>
              </div>
              <div className="mt-2">
                <p className="truncate text-xs font-bold text-foreground group-hover:text-brand">
                  {dest.name}
                </p>
                <p className="text-[11px] text-muted-foreground">{dest.country}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
