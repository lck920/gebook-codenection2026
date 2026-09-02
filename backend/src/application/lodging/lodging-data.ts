import type {
  LodgingListingDetail,
  LodgingListingSummary,
  LodgingSearchResult,
} from "../../domain/lodging";

export interface LodgingListingSummaryDto {
  id: string;
  url: string;
  data: Record<string, unknown>;
}

export interface LodgingSearchResultDto {
  searchUrl: string;
  searchResults: LodgingListingSummaryDto[];
  paginationInfo: Record<string, unknown> | null;
}

export interface LodgingListingDetailDto {
  listingUrl: string;
  details: Array<Record<string, unknown>>;
}

export function toSearchResultDto(
  result: LodgingSearchResult,
): LodgingSearchResultDto {
  return {
    searchUrl: result.searchUrl,
    searchResults: result.searchResults.map(toListingSummaryDto),
    paginationInfo: result.paginationInfo,
  };
}

export function toListingDetailDto(
  detail: LodgingListingDetail,
): LodgingListingDetailDto {
  return {
    listingUrl: detail.listingUrl,
    details: detail.details,
  };
}

function toListingSummaryDto(
  listing: LodgingListingSummary,
): LodgingListingSummaryDto {
  return {
    id: listing.id,
    url: listing.url,
    data: listing.data,
  };
}
