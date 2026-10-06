import { describe, expect, it } from "vitest";

import { buildLocalEnv } from "./plan";

const WRITTEN_BY = /^# Written by/u;

describe("buildLocalEnv", () => {
  it("sets NODE_ENV to development", () => {
    expect(buildLocalEnv().values.NODE_ENV).toBe("development");
  });

  it("writes one KEY=value line for every value", () => {
    const { lines, values } = buildLocalEnv();
    for (const [key, value] of Object.entries(values)) {
      expect(lines).toContain(`${key}=${value}`);
    }
  });

  it("starts with a comment saying the file is for local use", () => {
    expect(buildLocalEnv().lines[0]).toMatch(WRITTEN_BY);
  });
});
