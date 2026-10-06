export const ENVIRONMENTS = ["dev", "staging", "prod"] as const;
export type Environment = (typeof ENVIRONMENTS)[number];

export type Folder = "/api" | "/web" | "/native";

/** A secret we know how to fill in ourselves. */
interface AutoSecret {
  folder: Folder;
  key: string;
  value: string;
}

/** A secret only the user can provide (it comes from a third-party dashboard). */
export interface ManualSecret {
  folder: Folder;
  hint: string;
  key: string;
}

export interface SeedPlan {
  auto: AutoSecret[];
  manual: ManualSecret[];
}

/**
 * Decides which keys can be filled automatically for an environment and which need a human.
 * It is pure, so it is easy to test.
 *
 * Each package adds its keys here when it arrives:
 * - random signing secrets go in `auto`, generated fresh per environment;
 * - localhost URLs go in `auto` for `dev` only, and in `manual` for deployed environments;
 * - anything from a vendor dashboard (database, storage, email) goes in `manual`.
 */
export const buildSeedPlan = (environment: Environment): SeedPlan => ({
  auto: [
    {
      folder: "/api",
      key: "NODE_ENV",
      value: environment === "dev" ? "development" : "production",
    },
  ],
  manual: [],
});
