/**
 * Place background for a stop: a photo, a short description, and a link out.
 *
 * Google Places would be the obvious source, but it needs a billed key and the
 * deployment runs `GEO_PROVIDER=osm` with no `GOOGLE_MAPS_API_KEY`. Wikipedia
 * and Wikimedia Commons cover the same ground for named places, are keyless,
 * and both send `Access-Control-Allow-Origin` when called with `origin=*`, so
 * the browser can hit them directly.
 */

/** Wikipedia only serves a handful of languages we ship; anything else reads en. */
const WIKI_LANGS = new Set(["en", "zh", "ja", "ko", "fr", "de", "es", "ms"]);

/** A named Wikipedia hit further than this from the stop is a namesake. */
const MAX_MATCH_KM = 12;

/** An article that only matches on position has to be genuinely adjacent. */
const MAX_NEARBY_KM = 2;

export interface PlacePhoto {
  url: string;
  /** Wikimedia requires attribution; shown under the strip. */
  credit: string;
  license: string;
  descriptionUrl: string;
}

export interface PlaceInsight {
  title: string;
  extract: string;
  articleUrl: string;
  heroUrl: string | null;
  photos: PlacePhoto[];
  /** False when the article was matched on position alone — label it "nearby"
   * rather than passing it off as the stop itself. */
  matchedByName: boolean;
}

interface WikiPage {
  pageid: number;
  title: string;
  extract?: string;
  fullurl?: string;
  thumbnail?: { source: string };
  original?: { source: string };
  coordinates?: { lat: number; lon: number }[];
}

interface CommonsPage {
  title: string;
  imageinfo?: {
    thumburl?: string;
    url?: string;
    descriptionurl?: string;
    extmetadata?: Record<string, { value?: string }>;
  }[];
}

function wikiLang(lang: string): string {
  const base = lang.split("-")[0]!.toLowerCase();
  return WIKI_LANGS.has(base) ? base : "en";
}

