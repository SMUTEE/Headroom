/**
 * Billing.
 *
 * This is where business rules become a trust problem. A customer forgives a
 * clumsy interface; they do not forgive a bill they cannot explain. So the
 * rules here are explicit, each charge is traceable to a line, and the invoice
 * total is always the sum of its own lines — asserted in tests, because a
 * total that disagrees with its breakdown is the single fastest way to lose a
 * customer's trust in a product.
 *
 * Everything is integer cents. See `money.ts` for why.
 */

import {
  add,
  applyCredit,
  type Cents,
  clampToZero,
  multiply,
  priceUnits,
  subtract,
  ZERO,
} from './money';
import type {
  Account,
  Invoice,
  InvoiceLine,
  InvoiceStatus,
  PricingPlan,
  UsageEvent,
} from './types';

const MS_PER_DAY = 86_400_000;

export interface BillingPeriod {
  /** Inclusive. */
  start: Date;
  /** Exclusive, so a period boundary belongs to exactly one period. */
  end: Date;
}

/** The calendar month containing `date`, in UTC. */
export function monthPeriod(date: Date): BillingPeriod {
  const start = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1, 0, 0, 0, 0),
  );
  const end = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1, 0, 0, 0, 0),
  );
  return { start, end };
}

export function daysInPeriod(period: BillingPeriod): number {
  return Math.round((period.end.getTime() - period.start.getTime()) / MS_PER_DAY);
}

// ---------------------------------------------------------------------------
// Usage
// ---------------------------------------------------------------------------

export interface UsageSummary {
  /** Billable units after deduplication, within the period. */
  totalUnits: number;
  includedUnits: number;
  /** Units beyond the allowance. Always 0 on an unlimited plan. */
  overageUnits: number;
  /** Fraction of the allowance consumed. `null` when usage is unlimited. */
  allowanceUsed: number | null;
  eventsCounted: number;
  /**
   * Redeliveries dropped. Surfaced rather than hidden: an operator looking at
   * a disputed invoice needs to know the meter double-delivered.
   */
  duplicatesDropped: number;
  /** Events discarded because they fell outside the period. */
  outOfPeriodDropped: number;
}

/**
 * Aggregate metered usage for a period.
 *
 * Two rules that are not optional:
 *
 * 1. **Deduplicate by `idempotencyKey`, not by `id`.** Meters deliver
 *    at-least-once, and a redelivery arrives with a fresh id. Summing `units`
 *    naively overcharges the customer, which is the worst class of billing bug
 *    because it is invisible until someone complains.
 *
 * 2. **Never assume the array is sorted.** Events arrive out of order. Nothing
 *    here depends on ordering, and anything that does must sort explicitly.
 */
export function summariseUsage(
  events: readonly UsageEvent[],
  plan: PricingPlan,
  period: BillingPeriod,
): UsageSummary {
  const periodStart = period.start.getTime();
  const periodEnd = period.end.getTime();

  const seen = new Map<string, UsageEvent>();
  let duplicatesDropped = 0;
  let outOfPeriodDropped = 0;

  for (const event of events) {
    const at = new Date(event.occurredAt).getTime();
    // Half-open interval: an event at exactly `end` belongs to the next period,
    // so a single event is never billed twice or dropped at a boundary.
    if (at < periodStart || at >= periodEnd) {
      outOfPeriodDropped += 1;
      continue;
    }
    if (seen.has(event.idempotencyKey)) {
      duplicatesDropped += 1;
      continue;
    }
    seen.set(event.idempotencyKey, event);
  }

  let totalUnits = 0;
  for (const event of seen.values()) totalUnits += event.units;

  const overageUnits = plan.unlimitedUsage
    ? 0
    : Math.max(0, totalUnits - plan.includedUnits);

  return {
    totalUnits,
    includedUnits: plan.includedUnits,
    overageUnits,
    allowanceUsed: plan.unlimitedUsage
      ? null
      : plan.includedUnits === 0
        ? 1
        : totalUnits / plan.includedUnits,
    eventsCounted: seen.size,
    duplicatesDropped,
    outOfPeriodDropped,
  };
}

// ---------------------------------------------------------------------------
// Thresholds
// ---------------------------------------------------------------------------

export type UsageZone = 'safe' | 'warning' | 'overage';

export const WARNING_THRESHOLD = 0.8;

/**
 * Which band the account's consumption sits in.
 *
 * Exactly at the allowance is `warning`, not `overage` — no overage has been
 * charged at that point, and telling a customer they are over when they are
 * precisely at the limit is the kind of small inaccuracy that costs trust.
 */
