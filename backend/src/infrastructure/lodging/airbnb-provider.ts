/**
 * Airbnb lodging provider.
 *
 * Logic adapted from openbnb-org/mcp-server-airbnb (MIT) as an in-process
 * adapter — no MCP transport, no cheerio. HTML is fetched and the embedded
 * `#data-deferred-state-0` JSON is extracted with a regex.
 */

import type {
  LodgingDetailQuery,
  LodgingListingDetail,
  LodgingListingSummary,
  LodgingProvider,
  LodgingSearchQuery,
  LodgingSearchResult,
} from "../../domain/lodging";
import { LodgingError } from "../../application/lodging/lodging-error";
import type { LodgingConfig } from "../config";
import {
  cleanObject,
  diagnoseJsonPath,
  flattenArraysInObject,
  pickBySchema,
} from "./json-pick";

const BASE_URL = "https://www.airbnb.com";
const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const PROPERTY_TYPE_IDS: Record<string, string> = {
  entire_home: "1",
  private_room: "2",
  shared_room: "3",
  hotel_room: "4",
};

const PHOTON_TYPE_PRIORITY: Record<string, number> = {
  country: 1,
  state: 2,
  county: 3,
  city: 4,
  district: 5,
  locality: 6,
  street: 7,
  house: 8,
  other: 9,
};

const SEARCH_RESULT_SCHEMA = {
  demandStayListing: {
    id: true,
    description: true,
    location: true,
  },
  badges: { text: true },
  structuredContent: {
    mapCategoryInfo: { body: true },
    mapSecondaryLine: { body: true },
    primaryLine: { body: true },
    secondaryLine: { body: true },
  },
  avgRatingA11yLabel: true,
  listingParamOverrides: true,
  structuredDisplayPrice: {
    primaryLine: { accessibilityLabel: true },
    secondaryLine: { accessibilityLabel: true },
    explanationData: {
      title: true,
      priceDetails: {
        items: {
          description: true,
          priceString: true,
        },
      },
    },
  },
} as const;

const DETAIL_SECTION_SCHEMA: Record<string, Record<string, unknown>> = {
  LOCATION_DEFAULT: {
    lat: true,
    lng: true,
    subtitle: true,
    title: true,
  },
  POLICIES_DEFAULT: {
    title: true,
    houseRulesSections: {
      title: true,
      items: { title: true },
    },
  },
  HIGHLIGHTS_DEFAULT: {
    highlights: { title: true },
  },
  DESCRIPTION_DEFAULT: {
    htmlDescription: { htmlText: true },
  },
  AMENITIES_DEFAULT: {
    title: true,
    seeAllAmenitiesGroups: {
      title: true,
      amenities: { title: true },
    },
  },
};

export class AirbnbLodgingProvider implements LodgingProvider {
  private robotsTxt: string | null = null;
  private robotsLoad: Promise<void> | null = null;

  constructor(private config: LodgingConfig) {}

  async search(query: LodgingSearchQuery): Promise<LodgingSearchResult> {
    const searchUrl = await this.buildSearchUrl(query);
    const path = searchUrl.pathname + searchUrl.search;
    await this.ensureRobotsTxt();
    if (
      !query.ignoreRobotsTxt &&
      !this.config.ignoreRobotsTxt &&
      !this.isPathAllowed(path)
    ) {
      throw new LodgingError(
        "lodging_robots_blocked",
        "Path disallowed by Airbnb robots.txt for this User-Agent",
      );
    }

    const html = await this.fetchHtml(searchUrl.toString());
    const scriptContent = extractDeferredStateJson(html);
    try {
      const clientData = JSON.parse(scriptContent) as unknown;
      const results = getPath(clientData, [
        "niobeClientData",
        "0",
        "1",
        "data",
        "presentation",
        "staysSearch",
        "results",
      ]);
      if (!results || typeof results !== "object") {
        throw new Error("staysSearch.results missing");
      }
      cleanObject(results as Record<string, unknown>);
      const rawResults = (results as { searchResults?: unknown[] }).searchResults;
      if (!Array.isArray(rawResults)) {
        throw new Error("searchResults is not an array");
      }

      const searchResults: LodgingListingSummary[] = rawResults.map((raw) => {
        const picked = flattenArraysInObject(
          pickBySchema(raw, SEARCH_RESULT_SCHEMA),
        ) as Record<string, unknown>;
        const encodedId = getPath(picked, ["demandStayListing", "id"]);
        const id = decodeListingId(
          typeof encodedId === "string" ? encodedId : "",
        );
        return {
          id,
          url: `${BASE_URL}/rooms/${id}`,
          data: picked,
        };
      });

      const paginationInfo =
        (results as { paginationInfo?: Record<string, unknown> })
          .paginationInfo ?? null;

      return {
        searchUrl: searchUrl.toString(),
        searchResults,
        paginationInfo,
      };
    } catch (err) {
      let parsedRaw: unknown = null;
      try {
        parsedRaw = JSON.parse(scriptContent);
      } catch {
        /* ignore */
      }
      const diagnosis = parsedRaw
        ? diagnoseJsonPath(parsedRaw, [
            "niobeClientData",
            "0",
            "1",
            "data",
            "presentation",
            "staysSearch",
            "results",
          ])
        : "Could not parse script content as JSON";
      console.error("[lodging] failed to parse Airbnb search", {
        diagnosis,
        error: err instanceof Error ? err.message : String(err),
        url: searchUrl.toString(),
      });
      throw new LodgingError(
        "lodging_parse_failed",
        "Failed to parse Airbnb search results; page structure may have changed",
      );
    }
  }

