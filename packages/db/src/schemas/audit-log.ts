import { sql } from "drizzle-orm";
import {
  check,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { oneOf } from "../checks";
import { id } from "../columns";

/*
 * The audit log: who did what, to what, and when. It is append-only: a trigger (see the
 * `audit_log_append_only` migration) makes Postgres refuse any UPDATE, DELETE or TRUNCATE.
 * The behaviour (the catalog of actions, the writer, the reader) is in @repo/audit.
 */

export const AUDIT_ACTOR_TYPES = ["user", "system", "admin"] as const;

/** `till.void`, `admin.impersonation_started`: lowercase words joined by `_`, then `.`. */
// `[.]` rather than an escaped dot: drizzle-kit drops the backslash when it writes the migration SQL.
const ACTION_FORMAT = "^[a-z0-9_]+([.][a-z0-9_]+)+$";

export const auditLog = pgTable(
  "audit_log",
  {
    /** Set when an admin acts as another user: the user they are acting as. */
    actingAsId: uuid("acting_as_id"),
    action: text("action").notNull(),
    actorId: uuid("actor_id"),
    actorType: text("actor_type").notNull(),
    /** Small JSON of ids and codes. Never names, notes or free text. */
    details: jsonb("details")
      .$type<Record<string, boolean | number | string | null>>()
      .notNull()
      .default({}),
    id: id(),
    occurredAt: timestamp("occurred_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    /** Null for platform-level actions. A foreign key is added when auth creates organizations. */
    organizationId: uuid("organization_id"),
    requestId: text("request_id"),
    targetId: uuid("target_id"),
    targetType: text("target_type"),
  },
  (table) => [
    oneOf("audit_log_actor_type_valid", table.actorType, AUDIT_ACTOR_TYPES),
    check(
      "audit_log_action_valid",
      sql`${table.action} ~ ${sql.raw(`'${ACTION_FORMAT}'`)}`
    ),
    // The system has no id; a user or an admin always has one.
    check(
      "audit_log_actor_id_valid",
      sql`(${table.actorType} = 'system') = (${table.actorId} is null)`
    ),
    // Only an admin acts as someone else.
    check(
      "audit_log_acting_as_valid",
      sql`${table.actingAsId} is null or ${table.actorType} = 'admin'`
    ),
    // A target has both a type and an id, or neither.
    check(
      "audit_log_target_valid",
      sql`(${table.targetType} is null) = (${table.targetId} is null)`
    ),
    // Read newest first, one organization, record or person at a time. Ids are UUIDv7, so
    // ordering by id is ordering by time, and it is a unique key to page with.
    index("audit_log_organization_idx").on(
      table.organizationId,
      table.id.desc().nullsFirst()
    ),
    index("audit_log_target_idx").on(
      table.targetType,
      table.targetId,
      table.id.desc().nullsFirst()
    ),
    index("audit_log_actor_idx").on(
      table.actorId,
      table.id.desc().nullsFirst()
    ),
  ]
);

export type AuditLogRow = typeof auditLog.$inferSelect;
export type NewAuditLogRow = typeof auditLog.$inferInsert;
