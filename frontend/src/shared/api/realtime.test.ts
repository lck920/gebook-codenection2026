import { describe, expect, it, vi } from "vitest";
import {
  TripRealtimeClient,
  parseRealtimeServerMessage,
  type RealtimeClientDependencies,
  type SocketLike,
} from "./realtime";

class FakeSocket implements SocketLike {
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: unknown }) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;
  readonly sent: string[] = [];
  readonly closed: Array<{ code?: number; reason?: string }> = [];

  send(data: string): void {
    this.sent.push(data);
  }

  close(code?: number, reason?: string): void {
    this.closed.push({ code, reason });
  }

  receive(value: unknown): void {
    this.onmessage?.({ data: JSON.stringify(value) });
  }
}

function fixture() {
  const sockets: FakeSocket[] = [];
  const scheduled: Array<() => void> = [];
  let online = true;
  let onlineListener: (() => void) | null = null;
  const dependencies: RealtimeClientDependencies = {
    createSocket: vi.fn(() => {
      const socket = new FakeSocket();
      sockets.push(socket);
      return socket;
    }),
    schedule: vi.fn((callback) => {
      scheduled.push(callback);
      return scheduled.length;
    }),
    cancelSchedule: vi.fn(),
    isOnline: () => online,
    addOnlineListener: (listener) => {
      onlineListener = listener;
      return () => {
        onlineListener = null;
      };
    },
    realtimeUrl: (tripId) => `wss://api.example.test/api/trips/${tripId}/realtime`,
  };
  return {
    dependencies,
    sockets,
    scheduled,
    setOnline(value: boolean) {
      online = value;
      if (value) onlineListener?.();
    },
  };
}

describe("TripRealtimeClient", () => {
  it("resyncs the initial GET/WebSocket race and applies ordered changes", () => {
    const f = fixture();
    const onResync = vi.fn();
    const onChange = vi.fn();
    const client = new TripRealtimeClient(
      {
        tripId: "trip-1",
        onStatus: vi.fn(),
        onPresence: vi.fn(),
        onChange,
        onResync,
      },
      f.dependencies,
    );
    client.start();
    const socket = f.sockets[0]!;
    socket.onopen?.();
    socket.receive({
      type: "hello",
      connectionId: "c1",
      sequence: 4,
      presence: [],
    });
    expect(onResync).toHaveBeenCalledOnce();

    socket.receive({
      type: "change",
      sequence: 5,
      change: {
        eventId: "e5",
        tripId: "trip-1",
        revision: 5,
        actorId: "u2",
        occurredAt: "2026-07-12T00:00:00.000Z",
        scopes: ["stops"],
      },
    });
    expect(onChange).toHaveBeenCalledOnce();
  });

  it("requests replay after reconnect and resyncs sequence gaps", () => {
    const f = fixture();
    const onResync = vi.fn();
    const client = new TripRealtimeClient(
      {
        tripId: "trip-1",
        onStatus: vi.fn(),
        onPresence: vi.fn(),
        onChange: vi.fn(),
        onResync,
      },
      f.dependencies,
    );
    client.start();
    f.sockets[0]!.receive({
      type: "hello",
      connectionId: "c1",
      sequence: 2,
      presence: [],
    });
    f.sockets[0]!.onclose?.();
    f.scheduled[0]!();
    const second = f.sockets[1]!;
    second.receive({
      type: "hello",
      connectionId: "c2",
      sequence: 4,
      presence: [],
    });
    expect(JSON.parse(second.sent[0]!)).toEqual({
      type: "resume",
      afterSequence: 2,
    });

    second.receive({
      type: "change",
      sequence: 4,
      change: {
        eventId: "e4",
        tripId: "trip-1",
        revision: 4,
        actorId: "u2",
        occurredAt: "2026-07-12T00:00:00.000Z",
        scopes: ["trip"],
      },
    });
    expect(onResync).toHaveBeenCalledTimes(2);
  });

  it("waits quietly offline and connects when online returns", () => {
    const f = fixture();
    f.setOnline(false);
    const onStatus = vi.fn();
    const client = new TripRealtimeClient(
      {
        tripId: "trip-1",
        onStatus,
        onPresence: vi.fn(),
        onChange: vi.fn(),
        onResync: vi.fn(),
      },
      f.dependencies,
    );
    client.start();
    expect(onStatus).toHaveBeenLastCalledWith("offline");
    expect(f.sockets).toHaveLength(0);
    f.setOnline(true);
    expect(f.sockets).toHaveLength(1);
  });
});

describe("parseRealtimeServerMessage", () => {
  it("rejects malformed and oversized server payloads", () => {
    expect(parseRealtimeServerMessage("not-json")).toBeNull();
    expect(parseRealtimeServerMessage("x".repeat(64 * 1024 + 1))).toBeNull();
    expect(parseRealtimeServerMessage('{"type":"change"}')).toBeNull();
  });
});
