import { describe, expect, it } from "vitest";
import type { TripChange } from "../src/domain/realtime";
import { TripRealtimeObject } from "../src/infrastructure/realtime";

class MemoryStorage {
  readonly values = new Map<string, unknown>();

  async get<T>(key: string): Promise<T | undefined> {
    return this.values.get(key) as T | undefined;
  }

  async put<T>(key: string, value: T): Promise<void> {
    this.values.set(key, value);
  }

  async delete(key: string): Promise<boolean> {
    return this.values.delete(key);
  }
}

class FakeSocket {
  readonly readyState = 1;
  readonly sent: string[] = [];
  attachment: unknown = null;
  closed: { code?: number; reason?: string } | null = null;

  send(message: string) {
    this.sent.push(message);
  }

  close(code?: number, reason?: string) {
    this.closed = { code, reason };
  }

  serializeAttachment(value: unknown) {
    this.attachment = value;
  }

  deserializeAttachment() {
    return this.attachment;
  }
}

function state(sockets: FakeSocket[] = []) {
  const storage = new MemoryStorage();
  return {
    storage,
    acceptWebSocket(socket: FakeSocket) {
      sockets.push(socket);
    },
    getWebSockets(tag?: string) {
      if (!tag) return sockets;
      const value = tag.replace(/^trip:/, "");
      return sockets.filter(
        (socket) =>
          (socket.attachment as { tripId?: string } | null)?.tripId === value,
      );
    },
    setWebSocketAutoResponse() {},
  };
}

const secret = "test-realtime-secret-at-least-32-bytes-long";

function change(eventId: string, revision = 1): TripChange {
  return {
    eventId,
    tripId: "trip-1",
    revision,
    actorId: "user-1",
    occurredAt: "2026-07-12T00:00:00.000Z",
    scopes: ["stops"],
  };
}

function publishRequest(body: TripChange, authorized = true) {
  return new Request("https://internal/publish?tripId=trip-1", {
    method: "POST",
    headers: authorized
      ? { "X-OpenTrip-Realtime-Secret": secret }
      : undefined,
    body: JSON.stringify(body),
  });
}

describe("TripRealtimeObject", () => {
  it("persists, sequences, broadcasts, and deduplicates committed changes", async () => {
    const socket = new FakeSocket();
    socket.attachment = {
      connectionId: "c1",
      tripId: "trip-1",
      userId: "user-2",
      name: "Ben",
      image: null,
      role: "editor",
    };
    const ctx = state([socket]);
    const object = new TripRealtimeObject(ctx as never, {
      REALTIME_GRANT_SECRET: secret,
    });

    const first = await object.fetch(publishRequest(change("event-1")));
    expect(first.status).toBe(200);
    await expect(first.json()).resolves.toEqual({ sequence: 1 });
    expect(JSON.parse(socket.sent[0]!)).toMatchObject({
      type: "change",
      sequence: 1,
      change: { eventId: "event-1" },
    });

    const duplicate = await object.fetch(publishRequest(change("event-1")));
    await expect(duplicate.json()).resolves.toEqual({ duplicate: true });
    expect(socket.sent).toHaveLength(1);
  });

  it("rejects public publication", async () => {
    const object = new TripRealtimeObject(state() as never, {
      REALTIME_GRANT_SECRET: secret,
    });
    const response = await object.fetch(publishRequest(change("event-1"), false));
    expect(response.status).toBe(403);
  });

  it("replays stored events after hibernation without constructor memory", async () => {
    const ctx = state();
    const firstObject = new TripRealtimeObject(ctx as never, {
      REALTIME_GRANT_SECRET: secret,
    });
    await firstObject.fetch(publishRequest(change("event-1", 1)));
    await firstObject.fetch(publishRequest(change("event-2", 2)));

    const resumedObject = new TripRealtimeObject(ctx as never, {
      REALTIME_GRANT_SECRET: secret,
    });
    const socket = new FakeSocket();
    await resumedObject.webSocketMessage(
      socket as never,
      JSON.stringify({ type: "resume", afterSequence: 0 }),
    );

    expect(socket.sent.map((message) => JSON.parse(message))).toEqual([
      expect.objectContaining({ type: "change", sequence: 1 }),
      expect.objectContaining({ type: "change", sequence: 2 }),
    ]);
  });

  it("requires a full resync when retained history has a gap", async () => {
    const ctx = state();
    await ctx.storage.put("meta:sequence", 2);
    const object = new TripRealtimeObject(ctx as never, {
      REALTIME_GRANT_SECRET: secret,
    });
    const socket = new FakeSocket();

    await object.webSocketMessage(
      socket as never,
      JSON.stringify({ type: "resume", afterSequence: 0 }),
    );

    expect(JSON.parse(socket.sent[0]!)).toEqual({
      type: "resync_required",
      sequence: 2,
    });
  });

  it("closes binary and unsupported client messages", async () => {
    const object = new TripRealtimeObject(state() as never, {
      REALTIME_GRANT_SECRET: secret,
    });
    const binary = new FakeSocket();
    await object.webSocketMessage(binary as never, new ArrayBuffer(1));
    expect(binary.closed?.code).toBe(1003);

    const unsupported = new FakeSocket();
    await object.webSocketMessage(unsupported as never, '{"type":"publish"}');
    expect(unsupported.closed?.code).toBe(1008);
  });
});
