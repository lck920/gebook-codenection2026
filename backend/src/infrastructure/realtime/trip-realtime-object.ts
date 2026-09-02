import {
  createTripChange,
  type RealtimeConnectionIdentity,
  type TripChange,
} from "../../domain/realtime";
import {
  buildPresence,
  encodeRealtimeMessage,
  parseRealtimeClientMessage,
  type StoredRealtimeEvent,
} from "./protocol";
import { verifyRealtimeGrant } from "./realtime-grant";

const EVENT_LIMIT = 256;
const SEQUENCE_KEY = "meta:sequence";
const EVENT_PREFIX = "event:";
const SEEN_PREFIX = "seen:";

interface DurableStorage {
  get<T>(key: string): Promise<T | undefined>;
  put<T>(key: string, value: T): Promise<void>;
  delete(key: string): Promise<boolean>;
}

interface HibernatingSocket {
  readonly readyState: number;
  send(message: string): void;
  close(code?: number, reason?: string): void;
  serializeAttachment(value: unknown): void;
  deserializeAttachment(): unknown | null;
}

interface RealtimeObjectState {
  readonly storage: DurableStorage;
  acceptWebSocket(socket: HibernatingSocket, tags?: string[]): void;
  getWebSockets(tag?: string): HibernatingSocket[];
  setWebSocketAutoResponse(pair: unknown): void;
}

interface TripRealtimeEnv {
  REALTIME_GRANT_SECRET: string;
}

interface WebSocketPairShape {
  0: HibernatingSocket;
  1: HibernatingSocket;
}

interface WebSocketPairConstructor {
  new (): WebSocketPairShape;
}

interface AutoResponsePairConstructor {
  new (request: string, response: string): unknown;
}

