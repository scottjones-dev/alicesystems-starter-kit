import { decimalsOf } from "./currency";

/*
 * Money as a whole number of minor units (pence, cents) and a currency. Every function takes
 * and returns a new value; nothing is changed in place. A mistake (mixing currencies, a result
 * too large to hold exactly) throws instead of returning a wrong amount, because a wrong
 * amount is worse than a crash.
 */

export interface Money {
  /** Whole minor units: 1999 is £19.99 in GBP and ¥1,999 in JPY. Can be negative. */
  readonly amount: number;
  /** Three capital letters, e.g. GBP. */
  readonly currency: string;
}

/** The text of an amount written in major units: "19.99", "-0.05", "1999". */
const MAJOR_AMOUNT = /^(?<sign>-?)(?<whole>\d+)(?:\.(?<fraction>\d+))?$/u;

/**
 * Makes a Money. The amount must be a whole number that is exactly representable, which is
 * what keeps adding and comparing exact.
 */
export const money = (amount: number, currency: string): Money => {
  decimalsOf(currency);
  if (!Number.isSafeInteger(amount)) {
    throw new Error(
      `Money must be a whole number of minor units that fits exactly, got ${amount}.`
    );
  }
  // `-0` would print as "-0" and compare unequal to 0 with Object.is.
  return { amount: amount === 0 ? 0 : amount, currency };
};

const MAX_SAFE = BigInt(Number.MAX_SAFE_INTEGER);
const MIN_SAFE = BigInt(Number.MIN_SAFE_INTEGER);

/**
 * Makes a Money from a `bigint` amount, for code that does its working in `bigint` so a large
 * product cannot lose exactness on the way (see rounding.ts). Throws when the result no longer
 * fits exactly.
 */
export const moneyFromBigInt = (amount: bigint, currency: string): Money => {
  if (amount > MAX_SAFE || amount < MIN_SAFE) {
    throw new Error("The result is too large to hold exactly.");
  }
  return money(Number(amount), currency);
};

const assertSameCurrency = (a: Money, b: Money) => {
  if (a.currency !== b.currency) {
    throw new Error(
      `Cannot combine ${a.currency} and ${b.currency}: convert one first.`
    );
  }
};

export const add = (a: Money, b: Money): Money => {
  assertSameCurrency(a, b);
  return money(a.amount + b.amount, a.currency);
};

export const subtract = (a: Money, b: Money): Money => {
  assertSameCurrency(a, b);
  return money(a.amount - b.amount, a.currency);
};

export const negate = (a: Money): Money => money(-a.amount, a.currency);

/** The size of an amount without its sign. */
export const abs = (a: Money): Money => money(Math.abs(a.amount), a.currency);

/** Adds a list. An empty list gives zero in `currency`, so a total of nothing is not an error. */
export const sum = (amounts: readonly Money[], currency: string): Money => {
  let total = money(0, currency);
  for (const amount of amounts) {
    total = add(total, amount);
  }
  return total;
};

/** Multiplies by a whole number, e.g. a unit price by a quantity. */
export const multiply = (a: Money, quantity: number): Money => {
  if (!Number.isInteger(quantity)) {
    throw new Error(
      `Multiply by a whole number, got ${quantity}. For a fraction or a rate, use percentage().`
    );
  }
  // The product of two safe integers can pass 2^53 and lose exactness before we can check it.
  return moneyFromBigInt(BigInt(a.amount) * BigInt(quantity), a.currency);
};

/** Negative when `a` is smaller, positive when larger, zero when equal. Usable with `sort`. */
export const compare = (a: Money, b: Money): number => {
  assertSameCurrency(a, b);
  return Math.sign(a.amount - b.amount);
};

export const equals = (a: Money, b: Money): boolean =>
  a.currency === b.currency && a.amount === b.amount;

export const isZero = (a: Money): boolean => a.amount === 0;
export const isNegative = (a: Money): boolean => a.amount < 0;

/**
 * Reads an amount typed in major units ("19.99") without going through a floating point
 * number, which would turn 19.99 into 19.989999.... More decimals than the currency has is an
 * error rather than a silent rounding: the caller decides how to round user input.
 */
export const parseMajor = (text: string, currency: string): Money => {
  const decimals = decimalsOf(currency);
  const match = MAJOR_AMOUNT.exec(text.trim());
  if (!match?.groups) {
    throw new Error(`"${text}" is not an amount like 19.99.`);
  }
  const { fraction = "", sign, whole = "" } = match.groups;
  if (fraction.length > decimals) {
    throw new Error(
      `${currency} has ${decimals} decimal places, got "${text}".`
    );
  }
  const minor = BigInt(`${whole}${fraction.padEnd(decimals, "0")}`);
  return moneyFromBigInt(sign === "-" ? -minor : minor, currency);
};

/**
 * An amount written in major units with no symbol or grouping: "19.99". For files, APIs and
 * logs. For people, use `formatMoney` from `@repo/internationalization`.
 */
export const toMajorString = (a: Money): string => {
  const decimals = decimalsOf(a.currency);
  const digits = String(Math.abs(a.amount)).padStart(decimals + 1, "0");
  const whole = digits.slice(0, digits.length - decimals);
  const fraction = digits.slice(digits.length - decimals);
  const sign = a.amount < 0 ? "-" : "";
  return decimals === 0 ? `${sign}${whole}` : `${sign}${whole}.${fraction}`;
};
