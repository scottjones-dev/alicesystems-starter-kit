import { Novu } from "@novu/api";

export type NovuRegion = "eu" | "us";

export const novuApiUrl = (region: NovuRegion) =>
  region === "eu" ? "https://eu.api.novu.co" : "https://api.novu.co";

/** The Novu dashboard for a region. `novu dev` opens the US one unless told otherwise. */
export const novuDashboardUrl = (region: NovuRegion) =>
  region === "eu"
    ? "https://eu.dashboard.novu.co"
    : "https://dashboard.novu.co";

/** A Novu client for one key and region, or null when there is no key. */
export const createNovuClient = (
  secretKey: string | undefined,
  region: NovuRegion
): Novu | null =>
  secretKey ? new Novu({ secretKey, serverURL: novuApiUrl(region) }) : null;
