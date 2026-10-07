import { describe, expect, it } from 'vitest';
import {
  compareInvoices,
  computeInvoice,
  daysInPeriod,
  monthPeriod,
  projectInvoice,
  prorate,
  recommendPlan,
  repriceBook,
  summariseUsage,
  usageZone,
} from './billing';
import { add, cents, fromDollars, ZERO } from './money';
import type { Account, PricingPlan, UsageEvent } from './types';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const PERIOD = { start: new Date('2026-09-01T00:00:00Z'), end: new Date('2026-10-01T00:00:00Z') };

const growth: PricingPlan = {
  id: 'growth',
  name: 'Growth',
  monthlyBase: fromDollars(299),
  includedUnits: 100_000,
  overageRatePerUnit: 0.12, // cents per unit
  includedSeats: 10,
  perSeatMonthly: fromDollars(19),
  unlimitedUsage: false,
  annualDiscount: 0.17,
};

const starter: PricingPlan = {
  ...growth,
  id: 'starter',
  name: 'Starter',
  monthlyBase: fromDollars(49),
  includedUnits: 10_000,
  overageRatePerUnit: 0.25,
  includedSeats: 3,
  perSeatMonthly: fromDollars(12),
  annualDiscount: 0.1,
};

const enterprise: PricingPlan = {
  ...growth,
  id: 'enterprise',
  name: 'Enterprise',
  monthlyBase: fromDollars(2400),
  includedUnits: 2_000_000,
  includedSeats: 100,
  perSeatMonthly: ZERO,
  unlimitedUsage: true,
  annualDiscount: 0.2,
};

const account: Account = {
  id: 'acc_test',
  companyName: 'Test Co',
  contactName: 'A Person',
  contactEmail: 'a@test.example',
  planId: 'growth',
  billingInterval: 'monthly',
  status: 'active',
  seats: 10,
  mrr: fromDollars(299),
  createdAt: '2026-01-01T00:00:00Z',
  creditBalance: ZERO,
};

function usage(units: number, opts: Partial<UsageEvent> = {}): UsageEvent {
  return {
    id: opts.id ?? `ue_${Math.random()}`,
    accountId: account.id,
    occurredAt: opts.occurredAt ?? '2026-09-15T00:00:00Z',
    units,
    source: 'api',
    idempotencyKey: opts.idempotencyKey ?? `k_${Math.random()}`,
    ...opts,
  };
}

/** The invoice total must always equal the sum of its own lines. */
function assertTotalMatchesLines(invoice: ReturnType<typeof computeInvoice>) {
  const summed = add(...invoice.lines.map((l) => l.amount));
  expect(invoice.total).toBe(Math.max(0, summed));
}

// ---------------------------------------------------------------------------

describe('periods', () => {
  it('builds a calendar month with an exclusive end', () => {
    const p = monthPeriod(new Date('2026-09-14T13:00:00Z'));
    expect(p.start.toISOString()).toBe('2026-09-01T00:00:00.000Z');
    expect(p.end.toISOString()).toBe('2026-10-01T00:00:00.000Z');
  });

  it('counts days correctly across month lengths and a leap year', () => {
    expect(daysInPeriod(monthPeriod(new Date('2026-09-10Z')))).toBe(30);
    expect(daysInPeriod(monthPeriod(new Date('2026-10-10Z')))).toBe(31);
    expect(daysInPeriod(monthPeriod(new Date('2026-02-10Z')))).toBe(28);
    expect(daysInPeriod(monthPeriod(new Date('2028-02-10Z')))).toBe(29);
  });
});

describe('summariseUsage — deduplication', () => {
  it('drops a redelivery sharing an idempotency key but having a new id', () => {
    const events = [
      usage(1000, { id: 'a', idempotencyKey: 'k1' }),
      usage(1000, { id: 'b', idempotencyKey: 'k1' }), // redelivered
      usage(500, { id: 'c', idempotencyKey: 'k2' }),
    ];
    const s = summariseUsage(events, growth, PERIOD);
    expect(s.totalUnits).toBe(1500);
    expect(s.duplicatesDropped).toBe(1);
    expect(s.eventsCounted).toBe(2);
  });

  it('does NOT deduplicate distinct events that happen to have equal units', () => {
    const events = [
      usage(1000, { id: 'a', idempotencyKey: 'k1' }),
      usage(1000, { id: 'b', idempotencyKey: 'k2' }),
    ];
    expect(summariseUsage(events, growth, PERIOD).totalUnits).toBe(2000);
  });

  it('is order-independent', () => {
    const a = usage(300, { idempotencyKey: 'k1', occurredAt: '2026-09-20T00:00:00Z' });
    const b = usage(700, { idempotencyKey: 'k2', occurredAt: '2026-09-02T00:00:00Z' });
    expect(summariseUsage([a, b], growth, PERIOD).totalUnits).toBe(
      summariseUsage([b, a], growth, PERIOD).totalUnits,
    );
  });
});

