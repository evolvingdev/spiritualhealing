-- Access control for the `app` schema and the session-revocation check (ADR 0004, 0005, 0006).
-- Runs as app_migrator, which therefore owns these objects. Roles come from bootstrap/roles.sql.

-- Defence in depth: RLS on with no policies denies all direct access by Supabase's
-- `anon` and `authenticated` roles. Authorization happens in the API.
ALTER TABLE "app"."user_roles" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
REVOKE ALL ON SCHEMA "app" FROM PUBLIC;
--> statement-breakpoint
GRANT USAGE ON SCHEMA "app" TO app_runtime;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON "app"."user_roles" TO app_runtime;
--> statement-breakpoint
-- app_runtime is not the table owner, so it needs an explicit policy to see rows under RLS.
CREATE POLICY "user_roles_app_runtime_all" ON "app"."user_roles"
  AS PERMISSIVE FOR ALL TO app_runtime USING (true) WITH CHECK (true);
--> statement-breakpoint
-- Whether a Supabase session still exists and has not expired. SECURITY DEFINER so app_runtime
-- can call it without any access to the `auth` schema; it returns a boolean and nothing else.
CREATE FUNCTION "app"."is_session_active"(p_session_id uuid, p_user_id uuid)
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM auth.sessions AS s
    WHERE s.id = p_session_id
      AND s.user_id = p_user_id
      AND (s.not_after IS NULL OR s.not_after > now())
  );
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION "app"."is_session_active"(uuid, uuid) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION "app"."is_session_active"(uuid, uuid) TO app_runtime;
