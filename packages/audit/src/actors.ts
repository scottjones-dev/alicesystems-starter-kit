import { z } from "zod";

/*
 * Who did it. A person (`user`), the system itself (a scheduled job, a webhook: no person), or
 * an `admin` of the platform, who may be acting as one of the users to help them.
 */

export const actorSchema = z.discriminatedUnion("type", [
  z.object({ id: z.uuid(), type: z.literal("user") }),
  z.object({ type: z.literal("system") }),
  z.object({
    /** The user the admin is acting as, when they are impersonating one. */
    actingAsId: z.uuid().optional(),
    id: z.uuid(),
    type: z.literal("admin"),
  }),
]);

export type Actor = z.input<typeof actorSchema>;

/** The `audit_log` columns that describe the actor. */
export const actorColumns = (actor: Actor) => {
  switch (actor.type) {
    case "system":
      return { actingAsId: null, actorId: null, actorType: "system" } as const;
    case "admin":
      return {
        actingAsId: actor.actingAsId ?? null,
        actorId: actor.id,
        actorType: "admin",
      } as const;
    default:
      return {
        actingAsId: null,
        actorId: actor.id,
        actorType: "user",
      } as const;
  }
};
