/** Insertion marker shown between itinerary items while a stop is dragged, at
 *  the slot where a release would drop it. */
export function ItineraryDropLine() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none relative my-0.5 h-0.5 rounded-full bg-brand shadow-[0_0_0_3px_var(--brand-muted)]"
    >
      <span className="absolute -left-1 top-1/2 size-2 -translate-y-1/2 rounded-full bg-brand" />
    </div>
  );
}
