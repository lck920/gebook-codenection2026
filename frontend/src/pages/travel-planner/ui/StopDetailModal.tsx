import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  XIcon,
  MapIcon,
  ExternalLinkIcon,
  Trash2Icon,
  PencilIcon,
  StarIcon,
  ImageOffIcon,
  MapPinIcon,
} from "lucide-react";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import type { Trip } from "@/entities/trip";
import {
  CategoryIcon,
  categoryMeta,
  type Stop,
} from "@/entities/stop";
import { cn, formatMoney, interactive } from "@/shared/lib";
import { Spinner } from "@/shared/ui/spinner";
import { usePlaceInsight } from "../model/usePlaceInsight";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface StopDetailModalProps {
  trip: Trip;
  stop: Stop | null;
  open: boolean;
  onClose: () => void;
  /** Navigate to the map tab and open the full stop editor. */
  onEdit: (stopId: string) => void;
  /** Delete this stop. */
  onDelete: (stopId: string) => void;
  /** Switch to the map tab and centre on this stop. */
  onShowOnMap: (stopId: string) => void;
  canEdit: boolean;
}

// ─── Chip colours matching existing ItineraryItemCard tones ─────────────────

const chipBase =
  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase ring-1 ring-inset tabular-nums";

// ─── Main modal ──────────────────────────────────────────────────────────────

/**
 * Itinerary Item Detail Modal.
 *
 * Opens over the Schedule board when the user clicks a stop card — instead of
 * navigating away to the map tab. Shows a photo carousel (Wikimedia), metadata
 * chips, notes, action links, and footer actions (delete / close / edit).
 */
