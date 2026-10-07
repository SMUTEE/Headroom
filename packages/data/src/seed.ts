/**
 * The synthetic world.
 *
 * ALL DATA HERE IS FICTIONAL. No real company, person, usage figure or revenue
 * number appears anywhere in Headroom.
 *
 * Two properties matter more than volume:
 *
 * 1. **Deterministic.** Seeded from a fixed PRNG and anchored to a fixed
 *    reference date, never `Date.now()`. "Reset demo" has to restore exactly
 *    the same state, and tests cannot assert against data that drifts daily.
 *
 * 2. **Internally coherent.** An account's usage relates logically to its
 *    plan, its invoice, its health score, its activation state and its events.
 *    Eight independently generated datasets would be eight demos; one coherent
 *    world is a product. Orbit Health tells the same story in every build.
 */

import type {
  Account,
  AccountEvent,
  PricingPlan,
  UsageEvent,
} from '@headroom/domain';
import { fromDollars } from '@headroom/domain';

/**
 * The world's "now". Everything relative is computed from here, so the data is
 * identical on every run and in every environment.
 */
export const REFERENCE_NOW = new Date('2026-10-07T12:00:00.000Z');

/** Days before the reference date, as an ISO string. */
function daysAgo(days: number, hours = 0): string {
  const d = new Date(REFERENCE_NOW);
  d.setUTCDate(d.getUTCDate() - days);
  d.setUTCHours(d.getUTCHours() - hours);
  return d.toISOString();
}

/** mulberry32 — small, fast, and identical across platforms. */
function createRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------------------
// Plans
// ---------------------------------------------------------------------------

export function seedPlans(): PricingPlan[] {
  return [
    {
      id: 'starter',
      name: 'Starter',
      monthlyBase: fromDollars(49),
      includedUnits: 10_000,
      overageRatePerUnit: 0.25, // cents per unit → $0.0025
      includedSeats: 3,
      perSeatMonthly: fromDollars(12),
      usageCap: null,
      annualDiscount: 0.1,
    },
    {
      id: 'growth',
      name: 'Growth',
      monthlyBase: fromDollars(299),
      includedUnits: 100_000,
      overageRatePerUnit: 0.12,
      includedSeats: 10,
      perSeatMonthly: fromDollars(19),
      usageCap: null,
      annualDiscount: 0.17,
    },
    {
      id: 'scale',
      name: 'Scale',
      monthlyBase: fromDollars(899),
      includedUnits: 500_000,
      overageRatePerUnit: 0.08,
      includedSeats: 25,
      perSeatMonthly: fromDollars(25),
      usageCap: null,
      annualDiscount: 0.2,
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      monthlyBase: fromDollars(2400),
      includedUnits: 2_000_000,
      overageRatePerUnit: 0.05,
      includedSeats: 100,
      perSeatMonthly: fromDollars(0),
      // Unlimited usage: overage is never charged. An edge case the billing
      // engine has to handle rather than divide by.
      usageCap: null,
      annualDiscount: 0.2,
    },
  ];
}

// ---------------------------------------------------------------------------
// Accounts
// ---------------------------------------------------------------------------

/**
 * The hero account, referenced by every build.
 *
 * Its story: on Growth, activated 34 days ago, usage down 23% over the last
 * fortnight, one payment failed 4 days ago, two support conversations
 * mentioning implementation difficulty, health fallen from 82 to 54.
 *
 * It is also the account carrying deliberately imperfect data — a duplicate
 * meter event, out-of-order timestamps and a stale health calculation — so the
 * handling is demonstrated on the account people actually look at.
 */
export const HERO_ACCOUNT_ID = 'acc_orbit_health';