describe('summariseUsage — period boundaries', () => {
  it('includes an event at the exact start', () => {
    const s = summariseUsage([usage(100, { occurredAt: '2026-09-01T00:00:00.000Z' })], growth, PERIOD);
    expect(s.totalUnits).toBe(100);
  });

  it('excludes an event at the exact end, which belongs to the next period', () => {
    const s = summariseUsage([usage(100, { occurredAt: '2026-10-01T00:00:00.000Z' })], growth, PERIOD);
    expect(s.totalUnits).toBe(0);
    expect(s.outOfPeriodDropped).toBe(1);
  });

  it('includes an event one millisecond before the end', () => {
    const s = summariseUsage([usage(100, { occurredAt: '2026-09-30T23:59:59.999Z' })], growth, PERIOD);
    expect(s.totalUnits).toBe(100);
  });

  it('excludes events before the period', () => {
    const s = summariseUsage([usage(100, { occurredAt: '2026-08-31T23:59:59.999Z' })], growth, PERIOD);
    expect(s.totalUnits).toBe(0);
    expect(s.outOfPeriodDropped).toBe(1);
  });
});

describe('usage zones', () => {
  const zoneFor = (units: number, plan = growth) =>
    usageZone(summariseUsage([usage(units)], plan, PERIOD), plan);

  it('is safe well below the allowance', () => {
    expect(zoneFor(50_000)).toBe('safe');
  });

  it('warns at 80% of the allowance', () => {
    expect(zoneFor(79_999)).toBe('safe');
    expect(zoneFor(80_000)).toBe('warning');
  });

  it('is still only a warning exactly AT the allowance, because nothing is charged yet', () => {
    expect(zoneFor(100_000)).toBe('warning');
  });

  it('tips into overage one unit above the allowance', () => {
    expect(zoneFor(100_001)).toBe('overage');
  });

  it('is always safe on an unlimited plan, however much is used', () => {
    expect(zoneFor(50_000_000, enterprise)).toBe('safe');
  });
});

describe('computeInvoice — base cases', () => {
  it('charges the base only when usage is inside the allowance', () => {
    const inv = computeInvoice({ account, plan: growth, usage: [usage(50_000)], period: PERIOD });
    expect(inv.total).toBe(fromDollars(299));
    expect(inv.lines).toHaveLength(1);
    assertTotalMatchesLines(inv);
  });

  it('charges the base with zero usage', () => {
    const inv = computeInvoice({ account, plan: growth, usage: [], period: PERIOD });
    expect(inv.total).toBe(fromDollars(299));
    expect(inv.usage.totalUnits).toBe(0);
    assertTotalMatchesLines(inv);
  });

  it('charges nothing extra exactly at the allowance', () => {
    const inv = computeInvoice({ account, plan: growth, usage: [usage(100_000)], period: PERIOD });
    expect(inv.total).toBe(fromDollars(299));
    expect(inv.usage.overageUnits).toBe(0);
  });

  it('charges exactly one unit of overage one unit above', () => {
    const inv = computeInvoice({ account, plan: growth, usage: [usage(100_001)], period: PERIOD });
    expect(inv.usage.overageUnits).toBe(1);
    // 1 unit at 0.12 cents rounds to 0 cents — the customer is not charged a
    // penny for a single unit, and the invoice still balances.
    expect(inv.total).toBe(fromDollars(299));
    assertTotalMatchesLines(inv);
  });

  it('prices a realistic overage', () => {
    // 18,402 units over at 0.12c = 2,208 cents = $22.08
    const inv = computeInvoice({ account, plan: growth, usage: [usage(118_402)], period: PERIOD });
    expect(inv.usage.overageUnits).toBe(18_402);
    expect(inv.total).toBe(fromDollars(299) + 2208);
    assertTotalMatchesLines(inv);
  });

  it('never charges overage on an unlimited plan', () => {
    const ent = { ...account, planId: 'enterprise' as const };
    const inv = computeInvoice({
      account: ent,
      plan: enterprise,
      usage: [usage(9_000_000)],
      period: PERIOD,
    });
    expect(inv.usage.overageUnits).toBe(0);
    expect(inv.total).toBe(fromDollars(2400));
  });

  it('handles implausibly high usage without overflowing', () => {
    const inv = computeInvoice({
      account,
      plan: growth,
      usage: [usage(50_000_000)],
      period: PERIOD,
    });
    expect(Number.isFinite(inv.total)).toBe(true);
    expect(Number.isInteger(inv.total)).toBe(true);
    assertTotalMatchesLines(inv);
  });
});

