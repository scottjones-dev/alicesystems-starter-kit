import { describe, expect, it } from "vitest";

import { buildSeedPlan, ENVIRONMENTS } from "./plan";

const autoValue = (environment: (typeof ENVIRONMENTS)[number], key: string) =>
  buildSeedPlan(environment).auto.find((secret) => secret.key === key)?.value;

describe("buildSeedPlan", () => {
  it("lists the three environments", () => {
    expect(ENVIRONMENTS).toEqual(["dev", "staging", "prod"]);
  });

  it("runs dev in development mode", () => {
    expect(autoValue("dev", "NODE_ENV")).toBe("development");
  });

  it("runs staging and prod in production mode", () => {
    expect(autoValue("staging", "NODE_ENV")).toBe("production");
    expect(autoValue("prod", "NODE_ENV")).toBe("production");
  });

  it("never fills a key in two places", () => {
    for (const environment of ENVIRONMENTS) {
      const { auto, manual } = buildSeedPlan(environment);
      const ids = [...auto, ...manual].map(
        ({ folder, key }) => `${folder}:${key}`
      );
      expect(new Set(ids).size).toBe(ids.length);
    }
  });
});
