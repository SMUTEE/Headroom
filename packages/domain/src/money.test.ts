import { describe, expect, it } from 'vitest';
import {
  add,
  applyCredit,
  cents,
  clampToZero,
  format,
  fromDollars,
  MoneyError,
  multiply,
  negate,
  priceUnits,
  subtract,
  ZERO,
} from './money';

describe('cents', () => {
  it('accepts whole numbers including zero and negatives', () => {
    expect(cents(0)).toBe(0);
    expect(cents(1299)).toBe(1299);
    expect(cents(-500)).toBe(-500);
  });

  it('rejects a float, because that is a dollar value that slipped through', () => {
    expect(() => cents(12.99)).toThrow(MoneyError);
    expect(() => cents(0.1)).toThrow(/whole number of cents/);
  });

  it('rejects NaN and Infinity', () => {
    expect(() => cents(Number.NaN)).toThrow(MoneyError);
    expect(() => cents(Number.POSITIVE_INFINITY)).toThrow(MoneyError);
  });
});

describe('fromDollars', () => {
  it('converts exactly', () => {
    expect(fromDollars(12.99)).toBe(1299);
    expect(fromDollars(0)).toBe(0);
    expect(fromDollars(1)).toBe(100);
  });

  it('survives values that float arithmetic gets wrong', () => {
    // 1.005 * 100 is 100.49999999999999 in IEEE 754.
    expect(fromDollars(1.005)).toBe(101);
    expect(fromDollars(0.07)).toBe(7);
    expect(fromDollars(1.1 + 2.2)).toBe(330);
  });

  it('rounds half away from zero, symmetrically for credits', () => {
    expect(fromDollars(0.005)).toBe(1);
    expect(fromDollars(-0.005)).toBe(-1);
    expect(fromDollars(0.015)).toBe(2);
    expect(fromDollars(-0.015)).toBe(-2);
  });

  it('treats sub-cent magnitudes as zero rather than printing an exponent', () => {
    // Below 1e-6 JavaScript switches to exponent notation, which the decimal
    // shift cannot parse. Those magnitudes are zero cents anyway.
    expect(fromDollars(1e-7)).toBe(0);
    expect(fromDollars(-1e-7)).toBe(0);
    expect(fromDollars(0.000001)).toBe(0);
  });

  it('rejects magnitudes beyond the money range', () => {
    expect(() => fromDollars(1e21)).toThrow(/outside the supported range/);
    expect(() => fromDollars(-1e21)).toThrow(MoneyError);
  });

  it('handles values with no fractional part and long fractions', () => {
    expect(fromDollars(1200)).toBe(120000);
    expect(fromDollars(0.1)).toBe(10);
    expect(fromDollars(1.9999999)).toBe(200);
    expect(fromDollars(-1.9999999)).toBe(-200);
  });
});

describe('arithmetic', () => {
  it('adds a list without drift', () => {
    const items = Array.from({ length: 1000 }, () => fromDollars(0.1));
    expect(add(...items)).toBe(10000); // $100.00 exactly
  });

  it('subtracts and negates', () => {
    expect(subtract(cents(1000), cents(250))).toBe(750);
    expect(subtract(cents(250), cents(1000))).toBe(-750);
    expect(negate(cents(500))).toBe(-500);
  });

  it('sums to zero with an empty list', () => {
    expect(add()).toBe(ZERO);
  });
});

describe('multiply', () => {
  it('applies a rate and rounds once', () => {
    expect(multiply(cents(10000), 0.2)).toBe(2000);
    expect(multiply(cents(9999), 0.5)).toBe(5000); // 4999.5 rounds away from zero
  });

  it('handles proration fractions', () => {
    // 11 of 30 days on a $99.00 base.
    expect(multiply(fromDollars(99), 11 / 30)).toBe(3630);
  });

  it('rounds negatives away from zero too', () => {
    expect(multiply(cents(-9999), 0.5)).toBe(-5000);
  });

  it('rejects a non-finite factor', () => {
    expect(() => multiply(cents(100), Number.NaN)).toThrow(MoneyError);
  });
});

describe('priceUnits', () => {
  it('prices whole-cent rates', () => {
    expect(priceUnits(1000, 1)).toBe(1000); // 1000 units at 1c
  });

  it('prices sub-cent rates without losing the fraction per unit', () => {
    // 18,402 units at $0.0012 = 0.12c per unit = $22.08
    expect(priceUnits(18402, 0.12)).toBe(2208);
  });

  it('is zero at zero usage', () => {
    expect(priceUnits(0, 0.12)).toBe(0);
  });

  it('rejects negative usage, which would credit the customer by accident', () => {
    expect(() => priceUnits(-1, 0.12)).toThrow(MoneyError);
  });
});

describe('applyCredit', () => {
  it('applies partial credit', () => {
    expect(applyCredit(fromDollars(100), fromDollars(30))).toEqual({
      charged: 7000,
      creditUsed: 3000,
      creditRemaining: 0,
    });
  });

  it('never drives a charge below zero, and carries the remainder forward', () => {
    expect(applyCredit(fromDollars(20), fromDollars(50))).toEqual({
      charged: 0,
      creditUsed: 2000,
      creditRemaining: 3000,
    });
  });

  it('is a no-op with no credit', () => {
    expect(applyCredit(fromDollars(42), ZERO)).toEqual({
      charged: 4200,
      creditUsed: 0,
      creditRemaining: 0,
    });
  });

  it('rejects a negative charge or negative credit', () => {
    expect(() => applyCredit(cents(-1), ZERO)).toThrow(MoneyError);
    expect(() => applyCredit(cents(100), cents(-1))).toThrow(MoneyError);
  });
});

describe('clampToZero', () => {
  it('floors negatives and leaves positives alone', () => {
    expect(clampToZero(cents(-250))).toBe(0);
    expect(clampToZero(cents(250))).toBe(250);
    expect(clampToZero(ZERO)).toBe(0);
  });
});

describe('format', () => {
  it('formats with cents by default', () => {
    expect(format(cents(128400))).toBe('$1,284.00');
    expect(format(ZERO)).toBe('$0.00');
  });

  it('formats negatives as credits', () => {
    expect(format(cents(-3000))).toBe('-$30.00');
  });

  it('can drop cents for headline figures', () => {
    expect(format(cents(128400), { showCents: false })).toBe('$1,284');
  });
});
