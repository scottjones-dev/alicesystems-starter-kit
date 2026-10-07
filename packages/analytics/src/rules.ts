import { createUrlTools, ONE_TIME_LINK_SECTIONS } from "./url";

/*
 * What may leave the app, for web and native alike. This file imports no analytics SDK: each
 * app installs its own and passes `beforeSend` into it.
 */

/** Property names that must never be sent, whatever a caller passes. A backstop only: the event catalog is the real rule. */
export const DEFAULT_DENIED_PROPERTIES = [
  "birth_date",
  "dob",
  "email",
  "name",
  "note",
  "notes",
  "password",
  "phone",
  "token",
] as const;

/** Properties that say where the event happened. An event from an untracked page is dropped. */
const LOCATION_KEYS = [
  "$current_url",
  "$pathname",
  "$referrer",
  "$screen_name",
];

/**
 * Every property that holds an address or path gets its secrets hidden, not just the four
 * above: posthog-js also sends the previous page (`$prev_pageview_pathname`) and the first
 * page of the visit (`$initial_current_url`, `$initial_referrer`, ...) on later events, so a
 * one-time link opened earlier would otherwise leak on the next page view.
 */
const ADDRESS_KEY = /(?:url|pathname|referrer)$/iu;

/** Nested property bags the SDK adds to an event (person properties). */
const NESTED_BAG_KEYS = new Set(["$set", "$set_once"]);

const holdsAddress = (key: string): boolean =>
  LOCATION_KEYS.includes(key) || ADDRESS_KEY.test(key);

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export interface CaptureEvent {
  /** Person properties set by this event, at event level (not inside `properties`). */
  $set?: Record<string, unknown>;
  $set_once?: Record<string, unknown>;
  event: string;
  properties?: Record<string, unknown>;
}

export interface RulesOptions {
  /** More property names to refuse, for this platform. */
  deniedProperties?: readonly string[];
  /** More page sections whose address holds a one-time secret, for this platform. */
  secretSections?: readonly string[];
}

/**
 * Builds the privacy rules. The defaults cover the pages auth sends links to; a platform adds
 * its own sections and property names without editing this package.
 */
export const createAnalyticsRules = ({
  deniedProperties = [],
  secretSections = [],
}: RulesOptions = {}) => {
  const { isTrackedPath, scrubUrl } = createUrlTools([
    ...ONE_TIME_LINK_SECTIONS,
    ...secretSections,
  ]);
  const denied = new Set<string>([
    ...DEFAULT_DENIED_PROPERTIES,
    ...deniedProperties,
  ]);

  const scrubProperties = (
    properties: Record<string, unknown>
  ): Record<string, unknown> => {
    const clean: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(properties)) {
      if (denied.has(key)) {
        continue;
      }
      if (NESTED_BAG_KEYS.has(key) && isPlainObject(value)) {
        clean[key] = scrubProperties(value);
      } else if (holdsAddress(key) && typeof value === "string") {
        clean[key] = scrubUrl(value);
      } else {
        clean[key] = value;
      }
    }
    return clean;
  };

  /**
   * For the SDK's `before_send`. Returns null to drop the event (untracked page or screen),
   * otherwise the event with secrets removed from addresses and denied properties removed.
   */
  const beforeSend = <E extends CaptureEvent>(event: E | null): E | null => {
    if (!event?.properties) {
      return event;
    }
    const { properties } = event;
    const where = LOCATION_KEYS.map((key) => properties[key])
      .filter((value) => value !== undefined && value !== null)
      .map(String);
    if (where.some((value) => !isTrackedPath(value))) {
      return null;
    }
    // The event-level person bags carry the "initial" address too, so they are scrubbed the same way.
    const { $set, $set_once: setOnce } = event;
    const bags = {
      ...($set && { $set: scrubProperties($set) }),
      ...(setOnce && { $set_once: scrubProperties(setOnce) }),
    };
    return { ...event, ...bags, properties: scrubProperties(properties) };
  };

  return {
    beforeSend,
    deniedProperties: [...denied],
    isTrackedPath,
    scrubUrl,
  };
};

/** The rules with the defaults. */
export const rules = createAnalyticsRules();
