import { describe, expect, it } from 'vitest';
import { deriveActivation } from './activation';
import {
  BASELINE,
  bandFor,
  calculateHealth,
  explainChange,
  usageTrend,
  WEIGHTS,
} from './health';
import type { AccountEvent, UsageEvent } from './types';

const ACCOUNT = 'acc_test';
const NOW = new Date('2026-10-01T00:00:00Z');

let seq = 0;
function evt(partial: Partial<AccountEvent> & Pick<AccountEvent, 'type' | 'occurredAt'>): AccountEvent {
  seq += 1;
  return {
    id: partial.id ?? `ev_${seq}`,
    accountId: partial.accountId ?? ACCOUNT,
    summary: partial.summary ?? partial.type,
    payload: partial.payload ?? {},
    ...partial,
  } as AccountEvent;
}

function daysBefore(days: number, base = NOW): string {
  return new Date(base.getTime() - days * 86_400_000).toISOString();
}

function usage(units: number, days: number, key?: string): UsageEvent {
  seq += 1;
  return {
    id: `ue_${seq}`,
    accountId: ACCOUNT,
    occurredAt: daysBefore(days),
    units,
    source: 'api',
    idempotencyKey: key ?? `k_${seq}`,
  };
}

/** A steady account: flat usage, nothing wrong. */
function flatUsage(perDay = 1000): UsageEvent[] {
  return Array.from({ length: 28 }, (_, i) => usage(perDay, i + 0.5));
}

const activated = deriveActivation({
  accountId: ACCOUNT,
  createdAt: daysBefore(90),
  events: [
    evt({ type: 'activation_step', occurredAt: daysBefore(60), payload: { step: 'rule_created' } }),
    evt({ type: 'activation', occurredAt: daysBefore(59), payload: { step: 'list_viewed' } }),
  ],
  asOf: NOW,
});

function health(events: AccountEvent[], usageEvents: UsageEvent[] = flatUsage(), asOf = NOW) {
  return calculateHealth({
    accountId: ACCOUNT,
    events,
    usage: usageEvents,
    activation: activated,
    asOf,
  });
}

// ---------------------------------------------------------------------------

describe('bands', () => {
  it('maps scores to bands at the stated thresholds', () => {
    expect(bandFor(100)).toBe('healthy');
    expect(bandFor(80)).toBe('healthy');
    expect(bandFor(79)).toBe('watch');
    expect(bandFor(60)).toBe('watch');
    expect(bandFor(59)).toBe('at_risk');
    expect(bandFor(40)).toBe('at_risk');
    expect(bandFor(39)).toBe('critical');
    expect(bandFor(0)).toBe('critical');
  });
});

describe('usage trend', () => {
  it('reports no trend when there is no prior window to compare against', () => {
    // Claiming "flat" without a baseline would be a different, untrue statement.
    expect(usageTrend([usage(500, 2)], NOW)).toBeNull();
  });

  it('measures a decline between the two windows', () => {
    const events = [
      ...Array.from({ length: 14 }, (_, i) => usage(1000, i + 15)),
      ...Array.from({ length: 14 }, (_, i) => usage(500, i + 0.5)),
    ];
    const trend = usageTrend(events, NOW)!;
    expect(Math.round(trend.changePercent)).toBe(-50);
  });

  it('does not read a redelivered meter event as a spike', () => {
    const base = [
      ...Array.from({ length: 14 }, (_, i) => usage(1000, i + 15, `p${i}`)),
      ...Array.from({ length: 14 }, (_, i) => usage(1000, i + 0.5, `r${i}`)),
    ];
    const clean = usageTrend(base, NOW)!;
    const withDupe = usageTrend([...base, { ...base[20]!, id: 'redelivered' }], NOW)!;
    expect(withDupe.changePercent).toBe(clean.changePercent);
  });
});

