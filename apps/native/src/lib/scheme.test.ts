import { describe, expect, it } from "vitest";

import { schemeFor } from "./scheme";

describe("schemeFor", () => {
  it("is dark only when the device says dark", () => {
    expect(schemeFor("dark")).toBe("dark");
  });

  it("is light when the device says light", () => {
    expect(schemeFor("light")).toBe("light");
  });

  it("is light when the device says nothing, matching the default in global.css", () => {
    expect(schemeFor(null)).toBe("light");
    expect(schemeFor(undefined)).toBe("light");
    expect(schemeFor("")).toBe("light");
  });
});