export function seedAccounts(): Account[] {
  return [
    {
      id: HERO_ACCOUNT_ID,
      companyName: 'Orbit Health',
      contactName: 'Dara Mensah',
      contactEmail: 'dara@orbithealth.example',
      planId: 'growth',
      billingInterval: 'monthly',
      status: 'past_due',
      seats: 14,
      mrr: fromDollars(299 + 4 * 19),
      createdAt: daysAgo(61),
      activatedAt: daysAgo(34),
      creditBalance: fromDollars(0),
    },
    {
      id: 'acc_northstar',
      companyName: 'Northstar Logistics',
      contactName: 'Priya Raghunathan',
      contactEmail: 'priya@northstar.example',
      planId: 'scale',
      billingInterval: 'annual',
      status: 'active',
      seats: 31,
      mrr: fromDollars(899 + 6 * 25),
      createdAt: daysAgo(418),
      activatedAt: daysAgo(405),
      creditBalance: fromDollars(0),
    },
    {
      id: 'acc_loomline',
      companyName: 'Loomline',
      contactName: 'Tomas Eriksen',
      contactEmail: 'tomas@loomline.example',
      planId: 'growth',
      billingInterval: 'monthly',
      status: 'active',
      seats: 9,
      mrr: fromDollars(299),
      createdAt: daysAgo(203),
      activatedAt: daysAgo(190),
      creditBalance: fromDollars(45),
    },
    {
      // Completed every onboarding step and still not activated. The state
      // that proves the product knows signup is not activation.
      id: 'acc_slate_labs',
      companyName: 'Slate Labs',
      contactName: 'Amara Nwosu',
      contactEmail: 'amara@slatelabs.example',
      planId: 'starter',
      billingInterval: 'monthly',
      status: 'trial',
      seats: 4,
      mrr: fromDollars(49 + 1 * 12),
      createdAt: daysAgo(12),
      creditBalance: fromDollars(0),
    },
    {
      id: 'acc_kora',
      companyName: 'Kora Analytics',
      contactName: 'Ben Oyelaran',
      contactEmail: 'ben@kora.example',
      planId: 'starter',
      billingInterval: 'monthly',
      status: 'active',
      seats: 3,
      mrr: fromDollars(49),
      createdAt: daysAgo(88),
      activatedAt: daysAgo(80),
      creditBalance: fromDollars(0),
    },
    {
      // Consistently over its included usage — the expansion-opportunity case.
      id: 'acc_fieldstack',
      companyName: 'Fieldstack',
      contactName: 'Marta Kowalczyk',
      contactEmail: 'marta@fieldstack.example',
      planId: 'growth',
      billingInterval: 'monthly',
      status: 'active',
      seats: 22,
      mrr: fromDollars(299 + 12 * 19),
      createdAt: daysAgo(154),
      activatedAt: daysAgo(141),
      creditBalance: fromDollars(0),
    },
    {
      id: 'acc_brightpay',
      companyName: 'BrightPay',
      contactName: 'Sunil Varma',
      contactEmail: 'sunil@brightpay.example',
      planId: 'enterprise',
      billingInterval: 'annual',
      status: 'active',
      seats: 140,
      mrr: fromDollars(2400),
      createdAt: daysAgo(602),
      activatedAt: daysAgo(588),
      creditBalance: fromDollars(1200),
    },
    {
      id: 'acc_monolith',
      companyName: 'Monolith Systems',
      contactName: 'Ines Duarte',
      contactEmail: 'ines@monolith.example',
      planId: 'scale',
      billingInterval: 'monthly',
      status: 'active',
      seats: 26,
      mrr: fromDollars(899 + 1 * 25),
      createdAt: daysAgo(271),
      activatedAt: daysAgo(254),
      creditBalance: fromDollars(0),
    },
  ];
}

// ---------------------------------------------------------------------------
// Usage
// ---------------------------------------------------------------------------

/** Daily usage shape per account, as a multiple of plan included units. */
const USAGE_PROFILE: Record<string, { baseline: number; trend: number }> = {
  [HERO_ACCOUNT_ID]: { baseline: 0.042, trend: -0.23 }, // declining 23%
  acc_northstar: { baseline: 0.031, trend: 0.04 },
  acc_loomline: { baseline: 0.033, trend: 0.0 },
  acc_slate_labs: { baseline: 0.002, trend: 0.0 }, // barely using it
  acc_kora: { baseline: 0.026, trend: 0.01 },
  acc_fieldstack: { baseline: 0.058, trend: 0.11 }, // consistently over
  acc_brightpay: { baseline: 0.02, trend: 0.0 },
  acc_monolith: { baseline: 0.029, trend: -0.03 },
};

