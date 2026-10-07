import { z } from "zod";

/*
 * The details of an audit entry hold ids and codes, never personal data. The types of each
 * action are the real protection (do not add a `name` or `note` field to an action). This is
 * the backstop that catches the usual mistakes at run time: prose, an email address, a
 * nested object.
 */

/** A value an audit detail may hold. No nesting: a flat bag of ids, codes, counts and flags. */
export type AuditDetailValue = boolean | number | string | null;
export type AuditDetails = Record<string, AuditDetailValue>;

/** The longest string a detail may hold. A uuid is 36 characters; prose is longer. */
export const MAX_DETAIL_LENGTH = 64;

/** Prose has spaces and an email address has an @; ids and codes have neither. */
const LOOKS_LIKE_TEXT = /[\s@]/u;

/** A plain id or code: short, with no spaces or @. */
export const auditCode = () =>
  z
    .string()
    .max(MAX_DETAIL_LENGTH)
    .refine((value) => !LOOKS_LIKE_TEXT.test(value), "must be an id or a code");

/**
 * Throws if `details` is not a flat bag of ids and codes. Names the offending key, never its
 * value (the value is exactly what must not be copied around).
 */
export const assertIdsOnly = (details: Record<string, unknown>): void => {
  for (const [key, value] of Object.entries(details)) {
    if (value === null || typeof value === "boolean") {
      continue;
    }
    if (typeof value === "number") {
      if (!Number.isFinite(value)) {
        throw new Error(`Audit detail "${key}" is not a finite number.`);
      }
      continue;
    }
    if (typeof value !== "string") {
      throw new Error(
        `Audit detail "${key}" must be a string, number, boolean or null: no nested data.`
      );
    }
    if (value.length > MAX_DETAIL_LENGTH || LOOKS_LIKE_TEXT.test(value)) {
      throw new Error(
        `Audit detail "${key}" looks like free text. Audit details hold ids and codes only.`
      );
    }
  }
};
