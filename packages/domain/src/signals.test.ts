import { describe, expect, it } from 'vitest';
import { deriveActivation, type ActivationState } from './activation';
import { fromDollars, ZERO } from './money';
import { detectSignals, RULES } from './signals';
import type { Account, AccountEvent, PricingPlan, UsageEvent } from './types';

const NOW = new Date('2026-10-01T00:00:00Z');
const MS_PER_DAY = 86_400_000;

function daysBefore(days: number): string {
  return new Date(NOW.getTime() - days * MS_PER_DAY).toISOString();
}

const plan: PricingPlan = {
  id: 'growth',
  name: 'Growth',
  monthlyBase: fromDollars(299),
  includedUnits: 30_000,
  overageRatePerUnit: 0.12,
  includedSeats: 10,
  perSeatMonthly: fromDollars(19),
  unlimitedUsage: false,
  annualDiscount: 0.17,
};

function account(id: string, name: string, over: Partial<Account> = {}): Account {
  return {
    id,
    companyName: name,
    contactName: 'A Person',
    contactEmail: `${id}@test.example`,
    planId: 'growth',
    billingInterval: 'monthly',
    status: 'active',
    seats: 10,
    mrr: fromDollars(299),
    createdAt: daysBefore(200),
    creditBalance: ZERO,
    ...over,
  };
}

let seq = 0;
function evt(
  accountId: string,
  type: AccountEvent['type'],
  days: number,
  over: Partial<AccountEvent> = {},
): AccountEvent {
  seq += 1;
  return {
    id: over.id ?? `ev_${seq}`,
    accountId,
    type,
    occurredAt: daysBefore(days),
    summary: type,
    payload: {},
    ...over,
  };
}

/** `perDay` across the recent window, `priorPerDay` across the one before it. */
function usageFor(accountId: string, perDay: number, priorPerDay = perDay): UsageEvent[] {
  seq += 1;
  const tag = seq;
  return [
    ...Array.from({ length: 14 }, (_, i) => ({
      id: `u_${tag}_p${i}`,
      accountId,
      occurredAt: daysBefore(i + 15),
      units: priorPerDay,
      source: 'api',
      idempotencyKey: `${tag}_p${i}`,
    })),
    ...Array.from({ length: 14 }, (_, i) => ({
      id: `u_${tag}_r${i}`,
      accountId,
      occurredAt: daysBefore(i + 0.5),
      units: perDay,
      source: 'api',
      idempotencyKey: `${tag}_r${i}`,
    })),
  ];
}

function activatedState(accountId: string): ActivationState {
  return deriveActivation({
    accountId,
    createdAt: daysBefore(200),
    events: [
      evt(accountId, 'activation_step', 180, { payload: { step: 'rule_created' } }),
      evt(accountId, 'activation', 179, { payload: { step: 'list_viewed' } }),
    ],
    asOf: NOW,
  });
}

function run(input: {
  accounts: Account[];
  events?: AccountEvent[];
  usage?: UsageEvent[];
  activation?: Map<string, ActivationState>;
}) {
  return detectSignals({
    accounts: input.accounts,
    plans: [plan],
    events: input.events ?? [],
    usage: input.usage ?? [],
    activation: input.activation ?? new Map(input.accounts.map((a) => [a.id, activatedState(a.id)])),
    asOf: NOW,
  });
}

// ---------------------------------------------------------------------------

describe('a quiet book produces no signals', () => {
  it('stays silent when nothing is wrong', () => {
    const a = account('a1', 'Steady Co');
    // Flat, and roughly 60% of the 30,000 allowance: not declining, not
    // spiking, comfortably inside both plan-fit thresholds.
    const signals = run({ accounts: [a], usage: usageFor('a1', 650) });
    expect(signals).toHaveLength(0);
  });
});