describe('computeInvoice — seats', () => {
  it('charges nothing for seats inside the allowance', () => {
    const inv = computeInvoice({
      account: { ...account, seats: 10 },
      plan: growth,
      usage: [],
      period: PERIOD,
    });
    expect(inv.lines.find((l) => l.kind === 'seats')).toBeUndefined();
  });

  it('charges only the seats beyond the allowance', () => {
    const inv = computeInvoice({
      account: { ...account, seats: 14 },
      plan: growth,
      usage: [],
      period: PERIOD,
    });
    const seatLine = inv.lines.find((l) => l.kind === 'seats');
    expect(seatLine?.quantity).toBe(4);
    expect(seatLine?.amount).toBe(fromDollars(76));
    expect(inv.total).toBe(fromDollars(375));
    assertTotalMatchesLines(inv);
  });
});

describe('computeInvoice — annual discount', () => {
  it('discounts the subscription but NOT the overage', () => {
    const annual = { ...account, billingInterval: 'annual' as const, seats: 14 };
    const inv = computeInvoice({
      account: annual,
      plan: growth,
      usage: [usage(118_402)],
      period: PERIOD,
    });

    const subscription = fromDollars(299 + 76); // 37500
    const discount = inv.lines.find((l) => l.kind === 'discount')!;
    expect(discount.amount).toBe(-Math.round(subscription * 0.17));

    // Overage is unaffected by the discount.
    const overage = inv.lines.find((l) => l.kind === 'usage')!;
    expect(overage.amount).toBe(2208);
    assertTotalMatchesLines(inv);
  });

  it('applies no discount on monthly billing', () => {
    const inv = computeInvoice({ account, plan: growth, usage: [], period: PERIOD });
    expect(inv.lines.find((l) => l.kind === 'discount')).toBeUndefined();
  });
});

describe('computeInvoice — credits', () => {
  it('applies partial credit and leaves nothing over', () => {
    const inv = computeInvoice({
      account,
      plan: growth,
      usage: [],
      period: PERIOD,
      creditBalance: fromDollars(100),
    });
    expect(inv.subtotal).toBe(fromDollars(299));
    expect(inv.creditApplied).toBe(fromDollars(100));
    expect(inv.total).toBe(fromDollars(199));
    expect(inv.creditRemaining).toBe(ZERO);
    assertTotalMatchesLines(inv);
  });

  it('never drives a total below zero, and carries credit forward', () => {
    const inv = computeInvoice({
      account,
      plan: growth,
      usage: [],
      period: PERIOD,
      creditBalance: fromDollars(500),
    });
    expect(inv.total).toBe(ZERO);
    expect(inv.creditRemaining).toBe(fromDollars(201));
    assertTotalMatchesLines(inv);
  });
});

describe('prorate', () => {
  it('returns the full amount for a whole period', () => {
    expect(prorate(fromDollars(99), 30, 30)).toBe(fromDollars(99));
  });

  it('returns nothing for zero or negative days', () => {
    expect(prorate(fromDollars(99), 0, 30)).toBe(ZERO);
    expect(prorate(fromDollars(99), -5, 30)).toBe(ZERO);
  });

  it('apportions a partial period', () => {
    expect(prorate(fromDollars(99), 11, 30)).toBe(3630);
  });

  it('never exceeds the full amount', () => {
    expect(prorate(fromDollars(99), 45, 30)).toBe(fromDollars(99));
  });

  it('rejects a zero-length period rather than dividing by zero', () => {
    expect(() => prorate(fromDollars(99), 5, 0)).toThrow();
  });
});

