import type { Database } from "@repo/db/client";
import type { AuditLogRow } from "@repo/db/schemas/audit-log";
import { auditLog } from "@repo/db/schemas/audit-log";
import type { SQL } from "drizzle-orm";
import { and, desc, eq, lt } from "drizzle-orm";

export type AuditReader = Pick<Database, "select">;

export const DEFAULT_PAGE_SIZE = 50;
export const MAX_PAGE_SIZE = 200;

export interface AuditFilter {
  /** Entries by this person (or by an admin acting as them: use `actorId`, not `actingAsId`). */
  actorId?: string;
  /** Only entries older than this one: the `next` of the previous page. */
  before?: string;
  /** How many to return. At most 200. */
  limit?: number;
  /** Entries of this organization. */
  organizationId?: string;
  /** Entries about this record. */
  target?: { id: string; type: string };
}

export interface AuditPage {
  entries: AuditLogRow[];
  /** Pass as `before` to get the next, older page. Null when there are no more. */
  next: string | null;
}

/**
 * Reads entries newest first, filtered by organization, record or person, a page at a time.
 * It refuses an unfiltered read: the log is for investigating something specific, and an
 * unfiltered read is always a mistake. Whether the caller is allowed to read is the API's
 * job (check their role in that organization first).
 *
 * Pages are keyed by id, not by offset, so a deep page costs the same as the first and a new
 * entry arriving while someone pages does not shift the pages. Ids are UUIDv7, so newest id
 * means newest entry.
 */
export const readAudit = async (
  reader: AuditReader,
  filter: AuditFilter
): Promise<AuditPage> => {
  const conditions: SQL[] = [];
  if (filter.organizationId) {
    conditions.push(eq(auditLog.organizationId, filter.organizationId));
  }
  if (filter.target) {
    conditions.push(
      eq(auditLog.targetType, filter.target.type),
      eq(auditLog.targetId, filter.target.id)
    );
  }
  if (filter.actorId) {
    conditions.push(eq(auditLog.actorId, filter.actorId));
  }
  if (conditions.length === 0) {
    throw new Error(
      "Filter the audit log by organization, target or actor: reading all of it is not allowed."
    );
  }
  if (filter.before) {
    conditions.push(lt(auditLog.id, filter.before));
  }

  const limit = Math.min(
    Math.max(Math.trunc(filter.limit ?? DEFAULT_PAGE_SIZE), 1),
    MAX_PAGE_SIZE
  );
  // One more than asked for, to learn whether another page exists.
  const rows = await reader
    .select()
    .from(auditLog)
    .where(and(...conditions))
    .orderBy(desc(auditLog.id))
    .limit(limit + 1);

  const entries = rows.slice(0, limit);
  return {
    entries,
    next: rows.length > limit ? (entries.at(-1)?.id ?? null) : null,
  };
};
