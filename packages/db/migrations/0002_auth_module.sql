CREATE TABLE "app"."audit_events" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "app"."audit_events_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"action" text NOT NULL,
	"actor_user_id" uuid,
	"target_user_id" uuid,
	"correlation_id" uuid NOT NULL,
	"details" jsonb DEFAULT '{}'::jsonb NOT NULL,
	CONSTRAINT "audit_events_action_check" CHECK (action in ('account.onboarding_completed', 'account.password_changed', 'account.email_change_requested', 'account.mfa_factor_removed', 'admin.user_looked_up', 'admin.role_granted', 'admin.role_revoked'))
);
--> statement-breakpoint
CREATE TABLE "app"."policy_acceptances" (
	"user_id" uuid NOT NULL,
	"policy" text NOT NULL,
	"version" text NOT NULL,
	"accepted_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "policy_acceptances_user_id_policy_version_pk" PRIMARY KEY("user_id","policy","version"),
	CONSTRAINT "policy_acceptances_policy_check" CHECK ("app"."policy_acceptances"."policy" in ('terms_of_service', 'privacy_notice', 'adult_attestation')),
	CONSTRAINT "policy_acceptances_version_check" CHECK ("app"."policy_acceptances"."version" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$')
);
--> statement-breakpoint
CREATE TABLE "app"."session_activity" (
	"session_id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_activity_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "app"."audit_events" ADD CONSTRAINT "audit_events_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "auth"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."audit_events" ADD CONSTRAINT "audit_events_target_user_id_users_id_fk" FOREIGN KEY ("target_user_id") REFERENCES "auth"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."policy_acceptances" ADD CONSTRAINT "policy_acceptances_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."session_activity" ADD CONSTRAINT "session_activity_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "auth"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_events_target_user_id_occurred_at_idx" ON "app"."audit_events" USING btree ("target_user_id","occurred_at");--> statement-breakpoint
CREATE INDEX "audit_events_actor_user_id_occurred_at_idx" ON "app"."audit_events" USING btree ("actor_user_id","occurred_at");