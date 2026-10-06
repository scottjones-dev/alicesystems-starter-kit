import { app } from "@repo/config/app";
import type { EmailId, EmailPropsMap } from "@repo/emails/registry";
import { renderEmail } from "@repo/emails/registry";
import type { RenderedEmail } from "@repo/emails/render";
import type { EmailBaseProps } from "@repo/emails/types";
import { z } from "zod";

/*
 * The one list of notifications. Each entry is an email template plus what notify() needs to
 * know about it: the shape of its data, whether the user may switch it off, and an optional
 * push message. Workflows, the typed notify() and the tests all read from this list.
 */

/** What a caller passes: the email's own props, without what notify() fills in itself. */
export type EventPayload<Id extends EmailId> = Omit<
  EmailPropsMap[Id],
  keyof EmailBaseProps
>;

export interface PushContent {
  body: string;
  title: string;
}

/** What the sending code needs from any event, whatever its payload looks like. */
export interface RuntimeEvent {
  /** Security and account events: the user cannot switch these off in preferences. */
  critical: boolean;
  /** True when this event also sends a push notification. */
  hasPush: boolean;
  /** Validates the data. Includes the optional `locale` notify() adds. */
  payload: z.ZodType;
  /** Renders the email. Takes plain JSON, as it arrives from Novu. */
  renderEmail: (
    payload: unknown,
    context: { baseUrl: string; locale?: string }
  ) => Promise<RenderedEmail>;
  /** Builds the push message. Only call when `hasPush` is true. */
  renderPush: (payload: unknown, locale?: string) => PushContent;
}

export interface EventDefinition<Id extends EmailId> {
  critical: boolean;
  payload: z.ZodType<EventPayload<Id> & { locale?: string }>;
  /** Short push message. Leave out for email-only events. No sensitive detail. */
  push?: (payload: EventPayload<Id>, locale?: string) => PushContent;
}

const defineEvent = <Id extends EmailId>(
  id: Id,
  definition: EventDefinition<Id>
): RuntimeEvent => ({
  critical: definition.critical,
  hasPush: Boolean(definition.push),
  payload: definition.payload,
  renderEmail: (payload, { baseUrl, locale }) =>
    // SAFETY: the payload is parsed with this event's schema, which matches the email's props.
    renderEmail(id, {
      ...definition.payload.parse(payload),
      baseUrl,
      locale,
    } as EmailPropsMap[Id]),
  renderPush: (payload, locale) => {
    if (!definition.push) {
      throw new Error(`${id} has no push message`);
    }
    return definition.push(definition.payload.parse(payload), locale);
  },
});

/** The language notify() adds from the recipient, so callers never put it in the payload. */
const localeField = { locale: z.enum(app.i18n.locales).optional() };

const text = z.string().min(1);

const duration = z
  .object({
    days: z.number().int().positive().optional(),
    hours: z.number().int().positive().optional(),
    minutes: z.number().int().positive().optional(),
  })
  .refine(
    (value) => Boolean(value.days || value.hours || value.minutes),
    "a duration needs days, hours or minutes"
  );

export const events = {
  "delete-account": defineEvent("delete-account", {
    critical: true,
    payload: z.object({
      ...localeField,
      expiresIn: duration,
      name: text,
      url: z.url(),
    }),
  }),
  // Sent by packages/auth for magic-link sign-in (existing accounts only).
  "magic-link": defineEvent("magic-link", {
    critical: true,
    payload: z.object({ ...localeField, expiresIn: duration, url: z.url() }),
  }),
  "organization-invitation": defineEvent("organization-invitation", {
    // An invitation is not a security notice: the invitee may switch it off.
    critical: false,
    payload: z.object({
      ...localeField,
      expiresIn: duration,
      inviterName: text,
      organizationName: text,
      role: text,
      url: z.url(),
    }),
  }),
  "reset-password": defineEvent("reset-password", {
    critical: true,
    payload: z.object({
      ...localeField,
      expiresIn: duration,
      name: text,
      url: z.url(),
    }),
  }),
  "verify-email": defineEvent("verify-email", {
    critical: true,
    payload: z.object({
      ...localeField,
      expiresIn: duration,
      name: text,
      url: z.url(),
    }),
  }),
} satisfies Record<EmailId, RuntimeEvent>;

export type EventId = keyof typeof events;

// SAFETY: `events` is declared with exactly these keys, so its key list is the EventId union.
export const eventIds = Object.keys(events) as EventId[];
