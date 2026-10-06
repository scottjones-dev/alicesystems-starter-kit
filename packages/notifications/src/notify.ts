import { toLocale } from "@repo/internationalization/resolve";
import { ZodError } from "zod";
import type { EventId, EventPayload } from "./events";
import { events } from "./events";
import type { Recipient, Transport } from "./transports";

export interface NotifyInput<Id extends EventId> {
  /** Pass the same key when retrying so the person is not notified twice. */
  idempotencyKey?: string;
  payload: EventPayload<Id>;
  to: Recipient;
}

interface Deps {
  log: (message: string, details: Record<string, string>) => void;
  transport: Transport;
}

/**
 * A one-line reason for a failure, with nothing the caller passed in it. The data holds
 * one-time links and addresses, so an invalid payload is described by the names of the
 * fields only, never their values.
 */
const describeError = (error: unknown): string => {
  if (error instanceof ZodError) {
    const fields = error.issues.map(
      (issue) => issue.path.join(".") || "(root)"
    );
    return `invalid payload, check: ${[...new Set(fields)].join(", ")}`;
  }
  return error instanceof Error ? error.message : "unknown error";
};

/**
 * Builds notify() around one transport. Tests pass a fake; the app uses the one in
 * `instance.ts`. The returned function never throws, so callers can write `void notify(...)`
 * (inside an auth callback, so response time does not reveal whether an account exists).
 */
export const createNotify =
  ({ log, transport }: Deps) =>
  async <Id extends EventId>(
    eventId: Id,
    { idempotencyKey, payload, to }: NotifyInput<Id>
  ): Promise<void> => {
    try {
      // Invalid data fails here, before anything leaves the building.
      // SAFETY: parsed with this event's own schema, which describes exactly EventPayload<Id>.
      const valid = events[eventId].payload.parse(payload) as EventPayload<Id>;
      // The email follows the recipient's language; one we do not ship means English.
      const locale = toLocale(to.locale);
      await transport.send({
        eventId,
        idempotencyKey,
        locale,
        payload: valid,
        to: { ...to, subscriberId: to.subscriberId ?? `email:${to.email}` },
      });
    } catch (error) {
      // Never the payload, the address or the user: only which event failed and why.
      log("notify failed", {
        error: describeError(error),
        eventId,
        transport: transport.name,
      });
    }
  };
