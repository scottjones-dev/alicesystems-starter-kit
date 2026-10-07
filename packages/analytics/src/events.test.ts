import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

import {
  baseCatalog,
  baseSchemas,
  catalogProblems,
  createCatalog,
} from "./events";

const FREE_TEXT = "Some free text a user typed into a form field";

describe("the base catalog", () => {
  it("has the events every platform needs", () => {
    expect(Object.keys(baseCatalog.schemas).toSorted()).toEqual([
      "analytics_opted_out",
      "invitation_accepted",
      "organization_created",
      "sign_in_completed",
      "sign_up_completed",
      "two_factor_enabled",
    ]);
  });

  it("is safe by its own rule", () => {
    expect(catalogProblems(baseSchemas)).toEqual([]);
  });

  it("never accepts free text in any property", () => {
    for (const schema of Object.values(baseCatalog.schemas)) {
      for (const key of Object.keys(schema.shape)) {
        expect(schema.safeParse({ [key]: FREE_TEXT }).success, key).toBe(false);
      }
    }
  });
});

describe("parseEvent", () => {
  it("accepts an event with valid properties", () => {
    expect(
      baseCatalog.parseEvent("sign_in_completed", { method: "google" })
    ).toStrictEqual({
      method: "google",
    });
    expect(
      baseCatalog.parseEvent("sign_in_completed", { method: "passkey" })
    ).toStrictEqual({
      method: "passkey",
    });
  });

  it("accepts events that have no properties", () => {
    expect(baseCatalog.parseEvent("two_factor_enabled", {})).toStrictEqual({});
  });

  it("drops an event with an unknown property", () => {
    expect(
      baseCatalog.parseEvent("sign_in_completed", {
        // @ts-expect-error: `email` is not part of this catalog entry
        email: "ada@example.test",
        method: "google",
      })
    ).toBeNull();
  });

  it("drops an event whose value is not one of the allowed options", () => {
    expect(
      baseCatalog.parseEvent("sign_in_completed", {
        // @ts-expect-error: not a sign-in method
        method: "carrier pigeon",
      })
    ).toBeNull();
  });

  it("does not offer magic links or passkeys as ways to sign up", () => {
    expect(
      baseCatalog.parseEvent("sign_up_completed", {
        // @ts-expect-error: sign-up has a shorter list of methods
        method: "passkey",
      })
    ).toBeNull();
  });

  it("drops an event name that is not in the catalog", () => {
    // @ts-expect-error: not an event
    expect(baseCatalog.parseEvent("made_up_event", {})).toBeNull();
  });
});

describe("createCatalog", () => {
  it("lets a platform add its own events beside the base ones", () => {
    const catalog = createCatalog({
      ...baseSchemas,
      invoice_sent: z.strictObject({ channel: z.enum(["email", "post"]) }),
    });
    expect(
      catalog.parseEvent("invoice_sent", { channel: "email" })
    ).toStrictEqual({
      channel: "email",
    });
    expect(
      catalog.parseEvent("sign_up_completed", { method: "apple" })
    ).toStrictEqual({
      method: "apple",
    });
  });

  it("accepts optional and defaulted coarse fields", () => {
    const catalog = createCatalog({
      shown: z.strictObject({
        beta: z.boolean().default(false),
        kind: z.enum(["a", "b"]).optional(),
        version: z.literal("v2"),
      }),
    });
    expect(catalog.parseEvent("shown", { version: "v2" })).toStrictEqual({
      beta: false,
      version: "v2",
    });
  });

  it("refuses a field that could hold free text or personal data", () => {
    expect(() =>
      createCatalog({ typed: z.strictObject({ note: z.string() }) })
    ).toThrow("typed.note");
    expect(() =>
      createCatalog({ typed: z.strictObject({ amount: z.number() }) })
    ).toThrow("typed.amount");
    expect(() =>
      createCatalog({ typed: z.strictObject({ id: z.string().optional() }) })
    ).toThrow("typed.id");
  });

  it("refuses an event that would let extra properties through", () => {
    expect(() =>
      createCatalog({ loose: z.object({ kind: z.enum(["a"]) }) })
    ).toThrow("loose: must be a strictObject");
  });

  it("explains every problem at once", () => {
    const problems = catalogProblems({
      a: z.object({ x: z.string() }),
      b: z.strictObject({ y: z.number() }),
    });
    expect(problems).toHaveLength(3);
  });
});

describe("createTracker", () => {
  const setup = () => {
    const capture =
      vi.fn<(name: string, properties: Record<string, unknown>) => void>();
    return { capture, track: baseCatalog.createTracker(capture) };
  };

  it("sends a valid event through the SDK's capture call", () => {
    const { capture, track } = setup();
    expect(track("sign_in_completed", { method: "google" })).toBe(true);
    expect(capture).toHaveBeenCalledWith("sign_in_completed", {
      method: "google",
    });
  });

  it("drops an invalid event and says so", () => {
    const { capture, track } = setup();
    const sent = track("sign_in_completed", {
      // @ts-expect-error: not a sign-in method
      method: "email-me-the-password",
    });
    expect(sent).toBe(false);
    expect(capture).not.toHaveBeenCalled();
  });
});
