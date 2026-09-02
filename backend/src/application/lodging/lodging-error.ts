/** Upstream / config failures for lodging (not DomainError). */
export class LodgingError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "LodgingError";
  }
}
