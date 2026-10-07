# @repo/money

Exact money maths in whole minor units: add, split, allocate and VAT without losing a penny.

## Why it exists

Every product adds, splits and taxes amounts, and floating point gets it wrong (`0.1 + 0.2` is `0.30000000000000004`). Money here is an integer number of pence or cents plus a currency, and every calculation either gives an exact answer or throws. The reasoning is in [`docs/content/docs/packages/money.mdx`](../../docs/content/docs/packages/money.mdx).

## What's inside

| Import | What it gives you |
| --- | --- |
| `@repo/money/money` | `money`, `add`, `subtract`, `negate`, `abs`, `sum`, `multiply`, `compare`, `equals`, `isZero`, `isNegative`, `parseMajor`, `toMajorString` |
| `@repo/money/allocate` | `allocate(total, ratios)` and `split(total, parts)`: the parts always add up to the total |
| `@repo/money/tax` | `percentage`, `addVat`, `removeVat`: rates in basis points, rounding always stated |
| `@repo/money/rounding` | the rounding modes and `divideRounded` |
| `@repo/money/currency` | `decimalsOf("GBP")` (2), `isCurrencyCode` |
| `@repo/money/schema` | `moneySchema` and `currencyCodeSchema` (zod) for API bodies and stored JSON |

## Use it

```ts
import { allocate, split } from "@repo/money/allocate";
import { add, money, parseMajor } from "@repo/money/money";
import { addVat } from "@repo/money/tax";

const bill = parseMajor("100.00", "GBP");        // { amount: 10000, currency: "GBP" }
split(bill, 3);                                   // 33.34, 33.33, 33.33: nothing lost
allocate(bill, [70, 30]);                         // 70.00, 30.00

// Rates are basis points (20% = 2000). The rounding rule is never defaulted.
addVat(money(1000, "GBP"), 2000, "half-away-from-zero");
// { net: 10.00, vat: 2.00, gross: 12.00 }

add(money(1, "GBP"), money(1, "EUR"));            // throws: Cannot combine GBP and EUR
```

To show an amount to a person use `formatMoney` from `@repo/internationalization`, which also takes its decimals from this package.

## Tests

`pnpm --filter @repo/money test`. Many tests are properties checked on generated inputs (fast-check): parts sum to the total, negate and subtract round-trip, VAT removal leaves net plus VAT equal to gross, every rounding mode lands beside the exact result, typed amounts read back what is written. Examples cover each rounding mode on exact halves in both signs, and the largest amounts. `pnpm --filter @repo/money check-types` for types.

## Depends on / used by

Depends on `zod` (only for `/schema`). Used by `@repo/internationalization` (decimals for `formatMoney`); later by `payments`, `documents` and the products.
