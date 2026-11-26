-- TEST ONLY. Run as a superuser. A minimal stand-in for the parts of Supabase this repo depends on:
-- the `auth` tables (names and types mirror Supabase's; keep them in sync) and Supabase's
-- non-superuser `postgres` role with the same privileges it has on hosted projects, so the
-- bootstrap and migrations are tested under the real privilege model (ADR 0022).
CREATE SCHEMA auth;

CREATE TYPE auth.aal_level AS ENUM ('aal1', 'aal2', 'aal3');

CREATE TABLE auth.users (
  id uuid PRIMARY KEY,
  email character varying(255),
  is_sso_user boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE auth.sessions (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz,
  aal auth.aal_level,
  not_after timestamptz
);

CREATE TYPE auth.factor_status AS ENUM ('unverified', 'verified');

CREATE TABLE auth.mfa_factors (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  status auth.factor_status NOT NULL
);

-- Like Supabase: `postgres` may use the auth tables but may not pass that access on.
CREATE ROLE postgres CREATEROLE NOLOGIN;
DO $$
BEGIN
  EXECUTE format('GRANT CREATE ON DATABASE %I TO postgres', current_database());
END
$$;
GRANT USAGE ON SCHEMA auth TO postgres;
GRANT SELECT, REFERENCES ON auth.users, auth.sessions, auth.mfa_factors TO postgres;