describe('computeInvoice — mid-cycle plan change', () => {
  it('splits the base across both plans by days', () => {
    const inv = computeInvoice({
      account,
      plan: growth,
      usage: [],
      period: PERIOD,
      planChange: { previousPlan: starter, changedAt: new Date('2026-09-11T00:00:00Z') },
    });

    const prorated = inv.lines.filter((l) => l.kind === 'proration');
    expect(prorated).toHaveLength(2);
    // 10 of 30 days on Starter ($49), 20 of 30 on Growth ($299).
    expect(prorated[0]!.amount).toBe(Math.round(4900 * (10 / 30)));
    expect(prorated[1]!.amount).toBe(Math.round(29900 * (20 / 30)));
    assertTotalMatchesLines(inv);
  });

  it('clamps a change date before the period to the period start', () => {
    const inv = computeInvoice({
      account,
      plan: growth,
      usage: [],
      period: PERIOD,
      planChange: { previousPlan: starter, changedAt: new Date('2026-07-01T00:00:00Z') },
    });
    const prorated = inv.lines.filter((l) => l.kind === 'proration');
    // Nothing on the old plan; the whole period on the new one.
    expect(prorated[0]!.amount).toBe(ZERO);
    expect(prorated[1]!.amount).toBe(fromDollars(299));
  });

  it('still charges full usage overage across a plan change', () => {
    const inv = computeInvoice({
      account,
      plan: growth,
      usage: [usage(118_402)],
      period: PERIOD,
      planChange: { previousPlan: starter, changedAt: new Date('2026-09-11T00:00:00Z') },
    });
    expect(inv.lines.find((l) => l.kind === 'usage')?.amount).toBe(2208);
    assertTotalMatchesLines(inv);
  });
});

describe('projectInvoice', () => {
  const dailyEvents = (perDay: number, days: number) =>
    Array.from({ length: days }, (_, i) =>
      usage(perDay, {
        idempotencyKey: `d${i}`,
        occurredAt: new Date(Date.UTC(2026, 8, i + 1, 6)).toISOString(),
      }),
    );

  it('extrapolates the observed daily average to the period end', () => {
    // 10 days at 5,000/day, as of day 10 of 30 → 150,000 projected.
    const p = projectInvoice({
      account,
      plan: growth,
      usage: dailyEvents(5000, 10),
      period: PERIOD,
      asOf: new Date('2026-09-11T00:00:00Z'),
    });
    expect(p.observedUnits).toBe(50_000);
    expect(p.projectedUnits).toBe(150_000);
    expect(p.zone).toBe('overage');
  });

  it('states its method, because a projection without one is a guess', () => {
    const p = projectInvoice({
      account,
      plan: growth,
      usage: dailyEvents(5000, 10),
      period: PERIOD,
      asOf: new Date('2026-09-11T00:00:00Z'),
    });
    expect(p.method).toMatch(/daily average/i);
    expect(p.projected).toBe(true);
  });

  it('projects nothing at the very start of a period', () => {
    const p = projectInvoice({
      account,
      plan: growth,
      usage: [],
      period: PERIOD,
      asOf: new Date('2026-09-01T00:00:00Z'),
    });
    expect(p.projectedUnits).toBe(0);
    expect(p.total).toBe(fromDollars(299));
  });

  it('equals the actual invoice once the period is over', () => {
    const events = dailyEvents(5000, 30);
    const projected = projectInvoice({
      account,
      plan: growth,
      usage: events,
      period: PERIOD,
      asOf: new Date('2026-10-01T00:00:00Z'),
    });
    const actual = computeInvoice({ account, plan: growth, usage: events, period: PERIOD });
    expect(projected.projectedUnits).toBe(actual.usage.totalUnits);
    expect(projected.total).toBe(actual.total);
  });

  it('does not let a duplicate delivery inflate the projection', () => {
    const events = dailyEvents(5000, 10);
    const inflated = [...events, { ...events[0]!, id: 'redelivered' }];
    const clean = projectInvoice({
      account, plan: growth, usage: events, period: PERIOD,
      asOf: new Date('2026-09-11T00:00:00Z'),
    });
    const withDupe = projectInvoice({
      account, plan: growth, usage: inflated, period: PERIOD,
      asOf: new Date('2026-09-11T00:00:00Z'),
    });
    expect(withDupe.projectedUnits).toBe(clean.projectedUnits);
    expect(withDupe.total).toBe(clean.total);
  });
});

