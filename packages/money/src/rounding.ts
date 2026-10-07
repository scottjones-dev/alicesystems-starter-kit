/*
 * Division of whole numbers with a stated rounding rule. Money maths multiplies before it
 * divides (amount times a rate, over a total), and that product can pass the largest whole
 * number JavaScript's `number` holds exactly, so the working is done in `bigint`.
 */

/**
 * What to do when a result falls between two whole numbers. Names say the direction in
 * words, because "round half up" means different things for a negative amount in different
 * tools.
 *
 * - `half-away-from-zero`: 2.5 becomes 3 and -2.5 becomes -3. What most tax rules expect.
 * - `half-to-even`: 2.5 becomes 2 and 3.5 becomes 4 ("banker's rounding"), so many rounded
 *   amounts do not drift upwards.
 * - `half-toward-zero`: 2.5 becomes 2 and -2.5 becomes -2.
 * - `toward-zero`: always drop the fraction (a discount that must never exceed the price).
 * - `away-from-zero`: always round any fraction up in size (a fee that must never be short).
 */
export const ROUNDING_MODES = [
  "away-from-zero",
  "half-away-from-zero",
  "half-to-even",
  "half-toward-zero",
  "toward-zero",
] as const;
export type Rounding = (typeof ROUNDING_MODES)[number];

const TWO = 2n;

/** Divides, rounding as asked. `denominator` must be positive. */
export const divideRounded = (
  numerator: bigint,
  denominator: bigint,
  rounding: Rounding
): bigint => {
  if (denominator <= 0n) {
    throw new Error("Cannot divide by zero or a negative number.");
  }
  // BigInt division truncates toward zero, and the remainder has the sign of the numerator.
  const truncated = numerator / denominator;
  const remainder = numerator % denominator;
  if (remainder === 0n) {
    return truncated;
  }

  const awayFromZero = numerator < 0n ? truncated - 1n : truncated + 1n;
  const twiceRemainder = (remainder < 0n ? -remainder : remainder) * TWO;

  switch (rounding) {
    case "toward-zero":
      return truncated;
    case "away-from-zero":
      return awayFromZero;
    default:
      break;
  }

  if (twiceRemainder > denominator) {
    return awayFromZero;
  }
  if (twiceRemainder < denominator) {
    return truncated;
  }
  // Exactly halfway: the mode decides.
  switch (rounding) {
    case "half-away-from-zero":
      return awayFromZero;
    case "half-toward-zero":
      return truncated;
    default:
      // half-to-even: keep whichever neighbour is even.
      return truncated % TWO === 0n ? truncated : awayFromZero;
  }
};
