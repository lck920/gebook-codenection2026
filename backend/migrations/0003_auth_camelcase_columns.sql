-- Align existing Better Auth tables with the direct pg/Kysely adapter, which
-- uses camelCase column names. This is idempotent so fresh databases created
-- from 0001 are unaffected, while local DBs created by the earlier snake_case
-- migration are repaired.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user' AND column_name = 'email_verified') THEN
    ALTER TABLE "user" RENAME COLUMN email_verified TO "emailVerified";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user' AND column_name = 'created_at') THEN
    ALTER TABLE "user" RENAME COLUMN created_at TO "createdAt";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user' AND column_name = 'updated_at') THEN
    ALTER TABLE "user" RENAME COLUMN updated_at TO "updatedAt";
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'session' AND column_name = 'expires_at') THEN
    ALTER TABLE "session" RENAME COLUMN expires_at TO "expiresAt";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'session' AND column_name = 'created_at') THEN
    ALTER TABLE "session" RENAME COLUMN created_at TO "createdAt";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'session' AND column_name = 'updated_at') THEN
    ALTER TABLE "session" RENAME COLUMN updated_at TO "updatedAt";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'session' AND column_name = 'ip_address') THEN
    ALTER TABLE "session" RENAME COLUMN ip_address TO "ipAddress";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'session' AND column_name = 'user_agent') THEN
    ALTER TABLE "session" RENAME COLUMN user_agent TO "userAgent";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'session' AND column_name = 'user_id') THEN
    ALTER TABLE "session" RENAME COLUMN user_id TO "userId";
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'account' AND column_name = 'account_id') THEN
    ALTER TABLE "account" RENAME COLUMN account_id TO "accountId";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'account' AND column_name = 'provider_id') THEN
    ALTER TABLE "account" RENAME COLUMN provider_id TO "providerId";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'account' AND column_name = 'user_id') THEN
    ALTER TABLE "account" RENAME COLUMN user_id TO "userId";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'account' AND column_name = 'access_token') THEN
    ALTER TABLE "account" RENAME COLUMN access_token TO "accessToken";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'account' AND column_name = 'refresh_token') THEN
    ALTER TABLE "account" RENAME COLUMN refresh_token TO "refreshToken";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'account' AND column_name = 'id_token') THEN
    ALTER TABLE "account" RENAME COLUMN id_token TO "idToken";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'account' AND column_name = 'access_token_expires_at') THEN
    ALTER TABLE "account" RENAME COLUMN access_token_expires_at TO "accessTokenExpiresAt";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'account' AND column_name = 'refresh_token_expires_at') THEN
    ALTER TABLE "account" RENAME COLUMN refresh_token_expires_at TO "refreshTokenExpiresAt";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'account' AND column_name = 'created_at') THEN
    ALTER TABLE "account" RENAME COLUMN created_at TO "createdAt";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'account' AND column_name = 'updated_at') THEN
    ALTER TABLE "account" RENAME COLUMN updated_at TO "updatedAt";
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'verification' AND column_name = 'expires_at') THEN
    ALTER TABLE "verification" RENAME COLUMN expires_at TO "expiresAt";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'verification' AND column_name = 'created_at') THEN
    ALTER TABLE "verification" RENAME COLUMN created_at TO "createdAt";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'verification' AND column_name = 'updated_at') THEN
    ALTER TABLE "verification" RENAME COLUMN updated_at TO "updatedAt";
  END IF;
END $$;