export function usageZone(summary: UsageSummary, plan: PricingPlan): UsageZone {
  if (plan.unlimitedUsage) return 'safe';
  // A zero overage rate cannot bill for excess, so exceeding the allowance has
  // no consequence and flagging it as overage is false. Without this, a plan
  // priced at 0c per unit shows accounts "newly in overage" whose bills do not
  // move by a cent.
  if (plan.overageRatePerUnit <= 0) return 'safe';
  if (summary.totalUnits > summary.includedUnits) return 'overage';
  if (summary.allowanceUsed !== null && summary.allowanceUsed >= WARNING_THRESHOLD) {
    return 'warning';
  }
  return 'safe';
}

// ---------------------------------------------------------------------------
// Charges
// ---------------------------------------------------------------------------

/** Apportion an amount across part of a period. */
export function prorate(amount: Cents, days: number, totalDays: number): Cents {
  if (totalDays <= 0) {
    throw new Error(`A billing period must have a positive length, got ${totalDays}`);
  }
  if (days <= 0) return ZERO;
  if (days >= totalDays) return amount;
  return multiply(amount, days / totalDays);
}

export interface PlanChange {
  previousPlan: PricingPlan;
  changedAt: Date;
}

export interface InvoiceInput {
  account: Account;
  plan: PricingPlan;
  usage: readonly UsageEvent[];
  period: BillingPeriod;
  /** Seat count override; defaults to the account's current seats. */
  seats?: number;
  /** A mid-cycle plan change to prorate across. */
  planChange?: PlanChange;
  /** Credit available to apply. Defaults to the account's balance. */
  creditBalance?: Cents;
  status?: InvoiceStatus;
}

function subscriptionLines(input: InvoiceInput): InvoiceLine[] {
  const { plan, period, planChange } = input;
  const seats = input.seats ?? input.account.seats;
  const totalDays = daysInPeriod(period);
  const lines: InvoiceLine[] = [];

  const seatCharge = (p: PricingPlan) =>
    multiply(p.perSeatMonthly, Math.max(0, seats - p.includedSeats));

  if (planChange) {
    // Clamp the change into the period so a stray date cannot produce negative
    // or over-length proration.
    const changedAt = Math.min(
      Math.max(planChange.changedAt.getTime(), period.start.getTime()),
      period.end.getTime(),
    );
    const daysOnPrevious = Math.round((changedAt - period.start.getTime()) / MS_PER_DAY);
    const daysOnCurrent = totalDays - daysOnPrevious;

    lines.push({
      label: `${planChange.previousPlan.name} plan (${daysOnPrevious} of ${totalDays} days)`,
      amount: prorate(planChange.previousPlan.monthlyBase, daysOnPrevious, totalDays),
      kind: 'proration',
    });
    lines.push({
      label: `${plan.name} plan (${daysOnCurrent} of ${totalDays} days)`,
      amount: prorate(plan.monthlyBase, daysOnCurrent, totalDays),
      kind: 'proration',
    });

    const previousSeats = prorate(seatCharge(planChange.previousPlan), daysOnPrevious, totalDays);
    const currentSeats = prorate(seatCharge(plan), daysOnCurrent, totalDays);
    const seatTotal = add(previousSeats, currentSeats);
    if (seatTotal !== ZERO) {
      lines.push({
        label: `Additional seats (prorated)`,
        quantity: Math.max(0, seats - plan.includedSeats),
        unit: 'seat',
        amount: seatTotal,
        kind: 'seats',
      });
    }
    return lines;
  }

  lines.push({ label: `${plan.name} plan`, amount: plan.monthlyBase, kind: 'base' });

  const extraSeats = Math.max(0, seats - plan.includedSeats);
  if (extraSeats > 0) {
    lines.push({
      label: `Additional seats`,
      quantity: extraSeats,
      unit: 'seat',
      amount: multiply(plan.perSeatMonthly, extraSeats),
      kind: 'seats',
    });
  }

  return lines;
}

export interface ComputedInvoice extends Invoice {
  usage: UsageSummary;
  zone: UsageZone;
  /** Subtotal before credit. */
  subtotal: Cents;
  creditApplied: Cents;
  creditRemaining: Cents;
}

/**
 * Compute an invoice for a closed period.
 *
 * Order of operations is itself a business rule, and changing it changes the
 * total: subscription, then usage overage, then the annual discount on the
 * subscription only, then credit against everything.
 */