  async listingDetails(
    query: LodgingDetailQuery,
  ): Promise<LodgingListingDetail> {
    const listingUrl = this.buildListingUrl(query);
    const path = listingUrl.pathname + listingUrl.search;
    await this.ensureRobotsTxt();
    if (
      !query.ignoreRobotsTxt &&
      !this.config.ignoreRobotsTxt &&
      !this.isPathAllowed(path)
    ) {
      throw new LodgingError(
        "lodging_robots_blocked",
        "Path disallowed by Airbnb robots.txt for this User-Agent",
      );
    }

    const html = await this.fetchHtml(listingUrl.toString());
    const scriptContent = extractDeferredStateJson(html);
    try {
      const clientData = JSON.parse(scriptContent) as unknown;
      const sections = getPath(clientData, [
        "niobeClientData",
        "0",
        "1",
        "data",
        "presentation",
        "stayProductDetailPage",
        "sections",
        "sections",
      ]);
      if (!Array.isArray(sections)) {
        throw new Error("detail sections missing");
      }

      const details: Array<Record<string, unknown>> = [];
      for (const section of sections) {
        if (!section || typeof section !== "object") continue;
        const sectionId = (section as { sectionId?: string }).sectionId;
        if (!sectionId || !(sectionId in DETAIL_SECTION_SCHEMA)) continue;
        const body = (section as { section?: unknown }).section;
        if (body && typeof body === "object") {
          cleanObject(body as Record<string, unknown>);
        }
        details.push({
          id: sectionId,
          ...(flattenArraysInObject(
            pickBySchema(body, DETAIL_SECTION_SCHEMA[sectionId]!),
          ) as Record<string, unknown>),
        });
      }

      return {
        listingUrl: listingUrl.toString(),
        details,
      };
    } catch (err) {
      let parsedRaw: unknown = null;
      try {
        parsedRaw = JSON.parse(scriptContent);
      } catch {
        /* ignore */
      }
      const diagnosis = parsedRaw
        ? diagnoseJsonPath(parsedRaw, [
            "niobeClientData",
            "0",
            "1",
            "data",
            "presentation",
            "stayProductDetailPage",
            "sections",
            "sections",
          ])
        : "Could not parse script content as JSON";
      console.error("[lodging] failed to parse Airbnb listing", {
        diagnosis,
        id: query.id,
        error: err instanceof Error ? err.message : String(err),
      });
      throw new LodgingError(
        "lodging_parse_failed",
        "Failed to parse Airbnb listing details; page structure may have changed",
      );
    }
  }

  private async buildSearchUrl(query: LodgingSearchQuery): Promise<URL> {
    const slug = query.location
      .replace(/,\s*/g, "--")
      .replace(/\s+/g, "-");
    const searchUrl = new URL(
      `${BASE_URL}/s/${encodeURIComponent(slug)}/homes`,
    );

    if (query.placeId) {
      searchUrl.searchParams.set("place_id", query.placeId);
    }

    if (!query.placeId && !this.config.disableGeocoding) {
      const coords = await geocodeLocation(
        query.location,
        this.config.geocodeUserAgent,
      );
      if (coords) {
        searchUrl.searchParams.set("ne_lat", coords.ne_lat);
        searchUrl.searchParams.set("ne_lng", coords.ne_lng);
        searchUrl.searchParams.set("sw_lat", coords.sw_lat);
        searchUrl.searchParams.set("sw_lng", coords.sw_lng);
      }
    }

    if (query.checkin) searchUrl.searchParams.set("checkin", query.checkin);
    if (query.checkout) searchUrl.searchParams.set("checkout", query.checkout);

    const { adults, children, infants, pets } = query.guests;
    if (adults + children > 0) {
      searchUrl.searchParams.set("adults", String(adults));
      searchUrl.searchParams.set("children", String(children));
      searchUrl.searchParams.set("infants", String(infants));
      searchUrl.searchParams.set("pets", String(pets));
    }

    if (query.minPrice != null) {
      searchUrl.searchParams.set("price_min", String(query.minPrice));
    }
    if (query.maxPrice != null) {
      searchUrl.searchParams.set("price_max", String(query.maxPrice));
    }
    if (query.propertyType && PROPERTY_TYPE_IDS[query.propertyType]) {
      searchUrl.searchParams.append(
        "l2_property_type_ids[]",
        PROPERTY_TYPE_IDS[query.propertyType]!,
      );
    }
    if (query.cursor) searchUrl.searchParams.set("cursor", query.cursor);

    return searchUrl;
  }

