/** Error surfaces the app can render. `offline` has no HTTP status of its own
 *  but shares the same presentation. */
export type ErrorVariant = "404" | "500" | "403" | "503" | "offline";

/** Slug of alt text under the `error:photos` i18n namespace. Kept as a literal
 *  union so `t(\`photos.${slug}\`)` stays type-checked. */
export type ErrorPhotoKey =
  | "map-flatlay"
  | "world-map-pen"
  | "map-topdown"
  | "airport-silhouette"
  | "mountain-haze"
  | "waterfall-hiker"
  | "ridge-cairn"
  | "desk-globe"
  | "lake-backpacker"
  | "gate-wait"
  | "dock-lake";

/** A stable Unsplash CDN photo plus the i18n key used for accessible alt text.
 *  The id is the path segment of `images.unsplash.com/<id>`. */
export interface ErrorPhoto {
  id: string;
  descriptionKey: ErrorPhotoKey;
}

/** Actions an error surface can offer. Each maps to a concrete destination so
 *  no button is a dead end: `home` -> trips root, `signIn` -> sign-in,
 *  `retry` -> reload (or a caller-supplied reset). */
export type ErrorAction = "home" | "retry" | "signIn";

export interface ErrorVariantConfig {
  /** Filled, high-emphasis action. */
  primaryAction: ErrorAction;
  /** Optional low-emphasis follow-up action. */
  secondaryAction: ErrorAction | null;
  /** Travel imagery pool; one photo is chosen at random per mount. */
  photos: ErrorPhoto[];
}

export const errorVariants: Record<ErrorVariant, ErrorVariantConfig> = {
  "404": {
    primaryAction: "home",
    secondaryAction: null,
    photos: [
      { id: "photo-1488646953014-85cb44e25828", descriptionKey: "map-flatlay" },
      { id: "photo-1499591934245-40b55745b905", descriptionKey: "world-map-pen" },
      { id: "photo-1524850011238-e3d235c7d4c9", descriptionKey: "map-topdown" },
    ],
  },
  "500": {
    primaryAction: "retry",
    secondaryAction: "home",
    photos: [
      { id: "photo-1504150558240-0b4fd8946624", descriptionKey: "airport-silhouette" },
      { id: "photo-1469474968028-56623f02e42e", descriptionKey: "mountain-haze" },
    ],
  },
  "403": {
    primaryAction: "signIn",
    secondaryAction: "home",
    photos: [
      { id: "photo-1517760444937-f6397edcbbcd", descriptionKey: "waterfall-hiker" },
      { id: "photo-1526772662000-3f88f10405ff", descriptionKey: "ridge-cairn" },
    ],
  },
  "503": {
    primaryAction: "retry",
    secondaryAction: null,
    photos: [
      { id: "photo-1521295121783-8a321d551ad2", descriptionKey: "desk-globe" },
      { id: "photo-1503220317375-aaad61436b1b", descriptionKey: "lake-backpacker" },
    ],
  },
  offline: {
    primaryAction: "retry",
    secondaryAction: null,
    photos: [
      { id: "photo-1530521954074-e64f6810b32d", descriptionKey: "gate-wait" },
      { id: "photo-1508672019048-805c876b67e2", descriptionKey: "dock-lake" },
    ],
  },
};

/** Picks a random photo from a variant's pool. */
export function pickErrorPhoto(photos: ErrorPhoto[]): ErrorPhoto {
  return photos[Math.floor(Math.random() * photos.length)] ?? photos[0]!;
}
