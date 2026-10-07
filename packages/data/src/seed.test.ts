import { describe, expect, it } from 'vitest';
import { deriveActivation, summariseCohort } from '@headroom/domain';
import { HERO_ACCOUNT_ID, REFERENCE_NOW, seedWorld } from './seed';

/**
 * These tests exist to protect the one property that makes the lab read as a
 * product rather than five demos: the world is internally coherent, and the
 * same account tells the same story everywhere.
 *
 * Coherence is easy to break silently. Change a plan's included units and
 * suddenly the "consistently over usage" account is under it, and the
 * expansion signal in Account Intelligence contradicts the invoice in the
 * Monetisation Lab. A reviewer would notice; a test notices first.
 */

describe('determinism', () => {
  it('produces equivalent data on every call', () => {
    expect(seedWorld()).toEqual(seedWorld());
  });

  it('is anchored to a fixed reference date, never Date.now()', () => {
    expect(seedWorld().referenceNow).toEqual(REFERENCE_NOW);
    // If this ever starts failing by a day, something reached for the clock.
    expect(REFERENCE_NOW.toISOString()).toBe('2026-10-07T12:00:00.000Z');
  });
});

describe('referential integrity', () => {
  const world = seedWorld();
  const accountIds = new Set(world.accounts.map((a) => a.id));
  const planIds = new Set(world.plans.map((p) => p.id));

  it('every account references a plan that exists', () => {
    for (const account of world.accounts) {
      expect(planIds.has(account.planId)).toBe(true);
    }
  });

  it('every usage event references an account that exists', () => {
    for (const event of world.usageEvents) {
      expect(accountIds.has(event.accountId)).toBe(true);
    }
  });

  it('every account event references an account that exists', () => {
    for (const event of world.accountEvents) {
      expect(accountIds.has(event.accountId)).toBe(true);
    }
  });

  it('gives every account some usage history', () => {
    for (const account of world.accounts) {
      const count = world.usageEvents.filter((e) => e.accountId === account.id).length;
      expect(count).toBeGreaterThan(0);
    }
  });
});

describe('money is always whole cents', () => {
  const world = seedWorld();

  it('across plans', () => {
    for (const plan of world.plans) {
      expect(Number.isInteger(plan.monthlyBase)).toBe(true);
      expect(Number.isInteger(plan.perSeatMonthly)).toBe(true);
    }
  });

  it('across accounts', () => {
    for (const account of world.accounts) {
      expect(Number.isInteger(account.mrr)).toBe(true);
      expect(Number.isInteger(account.creditBalance)).toBe(true);
    }
  });
});

describe('activation is derived, never stored', () => {
  const world = seedWorld();
  const stateOf = (id: string) =>
    deriveActivation({
      accountId: id,
      createdAt: world.accounts.find((a) => a.id === id)!.createdAt,
      events: world.accountEvents,
      asOf: REFERENCE_NOW,
    });

  it('exposes no stored activation flag on the account record', () => {
    for (const account of world.accounts) {
      expect(account).not.toHaveProperty('activatedAt');
    }
  });

  it('never activates an account before it was created', () => {
    for (const account of world.accounts) {
      const state = stateOf(account.id);
      if (!state.activatedAt) continue;
      expect(new Date(state.activatedAt).getTime()).toBeGreaterThanOrEqual(
        new Date(account.createdAt).getTime(),
      );
    }
  });

  it('leaves only trial accounts unactivated', () => {
    for (const account of world.accounts) {
      if (!stateOf(account.id).activated) expect(account.status).toBe('trial');
    }
  });

  it('spreads the cohort across stages rather than bunching at one', () => {
    const cohort = summariseCohort(world.accounts.map((a) => stateOf(a.id)));
    const occupied = Object.values(cohort.byStage).filter((n) => n > 0).length;
    // A cohort sitting in one or two stages cannot demonstrate a funnel.
    expect(occupied).toBeGreaterThanOrEqual(4);
    expect(cohort.total).toBe(world.accounts.length);
  });

  it('includes at least one stalled account and one that finished onboarding without activating', () => {
    const cohort = summariseCohort(world.accounts.map((a) => stateOf(a.id)));
    expect(cohort.stalled).toBeGreaterThanOrEqual(1);
    expect(cohort.onboardedButNotActivated).toBeGreaterThanOrEqual(1);
  });
});

describe('Slate Labs — onboarding complete but not activated', () => {
  const world = seedWorld();
  const slate = world.accounts.find((a) => a.id === 'acc_slate_labs');

  it('finished every step the product nags about and still reached nothing', () => {
    expect(slate).toBeDefined();
    const state = deriveActivation({
      accountId: 'acc_slate_labs',
      createdAt: slate!.createdAt,
      events: world.accountEvents,
      asOf: REFERENCE_NOW,
    });
    // The state the whole build exists to make visible.
    expect(state.checklistComplete).toBe(true);
    expect(state.activated).toBe(false);
    expect(state.onboardedButNotActivated).toBe(true);
  });

  it('has completed setup steps despite not being activated', () => {
    const steps = world.accountEvents.filter(
      (e) => e.accountId === 'acc_slate_labs' && e.type === 'activation_step',
    );
    expect(steps.length).toBeGreaterThanOrEqual(2);

    const activations = world.accountEvents.filter(
      (e) => e.accountId === 'acc_slate_labs' && e.type === 'activation',
    );
    expect(activations).toHaveLength(0);
  });
});