export function computeInvoice(input: InvoiceInput): ComputedInvoice {
  const { account, plan, period } = input;
  const usage = summariseUsage(input.usage, plan, period);

  const lines = subscriptionLines(input);

  const subscriptionTotal = add(...lines.map((l) => l.amount));

  if (usage.overageUnits > 0) {
    lines.push({
      label: `Usage overage`,
      quantity: usage.overageUnits,
      unit: 'unit',
      amount: priceUnits(usage.overageUnits, plan.overageRatePerUnit),
      kind: 'usage',
    });
  }

  // The annual discount applies to the subscription, never to overage.
  if (account.billingInterval === 'annual' && plan.annualDiscount > 0) {
    lines.push({
      label: `Annual commitment (${Math.round(plan.annualDiscount * 100)}% off subscription)`,
      amount: multiply(subscriptionTotal, -plan.annualDiscount),
      kind: 'discount',
    });
  }

  const subtotal = clampToZero(add(...lines.map((l) => l.amount)));
  const available = input.creditBalance ?? account.creditBalance;
  const { charged, creditUsed, creditRemaining } = applyCredit(subtotal, available);

  if (creditUsed !== ZERO) {
    lines.push({ label: 'Credit applied', amount: -creditUsed as Cents, kind: 'credit' });
  }

  return {
    id: `inv_${account.id}_${period.start.toISOString().slice(0, 7)}`,
    accountId: account.id,
    periodStart: period.start.toISOString(),
    periodEnd: period.end.toISOString(),
    lines,
    total: charged,
    status: input.status ?? 'draft',
    usage,
    zone: usageZone(usage, plan),
    subtotal,
    creditApplied: creditUsed,
    creditRemaining,
  };
}

// ---------------------------------------------------------------------------
// Projection
// ---------------------------------------------------------------------------

export interface InvoiceProjection extends ComputedInvoice {
  projected: true;
  /** Stated in the interface. A projection presented without its method is a guess. */
  method: string;
  projectedUnits: number;
  observedUnits: number;
  daysElapsed: number;
  daysRemaining: number;
  /**
   * Units per day, the rate the projection is actually built from.
   *
   * Exposed because `daysElapsed` is rounded for display while the rate is
   * computed on exact elapsed time. Without this, a reader who checks
   * `observed ÷ daysElapsed × totalDays` gets a different answer from the one
   * shown and has no way to account for the gap — which is fatal on a surface
   * whose whole job is making a bill reproducible.
   */
  dailyAverage: number;
}

/**
 * Project the invoice for a period still in progress.
 *
 * Linear extrapolation from the observed daily average — deliberately the
 * simplest defensible method, and named in the UI. A cleverer forecast that
 * the customer cannot reason about is worse than a simple one they can, since
 * the purpose is to prevent a surprise rather than to be right to the cent.
 */
export function projectInvoice(input: InvoiceInput & { asOf: Date }): InvoiceProjection {
  const { period, asOf, plan } = input;
  const totalDays = daysInPeriod(period);

  const elapsedMs = Math.min(
    Math.max(asOf.getTime() - period.start.getTime(), 0),
    period.end.getTime() - period.start.getTime(),
  );

  // Every input to the projection is the value the interface will display.
  //
  // Days are rounded first, then the rate is derived from the rounded day
  // count, then the projection is built from both. Mixing exact and rounded
  // inputs — an exact rate against a displayed day count, or an exact elapsed
  // time against a rounded one — leaves the published figure a few units away
  // from anything a reader can reproduce by hand. On a surface whose entire
  // job is making a bill checkable, reproducibility beats the fraction of a
  // percent of precision it costs.
  const daysElapsed = Math.min(totalDays, Math.max(0, Math.round(elapsedMs / MS_PER_DAY)));
  const daysRemaining = totalDays - daysElapsed;

  const observed = summariseUsage(input.usage, plan, {
    start: period.start,
    end: new Date(Math.min(asOf.getTime(), period.end.getTime())),
  });

  // Before any time has elapsed there is no rate to extrapolate from, so the
  // projection is simply what has been observed.
  const dailyAverage = daysElapsed > 0 ? Math.round(observed.totalUnits / daysElapsed) : 0;
  const projectedUnits = observed.totalUnits + dailyAverage * daysRemaining;

  // Re-run the full invoice against the projected unit count by synthesising a
  // single event, so projection and actual go through exactly the same code.
  const synthetic: UsageEvent = {
    id: 'projected',
    accountId: input.account.id,
    occurredAt: period.start.toISOString(),
    units: projectedUnits,
    source: 'projection',
    idempotencyKey: 'projection',
  };

  const invoice = computeInvoice({ ...input, usage: [synthetic] });

  return {
    ...invoice,
    projected: true,
    method: "Linear projection from this period's observed daily average",
    projectedUnits,
    observedUnits: observed.totalUnits,
    daysElapsed,
    daysRemaining,
    dailyAverage,
  };
}

