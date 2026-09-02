import type { RealtimeConnectionIdentity } from "../../domain/realtime";

export interface RealtimeConnectionGrant extends RealtimeConnectionIdentity {
  expiresAt: number;
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export async function signRealtimeGrant(
  identity: RealtimeConnectionIdentity,
  secret: string,
  now = Date.now(),
  ttlMs = 30_000,
): Promise<string> {
  assertSecret(secret);
  const payload: RealtimeConnectionGrant = {
    ...identity,
    expiresAt: now + ttlMs,
  };
  const encoded = toBase64Url(encoder.encode(JSON.stringify(payload)));
  const signature = await hmac(encoded, secret);
  return `${encoded}.${toBase64Url(signature)}`;
}

export async function verifyRealtimeGrant(
  token: string,
  secret: string,
  now = Date.now(),
): Promise<RealtimeConnectionGrant | null> {
  assertSecret(secret);
  const [encoded, signature, extra] = token.split(".");
  if (!encoded || !signature || extra) return null;
  let supplied: Uint8Array;
  try {
    supplied = fromBase64Url(signature);
  } catch {
    return null;
  }
  const key = await importHmacKey(secret, ["verify"]);
  const valid = await crypto.subtle.verify(
    "HMAC",
    key,
    supplied,
    encoder.encode(encoded),
  );
  if (!valid) return null;

  try {
    const parsed = JSON.parse(decoder.decode(fromBase64Url(encoded))) as Partial<RealtimeConnectionGrant>;
    if (!isGrant(parsed) || parsed.expiresAt <= now) return null;
    return parsed;
  } catch {
    return null;
  }
}

async function hmac(value: string, secret: string): Promise<ArrayBuffer> {
  const key = await importHmacKey(secret, ["sign"]);
  return crypto.subtle.sign("HMAC", key, encoder.encode(value));
}

async function importHmacKey(
  secret: string,
  usages: Array<"sign" | "verify">,
) {
  return await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    usages,
  );
}

function assertSecret(secret: string): void {
  if (encoder.encode(secret).byteLength < 32) {
    throw new Error("Realtime grant secret must be at least 32 bytes");
  }
}

function isGrant(value: Partial<RealtimeConnectionGrant>): value is RealtimeConnectionGrant {
  return (
    typeof value.connectionId === "string" && value.connectionId.length > 0 &&
    typeof value.tripId === "string" && value.tripId.length > 0 &&
    typeof value.userId === "string" && value.userId.length > 0 &&
    typeof value.name === "string" && value.name.length > 0 &&
    (value.image === null || typeof value.image === "string") &&
    (value.role === "owner" || value.role === "editor" || value.role === "viewer") &&
    typeof value.expiresAt === "number" && Number.isFinite(value.expiresAt)
  );
}

function toBase64Url(value: Uint8Array | ArrayBuffer): string {
  const bytes = value instanceof Uint8Array ? value : new Uint8Array(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

function fromBase64Url(value: string): Uint8Array {
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}
