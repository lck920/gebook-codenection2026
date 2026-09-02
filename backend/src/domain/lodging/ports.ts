import type {
  LodgingDetailQuery,
  LodgingListingDetail,
  LodgingSearchQuery,
  LodgingSearchResult,
} from "./types";

export type {
  LodgingPropertyType,
  LodgingGuestCounts,
  LodgingSearchQuery,
  LodgingListingSummary,
  LodgingSearchResult,
  LodgingDetailQuery,
  LodgingListingDetail,
} from "./types";

/** Driven port: search vacation rentals and fetch listing details. */
export interface LodgingProvider {
  search(query: LodgingSearchQuery): Promise<LodgingSearchResult>;
  listingDetails(query: LodgingDetailQuery): Promise<LodgingListingDetail>;
}