// ---------------------------------------------------------------------------
// Comparing two invoices
// ---------------------------------------------------------------------------

export interface LineDelta {
  label: string;
  kind: InvoiceLine['kind'];
  // Explicitly `| undefined` rather than only optional: the package runs with
  // `exactOptionalPropertyTypes`, which distinguishes "absent" from "present
  // and undefined". These are built by lookup, so they are the latter.
  unit?: InvoiceLine['unit'] | undefined;
  quantityBefore?: number | undefined;
  quantityAfter?: number | undefined;
  /** `null` where the line did not exist on that side. */
  before: Cents | null;
  after: Cents | null;
  delta: Cents;
  changed: boolean;
}

export interface InvoiceComparison {
  lines: LineDelta[];
  /** Only the lines that actually moved. The ones that did not are noise. */
  changedLines: LineDelta[];
  totalBefore: Cents;
  totalAfter: Cents;
  delta: Cents;
  deltaRatio: number | null;
}

/**
 * Diff two invoices for the same account and period.
 *
 * Answers "what did this change do to this customer", which is a different
 * question from "what does this customer owe" — and the only one worth asking
 * when the reader has just altered a price.
 *
 * Lines are matched on kind rather than label, because a label carries the
 * plan name and changes when the plan does.
 */
export function compareInvoices(
  before: ComputedInvoice,
  after: ComputedInvoice,
): InvoiceComparison {
  const kinds = new Set<InvoiceLine['kind']>([
    ...before.lines.map((l) => l.kind),
    ...after.lines.map((l) => l.kind),
  ]);

  const lines: LineDelta[] = [];
  for (const kind of kinds) {
    const b = before.lines.find((l) => l.kind === kind);
    const a = after.lines.find((l) => l.kind === kind);
    const beforeAmount = b ? b.amount : null;
    const afterAmount = a ? a.amount : null;
    const delta = ((afterAmount ?? 0) - (beforeAmount ?? 0)) as Cents;

    lines.push({
      label: a?.label ?? b?.label ?? kind,
      kind,
      unit: a?.unit ?? b?.unit,
      quantityBefore: b?.quantity,
      quantityAfter: a?.quantity,
      before: beforeAmount,
      after: afterAmount,
      delta,
      changed: delta !== 0,
    });
  }

  const delta = subtract(after.total, before.total);

  return {
    lines,
    changedLines: lines.filter((l) => l.changed),
    totalBefore: before.total,
    totalAfter: after.total,
    delta,
    deltaRatio: before.total === ZERO ? null : delta / before.total,
  };
}

// ---------------------------------------------------------------------------
// Repricing the book
// ---------------------------------------------------------------------------

export interface AccountImpact {
  accountId: string;
  companyName: string;
  before: Cents;
  after: Cents;
  delta: Cents;
  /** Relative change. `null` when the account was previously billed nothing. */
  deltaRatio: number | null;
  zoneBefore: UsageZone;
  zoneAfter: UsageZone;
  /** True when this change pushes the account into paying overage for the first time. */
  crossesIntoOverage: boolean;
}

export interface BookImpact {
  accounts: AccountImpact[];
  revenueBefore: Cents;
  revenueAfter: Cents;
  revenueDelta: Cents;
  crossingIntoOverage: number;
  /** Accounts whose bill more than doubles. The ones who will actually call. */
  sharplyIncreased: number;
  unaffected: number;
}

/** A proposed change to a plan's packaging. */
export type PlanOverride = Partial<
  Pick<
    PricingPlan,
    'monthlyBase' | 'includedUnits' | 'overageRatePerUnit' | 'perSeatMonthly' | 'includedSeats'
  >
>;

export function applyOverride(plan: PricingPlan, override: PlanOverride): PricingPlan {
  return { ...plan, ...override };
}

/** A bill more than doubling is the threshold for "this customer will call". */
export const SHARP_INCREASE_RATIO = 1;

