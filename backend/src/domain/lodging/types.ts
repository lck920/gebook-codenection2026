/** Lodging search / listing types (vendor-neutral; Airbnb is the first adapter). */

export type LodgingPropertyType =
  | "entire_home"
  | "private_room"
  | "shared_room"
  | "hotel_room";

export interface LodgingGuestCounts {
  adults: number;
  children: number;
  infants: number;
  pets: number;
}

export interface LodgingSearchQuery {
  location: string;
  placeId?: string;
  checkin?: string;
  checkout?: string;
  guests: LodgingGuestCounts;
  minPrice?: number;
  maxPrice?: number;
  cursor?: string;
  propertyType?: LodgingPropertyType;
  /** Per-request override; provider may also have a global ignore flag. */
  ignoreRobotsTxt?: boolean;
}

export interface LodgingListingSummary {
  id: string;
  url: string;
  /** Vendor-shaped fields kept compact for the model. */
  data: Record<string, unknown>;
}

export interface LodgingSearchResult {
  searchUrl: string;
  searchResults: LodgingListingSummary[];
  paginationInfo: Record<string, unknown> | null;
}

export interface LodgingDetailQuery {
  id: string;
  checkin?: string;
  checkout?: string;
  guests: LodgingGuestCounts;
  ignoreRobotsTxt?: boolean;
}

export interface LodgingListingDetail {
  listingUrl: string;
  details: Array<Record<string, unknown>>;
}