const DAYS_OF_USAGE = 60;

/**
 * Daily metered events for the last 60 days.
 *
 * Deliberately imperfect on the hero account:
 *   - one duplicate delivery (same `idempotencyKey`, different `id`)
 *   - two events recorded out of chronological order
 *
 * Both are normal for an at-least-once meter. A naive `sum(units)` over this
 * array overcharges Orbit Health, which is exactly the point.
 */
export function seedUsageEvents(): UsageEvent[] {
  const plans = new Map(seedPlans().map((p) => [p.id, p]));
  const events: UsageEvent[] = [];

  for (const account of seedAccounts()) {
    const plan = plans.get(account.planId);
    const profile = USAGE_PROFILE[account.id];
    if (!plan || !profile) continue;

    const random = createRandom(hashString(account.id));

    for (let day = DAYS_OF_USAGE - 1; day >= 0; day -= 1) {
      // Linear trend across the window, plus bounded daily noise.
      const progress = (DAYS_OF_USAGE - 1 - day) / (DAYS_OF_USAGE - 1);
      const trendFactor = 1 + profile.trend * progress;
      const noise = 0.85 + random() * 0.3;
      const units = Math.max(
        0,
        Math.round(plan.includedUnits * profile.baseline * trendFactor * noise),
      );

      const occurredAt = daysAgo(day, 6);
      events.push({
        id: `ue_${account.id}_${day}`,
        accountId: account.id,
        occurredAt,
        units,
        source: 'api',
        idempotencyKey: `${account.id}:${day}`,
      });
    }
  }

  return injectUsageImperfections(events);
}

function injectUsageImperfections(events: UsageEvent[]): UsageEvent[] {
  const out = [...events];

  // A duplicate delivery of day 9. Same idempotency key, new id — which is how
  // it arrives in reality, and why dedup cannot key on `id`.
  const original = out.find((e) => e.id === `ue_${HERO_ACCOUNT_ID}_9`);
  if (original) {
    out.push({
      ...original,
      id: `ue_${HERO_ACCOUNT_ID}_9_redelivered`,
    });
  }

  // Two events arriving out of order. Any code assuming the array is sorted
  // by `occurredAt` is wrong, and should sort rather than assume.
  const a = out.findIndex((e) => e.id === `ue_${HERO_ACCOUNT_ID}_21`);
  const b = out.findIndex((e) => e.id === `ue_${HERO_ACCOUNT_ID}_20`);
  if (a !== -1 && b !== -1) {
    const tmp = out[a]!;
    out[a] = out[b]!;
    out[b] = tmp;
  }

  return out;
}

