import { DomainError } from "../../domain/shared/errors";
import type {
  LodgingGuestCounts,
  LodgingPropertyType,
  LodgingProvider,
} from "../../domain/lodging";
import {
  toListingDetailDto,
  toSearchResultDto,
  type LodgingListingDetailDto,
  type LodgingSearchResultDto,
} from "./lodging-data";

const YMD = /^\d{4}-\d{2}-\d{2}$/;
const PROPERTY_TYPES = new Set<LodgingPropertyType>([
  "entire_home",
  "private_room",
  "shared_room",
  "hotel_room",
]);

export class LodgingService {
  constructor(private provider: LodgingProvider) {}

  async search(input: {
    location: string;
    placeId?: string;
    checkin?: string;
    checkout?: string;
    adults?: number;
    children?: number;
    infants?: number;
    pets?: number;
    minPrice?: number;
    maxPrice?: number;
    cursor?: string;
    propertyType?: LodgingPropertyType;
    ignoreRobotsTxt?: boolean;
  }): Promise<LodgingSearchResultDto> {
    const location = input.location?.trim();
    if (!location || location.length < 2) {
      throw new DomainError(
        "invalid_location",
        "location must be at least 2 characters",
      );
    }
    assertOptionalYmd(input.checkin, "checkin");
    assertOptionalYmd(input.checkout, "checkout");
    if (input.checkin && input.checkout && input.checkin > input.checkout) {
      throw new DomainError(
        "invalid_dates",
        "checkin must be on or before checkout",
      );
    }
    if (input.propertyType && !PROPERTY_TYPES.has(input.propertyType)) {
      throw new DomainError("invalid_property_type", "Unknown propertyType");
    }
    assertOptionalNonNegative(input.minPrice, "minPrice");
    assertOptionalNonNegative(input.maxPrice, "maxPrice");
    if (
      input.minPrice != null &&
      input.maxPrice != null &&
      input.minPrice > input.maxPrice
    ) {
      throw new DomainError(
        "invalid_price_range",
        "minPrice must be <= maxPrice",
      );
    }

    const result = await this.provider.search({
      location,
      placeId: input.placeId?.trim() || undefined,
      checkin: input.checkin,
      checkout: input.checkout,
      guests: normalizeGuests(input),
      minPrice: input.minPrice,
      maxPrice: input.maxPrice,
      cursor: input.cursor?.trim() || undefined,
      propertyType: input.propertyType,
      ignoreRobotsTxt: input.ignoreRobotsTxt,
    });
    return toSearchResultDto(result);
  }

  async listingDetails(input: {
    id: string;
    checkin?: string;
    checkout?: string;
    adults?: number;
    children?: number;
    infants?: number;
    pets?: number;
    ignoreRobotsTxt?: boolean;
  }): Promise<LodgingListingDetailDto> {
    const id = input.id?.trim();
    if (!id) {
      throw new DomainError("invalid_listing_id", "id is required");
    }
    assertOptionalYmd(input.checkin, "checkin");
    assertOptionalYmd(input.checkout, "checkout");

    const detail = await this.provider.listingDetails({
      id,
      checkin: input.checkin,
      checkout: input.checkout,
      guests: normalizeGuests(input),
      ignoreRobotsTxt: input.ignoreRobotsTxt,
    });
    return toListingDetailDto(detail);
  }
}

function normalizeGuests(input: {
  adults?: number;
  children?: number;
  infants?: number;
  pets?: number;
}): LodgingGuestCounts {
  return {
    adults: clampGuest(input.adults, 1),
    children: clampGuest(input.children, 0),
    infants: clampGuest(input.infants, 0),
    pets: clampGuest(input.pets, 0),
  };
}

function clampGuest(value: number | undefined, fallback: number): number {
  if (value == null || Number.isNaN(value)) return fallback;
  const n = Math.floor(value);
  if (n < 0) {
    throw new DomainError("invalid_guests", "Guest counts must be >= 0");
  }
  if (n > 50) {
    throw new DomainError("invalid_guests", "Guest counts must be <= 50");
  }
  return n;
}

function assertOptionalYmd(value: string | undefined, name: string): void {
  if (value == null || value === "") return;
  if (!YMD.test(value)) {
    throw new DomainError("invalid_date", `${name} must be YYYY-MM-DD`);
  }
}

function assertOptionalNonNegative(
  value: number | undefined,
  name: string,
): void {
  if (value == null) return;
  if (Number.isNaN(value) || value < 0) {
    throw new DomainError("invalid_price", `${name} must be >= 0`);
  }
}
