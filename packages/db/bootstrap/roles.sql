-- One-time, per-environment setup of the database roles (ADR 0005, amended by ADR 0022).
-- Run by an administrator as Supabase's `postgres` role, never by CI or the application.
-- Idempotent. Passwords and LOGIN are set separately from AWS Secrets Manager, never in this file.
--
-- Migrations also run as `postgres`. On Supabase only `postgres` can reference the `auth` schema:
-- it holds those privileges without GRANT OPTION, so a separate migration role cannot be given
-- them (verified against the local Supabase stack, `pnpm db:setup:local`).

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_runtime') THEN
    CREATE ROLE app_runtime NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_readonly') THEN
    CREATE ROLE app_readonly NOLOGIN;
  END IF;
END
$$;

-- Bound every runtime query so a slow statement cannot hold a pooled connection indefinitely.
ALTER ROLE app_runtime SET statement_timeout = '5s';
ALTER ROLE app_runtime SET idle_in_transaction_session_timeout = '10s';