export function StopDetailModal({
  trip,
  stop,
  open,
  onClose,
  onEdit,
  onDelete,
  onShowOnMap,
  canEdit,
}: StopDetailModalProps) {
  const { t } = useTranslation("planner");

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogPrimitive.Portal>
        {/* ── Backdrop ── */}
        <DialogPrimitive.Backdrop
          className={cn(
            "fixed inset-0 z-40 bg-black/50 backdrop-blur-sm",
            "transition-opacity duration-[var(--dur-slow)] ease-[var(--ease-out)]",
            "data-[starting-style]:opacity-0 data-[ending-style]:opacity-0",
          )}
        />

        {/* ── Viewport (centers the card) ── */}
        <DialogPrimitive.Viewport
          className="fixed inset-0 z-40 flex items-center justify-center p-4 sm:p-6"
        >
          {stop ? (
            <ModalContent
              trip={trip}
              stop={stop}
              canEdit={canEdit}
              onClose={onClose}
              onEdit={onEdit}
              onDelete={onDelete}
              onShowOnMap={onShowOnMap}
              t={t}
            />
          ) : null}
        </DialogPrimitive.Viewport>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

// ─── Inner content (extracted so hooks only fire when stop is non-null) ──────

function ModalContent({
  trip,
  stop,
  canEdit,
  onClose,
  onEdit,
  onDelete,
  onShowOnMap,
  t,
}: {
  trip: Trip;
  stop: Stop;
  canEdit: boolean;
  onClose: () => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onShowOnMap: (id: string) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: any;
}) {
  const { insight, loading, failed } = usePlaceInsight(stop);
  const [photoIndex, setPhotoIndex] = useState(0);

  // Build the carousel slide list: hero first, then additional photos.
  const photos: { url: string; title: string | null }[] = [];
  if (insight?.heroUrl) {
    photos.push({ url: insight.heroUrl, title: insight.title });
  }
  for (const p of insight?.photos ?? []) {
    photos.push({ url: p.url, title: p.credit || null });
  }

  // Reset carousel when stop changes.
  useEffect(() => {
    setPhotoIndex(0);
  }, [stop.id]);

  const prev = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setPhotoIndex((i) => (i - 1 + photos.length) % photos.length);
    },
    [photos.length],
  );
  const next = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setPhotoIndex((i) => (i + 1) % photos.length);
    },
    [photos.length],
  );

  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${stop.name} ${stop.lat},${stop.lng}`,
  )}`;

  const cost = stop.cost
    ? formatMoney(stop.cost, stop.costCurrency || trip.currency)
    : null;

  const catMeta = categoryMeta(stop.category);

  return (
    <DialogPrimitive.Popup
      className={cn(
        "relative flex w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-card",
        "shadow-[var(--shadow-border),0_25px_50px_-12px_rgb(0_0_0/.35)]",
        "outline-none",
        "transition-[opacity,scale,translate] duration-[var(--dur-slow)] ease-[var(--ease-out)]",
        "data-[starting-style]:scale-95 data-[starting-style]:opacity-0",
        "data-[ending-style]:scale-95 data-[ending-style]:opacity-0",
        "max-h-[min(92dvh,680px)]",
      )}
    >
      {/* ══ CAROUSEL ══════════════════════════════════════════════════════════ */}
      <div className="relative h-52 flex-none overflow-hidden rounded-t-3xl bg-muted sm:h-72">
        {/* Photo / loading / empty state */}
        {loading ? (
          <div className="flex size-full items-center justify-center bg-muted">
            <Spinner className="size-5 text-muted-foreground" />
          </div>
        ) : photos.length > 0 ? (
          <>
            {photos.map((photo, i) => (
              <img
                key={photo.url}
                src={photo.url}
                alt={photo.title ?? stop.name}
                loading="lazy"
                className={cn(
                  "absolute inset-0 size-full object-cover transition-opacity duration-300",
                  i === photoIndex ? "opacity-100" : "opacity-0",
                )}
              />
            ))}
          </>
        ) : (
          /* Empty state */
          <div className="flex size-full flex-col items-center justify-center gap-2 bg-muted text-muted-foreground">
            <span
              className="flex size-14 items-center justify-center rounded-full"
              style={{ background: catMeta.bg }}
            >
              <CategoryIcon category={stop.category} />
            </span>
            {failed ? (
              <>
                <ImageOffIcon className="size-5" aria-hidden="true" />
                <p className="text-xs">{t("place.lookupFailed")}</p>
              </>
            ) : (
              <p className="px-8 text-center text-xs text-pretty">
                {t("place.noBackground", { name: stop.name })}
              </p>
            )}
          </div>
        )}

        {/* Close button — top-right */}
        <DialogPrimitive.Close
          aria-label={t("place.close")}
          className={cn(
            interactive,
            "absolute top-2.5 right-2.5 z-10 flex size-8 items-center justify-center",
            "rounded-full bg-black/60 text-white backdrop-blur-sm",
            "transition-colors duration-200 hover:bg-black/75",
          )}
        >
          <XIcon className="size-4" aria-hidden="true" />
        </DialogPrimitive.Close>

        {/* Image caption pill — top-left */}
        {photos[photoIndex]?.title ? (
          <span className="absolute top-2.5 left-2.5 z-10 max-w-[55%] truncate rounded-full bg-black/55 px-2.5 py-1 text-[10px] font-medium text-white backdrop-blur-sm">
            {photos[photoIndex].title}
          </span>
        ) : null}

        {/* Prev / Next arrows — only when multiple photos */}
        {photos.length > 1 ? (
          <>
            <button
              type="button"
              onClick={prev}
              aria-label="Previous photo"
              className={cn(
                interactive,
                "absolute top-1/2 left-2.5 z-10 flex size-9 -translate-y-1/2 items-center justify-center",
                "rounded-full bg-black/55 text-white backdrop-blur-sm",
                "transition-colors duration-200 hover:bg-black/70",
              )}
            >
              <ChevronLeftIcon className="size-5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={next}
              aria-label="Next photo"
              className={cn(
                interactive,
                "absolute top-1/2 right-2.5 z-10 flex size-9 -translate-y-1/2 items-center justify-center",
                "rounded-full bg-black/55 text-white backdrop-blur-sm",
                "transition-colors duration-200 hover:bg-black/70",
              )}
            >
              <ChevronRightIcon className="size-5" aria-hidden="true" />
            </button>

            {/* Pagination pills */}
            <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1">
              {photos.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setPhotoIndex(i); }}
                  aria-label={`Go to photo ${i + 1}`}
                  className={cn(
                    "h-1.5 rounded-full transition-all duration-200",
                    i === photoIndex
                      ? "w-5 bg-white"
                      : "w-1.5 bg-white/60 hover:bg-white/80",
                  )}
                />
              ))}
            </div>
          </>
        ) : null}

        {/* Wikimedia credit (only when showing real photos) */}
        {!loading && insight && insight.photos.length > 0 ? (
          <span className="absolute bottom-3 right-3 z-10 text-[9px] text-white/60">
            {t("place.photoCredit")}
          </span>
        ) : null}
      </div>

      {/* ══ SCROLLABLE CONTENT ════════════════════════════════════════════════ */}
      <div className="scrollbar-overlay min-h-0 flex-1 overflow-y-auto">
        <div className="p-5 sm:p-6">

          {/* — Metadata chips — */}
          <div className="flex flex-wrap items-center gap-1.5">
            {/* Day */}
            <span className={cn(chipBase, "bg-muted text-muted-foreground ring-border")}>
              {`Day ${stop.day}`}
            </span>

            {/* Category */}
            <span
              className={cn(chipBase, "ring-transparent")}
              style={{ background: catMeta.bg, color: catMeta.fg }}
            >
              <CategoryIcon category={stop.category} />
              {t(`category.${stop.category}`) || stop.category}
            </span>

            {/* Time */}
            {stop.time ? (
              <span className={cn(chipBase, "bg-muted text-muted-foreground ring-border")}>
                {stop.time}
              </span>
            ) : null}

            {/* Duration */}
            {stop.duration ? (
              <span
                className={cn(
                  chipBase,
                  "bg-[color-mix(in_oklab,var(--info)_12%,transparent)] text-[color-mix(in_oklab,var(--info)_90%,var(--foreground))] ring-transparent",
                )}
              >
                {stop.duration}
              </span>
            ) : null}

            {/* Cost */}
            {cost ? (
              <span className={cn(chipBase, "bg-brand-muted text-brand ring-transparent")}>
                {cost}
              </span>
            ) : null}

            {/* Must See */}
            {stop.mustSee ? (
              <span
                className={cn(
                  chipBase,
                  "bg-[color-mix(in_oklab,var(--warning)_16%,transparent)] text-warning ring-transparent",
                )}
              >
                <StarIcon className="size-2.5 fill-current" aria-hidden="true" />
                {t("detail.mustSee")}
              </span>
            ) : null}
          </div>

          {/* — Title — */}
          <h2 className="mt-2 text-lg font-bold leading-snug text-pretty text-foreground">
            {stop.name}
          </h2>

          {/* — Area subtitle — */}
          {stop.area && stop.area !== "TBD" ? (
            <p className="mt-0.5 flex items-center gap-1 text-[12.5px] text-muted-foreground">
              <MapPinIcon className="size-3 flex-none" aria-hidden="true" />
              {stop.area}
            </p>
          ) : null}

          {/* — Wikipedia extract (fallback when there's no user note) — */}
          {!stop.note && insight?.extract ? (
            <p className="mt-2 text-[13px] leading-relaxed text-pretty text-muted-foreground">
              {insight.extract}
            </p>
          ) : null}

          {/* — Notes — */}
          {stop.note ? (
            <p className="mt-1.5 whitespace-pre-line text-[13px] leading-relaxed text-pretty text-muted-foreground">
              {stop.note}
            </p>
          ) : null}

          {/* — Action links — */}
          <div className="mt-4 flex flex-wrap items-center gap-1.5">
            {/* Show on Map */}
            <button
              type="button"
              onClick={() => { onShowOnMap(stop.id); onClose(); }}
              className={cn(
                interactive,
                "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold",
                "bg-[color-mix(in_oklab,var(--success)_12%,transparent)] text-[color-mix(in_oklab,var(--success)_90%,var(--foreground))]",
                "transition-colors duration-200 hover:bg-[color-mix(in_oklab,var(--success)_20%,transparent)]",
              )}
            >
              <MapIcon className="size-3.5" aria-hidden="true" />
              {t("place.openDetails") || "Show on Map"}
            </button>

            {/* Google Maps */}
            <a
              href={mapsUrl}
              target="_blank"
              rel="noreferrer noopener"
              className={cn(
                interactive,
                "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold",
                "bg-[color-mix(in_oklab,var(--brand)_10%,transparent)] text-brand",
                "transition-colors duration-200 hover:bg-[color-mix(in_oklab,var(--brand)_18%,transparent)]",
              )}
            >
              <MapPinIcon className="size-3.5" aria-hidden="true" />
              {t("place.googleMaps") || "Google Maps"}
            </a>

            {/* Wikipedia */}
            {insight?.articleUrl ? (
              <a
                href={insight.articleUrl}
                target="_blank"
                rel="noreferrer noopener"
                className={cn(
                  interactive,
                  "inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-muted-foreground",
                  "transition-colors duration-200 hover:text-foreground",
                )}
              >
                {t("place.wikipedia") || "Wikipedia"}
                <ExternalLinkIcon className="size-3" aria-hidden="true" />
              </a>
            ) : null}

            {/* Custom stop links */}
            {stop.links.map((link, i) => {
              let label = link.label.trim();
              if (!label) {
                try {
                  label = new URL(link.url).host.replace(/^www\./, "");
                } catch {
                  label = link.url;
                }
              }
              return (
                <a
                  key={`${link.url}-${i}`}
                  href={link.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className={cn(
                    interactive,
                    "inline-flex max-w-[160px] items-center gap-1 truncate rounded-lg px-2.5 py-1.5 text-xs font-semibold",
                    "bg-muted text-muted-foreground",
                    "transition-colors duration-200 hover:bg-accent hover:text-foreground",
                  )}
                >
                  <ExternalLinkIcon className="size-3 flex-none" aria-hidden="true" />
                  {label}
                </a>
              );
            })}
          </div>
        </div>
      </div>

      {/* ══ FOOTER ════════════════════════════════════════════════════════════ */}
      <div
        className={cn(
          "flex flex-none items-center gap-2 border-t border-border bg-card/50 px-5",
          "pb-[max(env(safe-area-inset-bottom),1rem)] pt-3",
        )}
      >
        {/* Delete — left-aligned, only for editors */}
        {canEdit ? (
          <button
            type="button"
            onClick={() => { onDelete(stop.id); onClose(); }}
            className={cn(
              interactive,
              "flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold text-destructive",
              "transition-colors duration-200 hover:bg-destructive/10",
            )}
          >
            <Trash2Icon className="size-4" aria-hidden="true" />
            {t("detail.delete") || "Delete"}
          </button>
        ) : null}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Close */}
        <DialogPrimitive.Close
          className={cn(
            interactive,
            "rounded-xl border border-border px-4 py-2 text-sm font-semibold text-muted-foreground",
            "transition-colors duration-200 hover:bg-accent hover:text-foreground",
          )}
        >
          {t("compose.cancel") || "Close"}
        </DialogPrimitive.Close>

        {/* Edit — primary, only for editors */}
        {canEdit ? (
          <button
            type="button"
            onClick={() => { onEdit(stop.id); onClose(); }}
            className={cn(
              interactive,
              "flex items-center gap-1.5 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-brand-foreground shadow-md",
              "transition-colors duration-200 hover:opacity-90",
            )}
          >
            <PencilIcon className="size-3.5" aria-hidden="true" />
            {t("detail.editStop", { name: "" }).trim() || "Edit"}
          </button>
        ) : null}
      </div>
    </DialogPrimitive.Popup>
  );
}
