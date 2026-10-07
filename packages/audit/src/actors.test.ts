import { describe, expect, it } from "vitest";

import { actorColumns, actorSchema } from "./actors";

const USER_ID = "0190a8e2-7c3b-7d2e-9a1f-1b2c3d4e5f60";
const OTHER_ID = "0190a8e2-7c3b-7d2e-9a1f-1b2c3d4e5f61";

describe("actorColumns", () => {
  it("writes a user with their id", () => {
    expect(actorColumns({ id: USER_ID, type: "user" })).toStrictEqual({
      actingAsId: null,
      actorId: USER_ID,
      actorType: "user",
    });
  });

  it("writes the system with no id", () => {
    expect(actorColumns({ type: "system" })).toStrictEqual({
      actingAsId: null,
      actorId: null,
      actorType: "system",
    });
  });

  it("writes an admin, and the user they are acting as", () => {
    expect(
      actorColumns({ actingAsId: OTHER_ID, id: USER_ID, type: "admin" })
    ).toStrictEqual({
      actingAsId: OTHER_ID,
      actorId: USER_ID,
      actorType: "admin",
    });
    expect(actorColumns({ id: USER_ID, type: "admin" }).actingAsId).toBeNull();
  });
});

describe("actorSchema", () => {
  it("accepts the three kinds of actor", () => {
    for (const actor of [
      { id: USER_ID, type: "user" },
      { type: "system" },
      { actingAsId: OTHER_ID, id: USER_ID, type: "admin" },
    ]) {
      expect(actorSchema.safeParse(actor).success).toBe(true);
    }
  });

  it("refuses a user without an id, an id that is not a uuid, and an unknown kind", () => {
    for (const actor of [
      { type: "user" },
      { id: "42", type: "user" },
      { type: "robot" },
      { actingAsId: "nope", id: USER_ID, type: "admin" },
    ]) {
      expect(actorSchema.safeParse(actor).success).toBe(false);
    }
  });
});
