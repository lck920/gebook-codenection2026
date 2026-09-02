/** Place search via Photon (OSM-based, keyless, CORS-enabled). Results come
 * back ordered by Photon's importance ranking, i.e. relevance-sorted. */

const PHOTON_BASE = "https://photon.komoot.io";

export interface PlaceResult {
  id: string;
  /** Primary label, e.g. the POI or street name. */
  label: string;
  /** Secondary line: city / region / country context. */
  secondary: string;
  lat: number;
  lng: number;
}

interface PhotonProps {
  name?: string;
  street?: string;
  housenumber?: string;
  city?: string;
  district?: string;
  state?: string;
  country?: string;
  osm_id?: number;
  osm_type?: string;
}

interface PhotonFeature {
  geometry: { coordinates: [number, number] };
  properties: PhotonProps;
}

function toResult(f: PhotonFeature, i: number): PlaceResult {
  const p = f.properties;
  const [lng, lat] = f.geometry.coordinates;
  const label =
    p.name ??
    [p.housenumber, p.street].filter(Boolean).join(" ") ??
    p.city ??
    `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  const secondary = [p.street && p.street !== label ? p.street : null, p.district, p.city, p.state, p.country]
    .filter(Boolean)
    .join(", ");
  return {
    id: p.osm_type && p.osm_id ? `${p.osm_type}${p.osm_id}` : `r${i}`,
    label,
    secondary,
    lat,
    lng,
  };
}

export interface SearchPlacesOptions {
  /** Bias results near this point (usually the trip's current map center). */
  lat?: number;
  lng?: number;
  lang?: string;
  limit?: number;
  signal?: AbortSignal;
}

export async function searchPlaces(
  query: string,
  { lat, lng, lang = "en", limit = 6, signal }: SearchPlacesOptions = {},
): Promise<PlaceResult[]> {
  const q = query.trim();
  if (!q) return [];
  const url = new URL(`${PHOTON_BASE}/api/`);
  url.searchParams.set("q", q);
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("lang", lang === "zh" ? "default" : lang);
  if (lat != null && lng != null) {
    url.searchParams.set("lat", String(lat));
    url.searchParams.set("lon", String(lng));
  }
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`geocode_failed_${res.status}`);
  const data = (await res.json()) as { features?: PhotonFeature[] };
  return (data.features ?? []).map(toResult);
}

export async function reversePlace(
  lat: number,
  lng: number,
  lang = "en",
): Promise<PlaceResult | null> {
  const url = new URL(`${PHOTON_BASE}/reverse`);
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lng));
  url.searchParams.set("lang", lang === "zh" ? "default" : lang);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`reverse_failed_${res.status}`);
  const data = (await res.json()) as { features?: PhotonFeature[] };
  const first = data.features?.[0];
  return first ? toResult(first, 0) : null;
}
