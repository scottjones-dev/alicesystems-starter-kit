import type { Money } from "./money";
import { moneyFromBigInt, subtract } from "./money";
import type { Rounding } from "./rounding";
import { divideRounded } from "./rounding";

/*
 * Percentages and VAT. Rates are whole numbers of basis points (hundredths of a percent): 20%
 * is 2000 and 5.5% is 550, so there is no floating point in a rate. The rounding rule is a
 * required argument everywhere: how a tax is rounded is a legal and business decision, and
 * a default would hide it.
 */

const BASIS_POINTS_PER_WHOLE = 10_000n;

const assertRate = (rateBasisPoints: number) => {
  if (!Number.isSafeInteger(rateBasisPoints) || rateBasisPoints < 0) {
    throw new Error(
      `A rate is a whole number of basis points (20% is 2000), got ${rateBasisPoints}.`
    );
  }
};

/** `rateBasisPoints` of `amount`: a discount, a fee, a tip. 2000 is 20%. */
export const percentage = (
  amount: Money,
  rateBasisPoints: number,
  rounding: Rounding
): Money => {
  assertRate(rateBasisPoints);
  return moneyFromBigInt(
    divideRounded(
      BigInt(amount.amount) * BigInt(rateBasisPoints),
      BASIS_POINTS_PER_WHOLE,
      rounding
    ),
    amount.currency
  );
};

/** An amount split into what is charged before tax, the tax, and what is paid. */
export interface VatBreakdown {
  /** Net plus VAT. */
  gross: Money;
  net: Money;
  vat: Money;
}

/** Adds VAT to a price that excludes it. The VAT is rounded; net and gross are exact. */
export const addVat = (
  net: Money,
  rateBasisPoints: number,
  rounding: Rounding
): VatBreakdown => {
  const vat = percentage(net, rateBasisPoints, rounding);
  return {
    gross: moneyFromBigInt(
      BigInt(net.amount) + BigInt(vat.amount),
      net.currency
    ),
    net,
    vat,
  };
};

/**
 * Takes the VAT out of a price that includes it. The VAT is rounded and the net is what is
 * left, so `net + vat` is always exactly `gross`. (Rounding the net instead could leave a
 * penny that belongs to neither.)
 */
export const removeVat = (
  gross: Money,
  rateBasisPoints: number,
  rounding: Rounding
): VatBreakdown => {
  assertRate(rateBasisPoints);
  const vat = moneyFromBigInt(
    divideRounded(
      BigInt(gross.amount) * BigInt(rateBasisPoints),
      BASIS_POINTS_PER_WHOLE + BigInt(rateBasisPoints),
      rounding
    ),
    gross.currency
  );
  return { gross, net: subtract(gross, vat), vat };
};
