import { z } from "zod";

import type { AuditDetails } from "./details";

/*
 * The catalog of things that can be audited, and what each one records. A platform lists its
 * own actions beside its own code and passes them to `createAuditor`:
 *
 *   const actions = defineAuditActions({
 *     ...baseActions,
 *     "till.void": z.strictObject({ sale_id: z.uuid(), reason: z.enum(["error", "customer"]) }),
 *   });
 *
 * Every action is `area.what_happened` in lowercase, which the database also checks.
 */

/** The schema of one action's details. `strictObject` rejects any field not listed. */
export type ActionDetailsSchema = z.ZodType<AuditDetails, AuditDetails>;

export type AuditCatalog = Record<`${string}.${string}`, ActionDetailsSchema>;

/** Returns the catalog unchanged; its only job is to check the shape and keep the exact keys. */
export const defineAuditActions = <const Catalog extends AuditCatalog>(
  catalog: Catalog
): Catalog => catalog;

/** Why an admin is acting as a user. A code, not a sentence: the ticket has the story. */
const IMPERSONATION_REASONS = [
  "security_review",
  "support_request",
  "other",
] as const;

/** The actions every platform has. The target of both is the user being acted as. */
export const baseActions = defineAuditActions({
  "admin.impersonation_ended": z.strictObject({}),
  "admin.impersonation_started": z.strictObject({
    reason: z.enum(IMPERSONATION_REASONS),
  }),
});
