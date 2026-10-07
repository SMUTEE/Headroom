/**
 * Money.
 *
 * Every amount in Headroom is an integer number of cents, and `Cents` is a
 * branded type so that passing a float dollar value is a compile error rather
 * than a rounding bug discovered on an invoice.
 *
 * This matters more than it looks. `0.1 + 0.2 !== 0.3` in IEEE 754, and a
 * usage-based invoice is thousands of small multiplications and additions. Do
 * that in floats and the total drifts from the sum of its own line items —
 * which is the one thing a customer will always check.
 */

declare const CENTS: unique symbol;

/** An integer number of cents. Construct with `cents()` or `fromDollars()`. */
export type Cents = number & { readonly [CENTS]: true };

export class MoneyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MoneyError';
  }
}

/** Assert an integer and brand it. Throws on a float, NaN or Infinity. */
export function cents(value: number): Cents {
  if (!Number.isFinite(value)) {
    throw new MoneyError(`Amount must be finite, received ${value}`);
  }
  if (!Number.isInteger(value)) {
    throw new MoneyError(
      `Amount must be a whole number of cents, received ${value}. ` +
        `Use fromDollars() to convert, or round explicitly.`,
    );
  }
  return value as Cents;
}

export const ZERO = cents(0);

/**
 * Convert dollars to cents, rounding half away from zero.
 *
 * Note what this does NOT do: multiply by 100. `1.005 * 100` is
 * `100.49999999999999` in IEEE 754, so the obvious implementation returns 100
 * where the correct answer is 101. The float error is introduced by the
 * multiply itself, so no amount of careful rounding afterwards recovers it.
 *
 * Instead this shifts the decimal point on the number's own shortest
 * round-trip string representation, using integer arithmetic throughout. The
 * digits JavaScript prints are the digits the author wrote, so shifting them
 * is exact.
 *
 * Half-away-from-zero rather than `Math.round`, which rounds half *up* and so
 * treats -0.5 and 0.5 asymmetrically. Credits are negative, and an asymmetric
 * rule would quietly favour one direction across thousands of line items.
 */
export function fromDollars(dollars: number): Cents {
  if (!Number.isFinite(dollars)) {
    throw new MoneyError(`Amount must be finite, received ${dollars}`);
  }

  // JavaScript prints exponent notation below 1e-6 and at or above 1e21.
  // Anything that small is zero cents; anything that large is not money.
  const magnitude = Math.abs(dollars);
  if (magnitude < 1e-6) return 0 as Cents;
  if (magnitude >= 1e21) {
    throw new MoneyError(`Amount ${dollars} is outside the supported range`);
  }

  const text = dollars.toString();
  const negative = text.startsWith('-');
  const unsigned = negative ? text.slice(1) : text;
  const [whole = '0', fraction = ''] = unsigned.split('.');

  // Two digits become cents; the rest only decide the rounding.
  const centDigits = fraction.slice(0, 2).padEnd(2, '0');
  const remainder = fraction.slice(2);

  let value = Number(whole) * 100 + Number(centDigits);

  // Round half away from zero on the magnitude, then reapply the sign.
  const firstDropped = remainder.charCodeAt(0) - 48;
  if (firstDropped >= 5) value += 1;

  return (negative ? -value : value) as Cents;
}

export function add(...amounts: readonly Cents[]): Cents {
  let total = 0;
  for (const amount of amounts) total += amount;
  return total as Cents;
}

export function subtract(a: Cents, b: Cents): Cents {
  return (a - b) as Cents;
}

export function negate(amount: Cents): Cents {
  return -amount as Cents;
}

/**
 * Multiply an amount by a non-integer factor (a rate, a proration fraction),
 * rounding the result back to whole cents.
 *
 * Rounding happens once, here, at the end. Rounding each intermediate step
 * instead is how a bill ends up a few cents away from its own line items.
 */
export function multiply(amount: Cents, factor: number): Cents {
  if (!Number.isFinite(factor)) {
    throw new MoneyError(`Factor must be finite, received ${factor}`);
  }
  const scaled = amount * factor;
  const rounded = scaled < 0 ? -Math.round(-scaled) : Math.round(scaled);
  return rounded as Cents;
}

/**
 * Price a quantity at a per-unit rate given in cents, where the rate itself may
 * be fractional (e.g. $0.0012 per unit = 0.12 cents).
 */
export function priceUnits(units: number, ratePerUnitInCents: number): Cents {
  if (!Number.isFinite(units) || units < 0) {
    throw new MoneyError(`Units must be a non-negative finite number, received ${units}`);
  }
  return multiply(cents(1), units * ratePerUnitInCents);
}

/** Never let a computed charge go below zero. */
export function clampToZero(amount: Cents): Cents {
  return (amount < 0 ? 0 : amount) as Cents;
}

export function max(a: Cents, b: Cents): Cents {
  return (a > b ? a : b) as Cents;
}

export function min(a: Cents, b: Cents): Cents {
  return (a < b ? a : b) as Cents;
}

/**
 * Apply credits to a charge, returning what is owed and what credit is left.
 *
 * Credit application order is a real business rule, not an implementation
 * detail: applying credit before tax versus after changes the total, and
 * applying it to the largest line item versus the earliest changes which
 * invoice a customer disputes. Headroom applies credit to the whole charge,
 * never below zero, and carries the remainder forward.
 */
export function applyCredit(
  charge: Cents,
  availableCredit: Cents,
): { charged: Cents; creditUsed: Cents; creditRemaining: Cents } {
  if (charge < 0) {
    throw new MoneyError(`Cannot apply credit to a negative charge (${charge})`);
  }
  if (availableCredit < 0) {
    throw new MoneyError(`Available credit cannot be negative (${availableCredit})`);
  }
  const creditUsed = min(charge, availableCredit);
  return {
    charged: subtract(charge, creditUsed),
    creditUsed,
    creditRemaining: subtract(availableCredit, creditUsed),
  };
}

/** Format for display. Currency is USD throughout — the lab is single-currency. */
export function format(amount: Cents, options: { showCents?: boolean } = {}): string {
  const showCents = options.showCents ?? true;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: showCents ? 2 : 0,
    maximumFractionDigits: showCents ? 2 : 0,
  }).format(amount / 100);
}

export function toDollars(amount: Cents): number {
  return amount / 100;
}