describe('Orbit Health — the hero narrative', () => {
  const world = seedWorld();
  const orbit = world.accounts.find((a) => a.id === HERO_ACCOUNT_ID);
  const events = world.accountEvents.filter((e) => e.accountId === HERO_ACCOUNT_ID);
  const usage = world.usageEvents.filter((e) => e.accountId === HERO_ACCOUNT_ID);

  it('is on Growth and past due', () => {
    expect(orbit?.planId).toBe('growth');
    expect(orbit?.status).toBe('past_due');
  });

  it('activated 34 days before the reference date, derived from its events', () => {
    const state = deriveActivation({
      accountId: HERO_ACCOUNT_ID,
      createdAt: orbit!.createdAt,
      events: world.accountEvents,
      asOf: REFERENCE_NOW,
    });
    expect(state.activated).toBe(true);
    const days = (REFERENCE_NOW.getTime() - new Date(state.activatedAt!).getTime()) / 86_400_000;
    expect(Math.round(days)).toBe(34);
  });

  it('has a failed payment 4 days before the reference date', () => {
    const failure = events.find((e) => e.type === 'payment_failed');
    expect(failure).toBeDefined();
    const days = (REFERENCE_NOW.getTime() - new Date(failure!.occurredAt).getTime()) / 86_400_000;
    expect(Math.round(days)).toBe(4);
  });

  it('has not recovered that payment, which is why it is past due', () => {
    expect(events.some((e) => e.type === 'payment_recovered')).toBe(false);
  });

  it('has two support events about implementation difficulty', () => {
    const support = events.filter(
      (e) => e.type === 'support_event' && e.payload.theme === 'implementation_difficulty',
    );
    expect(support).toHaveLength(2);
  });

  it('shows usage genuinely declining over the last fortnight', () => {
    const sorted = [...usage].sort(
      (a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime(),
    );
    const window = 14;
    const recent = sorted.slice(-window);
    const prior = sorted.slice(-window * 2, -window);

    const mean = (xs: typeof sorted) => xs.reduce((sum, e) => sum + e.units, 0) / xs.length;
    // The decline must be real, not noise. Asserting direction and rough
    // magnitude rather than an exact figure, since daily noise is seeded in.
    expect(mean(recent)).toBeLessThan(mean(prior));
    const drop = 1 - mean(recent) / mean(prior);
    expect(drop).toBeGreaterThan(0.03);
  });
});

describe('deliberately imperfect data', () => {
  const world = seedWorld();
  const usage = world.usageEvents.filter((e) => e.accountId === HERO_ACCOUNT_ID);

  it('contains a duplicate meter delivery with a distinct id', () => {
    const keys = usage.map((e) => e.idempotencyKey);
    const duplicated = keys.filter((k, i) => keys.indexOf(k) !== i);
    expect(duplicated.length).toBe(1);

    const pair = usage.filter((e) => e.idempotencyKey === duplicated[0]);
    expect(pair).toHaveLength(2);
    // Same key, different id — dedup must key on the key, not the id.
    expect(pair[0]!.id).not.toBe(pair[1]!.id);
    expect(pair[0]!.units).toBe(pair[1]!.units);
  });

  it('would overcharge if summed naively, which is the whole point', () => {
    const naive = usage.reduce((sum, e) => sum + e.units, 0);
    const deduped = [...new Map(usage.map((e) => [e.idempotencyKey, e])).values()].reduce(
      (sum, e) => sum + e.units,
      0,
    );
    expect(naive).toBeGreaterThan(deduped);
  });

  it('is not sorted by occurrence, so consumers must sort rather than assume', () => {
    const times = usage.map((e) => new Date(e.occurredAt).getTime());
    const sorted = [...times].sort((a, b) => a - b);
    expect(times).not.toEqual(sorted);
  });

  it('has a payment failure with no reason field, as real webhooks do', () => {
    const failure = world.accountEvents.find(
      (e) => e.accountId === HERO_ACCOUNT_ID && e.type === 'payment_failed',
    );
    expect(failure).toBeDefined();
    expect(failure!.payload.reason).toBeUndefined();
  });
});

describe('Fieldstack — the expansion case', () => {
  const world = seedWorld();

  it('genuinely exceeds its plan allowance, so the signal is not a fiction', () => {
    const account = world.accounts.find((a) => a.id === 'acc_fieldstack')!;
    const plan = world.plans.find((p) => p.id === account.planId)!;

    // Last 30 days of usage against a monthly allowance.
    const sorted = world.usageEvents
      .filter((e) => e.accountId === account.id)
      .sort((a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime());
    const monthUnits = sorted.slice(-30).reduce((sum, e) => sum + e.units, 0);

    expect(monthUnits).toBeGreaterThan(plan.includedUnits);
  });
});
