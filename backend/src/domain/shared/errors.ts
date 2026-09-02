/** Base class for domain rule violations. Mapped to HTTP 400 at the edge. */
export class DomainError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = "DomainError";
  }
}

export class NotFoundError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = "NotFoundError";
  }
}
