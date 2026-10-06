import { workflow } from "@novu/framework";
import type { EventId, RuntimeEvent } from "./events";
import { eventIds, events } from "./events";

/** The recipient's language from a payload, if notify() put one there. */
const localeOf = (payload: unknown): string | undefined =>
  typeof payload === "object" &&
  payload !== null &&
  "locale" in payload &&
  typeof payload.locale === "string"
    ? payload.locale
    : undefined;

/**
 * Builds the Novu workflow for one event. Every event goes through this one builder, so
 * there is no per-notification workflow code. SMS becomes another step here once a provider
 * is chosen.
 *
 * `baseUrl` is the web address of this environment; it is passed in (not read from the
 * environment here) so tests can build workflows with any value.
 */
export const buildWorkflow = (
  id: string,
  definition: RuntimeEvent,
  baseUrl: string
) =>
  workflow(
    id,
    async ({ payload, step }) => {
      const locale = localeOf(payload);

      await step.email("email", async () => {
        const { html, subject } = await definition.renderEmail(payload, {
          baseUrl,
          locale,
        });
        return { body: html, subject };
      });

      if (definition.hasPush) {
        await step.push("push", () => {
          const { body, title } = definition.renderPush(payload, locale);
          return { body, subject: title };
        });
      }
    },
    {
      name: id,
      payloadSchema: definition.payload,
      // Critical workflows are read-only: a user's preferences cannot switch them off.
      preferences: { all: { enabled: true, readOnly: definition.critical } },
    }
  );

export const buildWorkflows = (baseUrl: string) =>
  eventIds.map((id: EventId) => buildWorkflow(id, events[id], baseUrl));