/**
 * Re-price an entire book of business against a proposed packaging change.
 *
 * This is the question a founder actually asks about pricing, and the one a
 * pricing page cannot answer: not "what does this cost" but "what happens to
 * the customers we already have". The answer is a distribution, not a number.
 */
export function repriceBook(input: {
  accounts: readonly Account[];
  plans: readonly PricingPlan[];
  usage: readonly UsageEvent[];
  period: BillingPeriod;
  overrides: Partial<Record<string, PlanOverride>>;
}): BookImpact {
  const plans = new Map(input.plans.map((p) => [p.id, p]));
  const usageByAccount = new Map<string, UsageEvent[]>();
  for (const event of input.usage) {
    const list = usageByAccount.get(event.accountId);
    if (list) list.push(event);
    else usageByAccount.set(event.accountId, [event]);
  }

  const accounts: AccountImpact[] = [];
  let revenueBefore = ZERO;
  let revenueAfter = ZERO;
  let crossingIntoOverage = 0;
  let sharplyIncreased = 0;
  let unaffected = 0;

  for (const account of input.accounts) {
    const plan = plans.get(account.planId);
    if (!plan) continue;

    const override = input.overrides[account.planId];
    const proposed = override ? applyOverride(plan, override) : plan;
    const usage = usageByAccount.get(account.id) ?? [];

    const before = computeInvoice({ account, plan, usage, period: input.period });
    const after = computeInvoice({ account, plan: proposed, usage, period: input.period });

    const delta = subtract(after.total, before.total);
    revenueBefore = add(revenueBefore, before.total);
    revenueAfter = add(revenueAfter, after.total);

    const crossesIntoOverage = before.zone !== 'overage' && after.zone === 'overage';
    if (crossesIntoOverage) crossingIntoOverage += 1;

    const deltaRatio = before.total === ZERO ? null : delta / before.total;
    if (deltaRatio !== null && deltaRatio > SHARP_INCREASE_RATIO) sharplyIncreased += 1;
    if (delta === ZERO) unaffected += 1;

    accounts.push({
      accountId: account.id,
      companyName: account.companyName,
      before: before.total,
      after: after.total,
      delta,
      deltaRatio,
      zoneBefore: before.zone,
      zoneAfter: after.zone,
      crossesIntoOverage,
    });
  }

  // Largest increase first: the accounts a founder needs to look at.
  accounts.sort((a, b) => b.delta - a.delta);

  return {
    accounts,
    revenueBefore,
    revenueAfter,
    revenueDelta: subtract(revenueAfter, revenueBefore),
    crossingIntoOverage,
    sharplyIncreased,
    unaffected,
  };
}

/**
 * Recommend the cheapest plan for a given consumption profile.
 *
 * Returns the reasoning as well as the answer, because "why this plan" is the
 * part a customer disputes and the part a founder needs to be able to defend.
 */
export function recommendPlan(input: {
  plans: readonly PricingPlan[];
  units: number;
  seats: number;
  billingInterval: Account['billingInterval'];
}): { plan: PricingPlan; monthlyCost: Cents; reason: string; alternatives: Array<{ plan: PricingPlan; monthlyCost: Cents }> } {
  const priced = input.plans.map((plan) => {
    const extraSeats = Math.max(0, input.seats - plan.includedSeats);
    const subscription = add(plan.monthlyBase, multiply(plan.perSeatMonthly, extraSeats));
    const overageUnits = plan.unlimitedUsage ? 0 : Math.max(0, input.units - plan.includedUnits);
    const overage = priceUnits(overageUnits, plan.overageRatePerUnit);

    const discount =
      input.billingInterval === 'annual'
        ? multiply(subscription, -plan.annualDiscount)
        : ZERO;

    return { plan, monthlyCost: add(subscription, overage, discount), overageUnits };
  });

  priced.sort((a, b) => a.monthlyCost - b.monthlyCost);
  const best = priced[0]!;

  const reason = best.overageUnits > 0
    ? `${best.plan.name} is cheapest at ${input.units.toLocaleString()} units even after ` +
      `${best.overageUnits.toLocaleString()} units of overage — the next plan up costs more in base than it saves in overage.`
    : `${input.units.toLocaleString()} units sits inside ${best.plan.name}'s included allowance of ` +
      `${best.plan.includedUnits.toLocaleString()}, so no overage applies.`;

  return {
    plan: best.plan,
    monthlyCost: best.monthlyCost,
    reason,
    alternatives: priced.slice(1).map(({ plan, monthlyCost }) => ({ plan, monthlyCost })),
  };
}