describe('usage rules', () => {
  it('flags a decline past the threshold', () => {
    const signals = run({ accounts: [account('a1', 'Fading')], usage: usageFor('a1', 700, 1500) });
    const s = signals.find((x) => x.kind === 'usage_declining');
    expect(s).toBeDefined();
    expect(s!.headline).toMatch(/down 53%/);
  });

  it('does not flag a decline that sits inside the threshold', () => {
    // 10% down, against a 15% rule.
    const signals = run({ accounts: [account('a1', 'Fine')], usage: usageFor('a1', 1350, 1500) });
    expect(signals.some((s) => s.kind === 'usage_declining')).toBe(false);
  });

  it('escalates a steep decline to critical', () => {
    const signals = run({ accounts: [account('a1', 'Falling')], usage: usageFor('a1', 400, 1500) });
    expect(signals.find((s) => s.kind === 'usage_declining')!.severity).toBe('critical');
  });

  it('flags a spike', () => {
    const signals = run({ accounts: [account('a1', 'Surging')], usage: usageFor('a1', 1600, 900) });
    expect(signals.some((s) => s.kind === 'usage_spike')).toBe(true);
  });

  it('cannot flag a trend with no prior window to compare against', () => {
    const only = [
      {
        id: 'u1', accountId: 'a1', occurredAt: daysBefore(2),
        units: 50_000, source: 'api', idempotencyKey: 'k1',
      },
    ];
    const signals = run({ accounts: [account('a1', 'New')], usage: only });
    expect(signals.some((s) => s.kind === 'usage_declining' || s.kind === 'usage_spike')).toBe(false);
  });
});

describe('plan fit', () => {
  it('flags an account consistently over its allowance as expansion', () => {
    // ~2,000/day over 30 days against a 30,000 allowance.
    const signals = run({ accounts: [account('a1', 'Fieldstack')], usage: usageFor('a1', 2000) });
    const s = signals.find((x) => x.kind === 'expansion_opportunity');
    expect(s).toBeDefined();
    expect(s!.severity).toBe('info');
  });

  it('flags an account barely touching its allowance as a downgrade risk', () => {
    const signals = run({ accounts: [account('a1', 'Quiet Co')], usage: usageFor('a1', 200) });
    expect(signals.some((s) => s.kind === 'downgrade_risk')).toBe(true);
  });

  it('does not call an unactivated account a downgrade risk', () => {
    // It is not under-using its plan, it never started.
    const never = deriveActivation({
      accountId: 'a1', createdAt: daysBefore(20), events: [], asOf: NOW,
    });
    const signals = run({
      accounts: [account('a1', 'Never Started', { status: 'trial' })],
      usage: usageFor('a1', 200),
      activation: new Map([['a1', never]]),
    });
    expect(signals.some((s) => s.kind === 'downgrade_risk')).toBe(false);
  });

  it('says nothing about plan fit on an unlimited plan', () => {
    const unlimited = { ...plan, unlimitedUsage: true };
    const signals = detectSignals({
      accounts: [account('a1', 'Enterprise Co')],
      plans: [unlimited],
      events: [],
      usage: usageFor('a1', 9000),
      activation: new Map([['a1', activatedState('a1')]]),
      asOf: NOW,
    });
    expect(signals.some((s) => s.kind === 'expansion_opportunity')).toBe(false);
    expect(signals.some((s) => s.kind === 'downgrade_risk')).toBe(false);
  });
});

describe('activation stalls come from the derived state', () => {
  it('reports a stall rather than re-deriving one', () => {
    const stalled = deriveActivation({
      accountId: 'a1',
      createdAt: daysBefore(30),
      events: [evt('a1', 'activation_step', 25, { payload: { step: 'source_connected' } })],
      asOf: NOW,
    });
    const signals = run({
      accounts: [account('a1', 'Tidewater', { status: 'trial' })],
      activation: new Map([['a1', stalled]]),
    });
    const s = signals.find((x) => x.kind === 'activation_stalled');
    expect(s).toBeDefined();
    expect(s!.headline).toMatch(/sat at connected for 25 days/);
  });

  it('escalates an account that finished onboarding and reached nothing', () => {
    const onboarded = deriveActivation({
      accountId: 'a1',
      createdAt: daysBefore(30),
      events: [
        evt('a1', 'activation_step', 25, { payload: { step: 'source_connected' } }),
        evt('a1', 'activation_step', 24, { payload: { step: 'team_invited' } }),
        evt('a1', 'activation_step', 23, { payload: { step: 'billing_added' } }),
      ],
      asOf: NOW,
    });
    const signals = run({
      accounts: [account('a1', 'Slate Labs', { status: 'trial' })],
      activation: new Map([['a1', onboarded]]),
    });
    const s = signals.find((x) => x.kind === 'activation_stalled')!;
    expect(s.severity).toBe('critical');
    expect(s.recommendedAction).toMatch(/reached nothing/i);
  });
});

