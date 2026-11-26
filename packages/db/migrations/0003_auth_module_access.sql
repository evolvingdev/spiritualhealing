-- Access control for the auth module tables, and the narrow functions the API uses to read
-- Supabase's `auth` schema (ADR 0004, 0005, 0022). Runs as app_migrator, which owns these objects.

-- Defence in depth, as for user_roles: RLS on, with policies only for app_runtime.
ALTER TABLE "app"."policy_acceptances" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "app"."session_activity" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "app"."audit_events" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

-- Consent records are append-only: insert and read, never update or delete (rows go only with the
-- identity, through the cascade).
GRANT SELECT, INSERT ON "app"."policy_acceptances" TO app_runtime;
--> statement-breakpoint
CREATE POLICY "policy_acceptances_app_runtime_select" ON "app"."policy_acceptances"
  AS PERMISSIVE FOR SELECT TO app_runtime USING (true);
--> statement-breakpoint
CREATE POLICY "policy_acceptances_app_runtime_insert" ON "app"."policy_acceptances"
  AS PERMISSIVE FOR INSERT TO app_runtime WITH CHECK (true);
--> statement-breakpoint

-- Upserted at most once a minute per session (ON CONFLICT DO UPDATE needs SELECT as well).
GRANT SELECT, INSERT, UPDATE ON "app"."session_activity" TO app_runtime;
--> statement-breakpoint
CREATE POLICY "session_activity_app_runtime_all" ON "app"."session_activity"
  AS PERMISSIVE FOR ALL TO app_runtime USING (true) WITH CHECK (true);
--> statement-breakpoint

-- The audit trail is write-only for the application: it cannot read, change or delete events.
GRANT INSERT ON "app"."audit_events" TO app_runtime;
--> statement-breakpoint
CREATE POLICY "audit_events_app_runtime_insert" ON "app"."audit_events"
  AS PERMISSIVE FOR INSERT TO app_runtime WITH CHECK (true);
--> statement-breakpoint

-- Replaced by app.get_session_timeline, which also returns what the idle and absolute timeouts
-- need. Dropping it in the same release is safe only because no environment runs the old API yet
-- (ADR 0022); later changes to these functions follow expand/contract.
DROP FUNCTION "app"."is_session_active"(uuid, uuid);
--> statement-breakpoint

-- When an active Supabase session started, when the API last saw it, and whether the user has a
-- verified authenticator (which makes MFA required for them, whatever their role). No row means
-- the session does not exist, belongs to someone else, or has passed Supabase's `not_after`.
CREATE FUNCTION "app"."get_session_timeline"(p_session_id uuid, p_user_id uuid)
  RETURNS TABLE (
    started_at timestamptz,
    last_activity_at timestamptz,
    has_verified_mfa_factor boolean
  )
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = ''
AS $$
  SELECT
    s.created_at,
    a.last_activity_at,
    EXISTS (
      SELECT 1 FROM auth.mfa_factors AS f
      WHERE f.user_id = s.user_id AND f.status = 'verified'
    )
  FROM auth.sessions AS s
  LEFT JOIN app.session_activity AS a ON a.session_id = s.id
  WHERE s.id = p_session_id
    AND s.user_id = p_user_id
    AND (s.not_after IS NULL OR s.not_after > now());
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION "app"."get_session_timeline"(uuid, uuid) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION "app"."get_session_timeline"(uuid, uuid) TO app_runtime;
--> statement-breakpoint

-- Admin lookup of a user by their (already normalised, lowercase) email. Returns the ID only, so
-- the runtime role never reads auth.users. Matches the unique index users_email_partial_key.
CREATE FUNCTION "app"."find_user_id_by_email"(p_email text)
  RETURNS uuid
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = ''
AS $$
  SELECT u.id
  FROM auth.users AS u
  WHERE u.email = p_email
    AND u.is_sso_user = false
    AND u.deleted_at IS NULL;
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION "app"."find_user_id_by_email"(text) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION "app"."find_user_id_by_email"(text) TO app_runtime;
