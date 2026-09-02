import type { TripChange } from "./types";

/** Driven port implemented by the Cloudflare Durable Object publisher. */
export interface TripChangePublisher {
  publish(change: TripChange): Promise<void>;
}

