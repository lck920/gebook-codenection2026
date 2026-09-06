import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import {
  searchPlaceDetails,
  searchPlaces,
  type PlaceDetails,
  type PlaceResult,
} from "@/shared/api";

function useDebounced<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return debounced;
}

/** The provider's own name and address, in the shape the pickers expect. */
function toResult(place: PlaceDetails): PlaceResult {
  return {
    id: place.id,
    label: place.name,
    secondary: place.label === place.name ? "" : place.label,
    lat: place.lat,
    lng: place.lng,
  };
}

/**
 * Stop-name autocomplete.
 *
 * Prefers the configured geo provider through our own API — the same source
 * that backs stop details, so a place picked here matches the place shown
 * later. Falls back to keyless Photon when that call fails (no key, no
 * session, provider outage) rather than leaving the member with no search.
 */
export function usePlaceSearch(
  query: string,
  biasLat?: number,
  biasLng?: number,
) {
  const { i18n } = useTranslation("planner");
  const lang = i18n.resolvedLanguage ?? "en";
  const debounced = useDebounced(query, 250);
  const enabled = debounced.trim().length >= 2;

  const { data: results = [], isFetching } = useQuery({
    queryKey: ["places", debounced, biasLat, biasLng, lang],
    queryFn: async ({ signal }) => {
      try {
        const places = await searchPlaceDetails(debounced, {
          signal,
          lang,
          lat: biasLat,
          lng: biasLng,
        });
        if (places.length > 0) return places.map(toResult);
      } catch {
        // Fall through to the keyless geocoder below.
      }
      return searchPlaces(debounced, {
        lat: biasLat,
        lng: biasLng,
        lang,
        signal,
      });
    },
    enabled,
    staleTime: 60_000,
  });

  return { results, isFetching, enabled };
}

export type { PlaceResult };
