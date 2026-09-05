import { useTranslation } from "react-i18next";
import { useQueries } from "@tanstack/react-query";
import {
  fetchPlaceDetails,
  fetchPlaceInsight,
  type PlaceDetails,
  type PlaceInsight,
} from "@/shared/api";

export interface StopPlaceInfo {
  /** Ratings, hours, address and blurb from the geo provider (Google). */
  details: PlaceDetails | null;
  /** Photos and encyclopaedic background from Wikipedia / Wikimedia Commons. */
  insight: PlaceInsight | null;
}

/**
 * Everything worth showing about a stop, from the two sources that each hold
 * half of it: Google knows the ratings, hours and address; Wikimedia has the
 * photographs (Google's Places photos are an Enterprise-tier field this key
 * does not return). They are fetched in parallel and either may come back
 * empty — a stop called "Lunch" is in neither.
 */
export function usePlaceInsight(
  stop: { id: string; name: string; lat: number; lng: number } | undefined,
): StopPlaceInfo & { loading: boolean; failed: boolean } {
  const { i18n } = useTranslation("planner");
  const lang = i18n.resolvedLanguage ?? "en";
  const enabled = Boolean(stop);

  const [details, insight] = useQueries({
    queries: [
      {
        queryKey: ["place-details", stop?.id, stop?.name, lang],
        queryFn: ({ signal }: { signal: AbortSignal }) =>
          fetchPlaceDetails(stop!.name, stop!.lat, stop!.lng, { signal, lang }),
        enabled,
        staleTime: 30 * 60_000,
        retry: 1,
      },
      {
        queryKey: ["place-insight", stop?.id, stop?.name, stop?.lat, stop?.lng, lang],
        queryFn: ({ signal }: { signal: AbortSignal }) =>
          fetchPlaceInsight(stop!.name, stop!.lat, stop!.lng, lang, signal),
        enabled,
        staleTime: Infinity,
        gcTime: 30 * 60_000,
        retry: 1,
      },
    ],
  });

  return {
    details: details.data ?? null,
    insight: insight.data ?? null,
    // The card can render as soon as either source lands; only hold the
    // skeleton while both are still outstanding.
    loading: enabled && details.isPending && insight.isPending,
    failed: details.isError && insight.isError,
  };
}
