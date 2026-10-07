import type { PostHogConfig } from "posthog-js";

import { rules } from "./rules";

/*
 * PostHog settings shared by the apps. This file imports no SDK at run time (the type above
 * is erased): each app installs `posthog-js` or `posthog-react-native` and passes these in.
 */

/** PostHog Cloud EU (Frankfurt). Events never leave the EU. */
export const POSTHOG_EU_HOST = "https://eu.i.posthog.com";

/** Where PostHog's own UI lives, used for toolbar links. */
export const POSTHOG_UI_HOST = "https://eu.posthog.com";

/**
 * On the web, events go through our own domain (a rewrite in the web app) so blockers and
 * the content security policy are not a problem.
 */
export const WEB_INGEST_PATH = "/ingest";

/**
 * The `posthog-js` options for the website. Nothing is stored on the visitor's device until
 * they agree (`consented`), and the features that can capture what is on screen stay off.
 */
export const posthogWebOptions = ({ consented }: { consented: boolean }) =>
  ({
    api_host: WEB_INGEST_PATH,
    // Only the events in the catalog are sent: no automatic capture of clicks or inputs.
    autocapture: false,
    before_send: rules.beforeSend,
    capture_pageview: "history_change",
    // Session replay can record what is on screen, including personal data.
    disable_session_recording: true,
    // Memory only until consent: nothing is written to cookies or local storage.
    persistence: consented ? "localStorage+cookie" : "memory",
    person_profiles: "identified_only",
    respect_dnt: true,
    ui_host: POSTHOG_UI_HOST,
  }) satisfies Partial<PostHogConfig>;
