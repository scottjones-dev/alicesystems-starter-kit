import type { Money } from "./money";
import { moneyFromBigInt } from "./money";

/*
 * Splitting an amount so the parts add up to exactly the whole. Dividing 100.00 by three gives
 * 33.33 three times and loses a penny; here two parts get 33.33 and one gets 33.34.
 */

/**
 * Splits `total` in proportion to `ratios` (whole numbers, such as shares or weights), using
 * the largest remainder method: every part gets the rounded-down share, then the leftover
 * minor units go one each to the parts that lost the most, the earlier part first on a tie.
 * The parts always add up to `total`.
 *
 * A negative total is split by its size and the parts are made negative, so a refund splits
 * the same way the charge did.
 */
export const allocate = (total: Money, ratios: readonly number[]): Money[] => {
  if (ratios.length === 0) {
    throw new Error("Give at least one ratio to split between.");
  }
  if (!ratios.every((ratio) => Number.isSafeInteger(ratio) && ratio >= 0)) {
    throw new Error("Ratios must be whole numbers, zero or more.");
  }
  const weights = ratios.map(BigInt);
  const weightTotal = weights.reduce((sum, weight) => sum + weight, 0n);
  if (weightTotal === 0n) {
    throw new Error("At least one ratio must be more than zero.");
  }

  const size = BigInt(Math.abs(total.amount));
  const shares = weights.map((weight) => (size * weight) / weightTotal);
  // What each part lost to rounding down, as a count of 1/weightTotal of a minor unit.
  const lost = weights.map((weight) => (size * weight) % weightTotal);

  const handedOut = shares.reduce((sum, share) => sum + share, 0n);
  let leftover = Number(size - handedOut);

  // Parts ordered by what they lost, biggest first; the earlier part wins a tie.
  const order = lost
    .map((loss, index) => ({ index, loss }))
    .sort((a, b) => {
      if (a.loss === b.loss) {
        return a.index - b.index;
      }
      return a.loss > b.loss ? -1 : 1;
    });
  for (const { index } of order) {
    if (leftover === 0) {
      break;
    }
    shares[index] = (shares[index] ?? 0n) + 1n;
    leftover -= 1;
  }

  const direction = total.amount < 0 ? -1n : 1n;
  return shares.map((share) =>
    moneyFromBigInt(share * direction, total.currency)
  );
};

/** Splits into `parts` equal-as-possible parts that add up to `total`: a bill shared four ways. */
export const split = (total: Money, parts: number): Money[] => {
  if (!Number.isSafeInteger(parts) || parts < 1) {
    throw new Error("Split into a whole number of parts, one or more.");
  }
  return allocate(
    total,
    Array.from({ length: parts }, () => 1)
  );
};
