import { statusByCode } from "@repo/errors/codes";
import { describe, expect, it } from "vitest";
import { z } from "zod";

import { errorResponses, jsonContent } from "./lib/responses";

describe("jsonContent", () => {
  it("describes a JSON response by its schema", () => {
    const schema = z.object({ ok: z.boolean() });
    expect(jsonContent(schema, "fine")).toEqual({
      content: { "application/json": { schema } },
      description: "fine",
    });
  });
});

describe("errorResponses", () => {
  it("documents each code under its HTTP status", () => {
    const responses = errorResponses(["NOT_FOUND", "UNAVAILABLE"]);
    expect(Object.keys(responses).toSorted()).toEqual([
      String(statusByCode.NOT_FOUND),
      String(statusByCode.UNAVAILABLE),
    ]);
  });

  it("uses the real error body and names the code", () => {
    const responses = errorResponses(["FORBIDDEN"]);
    expect(responses[403].description).toBe("FORBIDDEN");
    expect(
      Object.keys(responses[403].content["application/json"].schema.shape)
    ).toEqual(["error"]);
  });

  it("returns nothing for no codes", () => {
    expect(errorResponses([])).toEqual({});
  });
});