  private buildListingUrl(query: LodgingDetailQuery): URL {
    const listingUrl = new URL(`${BASE_URL}/rooms/${query.id}`);
    if (query.checkin) listingUrl.searchParams.set("check_in", query.checkin);
    if (query.checkout) {
      listingUrl.searchParams.set("check_out", query.checkout);
    }
    const { adults, children, infants, pets } = query.guests;
    if (adults + children > 0) {
      listingUrl.searchParams.set("adults", String(adults));
      listingUrl.searchParams.set("children", String(children));
      listingUrl.searchParams.set("infants", String(infants));
      listingUrl.searchParams.set("pets", String(pets));
    }
    return listingUrl;
  }

  private async fetchHtml(url: string): Promise<string> {
    const controller = new AbortController();
    const timer = setTimeout(
      () => controller.abort(),
      this.config.timeoutMs,
    );
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": BROWSER_UA,
          "Accept-Language": "en-US,en;q=0.9",
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
          "Cache-Control": "no-cache",
        },
        signal: controller.signal,
      });
      if (!res.ok) {
        throw new LodgingError(
          "lodging_upstream",
          `Airbnb returned HTTP ${res.status}`,
        );
      }
      return await res.text();
    } catch (err) {
      if (err instanceof LodgingError) throw err;
      if (err instanceof Error && err.name === "AbortError") {
        throw new LodgingError(
          "lodging_timeout",
          "Airbnb request timed out",
        );
      }
      throw new LodgingError(
        "lodging_upstream",
        err instanceof Error ? err.message : "Airbnb request failed",
      );
    } finally {
      clearTimeout(timer);
    }
  }

  private async ensureRobotsTxt(): Promise<void> {
    if (this.config.ignoreRobotsTxt) return;
    if (this.robotsTxt !== null) return;
    if (!this.robotsLoad) {
      this.robotsLoad = (async () => {
        try {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 10_000);
          try {
            const res = await fetch(`${BASE_URL}/robots.txt`, {
              headers: { "User-Agent": BROWSER_UA },
              signal: controller.signal,
            });
            this.robotsTxt = res.ok ? await res.text() : "";
          } finally {
            clearTimeout(timer);
          }
        } catch {
          this.robotsTxt = "";
        }
      })();
    }
    await this.robotsLoad;
  }

  private isPathAllowed(path: string): boolean {
    if (!this.robotsTxt) return true;
    return isAllowedByRobots(this.robotsTxt, path, BROWSER_UA);
  }
}

