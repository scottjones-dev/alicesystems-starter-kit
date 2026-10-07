import { describe, expect, it } from "vitest";
import { z } from "zod";

import { baseActions, defineAuditActions } from "./actions";
import type { AuditExecutor } from "./record";
import { createAuditor } from "./record";

const ORG_ID = "0190a8e2-7c3b-7d2e-9a1f-1b2c3d4e5f60";
const USER_ID = "0190a8e2-7c3b-7d2e-9a1f-1b2c3d4e5f61";
const SALE_ID = "0190a8e2-7c3b-7d2e-9a1f-1b2c3d4e5f62";

const NOT_IN_CATALOG = /not in the audit catalog/u;
const FREE_TEXT = /free text/u;
const NOT_SAVED = /not saved/u;

const actions = defineAuditActions({
  ...baseActions,
  "till.void": z.strictObject({
    reason: z.enum(["customer", "error"]),
    sale_id: z.uuid(),
  }),
});

/** A stand-in for the database that keeps what would have been inserted. */
const fakeExecutor = () => {
  const inserted: Record<string, unknown>[] = [];
  const executor = {
    insert: () => ({
      values: (values: Record<string, unknown>) => {
        inserted.push(values);
        return { returning: () => Promise.resolve([{ id: "new-id" }]) };
      },
    }),
  } as unknown as AuditExecutor;
  return { executor, inserted };
};

const { record } = createAuditor({ actions });

describe("record", () => {
  it("writes one row with the actor, target, organization and details", async () => {
    const { executor, inserted } = fakeExecutor();

    const result = await record(executor, {
      action: "till.void",
      actor: { id: USER_ID, type: "user" },
      details: { reason: "error", sale_id: SALE_ID },
      organizationId: ORG_ID,
      requestId: "req-1",
      target: { id: SALE_ID, type: "sale" },
    });

    expect(result).toStrictEqual({ id: "new-id" });
    expect(inserted).toStrictEqual([
      {
        actingAsId: null,
        action: "till.void",
        actorId: USER_ID,
        actorType: "user",
        details: { reason: "error", sale_id: SALE_ID },
        organizationId: ORG_ID,
        requestId: "req-1",
        targetId: SALE_ID,
        targetType: "sale",
      },
    ]);
  });

  it("leaves out what does not apply: a platform-level action by the system", async () => {
    const { executor, inserted } = fakeExecutor();

    await record(executor, {
      action: "admin.impersonation_ended",
      actor: { type: "system" },
      details: {},
    });

    expect(inserted[0]).toMatchObject({
      actorId: null,
      actorType: "system",
      organizationId: null,
      requestId: null,
      targetId: null,
      targetType: null,
    });
  });

  it("writes who an admin was acting as", async () => {
    const { executor, inserted } = fakeExecutor();

    await record(executor, {
      action: "admin.impersonation_started",
      actor: { actingAsId: USER_ID, id: ORG_ID, type: "admin" },
      details: { reason: "support_request" },
      target: { id: USER_ID, type: "user" },
    });

    expect(inserted[0]).toMatchObject({
      actingAsId: USER_ID,
      actorType: "admin",
      targetType: "user",
    });
  });

  it("refuses details that do not match the action, and writes nothing", async () => {
    const { executor, inserted } = fakeExecutor();
    const base = {
      action: "till.void",
      actor: { id: USER_ID, type: "user" },
    } as const;

    await expect(
      record(executor, {
        ...base,
        // @ts-expect-error `sale_id` is missing.
        details: { reason: "error" },
      })
    ).rejects.toThrow();
    await expect(
      record(executor, {
        ...base,
        // @ts-expect-error `note` is not a field of this action.
        details: { note: "x", reason: "error", sale_id: SALE_ID },
      })
    ).rejects.toThrow();
    await expect(
      record(executor, {
        ...base,
        // @ts-expect-error `reason` must be one of the listed codes.
        details: { reason: "boredom", sale_id: SALE_ID },
      })
    ).rejects.toThrow();
    expect(inserted).toHaveLength(0);
  });

  it("refuses an action that is not in the catalog", async () => {
    const { executor, inserted } = fakeExecutor();

    await expect(
      record(executor, {
        // @ts-expect-error not an action of this catalog.
        action: "till.open_drawer",
        actor: { type: "system" },
        details: {},
      })
    ).rejects.toThrow(NOT_IN_CATALOG);
    expect(inserted).toHaveLength(0);
  });

  it("refuses an actor, organization or target that is malformed", async () => {
    const { executor, inserted } = fakeExecutor();
    const entry = {
      action: "admin.impersonation_ended",
      actor: { type: "system" },
      details: {},
    } as const;

    await expect(
      record(executor, { ...entry, organizationId: "org-1" })
    ).rejects.toThrow();
    await expect(
      record(executor, { ...entry, target: { id: "nope", type: "sale" } })
    ).rejects.toThrow();
    await expect(
      record(executor, {
        ...entry,
        target: { id: SALE_ID, type: "Sale Order" },
      })
    ).rejects.toThrow();
    await expect(
      record(executor, { ...entry, requestId: "x".repeat(129) })
    ).rejects.toThrow();
    expect(inserted).toHaveLength(0);
  });

  it("refuses free text even when an action's schema would allow a string", async () => {
    const { executor, inserted } = fakeExecutor();
    const { record: recordLoose } = createAuditor({
      actions: defineAuditActions({
        "child.note_added": z.strictObject({ text: z.string() }),
      }),
    });

    await expect(
      recordLoose(executor, {
        action: "child.note_added",
        actor: { id: USER_ID, type: "user" },
        details: { text: "Ada ate everything today" },
      })
    ).rejects.toThrow(FREE_TEXT);
    expect(inserted).toHaveLength(0);
  });

  it("fails loudly if the database returns no row", async () => {
    const empty = {
      insert: () => ({
        values: () => ({ returning: () => Promise.resolve([]) }),
      }),
    } as unknown as AuditExecutor;

    await expect(
      record(empty, {
        action: "admin.impersonation_ended",
        actor: { type: "system" },
        details: {},
      })
    ).rejects.toThrow(NOT_SAVED);
  });
});
