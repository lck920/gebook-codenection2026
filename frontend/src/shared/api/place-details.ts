/** Place facts from the configured geo provider, proxied through our own API
 * so the provider key stays on the server. */

import { apiFetch } from "./client";

export interface PlaceDetails {
  id: string;
  name: string;
  /** Formatted address / display label. */
  label: string;
  lat: number;
  lng: number;
  categories: string[];
  rating?: number;
  ratingCount?: number;
  phone?: string;
  website?: string;
  /** One line per weekday, as the provider phrases them. */
  openingHours?: string[];
  /** Short editorial description (Google only). */
  summary?: string;
}

/**
 * Place autocomplete through our own API, so results come from the same
 * provider that backs stop details rather than a second, disagreeing geocoder.
 */
export async function searchPlaceDetails(
  query: string,
  {
    signal,
    lang = "en",
    lat,
    lng,
    limit = 6,
  }: {
    signal?: AbortSignal;
    lang?: string;
    lat?: number;
    lng?: number;
    limit?: number;
  } = {},
): Promise<PlaceDetails[]> {
  if (query.trim().length < 2) return [];
  const url = new URL("/api/places/search", window.location.origin);
  url.searchParams.set("q", query.trim());
  url.searchParams.set("lang", lang);
  url.searchParams.set("limit", String(limit));
  if (lat != null && lng != null) {
    url.searchParams.set("lat", String(lat));
    url.searchParams.set("lng", String(lng));
  }
  return apiFetch<PlaceDetails[]>(url.pathname + url.search, { signal });
}

export async function fetchPlaceDetails(
  name: string,
  lat: number,
  lng: number,
  { signal, lang = "en" }: { signal?: AbortSignal; lang?: string } = {},
): Promise<PlaceDetails | null> {
  if (name.trim().length < 2) return null;
  const url = new URL("/api/places/detail", window.location.origin);
  url.searchParams.set("name", name.trim());
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lng", String(lng));
  url.searchParams.set("lang", lang);

  try {
    return await apiFetch<PlaceDetails | null>(url.pathname + url.search, {
      signal,
    });
  } catch {
    // Background detail is a nicety: a provider outage, a missing key, or a
    // local test session with no server must not break the panel. The
    // encyclopaedic half still renders.
    return null;
  }
}
