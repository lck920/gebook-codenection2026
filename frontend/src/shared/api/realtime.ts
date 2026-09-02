declare const __WETRAVEL_BASE_URL__: string;

export type RealtimeConnectionStatus =
  | "connecting"
  | "connected"
  | "reconnecting"
  | "offline";

export type TripChangeScope =
  | "trip"
  | "days"
  | "stops"
  | "expenses"
  | "members"
  | "reservations"
  | "comments";

export interface TripChangeMessage {
  eventId: string;
  tripId: string;
  revision: number;
  actorId: string;
  occurredAt: string;
  scopes: TripChangeScope[];
}

export interface RealtimePresenceMember {
  userId: string;
  name: string;
  image: string | null;
  role: "owner" | "editor" | "viewer";
  connectionCount: number;
}

export type RealtimeServerMessage =
  | {
      type: "hello";
      connectionId: string;
      sequence: number;
      presence: RealtimePresenceMember[];
    }
  | { type: "change"; sequence: number; change: TripChangeMessage }
  | { type: "presence"; members: RealtimePresenceMember[] }
  | { type: "resync_required"; sequence: number };

export interface SocketLike {
  onopen: (() => void) | null;
  onmessage: ((event: { data: unknown }) => void) | null;
  onclose: (() => void) | null;
  onerror: (() => void) | null;
  send(data: string): void;
  close(code?: number, reason?: string): void;
}

export interface RealtimeClientDependencies {
  createSocket: (url: string) => SocketLike;
  schedule: (callback: () => void, delayMs: number) => number;
  cancelSchedule: (id: number) => void;
  isOnline: () => boolean;
  addOnlineListener: (listener: () => void) => () => void;
  realtimeUrl: (tripId: string) => string;
}

export interface TripRealtimeClientOptions {
  tripId: string;
  onStatus: (status: RealtimeConnectionStatus) => void;
  onPresence: (members: RealtimePresenceMember[]) => void;
  onChange: (change: TripChangeMessage) => void;
  onResync: () => void;
}

/** One resilient WebSocket per mounted planner. Protocol ordering is kept here
 * so page code only reacts to domain invalidations and presence. */
export class TripRealtimeClient {
  private socket: SocketLike | null = null;
  private reconnectTimer: number | null = null;
  private reconnectAttempt = 0;
  private stopped = true;
  private connectedOnce = false;
  private lastSequence = 0;
  private removeOnlineListener: (() => void) | null = null;

  constructor(
    private readonly options: TripRealtimeClientOptions,
    private readonly dependencies: RealtimeClientDependencies = browserDependencies(),
  ) {}

  start(): void {
    if (!this.stopped) return;
    this.stopped = false;
    this.removeOnlineListener = this.dependencies.addOnlineListener(() => {
      if (this.stopped || this.socket) return;
      this.reconnectAttempt = 0;
      this.connect();
    });
    this.connect();
  }

  stop(): void {
    this.stopped = true;
    this.removeOnlineListener?.();
    this.removeOnlineListener = null;
    if (this.reconnectTimer != null) {
      this.dependencies.cancelSchedule(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    const socket = this.socket;
    this.socket = null;
    socket?.close(1000, "Planner closed");
  }

  private connect(): void {
    if (this.stopped || this.socket) return;
    if (!this.dependencies.isOnline()) {
      this.options.onStatus("offline");
      return;
    }
    this.options.onStatus(this.connectedOnce ? "reconnecting" : "connecting");
    const socket = this.dependencies.createSocket(
      this.dependencies.realtimeUrl(this.options.tripId),
    );
    this.socket = socket;
    socket.onopen = () => {
      this.reconnectAttempt = 0;
      this.options.onStatus("connected");
    };
    socket.onmessage = (event) => this.receive(socket, event.data);
    socket.onerror = () => socket.close(1011, "Connection error");
    socket.onclose = () => {
      if (this.socket === socket) this.socket = null;
      if (!this.stopped) this.scheduleReconnect();
    };
  }

  private receive(socket: SocketLike, data: unknown): void {
    const message = parseRealtimeServerMessage(data);
    if (!message) return;
    switch (message.type) {
      case "hello":
        this.options.onPresence(message.presence);
        if (!this.connectedOnce) {
          this.connectedOnce = true;
          this.lastSequence = message.sequence;
          this.options.onResync();
        } else {
          socket.send(
            JSON.stringify({ type: "resume", afterSequence: this.lastSequence }),
          );
        }
        return;
      case "presence":
        this.options.onPresence(message.members);
        return;
      case "resync_required":
        this.lastSequence = message.sequence;
        this.options.onResync();
        return;
      case "change":
        if (message.sequence <= this.lastSequence) return;
        if (message.sequence !== this.lastSequence + 1) {
          this.lastSequence = message.sequence;
          this.options.onResync();
          return;
        }
        this.lastSequence = message.sequence;
        this.options.onChange(message.change);
    }
  }

  private scheduleReconnect(): void {
    if (!this.dependencies.isOnline()) {
      this.options.onStatus("offline");
      return;
    }
    this.options.onStatus("reconnecting");
    const delay = Math.min(1_000 * 2 ** this.reconnectAttempt, 15_000);
    this.reconnectAttempt += 1;
    this.reconnectTimer = this.dependencies.schedule(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }
}

export function parseRealtimeServerMessage(
  data: unknown,
): RealtimeServerMessage | null {
  if (typeof data !== "string" || data.length > 64 * 1024) return null;
  try {
    const value = JSON.parse(data) as RealtimeServerMessage;
    if (
      value.type === "hello" &&
      typeof value.connectionId === "string" &&
      validSequence(value.sequence) &&
      Array.isArray(value.presence)
    ) return value;
    if (value.type === "presence" && Array.isArray(value.members)) return value;
    if (value.type === "resync_required" && validSequence(value.sequence)) return value;
    if (
      value.type === "change" &&
      validSequence(value.sequence) &&
      validTripChange(value.change)
    ) return value;
  } catch {
    // Ignore malformed network data.
  }
  return null;
}

function validSequence(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 0;
}

function validTripChange(value: unknown): value is TripChangeMessage {
  if (!value || typeof value !== "object") return false;
  const change = value as Partial<TripChangeMessage>;
  return (
    typeof change.eventId === "string" &&
    typeof change.tripId === "string" &&
    validSequence(change.revision) &&
    typeof change.actorId === "string" &&
    typeof change.occurredAt === "string" &&
    Array.isArray(change.scopes)
  );
}

function realtimeUrl(tripId: string): string {
  const url = new URL(
    `/api/trips/${encodeURIComponent(tripId)}/realtime`,
    __WETRAVEL_BASE_URL__,
  );
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  return url.toString();
}

function browserDependencies(): RealtimeClientDependencies {
  return {
    createSocket: (url) => new WebSocket(url) as unknown as SocketLike,
    schedule: (callback, delay) => window.setTimeout(callback, delay),
    cancelSchedule: (id) => window.clearTimeout(id),
    isOnline: () => navigator.onLine,
    addOnlineListener: (listener) => {
      window.addEventListener("online", listener);
      return () => window.removeEventListener("online", listener);
    },
    realtimeUrl,
  };
}