describe('repriceBook', () => {
  const accounts: Account[] = [
    { ...account, id: 'a1', companyName: 'Under', seats: 10 },
    { ...account, id: 'a2', companyName: 'Over', seats: 10 },
  ];
  const usageEvents: UsageEvent[] = [
    usage(50_000, { accountId: 'a1', idempotencyKey: 'a1' }),
    usage(150_000, { accountId: 'a2', idempotencyKey: 'a2' }),
  ];

  it('reports no change when nothing is overridden', () => {
    const impact = repriceBook({
      accounts, plans: [growth], usage: usageEvents, period: PERIOD, overrides: {},
    });
    expect(impact.revenueDelta).toBe(ZERO);
    expect(impact.unaffected).toBe(2);
    expect(impact.crossingIntoOverage).toBe(0);
  });

  it('counts accounts pushed into overage by a lower allowance', () => {
    const impact = repriceBook({
      accounts, plans: [growth], usage: usageEvents, period: PERIOD,
      overrides: { growth: { includedUnits: 40_000 } },
    });
    expect(impact.crossingIntoOverage).toBe(1);
    expect(impact.revenueDelta).toBeGreaterThan(0);
  });

  it('raises the bill of an already-over account when the rate rises', () => {
    const impact = repriceBook({
      accounts, plans: [growth], usage: usageEvents, period: PERIOD,
      overrides: { growth: { overageRatePerUnit: 0.24 } },
    });
    const over = impact.accounts.find((a) => a.accountId === 'a2')!;
    const under = impact.accounts.find((a) => a.accountId === 'a1')!;
    expect(over.delta).toBeGreaterThan(0);
    expect(under.delta).toBe(ZERO);
    // Already in overage, so it does not "cross" into it.
    expect(over.crossesIntoOverage).toBe(false);
  });

  it('sorts the largest increase first, since those are the accounts to look at', () => {
    const impact = repriceBook({
      accounts, plans: [growth], usage: usageEvents, period: PERIOD,
      overrides: { growth: { overageRatePerUnit: 0.5 } },
    });
    expect(impact.accounts[0]!.accountId).toBe('a2');
  });

  it('flags a bill that more than doubles', () => {
    const impact = repriceBook({
      accounts, plans: [growth], usage: usageEvents, period: PERIOD,
      overrides: { growth: { monthlyBase: fromDollars(900) } },
    });
    expect(impact.sharplyIncreased).toBe(2);
  });
});