describe('scoring', () => {
  it('starts from the baseline plus activation for an otherwise quiet account', () => {
    const h = health([]);
    expect(h.score).toBe(BASELINE + WEIGHTS.activation.activated);
    expect(h.band).toBe('watch');
  });

  it('charges an open payment failure', () => {
    const h = health([evt({ type: 'payment_failed', occurredAt: daysBefore(4) })]);
    const line = h.contributions.find((c) => c.label.includes('not recovered'));
    expect(line?.points).toBe(WEIGHTS.paymentFailedOpen);
  });

  it('charges much less once that failure is recovered', () => {
    const open = health([evt({ type: 'payment_failed', occurredAt: daysBefore(4) })]);
    const fixed = health([
      evt({ type: 'payment_failed', occurredAt: daysBefore(4) }),
      evt({ type: 'payment_recovered', occurredAt: daysBefore(3) }),
    ]);
    expect(fixed.score).toBeGreaterThan(open.score);
    expect(fixed.contributions.some((c) => c.label.includes('not recovered'))).toBe(false);
  });

  it('treats a later failure after a recovery as open again', () => {
    const h = health([
      evt({ type: 'payment_failed', occurredAt: daysBefore(20) }),
      evt({ type: 'payment_recovered', occurredAt: daysBefore(19) }),
      evt({ type: 'payment_failed', occurredAt: daysBefore(2), id: 'ev_recent' }),
    ]);
    const line = h.contributions.find((c) => c.label.includes('not recovered'));
    expect(line?.eventId).toBe('ev_recent');
  });

  it('caps the damage from a pile of support events', () => {
    const many = Array.from({ length: 12 }, (_, i) =>
      evt({ type: 'support_event', severity: 'warning', occurredAt: daysBefore(i + 1) }),
    );
    const support = health(many).contributions.filter((c) => c.points === WEIGHTS.supportWarning);
    const total = support.reduce((sum, c) => sum + c.points, 0);
    expect(total).toBeGreaterThanOrEqual(WEIGHTS.supportCap);
  });

  it('ignores risk_signal events, which exist because health already fell', () => {
    // Counting them would charge the account twice and make attribution circular.
    const withSignal = health([
      evt({ type: 'risk_signal', severity: 'critical', occurredAt: daysBefore(1) }),
    ]);
    expect(withSignal.score).toBe(health([]).score);
  });

  it('ignores events belonging to another account', () => {
    const h = health([
      evt({ type: 'payment_failed', occurredAt: daysBefore(3), accountId: 'acc_other' }),
    ]);
    expect(h.score).toBe(health([]).score);
  });

  it('ignores events after the as-of date, so a past score stays a past score', () => {
    const future = evt({ type: 'payment_failed', occurredAt: daysBefore(-5) });
    expect(health([future]).score).toBe(health([]).score);
  });

  it('is order-independent', () => {
    const events = [
      evt({ type: 'support_event', severity: 'warning', occurredAt: daysBefore(10) }),
      evt({ type: 'payment_failed', occurredAt: daysBefore(4) }),
    ];
    expect(health([...events].reverse()).score).toBe(health(events).score);
  });

  it('never leaves the 0 to 100 range', () => {
    const brutal = Array.from({ length: 40 }, (_, i) =>
      evt({ type: 'support_event', severity: 'critical', occurredAt: daysBefore(i + 1) }),
    );
    const h = health([...brutal, evt({ type: 'payment_failed', occurredAt: daysBefore(1) })]);
    expect(h.score).toBeGreaterThanOrEqual(0);
    expect(h.score).toBeLessThanOrEqual(100);
  });
});

describe('the score is decomposable', () => {
  it('sums its own contributions', () => {
    const h = health([
      evt({ type: 'payment_failed', occurredAt: daysBefore(4) }),
      evt({ type: 'support_event', severity: 'warning', occurredAt: daysBefore(9) }),
    ]);
    const summed = h.contributions.reduce((s, c) => s + c.points, 0);
    expect(h.score).toBe(Math.max(0, Math.min(100, Math.round(summed))));
  });

  it('attributes event-driven contributions back to their event', () => {
    const failure = evt({ type: 'payment_failed', occurredAt: daysBefore(4), id: 'ev_pay' });
    const support = evt({
      type: 'support_event', severity: 'warning', occurredAt: daysBefore(9), id: 'ev_sup',
    });
    const ids = health([failure, support]).contributions.map((c) => c.eventId);
    expect(ids).toContain('ev_pay');
    expect(ids).toContain('ev_sup');
  });

  it('leaves non-event contributions unattributed rather than inventing a source', () => {
    const baseline = health([]).contributions.find((c) => c.label === 'Baseline');
    expect(baseline?.eventId).toBeUndefined();
  });
});

describe('explaining a change', () => {
  const quiet: AccountEvent[] = [];
  const troubled: AccountEvent[] = [
    evt({ type: 'support_event', severity: 'warning', occurredAt: daysBefore(19), id: 'ev_s1' }),
    evt({ type: 'support_event', severity: 'warning', occurredAt: daysBefore(9), id: 'ev_s2' }),
    evt({ type: 'payment_failed', occurredAt: daysBefore(4), id: 'ev_pay' }),
  ];

  it('names the events responsible for a drop', () => {
    const change = explainChange(health(quiet), health(troubled));
    expect(change.delta).toBeLessThan(0);
    expect(change.causes.map((c) => c.eventId)).toEqual(
      expect.arrayContaining(['ev_pay', 'ev_s1', 'ev_s2']),
    );
  });

  it('orders causes by how much they moved the score', () => {
    const change = explainChange(health(quiet), health(troubled));
    const sizes = change.causes.map((c) => Math.abs(c.delta));
    expect([...sizes].sort((a, b) => b - a)).toEqual(sizes);
    // The open payment failure is the largest single cause here.
    expect(change.causes[0]!.eventId).toBe('ev_pay');
  });

  it('accounts for the whole move when nothing is clamped', () => {
    const change = explainChange(health(quiet), health(troubled));
    const accounted = change.causes.reduce((s, c) => s + c.delta, 0);
    expect(accounted).toBe(change.delta);
    expect(change.coverage).toBe(1);
  });

  it('reports a new contribution as appearing rather than as a change from zero', () => {
    const change = explainChange(health(quiet), health(troubled));
    const pay = change.causes.find((c) => c.eventId === 'ev_pay')!;
    expect(pay.before).toBeNull();
    expect(pay.after).toBe(WEIGHTS.paymentFailedOpen);
  });

  it('finds no causes when nothing changed', () => {
    const change = explainChange(health(quiet), health(quiet));
    expect(change.causes).toHaveLength(0);
    expect(change.delta).toBe(0);
    expect(change.coverage).toBe(1);
  });

  it('reports partial coverage when the score hit a bound', () => {
    // Causes can exceed the visible move once the score clamps, and the
    // interface has to know rather than show arithmetic that overshoots.
    const brutal = Array.from({ length: 40 }, (_, i) =>
      evt({ type: 'support_event', severity: 'critical', occurredAt: daysBefore(i + 1) }),
    );
    const change = explainChange(health(quiet), health(brutal));
    expect(change.to).toBe(Math.max(0, change.to));
    expect(change.coverage).toBeLessThanOrEqual(1);
  });
});
