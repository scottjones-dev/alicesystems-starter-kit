CREATE TABLE "audit_log" (
	"acting_as_id" uuid,
	"action" text NOT NULL,
	"actor_id" uuid,
	"actor_type" text NOT NULL,
	"details" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"organization_id" uuid,
	"request_id" text,
	"target_id" uuid,
	"target_type" text,
	CONSTRAINT "audit_log_actor_type_valid" CHECK ("audit_log"."actor_type" in ('user', 'system', 'admin')),
	CONSTRAINT "audit_log_action_valid" CHECK ("audit_log"."action" ~ '^[a-z0-9_]+([.][a-z0-9_]+)+$'),
	CONSTRAINT "audit_log_actor_id_valid" CHECK (("audit_log"."actor_type" = 'system') = ("audit_log"."actor_id" is null)),
	CONSTRAINT "audit_log_acting_as_valid" CHECK ("audit_log"."acting_as_id" is null or "audit_log"."actor_type" = 'admin'),
	CONSTRAINT "audit_log_target_valid" CHECK (("audit_log"."target_type" is null) = ("audit_log"."target_id" is null))
);
--> statement-breakpoint
CREATE INDEX "audit_log_organization_idx" ON "audit_log" USING btree ("organization_id","id" DESC NULLS FIRST);--> statement-breakpoint
CREATE INDEX "audit_log_target_idx" ON "audit_log" USING btree ("target_type","target_id","id" DESC NULLS FIRST);--> statement-breakpoint
CREATE INDEX "audit_log_actor_idx" ON "audit_log" USING btree ("actor_id","id" DESC NULLS FIRST);