describe('recommendPlan', () => {
  const plans = [starter, growth, enterprise];

  it('picks the cheapest plan and explains why, with no overage', () => {
    const r = recommendPlan({ plans, units: 5_000, seats: 3, billingInterval: 'monthly' });
    expect(r.plan.id).toBe('starter');
    expect(r.reason).toMatch(/inside Starter's included allowance/);
  });

  it('prefers a bigger plan once overage outweighs the base difference', () => {
    const r = recommendPlan({ plans, units: 200_000, seats: 5, billingInterval: 'monthly' });
    expect(r.plan.id).toBe('growth');
  });

  it('explains an overage-inclusive recommendation', () => {
    const r = recommendPlan({ plans, units: 120_000, seats: 5, billingInterval: 'monthly' });
    expect(r.plan.id).toBe('growth');
    expect(r.reason).toMatch(/even after/);
  });

  it('returns alternatives ordered by cost', () => {
    const r = recommendPlan({ plans, units: 5_000, seats: 3, billingInterval: 'monthly' });
    const costs = r.alternatives.map((a) => a.monthlyCost);
    expect([...costs].sort((a, b) => a - b)).toEqual(costs);
  });

  it('accounts for the annual discount when comparing', () => {
    const monthly = recommendPlan({ plans, units: 5_000, seats: 3, billingInterval: 'monthly' });
    const annual = recommendPlan({ plans, units: 5_000, seats: 3, billingInterval: 'annual' });
    expect(annual.monthlyCost).toBeLessThan(monthly.monthlyCost);
  });
});

describe('invoice integrity', () => {
  it('total always equals the sum of lines, across a matrix of inputs', () => {
    const unitOptions = [0, 50_000, 100_000, 100_001, 250_000];
    const seatOptions = [3, 10, 25];
    const creditOptions = [ZERO, fromDollars(50), fromDollars(1000)];
    const intervals = ['monthly', 'annual'] as const;

    for (const units of unitOptions) {
      for (const seats of seatOptions) {
        for (const credit of creditOptions) {
          for (const interval of intervals) {
            const inv = computeInvoice({
              account: { ...account, seats, billingInterval: interval },
              plan: growth,
              usage: [usage(units)],
              period: PERIOD,
              creditBalance: credit,
            });
            assertTotalMatchesLines(inv);
            expect(inv.total).toBeGreaterThanOrEqual(0);
            expect(Number.isInteger(inv.total)).toBe(true);
          }
        }
      }
    }
  });

  it('is never negative even with a large credit and a discount', () => {
    const inv = computeInvoice({
      account: { ...account, billingInterval: 'annual' },
      plan: growth,
      usage: [],
      period: PERIOD,
      creditBalance: cents(10_000_00),
    });
    expect(inv.total).toBe(ZERO);
  });
});

describe('projection day accounting', () => {
  it('elapsed and remaining always sum to the period length', () => {
    // Regression: rounding both independently produced "7 of 32 days" in a
    // 31-day month.
    for (let day = 1; day <= 31; day += 1) {
      for (const hour of [0, 12, 23]) {
        const period = monthPeriod(new Date(Date.UTC(2026, 9, day)));
        const p = projectInvoice({
          account,
          plan: growth,
          usage: [],
          period,
          asOf: new Date(Date.UTC(2026, 9, day, hour)),
        });
        expect(p.daysElapsed + p.daysRemaining).toBe(daysInPeriod(period));
        expect(p.daysElapsed).toBeGreaterThanOrEqual(0);
        expect(p.daysRemaining).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('holds across a short month and a leap February', () => {
    for (const month of [1, 3, 11]) {
      const period = monthPeriod(new Date(Date.UTC(2028, month, 15)));
      const p = projectInvoice({
        account, plan: growth, usage: [], period,
        asOf: new Date(Date.UTC(2028, month, 15, 18)),
      });
      expect(p.daysElapsed + p.daysRemaining).toBe(daysInPeriod(period));
    }
  });
});

describe('projection is reproducible from what it shows', () => {
  it('exposes the daily rate the projection is actually built from', () => {
    // The reader must be able to reproduce the projected figure. daysElapsed is
    // rounded for display while the rate uses exact elapsed time, so the rate
    // itself has to be available or the arithmetic cannot be checked.
    const events = Array.from({ length: 7 }, (_, i) =>
      usage(3000, {
        idempotencyKey: `d${i}`,
        occurredAt: new Date(Date.UTC(2026, 8, i + 1, 6)).toISOString(),
      }),
    );
    const p = projectInvoice({
      account, plan: growth, usage: events, period: PERIOD,
      asOf: new Date('2026-09-07T12:00:00Z'),
    });

    // Everything shown must close: used + rate x days remaining.
    expect(p.observedUnits + p.dailyAverage * p.daysRemaining).toBe(p.projectedUnits);
    expect(p.daysElapsed + p.daysRemaining).toBe(daysInPeriod(PERIOD));
    expect(p.dailyAverage).toBeGreaterThan(0);
  });
});

describe('invoice line units', () => {
  it('labels seats as seats, not units', () => {
    const inv = computeInvoice({
      account: { ...account, seats: 14 }, plan: growth, usage: [], period: PERIOD,
    });
    expect(inv.lines.find((l) => l.kind === 'seats')?.unit).toBe('seat');
  });

  it('labels usage overage as units', () => {
    const inv = computeInvoice({
      account, plan: growth, usage: [usage(150_000)], period: PERIOD,
    });
    expect(inv.lines.find((l) => l.kind === 'usage')?.unit).toBe('unit');
  });
});

describe('compareInvoices', () => {
  const base = { account, usage: [usage(99_000)], period: PERIOD };
  const tighter = { ...growth, includedUnits: 40_000 };

  it('reports no changed lines when the plan is identical', () => {
    const c = compareInvoices(
      computeInvoice({ ...base, plan: growth }),
      computeInvoice({ ...base, plan: growth }),
    );
    expect(c.changedLines).toHaveLength(0);
    expect(c.delta).toBe(ZERO);
    expect(c.deltaRatio).toBe(0);
  });

  it('surfaces a line that appears only after the change', () => {
    const c = compareInvoices(
      computeInvoice({ ...base, plan: growth }),
      computeInvoice({ ...base, plan: tighter }),
    );
    const overage = c.changedLines.find((l) => l.kind === 'usage')!;
    expect(overage.before).toBeNull();
    expect(overage.after).toBe(7080); // 59,000 units at 0.12c
    expect(overage.delta).toBe(7080);
  });

  it('leaves unchanged lines out of changedLines but keeps them in lines', () => {
    const c = compareInvoices(
      computeInvoice({ ...base, plan: growth }),
      computeInvoice({ ...base, plan: tighter }),
    );
    expect(c.lines.find((l) => l.kind === 'base')?.changed).toBe(false);
    expect(c.changedLines.some((l) => l.kind === 'base')).toBe(false);
  });

  it('matches lines on kind, so a renamed plan does not read as two changes', () => {
    const renamed = { ...growth, name: 'Growth (2027)' };
    const c = compareInvoices(
      computeInvoice({ ...base, plan: growth }),
      computeInvoice({ ...base, plan: renamed }),
    );
    expect(c.changedLines).toHaveLength(0);
    expect(c.lines.filter((l) => l.kind === 'base')).toHaveLength(1);
  });

  it('computes the total delta and ratio', () => {
    const c = compareInvoices(
      computeInvoice({ ...base, plan: growth }),
      computeInvoice({ ...base, plan: tighter }),
    );
    expect(c.delta).toBe(subtractTotals(c.totalAfter, c.totalBefore));
    expect(c.deltaRatio).toBeCloseTo(c.delta / c.totalBefore, 10);
  });
});

function subtractTotals(a: number, b: number) {
  return a - b;
}

describe('every projected figure closes by hand', () => {
  it('holds at every point in a period, for several usage shapes', () => {
    // A reader checking `used + rate x daysRemaining` must land exactly on the
    // published projection, on any day, for any plan.
    for (const perDay of [0, 1, 997, 12_345]) {
      for (const day of [1, 2, 7, 15, 28, 31]) {
        const period = monthPeriod(new Date(Date.UTC(2026, 9, 1)));
        const events = Array.from({ length: day }, (_, i) =>
          usage(perDay, {
            idempotencyKey: `k${i}`,
            occurredAt: new Date(Date.UTC(2026, 9, i + 1, 3)).toISOString(),
          }),
        );
        const p = projectInvoice({
          account, plan: growth, usage: events, period,
          asOf: new Date(Date.UTC(2026, 9, day, 12)),
        });

        expect(p.observedUnits + p.dailyAverage * p.daysRemaining).toBe(p.projectedUnits);
        expect(p.daysElapsed + p.daysRemaining).toBe(daysInPeriod(period));
        if (p.daysElapsed > 0) {
          expect(p.dailyAverage).toBe(Math.round(p.observedUnits / p.daysElapsed));
        }
      }
    }
  });
});

describe('a plan that cannot bill overage is never flagged as in overage', () => {
  const freeOverage = { ...growth, overageRatePerUnit: 0 };

  it('reports safe even far beyond the allowance', () => {
    const summary = summariseUsage([usage(500_000)], freeOverage, PERIOD);
    expect(usageZone(summary, freeOverage)).toBe('safe');
  });

  it('charges nothing for the excess, so the bill does not move', () => {
    const over = computeInvoice({ account, plan: freeOverage, usage: [usage(500_000)], period: PERIOD });
    const under = computeInvoice({ account, plan: freeOverage, usage: [usage(1_000)], period: PERIOD });
    expect(over.total).toBe(under.total);
  });

  it('does not report an account as crossing into overage when nothing is billable', () => {
    // Regression: dropping the allowance to 0 while the rate was also 0 marked
    // accounts "newly in overage" whose bills did not change by a cent.
    const accounts = [{ ...account, id: 'a1', companyName: 'Flat' }];
    const impact = repriceBook({
      accounts,
      plans: [growth],
      usage: [usage(99_000, { accountId: 'a1', idempotencyKey: 'a1' })],
      period: PERIOD,
      overrides: { growth: { includedUnits: 0, overageRatePerUnit: 0 } },
    });
    expect(impact.crossingIntoOverage).toBe(0);
    expect(impact.accounts[0]!.zoneAfter).toBe('safe');
  });
});
