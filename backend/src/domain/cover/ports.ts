/** Resolves a landscape cover image URL for a destination query. */
export interface CoverImageProvider {
  searchLandscape(query: string): Promise<string | null>;
}
