import { z } from "zod";

import { isCurrencyCode } from "./currency";
import type { Money } from "./money";
import { money } from "./money";

/*
 * The shape of money in API bodies and database JSON. Kept apart from money.ts so the core
 * has no dependency, and an app that never validates input does not load zod for it.
 */

export const currencyCodeSchema = z
  .string()
  .refine(isCurrencyCode, "Use a three-letter currency code like GBP.");

/** `{ amount, currency }` with a whole-number amount that is exact. Output is a `Money`. */
export const moneySchema = z
  .object({
    amount: z.number().int().safe(),
    currency: currencyCodeSchema,
  })
  .transform((value): Money => money(value.amount, value.currency));
