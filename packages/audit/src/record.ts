import type { Database } from "@repo/db/client";
import { auditLog } from "@repo/db/schemas/audit-log";
import { z } from "zod";

import type { ActionDetailsSchema, AuditCatalog } from "./actions";
import type { Actor } from "./actors";
import { actorColumns, actorSchema } from "./actors";
import { assertIdsOnly } from "./details";

/** What `record` needs to write: the database, or a transaction (so the entry commits with the change). */
export type AuditExecutor = Pick<Database, "insert">;

const MAX_REQUEST_ID_LENGTH = 128;

/** What every entry carries, whatever the action. */
const entryBaseSchema = z.object({
  actor: actorSchema,
  /** Null or left out for platform-level actions. */
  organizationId: z.uuid().nullish(),
  /** The id the API gave the request, so an entry can be matched to its logs. */
  requestId: z.string().min(1).max(MAX_REQUEST_ID_LENGTH).optional(),
  /** The record the action was about. Both parts, or leave it out. */
  target: z
    .object({ id: z.uuid(), type: z.string().regex(/^[a-z0-9_]+$/u) })
    .optional(),
});

/** An entry for one action of the catalog. The details are typed by that action's schema. */
export type AuditEntry<Catalog extends AuditCatalog> = {
  [Action in keyof Catalog & string]: {
    action: Action;
    actor: Actor;
    details: z.input<Catalog[Action]>;
    organizationId?: string | null;
    requestId?: string;
    target?: { id: string; type: string };
  };
}[keyof Catalog & string];

/**
 * Builds the function that writes audit entries for a catalog of actions. It checks the
 * entry (the action exists, the details match it and hold ids only), then inserts one row.
 *
 * Call it with the transaction of the change being audited, as the last write in it:
 *
 *   await db.transaction(async (tx) => {
 *     await voidSale(tx, saleId);
 *     await record(tx, { action: "till.void", actor, details: { sale_id: saleId, reason: "error" } });
 *   });
 */
export const createAuditor = <const Catalog extends AuditCatalog>({
  actions,
}: {
  actions: Catalog;
}) => {
  const record = async (
    executor: AuditExecutor,
    entry: AuditEntry<Catalog>
  ): Promise<{ id: string }> => {
    // The catalog is typed, but a caller from untyped code can pass any action name.
    const detailsSchema = (
      actions as Partial<Record<string, ActionDetailsSchema>>
    )[entry.action];
    if (!detailsSchema) {
      throw new Error(`"${entry.action}" is not in the audit catalog.`);
    }
    const base = entryBaseSchema.parse(entry);
    // Zod's messages for a wrong field name the field, not its value, so nothing leaks here.
    const details = detailsSchema.parse(entry.details);
    assertIdsOnly(details);

    const [row] = await executor
      .insert(auditLog)
      .values({
        ...actorColumns(base.actor),
        action: entry.action,
        details,
        organizationId: base.organizationId ?? null,
        requestId: base.requestId ?? null,
        targetId: base.target?.id ?? null,
        targetType: base.target?.type ?? null,
      })
      .returning({ id: auditLog.id });
    if (!row) {
      throw new Error("The audit entry was not saved.");
    }
    return row;
  };

  return { record };
};
