export const TRIP_CHANGE_SCOPES = [
  "trip",
  "days",
  "stops",
  "expenses",
  "members",
  "reservations",
  "comments",
] as const;

export type TripChangeScope = (typeof TRIP_CHANGE_SCOPES)[number];

/** Durable business-state invalidation emitted only after a committed write. */
export interface TripChange {
  eventId: string;
  tripId: string;
  revision: number;
  actorId: string;
  occurredAt: string;
  scopes: TripChangeScope[];
}

/** Identity attached to a hibernating WebSocket. Never contains credentials. */
export interface RealtimeConnectionIdentity {
  connectionId: string;
  tripId: string;
  userId: string;
  name: string;
  image: string | null;
  role: "owner" | "editor" | "viewer";
}

export interface RealtimePresenceMember {
  userId: string;
  name: string;
  image: string | null;
  role: RealtimeConnectionIdentity["role"];
  connectionCount: number;
}

