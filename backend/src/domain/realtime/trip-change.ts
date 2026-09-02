import {
  TRIP_CHANGE_SCOPES,
  type TripChange,
  type TripChangeScope,
} from "./types";

const VALID_SCOPES = new Set<TripChangeScope>(TRIP_CHANGE_SCOPES);

export interface CreateTripChangeInput {
  eventId: string;
  tripId: string;
  revision: number;
  actorId: string;
  occurredAt: string;
  scopes: readonly TripChangeScope[];
}

/** Construct a canonical event at the domain boundary. */
export function createTripChange(input: CreateTripChangeInput): TripChange {
  const eventId = required(input.eventId, "event id");
  const tripId = required(input.tripId, "trip id");
  const actorId = required(input.actorId, "actor id");
  if (!Number.isSafeInteger(input.revision) || input.revision < 0) {
    throw new Error("Trip change revision must be a non-negative safe integer");
  }
  const occurredAt = required(input.occurredAt, "occurred at");
  if (Number.isNaN(Date.parse(occurredAt))) {
    throw new Error("Trip change occurredAt must be an ISO date-time");
  }

  const scopes = normalizeTripChangeScopes(input.scopes);
  if (scopes.length === 0) {
    throw new Error("Trip change must include at least one scope");
  }

  return {
    eventId,
    tripId,
    revision: input.revision,
    actorId,
    occurredAt: new Date(occurredAt).toISOString(),
    scopes,
  };
}

/** Deduplicate scopes and order them by the stable protocol catalog. */
export function normalizeTripChangeScopes(
  scopes: readonly TripChangeScope[],
): TripChangeScope[] {
  const selected = new Set<TripChangeScope>();
  for (const scope of scopes) {
    if (!VALID_SCOPES.has(scope)) {
      throw new Error(`Unsupported trip change scope: ${String(scope)}`);
    }
    selected.add(scope);
  }
  return TRIP_CHANGE_SCOPES.filter((scope) => selected.has(scope));
}

function required(value: string, label: string): string {
  const normalized = value.trim();
  if (!normalized) throw new Error(`Trip change ${label} is required`);
  return normalized;
}