/** Cloudflare Durable Object: one hibernating collaboration room per trip. */
export class TripRealtimeObject {
  constructor(
    private readonly ctx: RealtimeObjectState,
    private readonly env: TripRealtimeEnv,
  ) {
    const Pair = (globalThis as unknown as {
      WebSocketRequestResponsePair?: AutoResponsePairConstructor;
    }).WebSocketRequestResponsePair;
    if (Pair) this.ctx.setWebSocketAutoResponse(new Pair("ping", "pong"));
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname.endsWith("/connect")) return this.connect(request);
    if (url.pathname.endsWith("/publish")) return this.publish(request);
    return new Response("Not found", { status: 404 });
  }

  async webSocketMessage(
    socket: HibernatingSocket,
    message: string | ArrayBuffer,
  ): Promise<void> {
    if (typeof message !== "string") {
      socket.close(1003, "Text messages only");
      return;
    }
    const parsed = parseRealtimeClientMessage(message);
    if (!parsed) {
      socket.close(1008, "Unsupported message");
      return;
    }
    if (parsed.type === "resume") {
      await this.replay(socket, parsed.afterSequence);
    }
  }

  webSocketClose(
    socket: HibernatingSocket,
    code: number,
    reason: string,
  ): void {
    socket.close(code, reason);
    this.broadcastPresence();
  }

  webSocketError(socket: HibernatingSocket): void {
    socket.close(1011, "WebSocket error");
    this.broadcastPresence();
  }

  private async connect(request: Request): Promise<Response> {
    if (request.headers.get("Upgrade")?.toLowerCase() !== "websocket") {
      return new Response("Expected WebSocket", { status: 426 });
    }
    const authorization = request.headers.get("Authorization") ?? "";
    const token = authorization.startsWith("Bearer ")
      ? authorization.slice("Bearer ".length)
      : "";
    const grant = await verifyRealtimeGrant(
      token,
      this.env.REALTIME_GRANT_SECRET,
    );
    const tripId = new URL(request.url).searchParams.get("tripId");
    if (!grant || grant.tripId !== tripId) {
      return new Response("Invalid realtime grant", { status: 401 });
    }

    const Pair = (globalThis as unknown as {
      WebSocketPair: WebSocketPairConstructor;
    }).WebSocketPair;
    const pair = new Pair();
    const client = pair[0];
    const server = pair[1];
    const identity: RealtimeConnectionIdentity = {
      connectionId: grant.connectionId,
      tripId: grant.tripId,
      userId: grant.userId,
      name: grant.name,
      image: grant.image,
      role: grant.role,
    };
    server.serializeAttachment(identity);
    this.ctx.acceptWebSocket(server, [
      `trip:${identity.tripId}`,
      `user:${identity.userId}`,
    ]);

    const sequence = (await this.ctx.storage.get<number>(SEQUENCE_KEY)) ?? 0;
    server.send(
      encodeRealtimeMessage({
        type: "hello",
        connectionId: identity.connectionId,
        sequence,
        presence: this.currentPresence(),
      }),
    );
    this.broadcastPresence();

    return new Response(null, {
      status: 101,
      webSocket: client,
    } as ResponseInit & { webSocket: HibernatingSocket });
  }

  private async publish(request: Request): Promise<Response> {
    if (
      request.headers.get("X-OpenTrip-Realtime-Secret") !==
      this.env.REALTIME_GRANT_SECRET
    ) {
      return new Response("Forbidden", { status: 403 });
    }
    let raw: TripChange;
    try {
      raw = (await request.json()) as TripChange;
    } catch {
      return new Response("Invalid JSON", { status: 400 });
    }

    let change: TripChange;
    try {
      change = createTripChange(raw);
    } catch (error) {
      return new Response(
        error instanceof Error ? error.message : "Invalid trip change",
        { status: 400 },
      );
    }
    const tripId = new URL(request.url).searchParams.get("tripId");
    if (change.tripId !== tripId) {
      return new Response("Trip mismatch", { status: 400 });
    }
    if (await this.ctx.storage.get<number>(seenKey(change.eventId))) {
      return Response.json({ duplicate: true });
    }

    const sequence = ((await this.ctx.storage.get<number>(SEQUENCE_KEY)) ?? 0) + 1;
    const stored: StoredRealtimeEvent = { sequence, change };
    await this.ctx.storage.put(SEQUENCE_KEY, sequence);
    await this.ctx.storage.put(eventKey(sequence), stored);
    await this.ctx.storage.put(seenKey(change.eventId), sequence);
    await this.prune(sequence);

    const message = encodeRealtimeMessage({ type: "change", sequence, change });
    for (const socket of this.ctx.getWebSockets(`trip:${change.tripId}`)) {
      this.safeSend(socket, message);
    }
    return Response.json({ sequence });
  }

  private async replay(
    socket: HibernatingSocket,
    afterSequence: number,
  ): Promise<void> {
    const latest = (await this.ctx.storage.get<number>(SEQUENCE_KEY)) ?? 0;
    if (afterSequence >= latest) return;
    const oldest = Math.max(1, latest - EVENT_LIMIT + 1);
    if (afterSequence + 1 < oldest) {
      this.safeSend(
        socket,
        encodeRealtimeMessage({ type: "resync_required", sequence: latest }),
      );
      return;
    }
    for (let sequence = afterSequence + 1; sequence <= latest; sequence += 1) {
      const event = await this.ctx.storage.get<StoredRealtimeEvent>(
        eventKey(sequence),
      );
      if (!event) {
        this.safeSend(
          socket,
          encodeRealtimeMessage({ type: "resync_required", sequence: latest }),
        );
        return;
      }
      this.safeSend(
        socket,
        encodeRealtimeMessage({
          type: "change",
          sequence: event.sequence,
          change: event.change,
        }),
      );
    }
  }

  private async prune(latest: number): Promise<void> {
    const expiredSequence = latest - EVENT_LIMIT;
    if (expiredSequence < 1) return;
    const expired = await this.ctx.storage.get<StoredRealtimeEvent>(
      eventKey(expiredSequence),
    );
    await this.ctx.storage.delete(eventKey(expiredSequence));
    if (expired) await this.ctx.storage.delete(seenKey(expired.change.eventId));
  }

  private currentPresence() {
    const identities = this.ctx
      .getWebSockets()
      .map((socket) => socket.deserializeAttachment())
      .filter(isConnectionIdentity);
    return buildPresence(identities);
  }

  private broadcastPresence(): void {
    const message = encodeRealtimeMessage({
      type: "presence",
      members: this.currentPresence(),
    });
    for (const socket of this.ctx.getWebSockets()) this.safeSend(socket, message);
  }

  private safeSend(socket: HibernatingSocket, message: string): void {
    try {
      socket.send(message);
    } catch {
      // A closing socket disappears from getWebSockets; other peers continue.
    }
  }
}

function eventKey(sequence: number): string {
  return `${EVENT_PREFIX}${String(sequence).padStart(16, "0")}`;
}

function seenKey(eventId: string): string {
  return `${SEEN_PREFIX}${eventId}`;
}

function isConnectionIdentity(
  value: unknown,
): value is RealtimeConnectionIdentity {
  if (!value || typeof value !== "object") return false;
  const identity = value as Partial<RealtimeConnectionIdentity>;
  return (
    typeof identity.connectionId === "string" &&
    typeof identity.tripId === "string" &&
    typeof identity.userId === "string" &&
    typeof identity.name === "string" &&
    (identity.image === null || typeof identity.image === "string") &&
    (identity.role === "owner" ||
      identity.role === "editor" ||
      identity.role === "viewer")
  );
}

