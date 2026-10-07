/*
 * How many decimal places each currency has: GBP and EUR have 2 (pence, cents), JPY has 0,
 * BHD has 3. Amounts are whole minor units, so this decides what "1" means.
 *
 * The table lists only the exceptions to 2 (the ISO 4217 minor units), so it is short and has
 * no dependency on the runtime's `Intl`, which differs between Node, browsers and React Native.
 * A test compares it with `Intl` on Node so a change in the standard is noticed.
 */

const CURRENCY_CODE = /^[A-Z]{3}$/u;

const DECIMALS_BY_CURRENCY: Readonly<Record<string, number>> = {
  BHD: 3,
  BIF: 0,
  CLF: 4,
  CLP: 0,
  DJF: 0,
  GNF: 0,
  IQD: 3,
  ISK: 0,
  JOD: 3,
  JPY: 0,
  KMF: 0,
  KRW: 0,
  KWD: 3,
  LYD: 3,
  OMR: 3,
  PYG: 0,
  RWF: 0,
  TND: 3,
  UGX: 0,
  UYI: 0,
  UYW: 4,
  VND: 0,
  VUV: 0,
  XAF: 0,
  XOF: 0,
  XPF: 0,
};

const DEFAULT_DECIMALS = 2;

export const isCurrencyCode = (value: string): boolean =>
  CURRENCY_CODE.test(value);

/** The number of decimal places of a currency, e.g. 2 for GBP and 0 for JPY. */
export const decimalsOf = (currency: string): number => {
  if (!isCurrencyCode(currency)) {
    throw new Error(
      `"${currency}" is not a currency code: use three capital letters, like GBP.`
    );
  }
  return DECIMALS_BY_CURRENCY[currency] ?? DEFAULT_DECIMALS;
};
