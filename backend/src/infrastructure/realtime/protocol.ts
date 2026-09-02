import type {
  RealtimeConnectionIdentity,
  RealtimePresenceMember,
  TripChange,
} from "../../domain/realtime";

export type RealtimeServerMessage =
  | {
      type: "hello";
      connectionId: string;
      sequence: number;
      presence: RealtimePresenceMember[];
    }
  | { type: "change"; sequence: number; change: TripChange }
  | { type: "presence"; members: RealtimePresenceMember[] }
  | { type: "resync_required"; sequence: number };

export type RealtimeClientMessage =
  | { type: "resume"; afterSequence: number };

export interface StoredRealtimeEvent {
  sequence: number;
  change: TripChange;
}

export function parseRealtimeClientMessage(
  raw: string,
): RealtimeClientMessage | null {
  if (raw.length > 2_048) return null;
  try {
    const value = JSON.parse(raw) as { type?: unknown; afterSequence?: unknown };
    if (
      value.type === "resume" &&
      Number.isSafeInteger(value.afterSequence) &&
      Number(value.afterSequence) >= 0
    ) {
      return { type: "resume", afterSequence: Number(value.afterSequence) };
    }
  } catch {
    // Invalid client payloads are rejected by returning null.
  }
  return null;
}

export function buildPresence(
  identities: readonly RealtimeConnectionIdentity[],
): RealtimePresenceMember[] {
  const byUser = new Map<string, RealtimePresenceMember>();
  for (const identity of identities) {
    const current = byUser.get(identity.userId);
    if (current) {
      current.connectionCount += 1;
      continue;
    }
    byUser.set(identity.userId, {
      userId: identity.userId,
      name: identity.name,
      image: identity.image,
      role: identity.role,
      connectionCount: 1,
    });
  }
  return [...byUser.values()].sort(
    (a, b) => a.name.localeCompare(b.name) || a.userId.localeCompare(b.userId),
  );
}

export function encodeRealtimeMessage(message: RealtimeServerMessage): string {
  return JSON.stringify(message);
}