/** Extract `#data-deferred-state-0` script body without an HTML parser. */
export function extractDeferredStateJson(html: string): string {
  const match = html.match(
    /<script[^>]*\bid=["']data-deferred-state-0["'][^>]*>([\s\S]*?)<\/script>/i,
  );
  if (!match?.[1]?.trim()) {
    throw new LodgingError(
      "lodging_parse_failed",
      "Could not find Airbnb data-deferred-state-0 script",
    );
  }
  return match[1].trim();
}

export function decodeListingId(encoded: string): string {
  if (!encoded) return "";
  try {
    const decoded = atob(encoded);
    const parts = decoded.split(":");
    return parts[1] ?? decoded;
  } catch {
    return encoded;
  }
}

function getPath(data: unknown, path: string[]): unknown {
  let current: unknown = data;
  for (const key of path) {
    if (current == null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

/**
 * Minimal robots.txt allow check for one User-Agent (no robots-parser dep).
 * Empty / unparsable files are treated as allow-all.
 */
export function isAllowedByRobots(
  robotsTxt: string,
  path: string,
  userAgent: string,
): boolean {
  const ua = userAgent.toLowerCase();
  type Group = { agents: string[]; allow: string[]; disallow: string[] };
  const groups: Group[] = [];
  let current: Group = { agents: [], allow: [], disallow: [] };

  const flush = () => {
    if (current.agents.length > 0) groups.push(current);
    current = { agents: [], allow: [], disallow: [] };
  };

  for (const raw of robotsTxt.split(/\r?\n/)) {
    const line = raw.replace(/#.*$/, "").trim();
    if (!line) continue;
    const colon = line.indexOf(":");
    if (colon < 0) continue;
    const key = line.slice(0, colon).trim().toLowerCase();
    const value = line.slice(colon + 1).trim();
    if (key === "user-agent") {
      if (current.allow.length > 0 || current.disallow.length > 0) flush();
      current.agents.push(value.toLowerCase());
      continue;
    }
    if (current.agents.length === 0) continue;
    if (key === "disallow") current.disallow.push(value);
    if (key === "allow") current.allow.push(value);
  }
  flush();

  const specific = groups.filter((g) =>
    g.agents.some((agent) => agent !== "*" && ua.includes(agent)),
  );
  const star = groups.filter((g) => g.agents.includes("*"));
  const applicable = specific.length > 0 ? specific : star;
  if (applicable.length === 0) return true;

  let bestAllow = -1;
  let bestDisallow = -1;
  for (const group of applicable) {
    for (const prefix of group.allow) {
      if (prefix === "" || path.startsWith(prefix)) {
        bestAllow = Math.max(bestAllow, prefix.length);
      }
    }
    for (const prefix of group.disallow) {
      if (prefix === "") continue;
      if (path.startsWith(prefix)) {
        bestDisallow = Math.max(bestDisallow, prefix.length);
      }
    }
  }
  if (bestDisallow < 0) return true;
  return bestAllow >= bestDisallow;
}

interface BoundingBox {
  ne_lat: string;
  ne_lng: string;
  sw_lat: string;
  sw_lng: string;
}

async function geocodeLocation(
  location: string,
  userAgent: string,
): Promise<BoundingBox | null> {
  let extent: number[] | null = null;

  try {
    const data = await fetchJsonWithTimeout<{
      features?: Array<{
        properties?: {
          type?: string;
          name?: string;
          extent?: number[];
        };
      }>;
    }>(
      `https://photon.komoot.io/api/?q=${encodeURIComponent(location)}&limit=5`,
      userAgent,
      5_000,
    );
    const feature = pickBestPhotonFeature(data?.features ?? []);
    if (feature?.properties?.extent?.length === 4) {
      extent = feature.properties.extent;
    }
  } catch {
    /* fall through to Nominatim */
  }

  if (!extent) {
    try {
      const nomResults = await fetchJsonWithTimeout<
        Array<{ boundingbox?: string[]; display_name?: string }>
      >(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(location)}&format=json&limit=1`,
        userAgent,
        5_000,
      );
      const bb = nomResults?.[0]?.boundingbox;
      if (bb?.length === 4) {
        extent = [
          parseFloat(bb[2]!),
          parseFloat(bb[1]!),
          parseFloat(bb[3]!),
          parseFloat(bb[0]!),
        ];
      }
    } catch {
      return null;
    }
  }

  if (!extent || extent.length !== 4) return null;

  const swLat = extent[3]!;
  const neLat = extent[1]!;
  const swLng = extent[0]!;
  const neLng = extent[2]!;
  const latPadding = Math.max((neLat - swLat) * 0.25, 0.1);
  const lngPadding = Math.max((neLng - swLng) * 0.25, 0.1);
  const clamp = (value: number, min: number, max: number) =>
    Math.min(Math.max(value, min), max);

  return {
    sw_lat: clamp(swLat - latPadding, -90, 90).toFixed(7),
    ne_lat: clamp(neLat + latPadding, -90, 90).toFixed(7),
    sw_lng: clamp(swLng - lngPadding, -180, 180).toFixed(7),
    ne_lng: clamp(neLng + lngPadding, -180, 180).toFixed(7),
  };
}

function pickBestPhotonFeature(
  features: Array<{ properties?: { type?: string; extent?: number[] } }>,
): (typeof features)[number] | null {
  if (features.length === 0) return null;
  return features.reduce((best, f) => {
    const bestPri =
      PHOTON_TYPE_PRIORITY[best.properties?.type ?? ""] ??
      PHOTON_TYPE_PRIORITY.other!;
    const fPri =
      PHOTON_TYPE_PRIORITY[f.properties?.type ?? ""] ??
      PHOTON_TYPE_PRIORITY.other!;
    return fPri < bestPri ? f : best;
  });
}

async function fetchJsonWithTimeout<T>(
  url: string,
  userAgent: string,
  timeoutMs: number,
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": userAgent,
        Accept: "application/json",
      },
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}
