import { describe, expect, it, vi } from "vitest";
import { DomainError } from "../src/domain/shared/errors";
import type {
  LodgingListingDetail,
  LodgingProvider,
  LodgingSearchResult,
} from "../src/domain/lodging";
import { LodgingService } from "../src/application/lodging/lodging-service";
import { loadConfig, type RawEnv } from "../src/infrastructure/config";
import {
  decodeListingId,
  extractDeferredStateJson,
  isAllowedByRobots,
} from "../src/infrastructure/lodging/airbnb-provider";
import { buildLodgingReadTools } from "../src/infrastructure/ai/agent-model.ai-sdk";

function searchResult(
  overrides: Partial<LodgingSearchResult> = {},
): LodgingSearchResult {
  return {
    searchUrl: "https://www.airbnb.com/s/Paris--France/homes",
    searchResults: [
      {
        id: "123",
        url: "https://www.airbnb.com/rooms/123",
        data: { avgRatingA11yLabel: "4.9 out of 5" },
      },
    ],
    paginationInfo: null,
    ...overrides,
  };
}

function detailResult(
  overrides: Partial<LodgingListingDetail> = {},
): LodgingListingDetail {
  return {
    listingUrl: "https://www.airbnb.com/rooms/123",
    details: [{ id: "AMENITIES_DEFAULT", title: "Amenities" }],
    ...overrides,
  };
}

function mockProvider(
  overrides: Partial<LodgingProvider> = {},
): LodgingProvider {
  return {
    search: vi.fn(async () => searchResult()),
    listingDetails: vi.fn(async () => detailResult()),
    ...overrides,
  };
}

const BASE_ENV: RawEnv = {
  DATABASE_PROVIDER: "postgres",
  DATABASE_URL: "postgres://example.test/opentrip",
  BETTER_AUTH_SECRET: "a-secure-test-secret-with-32-characters",
  BASE_URL: "https://api.example.test",
  STORAGE_BACKEND: "fs",
  STORAGE_ROOT: "/tmp/uploads",
};

describe("LodgingService", () => {
  it("rejects short locations", async () => {
    const service = new LodgingService(mockProvider());
    await expect(service.search({ location: "a" })).rejects.toBeInstanceOf(
      DomainError,
    );
  });

  it("rejects inverted dates", async () => {
    const service = new LodgingService(mockProvider());
    await expect(
      service.search({
        location: "Paris",
        checkin: "2026-08-10",
        checkout: "2026-08-01",
      }),
    ).rejects.toBeInstanceOf(DomainError);
  });

  it("passes normalized guests to the provider", async () => {
    const provider = mockProvider();
    const service = new LodgingService(provider);
    const result = await service.search({
      location: "Paris, France",
      adults: 2,
      children: 1,
    });
    expect(result.searchResults[0]?.id).toBe("123");
    expect(provider.search).toHaveBeenCalledWith(
      expect.objectContaining({
        location: "Paris, France",
        guests: { adults: 2, children: 1, infants: 0, pets: 0 },
      }),
    );
  });

  it("requires a listing id for details", async () => {
    const service = new LodgingService(mockProvider());
    await expect(service.listingDetails({ id: "  " })).rejects.toBeInstanceOf(
      DomainError,
    );
  });
});

describe("Airbnb HTML helpers", () => {
  it("extracts data-deferred-state-0 JSON", () => {
    const html =
      '<html><script id="data-deferred-state-0">{"ok":true}</script></html>';
    expect(extractDeferredStateJson(html)).toBe('{"ok":true}');
  });

  it("decodes StayListing base64 ids", () => {
    const encoded = btoa("StayListing:98765");
    expect(decodeListingId(encoded)).toBe("98765");
  });

  it("respects robots.txt disallow with longer allow winning", () => {
    const robots = `
User-agent: *
Disallow: /s/
Allow: /s/Paris
`;
    expect(isAllowedByRobots(robots, "/s/Tokyo/homes", "Mozilla/5.0")).toBe(
      false,
    );
    expect(isAllowedByRobots(robots, "/s/Paris/homes", "Mozilla/5.0")).toBe(
      true,
    );
  });
});

describe("lodging config", () => {
  it("parses lodging flags from env", () => {
    const config = loadConfig({
      ...BASE_ENV,
      LODGING_IGNORE_ROBOTS_TXT: "true",
      LODGING_DISABLE_GEOCODING: "1",
      LODGING_TIMEOUT_MS: "15000",
    });
    expect(config.lodging.ignoreRobotsTxt).toBe(true);
    expect(config.lodging.disableGeocoding).toBe(true);
    expect(config.lodging.timeoutMs).toBe(15_000);
  });
});

describe("buildLodgingReadTools", () => {
  it("exposes airbnbSearch and airbnbListingDetails", () => {
    const tools = buildLodgingReadTools(new LodgingService(mockProvider()));
    expect(Object.keys(tools).sort()).toEqual([
      "airbnbListingDetails",
      "airbnbSearch",
    ]);
  });
});