function distanceKm(
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Strip the HTML Commons puts in `extmetadata` values. */
function plainText(html: string | undefined): string {
  if (!html) return "";
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Trim an intro extract to a card-sized blurb without cutting mid-sentence. */
function shorten(extract: string, maxChars = 420): string {
  const clean = extract.replace(/\s+/g, " ").trim();
  if (clean.length <= maxChars) return clean;
  const cut = clean.slice(0, maxChars);
  const stop = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("。"));
  return `${stop > 120 ? cut.slice(0, stop + 1) : cut.trimEnd()}…`;
}

async function wikiQuery(
  lang: string,
  params: Record<string, string>,
  signal?: AbortSignal,
): Promise<WikiPage[]> {
  const url = new URL(`https://${lang}.wikipedia.org/w/api.php`);
  const search = {
    action: "query",
    format: "json",
    origin: "*",
    formatversion: "2",
    prop: "extracts|pageimages|coordinates|info",
    inprop: "url",
    exintro: "1",
    explaintext: "1",
    exlimit: "5",
    piprop: "thumbnail|original",
    pithumbsize: "800",
    ...params,
  };
  for (const [key, value] of Object.entries(search)) {
    url.searchParams.set(key, value);
  }
  const response = await fetch(url, { signal });
  if (!response.ok) return [];
  const data = (await response.json()) as { query?: { pages?: WikiPage[] } };
  return data.query?.pages ?? [];
}

/** Pick the article that is actually about this spot, not a namesake elsewhere. */
function bestPage(
  pages: WikiPage[],
  lat: number,
  lng: number,
  name: string,
): { page: WikiPage; matchedByName: boolean } | null {
  const wanted = name.trim().toLowerCase();
  const seen = new Set<number>();
  const scored = pages
    .filter((page) => {
      if (!page.extract?.trim() || seen.has(page.pageid)) return false;
      seen.add(page.pageid);
      return true;
    })
    .map((page) => {
      const coord = page.coordinates?.[0];
      const km = coord ? distanceKm(lat, lng, coord.lat, coord.lon) : null;
      const title = page.title.toLowerCase();
      const titleMatch =
        wanted && title === wanted
          ? 0
          : wanted && (title.includes(wanted) || wanted.includes(title))
            ? 1
            : 2;
      return { page, km, titleMatch };
    })
    // A named match may sit anywhere in the region; a position-only match has
    // to be next door, or it is just some other building down the road.
    .filter((row) =>
      row.titleMatch < 2
        ? row.km === null || row.km <= MAX_MATCH_KM
        : row.km !== null && row.km <= MAX_NEARBY_KM,
    )
    .sort((a, b) => a.titleMatch - b.titleMatch || (a.km ?? 99) - (b.km ?? 99));

  const best = scored[0];
  return best ? { page: best.page, matchedByName: best.titleMatch < 2 } : null;
}

async function commonsPhotos(
  lat: number,
  lng: number,
  signal?: AbortSignal,
): Promise<PlacePhoto[]> {
  const url = new URL("https://commons.wikimedia.org/w/api.php");
  const params = {
    action: "query",
    format: "json",
    origin: "*",
    formatversion: "2",
    generator: "geosearch",
    ggsnamespace: "6",
    ggscoord: `${lat}|${lng}`,
    ggsradius: "800",
    ggslimit: "12",
    prop: "imageinfo",
    iiprop: "url|extmetadata",
    iiurlwidth: "800",
  };
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  const response = await fetch(url, { signal });
  if (!response.ok) return [];
  const data = (await response.json()) as { query?: { pages?: CommonsPage[] } };
  const photos: PlacePhoto[] = [];
  for (const page of data.query?.pages ?? []) {
    const info = page.imageinfo?.[0];
    const src = info?.thumburl ?? info?.url;
    // Skip the SVG maps and diagrams Commons geotags alongside photographs.
    if (!src || /\.(svg|pdf|tif|ogv|webm)$/i.test(new URL(src).pathname)) {
      continue;
    }
    const meta = info?.extmetadata ?? {};
    photos.push({
      url: src,
      credit: plainText(meta.Artist?.value) || "Wikimedia Commons",
      license: plainText(meta.LicenseShortName?.value) || "",
      descriptionUrl: info?.descriptionurl ?? src,
    });
    if (photos.length === 8) break;
  }
  return photos;
}

/**
 * Look a stop up by name, falling back to whatever Wikipedia has near its
 * coordinates. Returns `null` when nothing plausible matches — an unnamed
 * "Lunch" stop should show no panel rather than a wrong one.
 */
export async function fetchPlaceInsight(
  name: string,
  lat: number,
  lng: number,
  lang = "en",
  signal?: AbortSignal,
): Promise<PlaceInsight | null> {
  const wiki = wikiLang(lang);
  const trimmed = name.trim();
  const located = Number.isFinite(lat) && Number.isFinite(lng);

  // Ask by name and by position, then score both pools together: a search hit
  // can be a namesake a continent away, and a geosearch hit can be the café
  // next door. Whichever wins, the caller is told which way it matched.
  const [byName, byPosition, photos] = await Promise.all([
    trimmed
      ? wikiQuery(
          wiki,
          {
            generator: "search",
            gsrsearch: trimmed,
            gsrlimit: "5",
            gsrnamespace: "0",
          },
          signal,
        )
      : Promise.resolve<WikiPage[]>([]),
    located
      ? wikiQuery(
          wiki,
          {
            generator: "geosearch",
            ggscoord: `${lat}|${lng}`,
            ggsradius: "1500",
            ggslimit: "5",
          },
          signal,
        )
      : Promise.resolve<WikiPage[]>([]),
    located ? commonsPhotos(lat, lng, signal) : Promise.resolve<PlacePhoto[]>([]),
  ]);

  const match = bestPage([...byName, ...byPosition], lat, lng, trimmed);
  if (!match && photos.length === 0) return null;

  const page = match?.page;
  const hero = page?.original?.source ?? page?.thumbnail?.source ?? null;
  return {
    title: page?.title ?? trimmed,
    extract: shorten(page?.extract ?? ""),
    articleUrl:
      page?.fullurl ??
      (page ? `https://${wiki}.wikipedia.org/?curid=${page.pageid}` : ""),
    heroUrl: hero,
    // The hero already leads the card; do not repeat it in the strip.
    photos: photos.filter((photo) => photo.url !== hero),
    matchedByName: match?.matchedByName ?? false,
  };
}
