-- The audit log is append-only: Postgres refuses to change or remove a row, or to empty the
-- table, whoever asks (the API, a script, a person in psql). Hand-written because Drizzle does
-- not describe triggers. A superuser can still disable a trigger, so the API should connect as a
-- role that has only INSERT and SELECT on this table (see packages/audit/README.md).
CREATE FUNCTION audit_log_refuse_change() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
	-- restrict_violation (23001) says "this operation is not allowed" and is not used by anything else here.
	RAISE EXCEPTION 'audit_log is append-only: % is not allowed', TG_OP
		USING ERRCODE = 'restrict_violation';
END;
$$;
--> statement-breakpoint
CREATE TRIGGER audit_log_no_update_or_delete
	BEFORE UPDATE OR DELETE ON "audit_log"
	FOR EACH ROW EXECUTE FUNCTION audit_log_refuse_change();
--> statement-breakpoint
CREATE TRIGGER audit_log_no_truncate
	BEFORE TRUNCATE ON "audit_log"
	FOR EACH STATEMENT EXECUTE FUNCTION audit_log_refuse_change();
