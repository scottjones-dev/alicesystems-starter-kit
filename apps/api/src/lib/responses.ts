import { errorBodySchema } from "@repo/errors/app-error";
import type { ErrorCode } from "@repo/errors/codes";
import { statusByCode } from "@repo/errors/codes";
import type { ZodType } from "zod";

/** A JSON response described by a Zod schema, in OpenAPI form. */
export const jsonContent = <Schema extends ZodType>(
  schema: Schema,
  description: string
) => ({
  content: { "application/json": { schema } },
  description,
});

type ErrorContent = ReturnType<typeof jsonContent<typeof errorBodySchema>>;

/** One documented response per error code, keyed by its HTTP status. */
type ErrorResponses<Code extends ErrorCode> = {
  [C in Code as (typeof statusByCode)[C]]: ErrorContent;
};

/**
 * The documented error responses for a route. Each uses the real error body
 * (`errorBodySchema`), so the docs page shows exactly what clients receive.
 */
export const errorResponses = <const Codes extends readonly ErrorCode[]>(
  codes: Codes
): ErrorResponses<Codes[number]> => {
  const responses: Partial<Record<number, ErrorContent>> = {};
  for (const code of codes) {
    responses[statusByCode[code]] = jsonContent(errorBodySchema, code);
  }
  // SAFETY: the loop adds exactly one entry per requested code, which is what the type says.
  return responses as ErrorResponses<Codes[number]>;
};
