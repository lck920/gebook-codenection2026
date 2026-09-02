-- Better Auth core schema (PostgreSQL). Regenerate with `npx @better-auth/cli
-- generate` if auth options/plugins change; add a new migration rather than
-- editing this file once applied.

CREATE TABLE IF NOT EXISTS "user" (
  id             text PRIMARY KEY,
  name           text NOT NULL,
  email          text NOT NULL UNIQUE,
  "emailVerified" boolean NOT NULL DEFAULT false,
  image          text,
  "createdAt"     timestamptz NOT NULL DEFAULT now(),
  "updatedAt"     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "session" (
  id         text PRIMARY KEY,
  "expiresAt" timestamptz NOT NULL,
  token      text NOT NULL UNIQUE,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  "ipAddress" text,
  "userAgent" text,
  "userId"    text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS session_user_id_idx ON "session"("userId");

CREATE TABLE IF NOT EXISTS "account" (
  id                       text PRIMARY KEY,
  "accountId"              text NOT NULL,
  "providerId"             text NOT NULL,
  "userId"                 text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  "accessToken"            text,
  "refreshToken"           text,
  "idToken"                text,
  "accessTokenExpiresAt"   timestamptz,
  "refreshTokenExpiresAt"  timestamptz,
  scope                    text,
  password                 text,
  "createdAt"              timestamptz NOT NULL DEFAULT now(),
  "updatedAt"              timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS account_user_id_idx ON "account"("userId");

CREATE TABLE IF NOT EXISTS "verification" (
  id         text PRIMARY KEY,
  identifier text NOT NULL,
  value      text NOT NULL,
  "expiresAt" timestamptz NOT NULL,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS verification_identifier_idx ON "verification"(identifier);