describe('payment failures', () => {
  const failing = (id: string, days: number) => [
    evt(id, 'payment_failed', days, { id: `fail_${id}` }),
  ];

  it('does not call a single failure a cluster', () => {
    const signals = run({
      accounts: [account('a1', 'One'), account('a2', 'Two')],
      events: failing('a1', 5),
      usage: [...usageFor('a1', 1500), ...usageFor('a2', 1500)],
    });
    expect(signals.some((s) => s.kind === 'payment_failure_cluster')).toBe(false);
  });

  it('reports two or more as one cluster, not one signal each', () => {
    const signals = run({
      accounts: [account('a1', 'One'), account('a2', 'Two')],
      events: [...failing('a1', 5), ...failing('a2', 9)],
      usage: [...usageFor('a1', 1500), ...usageFor('a2', 1500)],
    });
    const clusters = signals.filter((s) => s.kind === 'payment_failure_cluster');
    expect(clusters).toHaveLength(1);
    expect(clusters[0]!.accountIds).toHaveLength(2);
    expect(clusters[0]!.severity).toBe('critical');
  });

  it('excludes a failure that was recovered', () => {
    const signals = run({
      accounts: [account('a1', 'One'), account('a2', 'Two')],
      events: [
        ...failing('a1', 5),
        ...failing('a2', 9),
        evt('a2', 'payment_recovered', 8),
      ],
      usage: [...usageFor('a1', 1500), ...usageFor('a2', 1500)],
    });
    expect(signals.some((s) => s.kind === 'payment_failure_cluster')).toBe(false);
  });

  it('excludes a failure older than the window', () => {
    const signals = run({
      accounts: [account('a1', 'One'), account('a2', 'Two')],
      events: [...failing('a1', 5), ...failing('a2', RULES.clusterWindowDays + 5)],
      usage: [...usageFor('a1', 1500), ...usageFor('a2', 1500)],
    });
    expect(signals.some((s) => s.kind === 'payment_failure_cluster')).toBe(false);
  });
});

describe('presentation contract', () => {
  it('never claims certainty', () => {
    const signals = run({ accounts: [account('a1', 'Fading')], usage: usageFor('a1', 400, 1500) });
    for (const s of signals) {
      expect(s.confidence).toBeGreaterThan(0);
      expect(s.confidence).toBeLessThan(1);
    }
  });

  it('raises confidence when more evidence corroborates', () => {
    const bare = run({ accounts: [account('a1', 'A')], usage: usageFor('a1', 400, 1500) })
      .find((s) => s.kind === 'usage_declining')!;
    const corroborated = run({
      accounts: [account('a1', 'A')],
      usage: usageFor('a1', 400, 1500),
      events: [
        evt('a1', 'support_event', 8, { severity: 'warning' }),
        evt('a1', 'usage_change', 12),
      ],
    }).find((s) => s.kind === 'usage_declining')!;
    expect(corroborated.confidence).toBeGreaterThan(bare.confidence);
  });

  it('orders the list most severe first, then best corroborated', () => {
    const signals = run({
      accounts: [account('a1', 'One'), account('a2', 'Two')],
      events: [evt('a1', 'payment_failed', 3), evt('a2', 'payment_failed', 4)],
      usage: [...usageFor('a1', 400, 1500), ...usageFor('a2', 1500)],
    });
    const ranks = { info: 0, warning: 1, critical: 2 } as const;
    const seen = signals.map((s) => ranks[s.severity]);
    expect([...seen].sort((a, b) => b - a)).toEqual(seen);
  });

  it('gives every signal an action, not just an observation', () => {
    const signals = run({
      accounts: [account('a1', 'One'), account('a2', 'Two')],
      events: [evt('a1', 'payment_failed', 3), evt('a2', 'payment_failed', 4)],
      usage: [...usageFor('a1', 400, 1500), ...usageFor('a2', 200)],
    });
    expect(signals.length).toBeGreaterThan(2);
    for (const s of signals) {
      expect(s.recommendedAction.length).toBeGreaterThan(20);
      expect(s.headline.length).toBeGreaterThan(10);
    }
  });
});
