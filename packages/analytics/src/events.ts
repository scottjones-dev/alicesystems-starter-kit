import { z } from "zod";

/*
 * The only events we send to analytics. Each has a strict schema of coarse values: enums,
 * booleans and literals, never free text. That is how "no personal data leaves the app" is
 * enforced in code: a property that is not listed cannot be sent, and a string that is not
 * one of the listed options is rejected. The rule is checked when a catalog is created, so
 * a free-text property cannot even be defined.
 */

/** What an analytics SDK accepts as event properties. */
export type PropertyBag = Record<string, boolean | number | string>;

/** The kinds of field a catalog may use. Anything else (a plain string, a number) is refused. */
const COARSE_TYPES = new Set(["boolean", "enum", "literal"]);

/** Fields can be optional or nullable; what matters is the kind of value inside. */
const WRAPPER_TYPES = new Set(["default", "nullable", "optional"]);

const innerType = (field: z.core.$ZodType): string => {
  let current = field;
  let definition = current._zod.def;
  while (WRAPPER_TYPES.has(definition.type) && "innerType" in definition) {
    // SAFETY: wrapper definitions (optional, nullable, default) all carry an `innerType` schema.
    current = definition.innerType as z.core.$ZodType;
    definition = current._zod.def;
  }
  return definition.type;
};

/** Everything wrong with a set of event schemas. Empty means they are safe to use. */
export const catalogProblems = (
  schemas: Record<string, z.ZodObject>
): string[] => {
  const problems: string[] = [];
  for (const [name, schema] of Object.entries(schemas)) {
    if (schema._zod.def.catchall?._zod.def.type !== "never") {
      problems.push(
        `${name}: must be a strictObject, so extra properties are refused`
      );
    }
    for (const [key, field] of Object.entries(schema.shape)) {
      const type = innerType(field);
      if (!COARSE_TYPES.has(type)) {
        problems.push(
          `${name}.${key}: a ${type} field can hold free text or personal data; use an enum, boolean or literal`
        );
      }
    }
  }
  return problems;
};

/**
 * Builds a catalog from event schemas. Throws if any schema allows free text. Each platform
 * makes its own with `createCatalog({ ...baseSchemas, invoice_sent: ... })`.
 */
export const createCatalog = <Schemas extends Record<string, z.ZodObject>>(
  schemas: Schemas
) => {
  const problems = catalogProblems(schemas);
  if (problems.length > 0) {
    throw new Error(`Unsafe analytics events:\n${problems.join("\n")}`);
  }

  /**
   * Checks an event against the catalog. Returns the properties to send, or null when they
   * do not match (the caller drops the event instead of sending something unexpected).
   */
  const parseEvent = <Name extends keyof Schemas & string>(
    name: Name,
    props: z.input<Schemas[Name]>
  ): PropertyBag | null => {
    const result = schemas[name]?.safeParse(props);
    // SAFETY: every field is an enum, boolean or literal (checked above), so the data is a PropertyBag.
    return result?.success ? (result.data as PropertyBag) : null;
  };

  return {
    /**
     * A `track(name, props)` function over any SDK's capture call. It validates, drops what
     * does not match, and returns whether the event was sent.
     */
    createTracker:
      (capture: (name: string, properties: PropertyBag) => void) =>
      <Name extends keyof Schemas & string>(
        name: Name,
        props: z.input<Schemas[Name]>
      ): boolean => {
        const properties = parseEvent(name, props);
        if (!properties) {
          return false;
        }
        capture(name, properties);
        return true;
      },
    parseEvent,
    schemas,
  };
};

const SIGN_UP_METHODS = ["password", "google", "microsoft", "apple"] as const;
const SIGN_IN_METHODS = [...SIGN_UP_METHODS, "magic_link", "passkey"] as const;

const noProps = z.strictObject({});

/** The events every platform has. Add your own with `createCatalog`. */
export const baseSchemas = {
  analytics_opted_out: noProps,
  invitation_accepted: noProps,
  organization_created: noProps,
  sign_in_completed: z.strictObject({ method: z.enum(SIGN_IN_METHODS) }),
  sign_up_completed: z.strictObject({ method: z.enum(SIGN_UP_METHODS) }),
  two_factor_enabled: noProps,
};

export const baseCatalog = createCatalog(baseSchemas);