function hashString(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

// ---------------------------------------------------------------------------
// Account events
// ---------------------------------------------------------------------------

/**
 * The narrative layer. These are the events a health score is attributed to
 * and the evidence the AI operator cites, so they have to agree with the usage
 * curve and the account status above.
 */
export function seedAccountEvents(): AccountEvent[] {
  const events: AccountEvent[] = [
    // ---- Orbit Health: the hero narrative --------------------------------
    {
      id: 'ev_orbit_1',
      accountId: HERO_ACCOUNT_ID,
      type: 'activation',
      occurredAt: daysAgo(34),
      severity: 'info',
      summary: 'Created first account health rule and viewed the resulting list',
      payload: { ruleName: 'Enterprise accounts at risk' },
    },
    {
      id: 'ev_orbit_2',
      accountId: HERO_ACCOUNT_ID,
      type: 'plan_change',
      occurredAt: daysAgo(30),
      severity: 'info',
      summary: 'Upgraded from Starter to Growth',
      payload: { from: 'starter', to: 'growth' },
    },
    {
      id: 'ev_orbit_3',
      accountId: HERO_ACCOUNT_ID,
      type: 'support_event',
      occurredAt: daysAgo(19),
      severity: 'warning',
      summary: 'Support: "we still cannot get the data sync to finish"',
      payload: { channel: 'email', theme: 'implementation_difficulty' },
    },
    {
      id: 'ev_orbit_4',
      accountId: HERO_ACCOUNT_ID,
      type: 'usage_change',
      occurredAt: daysAgo(14),
      severity: 'warning',
      summary: 'Usage began a sustained decline',
      payload: { changePercent: -23, windowDays: 14 },
    },
    {
      id: 'ev_orbit_5',
      accountId: HERO_ACCOUNT_ID,
      type: 'support_event',
      occurredAt: daysAgo(9),
      severity: 'warning',
      summary: 'Support: "the team has paused rollout until sync is reliable"',
      payload: { channel: 'chat', theme: 'implementation_difficulty' },
    },
    {
      id: 'ev_orbit_6',
      accountId: HERO_ACCOUNT_ID,
      type: 'payment_failed',
      occurredAt: daysAgo(4),
      severity: 'critical',
      summary: 'Card payment declined',
      // `reason` is deliberately missing. Real payment webhooks omit fields,
      // and the interface should show "reason unavailable" rather than crash
      // or invent one.
      payload: { amountCents: 37500, attempt: 1 },
    },
    {
      id: 'ev_orbit_7',
      accountId: HERO_ACCOUNT_ID,
      type: 'risk_signal',
      occurredAt: daysAgo(3),
      severity: 'critical',
      summary: 'Cancellation risk raised to elevated',
      payload: { previousBand: 'watch', band: 'at_risk' },
    },

    // ---- Slate Labs: onboarding done, not activated ----------------------
    {
      id: 'ev_slate_1',
      accountId: 'acc_slate_labs',
      type: 'activation_step',
      occurredAt: daysAgo(11),
      severity: 'info',
      summary: 'Connected a data source',
      payload: { step: 'connected' },
    },
    {
      id: 'ev_slate_2',
      accountId: 'acc_slate_labs',
      type: 'activation_step',
      occurredAt: daysAgo(10),
      severity: 'info',
      summary: 'Invited three teammates',
      payload: { step: 'configured' },
    },
    {
      id: 'ev_slate_3',
      accountId: 'acc_slate_labs',
      type: 'note',
      occurredAt: daysAgo(2),
      severity: 'warning',
      summary: 'All setup steps complete, but no health rule created yet',
      payload: { stepsComplete: true, activated: false },
    },

    // ---- Fieldstack: expansion ------------------------------------------
    {
      id: 'ev_field_1',
      accountId: 'acc_fieldstack',
      type: 'usage_change',
      occurredAt: daysAgo(21),
      severity: 'info',
      summary: 'Third consecutive month above included usage',
      payload: { consecutiveMonths: 3 },
    },
    {
      id: 'ev_field_2',
      accountId: 'acc_fieldstack',
      type: 'risk_signal',
      occurredAt: daysAgo(6),
      severity: 'info',
      summary: 'Expansion opportunity: Scale would reduce their effective rate',
      payload: { suggestedPlan: 'scale' },
    },

    // ---- Kora: recovered payment ----------------------------------------
    {
      id: 'ev_kora_1',
      accountId: 'acc_kora',
      type: 'payment_failed',
      occurredAt: daysAgo(27),
      severity: 'warning',
      summary: 'Card payment declined',
      payload: { amountCents: 4900, attempt: 1, reason: 'insufficient_funds' },
    },
    {
      id: 'ev_kora_2',
      accountId: 'acc_kora',
      type: 'payment_recovered',
      occurredAt: daysAgo(26),
      severity: 'info',
      summary: 'Payment recovered on retry',
      payload: { amountCents: 4900, attempt: 2 },
    },
  ];

  return events;
}

// ---------------------------------------------------------------------------
// The world
// ---------------------------------------------------------------------------

export interface World {
  referenceNow: Date;
  plans: PricingPlan[];
  accounts: Account[];
  usageEvents: UsageEvent[];
  accountEvents: AccountEvent[];
}

/**
 * Build the whole world in one call. Pure — calling it twice returns
 * equivalent data, which is what makes "Reset demo" trustworthy.
 */
export function seedWorld(): World {
  return {
    referenceNow: REFERENCE_NOW,
    plans: seedPlans(),
    accounts: seedAccounts(),
    usageEvents: seedUsageEvents(),
    accountEvents: seedAccountEvents(),
  };
}
