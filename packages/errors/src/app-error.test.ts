import { describe, expect, it } from "vitest";

import { AppError, errorBodySchema, toErrorBody } from "./app-error";
import { errorCodeNames, statusByCode } from "./codes";

const FIRST_ERROR_STATUS = 400;
const LAST_ERROR_STATUS = 599;

describe("codes", () => {
  it("gives every code an HTTP error status", () => {
    for (const code of errorCodeNames) {
      expect(statusByCode[code]).toBeGreaterThanOrEqual(FIRST_ERROR_STATUS);
      expect(statusByCode[code]).toBeLessThanOrEqual(LAST_ERROR_STATUS);
    }
  });

  it("uses a different status for every code, so clients can tell them apart", () => {
    const statuses = Object.values(statusByCode);
    expect(new Set(statuses).size).toBe(statuses.length);
  });

  it("maps the codes clients depend on", () => {
    expect(statusByCode.STALE_VERSION).toBe(412);
    expect(statusByCode.UNAVAILABLE).toBe(503);
    expect(statusByCode.VALIDATION_FAILED).toBe(422);
  });
});

describe("AppError", () => {
  it("carries its code, message and the matching status", () => {
    const error = new AppError("NOT_FOUND", "Post not found");
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("AppError");
    expect(error.code).toBe("NOT_FOUND");
    expect(error.message).toBe("Post not found");
    expect(error.status).toBe(404);
  });

  it("shows its message to the user, except for INTERNAL", () => {
    expect(new AppError("FORBIDDEN", "No").expose).toBe(true);
    expect(new AppError("UNAVAILABLE", "Payments are down").expose).toBe(true);
    expect(new AppError("INTERNAL", "Disk full").expose).toBe(false);
  });

  it("lets the caller override whether the message is shown", () => {
    expect(new AppError("CONFLICT", "x", { expose: false }).expose).toBe(false);
    expect(new AppError("INTERNAL", "x", { expose: true }).expose).toBe(true);
  });

  it("keeps the original error as its cause", () => {
    const cause = new Error("connection refused");
    expect(new AppError("UNAVAILABLE", "x", { cause }).cause).toBe(cause);
  });
});

describe("toErrorBody", () => {
  it("turns an AppError into its status and body", () => {
    const { body, status } = toErrorBody(
      new AppError("NOT_FOUND", "Post not found"),
      "req-1"
    );
    expect(status).toBe(404);
    expect(body).toEqual({
      error: {
        code: "NOT_FOUND",
        message: "Post not found",
        requestId: "req-1",
      },
    });
  });

  it("includes the invalid field paths, only when there are some", () => {
    const withFields = toErrorBody(
      new AppError("VALIDATION_FAILED", "Check your input", {
        fields: ["email"],
      })
    );
    expect(withFields.body.error.fields).toEqual(["email"]);
    const without = toErrorBody(new AppError("VALIDATION_FAILED", "Bad"));
    expect(without.body.error).not.toHaveProperty("fields");
  });

  it("hides the message of an AppError that is not exposed", () => {
    const { body } = toErrorBody(
      new AppError("CONFLICT", "row 42 clashes with jane@example.com", {
        expose: false,
      })
    );
    expect(body.error.message).not.toContain("jane");
    expect(body.error.code).toBe("CONFLICT");
  });

  it("treats a plain Error as a bug and leaks nothing", () => {
    const { body, status } = toErrorBody(
      new Error("password authentication failed for user postgres"),
      "req-2"
    );
    expect(status).toBe(500);
    expect(body.error.code).toBe("INTERNAL");
    expect(JSON.stringify(body)).not.toContain("postgres");
    expect(body.error.requestId).toBe("req-2");
  });

  it("handles things that are not Errors at all", () => {
    for (const thrown of ["boom", 42, null, undefined, { secret: "x" }]) {
      const { body, status } = toErrorBody(thrown);
      expect(status).toBe(500);
      expect(JSON.stringify(body)).not.toContain("secret");
    }
  });

  it("always produces a body that matches the published schema", () => {
    const samples = [
      new AppError("STALE_VERSION", "Out of date"),
      new AppError("VALIDATION_FAILED", "Bad", { fields: ["a.b"] }),
      new Error("bug"),
    ];
    for (const sample of samples) {
      expect(
        errorBodySchema.safeParse(toErrorBody(sample, "r").body).success
      ).toBe(true);
    }
  });
});

describe("errorBodySchema", () => {
  it("rejects a code we do not know", () => {
    const result = errorBodySchema.safeParse({
      error: { code: "TEAPOT", message: "x" },
    });
    expect(result.success).toBe(false);
  });

  it("rejects a body with no message", () => {
    expect(
      errorBodySchema.safeParse({ error: { code: "NOT_FOUND" } }).success
    ).toBe(false);
  });
});
