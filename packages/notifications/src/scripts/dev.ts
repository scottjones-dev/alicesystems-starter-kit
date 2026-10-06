import { spawn } from "node:child_process";

import { app } from "@repo/config/app";
import { loadRootEnv } from "@repo/env/load";

import { novuDashboardUrl } from "../client";
import { keys } from "../keys";

/*
 * Starts `novu dev`: a tunnel from Novu Cloud to the local API's bridge (/api/novu), so Novu
 * can run our code-first workflows. You only need it to try the novu transport on your
 * machine; day to day, development uses the smtp transport and Mailpit.
 *
 *   pnpm novu:tunnel [--port 9000] [--open]
 *
 * Headless by default so it does not open a browser tab every time; pass --open for the
 * Novu dashboard of your region (the CLI alone would open the US one).
 */

loadRootEnv();

const DEFAULT_API_PORT = "9000";
const args = process.argv.slice(2);
const portIndex = args.indexOf("--port");
const port =
  portIndex === -1
    ? DEFAULT_API_PORT
    : (args[portIndex + 1] ?? DEFAULT_API_PORT);
const open = args.includes("--open");

const command = [
  "pnpm exec novu dev",
  `--port ${port}`,
  `--route ${app.api.basePath}/novu`,
  `--dashboard-url ${novuDashboardUrl(keys.env().NOVU_REGION)}`,
  open ? "" : "--headless",
]
  .filter(Boolean)
  .join(" ");

const child = spawn(command, { shell: true, stdio: "inherit" });

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => child.kill(signal));
}
child.on("exit", (code) => process.exit(code ?? 0));
