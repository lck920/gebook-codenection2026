import { describe, expect, it } from "vitest";
import type { RealtimeConnectionIdentity } from "../src/domain/realtime";
import {
  buildPresence,
  parseRealtimeClientMessage,
  signRealtimeGrant,
  verifyRealtimeGrant,
} from "../src/infrastructure/realtime";

const secret = "test-realtime-secret-at-least-32-bytes-long";

describe("realtime grant", () => {
  const identity: RealtimeConnectionIdentity = {
    connectionId: "connection-1",
    tripId: "trip-1",
    userId: "user-1",
    name: "Ada",
    image: null,
    role: "owner",
  };

  it("signs and verifies a short-lived connection identity", async () => {
    const token = await signRealtimeGrant(identity, secret, 1_000, 30_000);
    await expect(verifyRealtimeGrant(token, secret, 20_000)).resolves.toEqual({
      ...identity,
      expiresAt: 31_000,
    });
  });

  it("rejects tampering and expiry", async () => {
    const token = await signRealtimeGrant(identity, secret, 1_000, 30_000);
    await expect(
      verifyRealtimeGrant(`${token.slice(0, -1)}x`, secret, 2_000),
    ).resolves.toBeNull();
    await expect(verifyRealtimeGrant(token, secret, 31_001)).resolves.toBeNull();
  });
});

describe("realtime protocol", () => {
  it("collapses multiple tabs into one stable presence member", () => {
    const base: RealtimeConnectionIdentity = {
      connectionId: "c1",
      tripId: "t1",
      userId: "u1",
      name: "Ada",
      image: null,
      role: "editor",
    };
    expect(
      buildPresence([
        base,
        { ...base, connectionId: "c2" },
        { ...base, connectionId: "c3", userId: "u2", name: "Ben" },
      ]),
    ).toEqual([
      expect.objectContaining({ userId: "u1", connectionCount: 2 }),
      expect.objectContaining({ userId: "u2", connectionCount: 1 }),
    ]);
  });

  it("accepts only bounded resume messages", () => {
    expect(
      parseRealtimeClientMessage('{"type":"resume","afterSequence":12}'),
    ).toEqual({ type: "resume", afterSequence: 12 });
    expect(parseRealtimeClientMessage('{"type":"publish"}')).toBeNull();
    expect(
      parseRealtimeClientMessage(
        JSON.stringify({ type: "resume", afterSequence: -1 }),
      ),
    ).toBeNull();
    expect(parseRealtimeClientMessage("x".repeat(2_049))).toBeNull();
  });
});
