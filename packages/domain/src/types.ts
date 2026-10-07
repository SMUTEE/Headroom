/**
 * The shared domain model.
 *
 * Every build in the lab reads these types, which is what makes the lab read
 * as one product rather than five demos. An account's story has to be the same
 * story in the Monetisation Lab, the Activation Workspace, Account
 * Intelligence, the AI Operator and the Operator Console.
 *
 * Everything here describes SYNTHETIC data. No real customer, company, usage
 * figure or revenue number appears anywhere in Headroom.
 */

import type { Cents } from './money';

// ---------------------------------------------------------------------------
// Plans and packaging
// ---------------------------------------------------------------------------

export type PlanId = 'starter' | 'growth' | 'scale' | 'enterprise';

export interface PricingPlan {
  id: PlanId;
  name: string;
  /** Recurring base charge per month. */
  monthlyBase: Cents;
  /** Usage units included in the base charge before overage applies. */
  includedUnits: number;
  /**
   * Cost per unit beyond `includedUnits`, in cents. Fractional by design —
   * sub-cent unit rates are normal in usage pricing.
   */
  overageRatePerUnit: number;
  /** Seats included before per-seat charges apply. */
  includedSeats: number;
  perSeatMonthly: Cents;
  /**
   * When true, usage beyond `includedUnits` is never charged. An edge case the
   * billing engine must branch on rather than multiply by zero, because the
   * interface also has to stop showing an overage warning that cannot happen.
   */
  unlimitedUsage: boolean;
  /**
   * Fraction off when billed annually, e.g. 0.2 for two months free.
   *
   * Business rule: the annual discount applies to the subscription (base and
   * seats) and NOT to usage overage. Committing to a term discounts the
   * commitment, not consumption beyond it.
   */
  annualDiscount: number;
}

export type BillingInterval = 'monthly' | 'annual';

// ---------------------------------------------------------------------------
// Accounts
// ---------------------------------------------------------------------------

export type AccountStatus = 'trial' | 'active' | 'past_due' | 'cancelled';

/**
 * Activation is a derived state, never a stored flag.
 *
 * `setup → connected → configured → activated → habitual`
 *
 * The activation event is explicit: the customer creates their first account
 * health rule AND views the resulting account list. It requires both
 * configuration and consumption, which is what separates it from a checklist.
 */
export type ActivationStage = 'setup' | 'connected' | 'configured' | 'activated' | 'habitual';

export type HealthBand = 'healthy' | 'watch' | 'at_risk' | 'critical';

export interface Account {
  id: string;
  companyName: string;
  contactName: string;
  contactEmail: string;
  planId: PlanId;
  billingInterval: BillingInterval;
  status: AccountStatus;
  seats: number;
  /** Monthly recurring revenue, excluding usage overage. */
  mrr: Cents;
  createdAt: string;
  /**
   * There is deliberately no `activatedAt` here. Activation is derived from
   * events by `deriveActivation`, never stored — a stored flag drifts from the
   * events that justify it the moment anything is backfilled, replayed or
   * corrected, and then the number nobody can explain is the one the team
   * plans against.
   */
  /** Unapplied credit balance. */
  creditBalance: Cents;
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

export type AccountEventType =
  | 'activation_step'
  | 'activation'
  | 'usage_change'
  | 'payment_failed'
  | 'payment_recovered'
  | 'support_event'
  | 'plan_change'
  | 'risk_signal'
  | 'note';

export type Severity = 'info' | 'warning' | 'critical';

export interface AccountEvent {
  id: string;
  accountId: string;
  type: AccountEventType;
  occurredAt: string;
  severity?: Severity;
  summary: string;
  payload: Record<string, unknown>;
}

/**
 * A metered usage event.
 *
 * `idempotencyKey` is what makes deduplication possible. Real meters deliver
 * at-least-once, so the same event arrives twice and a naive sum inflates the
 * bill. Account Intelligence deliberately seeds a duplicate to prove the
 * handling, rather than pretending ingestion is clean.
 */
export interface UsageEvent {
  id: string;
  accountId: string;
  occurredAt: string;
  units: number;
  source: string;
  idempotencyKey: string;
}

// ---------------------------------------------------------------------------
// Billing
// ---------------------------------------------------------------------------

export type InvoiceStatus = 'draft' | 'open' | 'paid' | 'past_due' | 'void';

export interface InvoiceLine {
  label: string;
  /** Quantity for a metered line; absent for a flat charge. */
  quantity?: number;
  /**
   * What `quantity` counts, singular. Seats are not units, and a billing
   * surface that labels them identically is the kind of carelessness a
   * customer notices before anything else on the invoice.
   */
  unit?: 'unit' | 'seat' | 'day';
  amount: Cents;
  kind: 'base' | 'seats' | 'usage' | 'credit' | 'proration' | 'discount';
}

export interface Invoice {
  id: string;
  accountId: string;
  periodStart: string;
  periodEnd: string;
  lines: InvoiceLine[];
  /** Sum of all lines. Must equal the sum of `lines` — asserted in tests. */
  total: Cents;
  status: InvoiceStatus;
  issuedAt?: string;
}

// ---------------------------------------------------------------------------
// Health and signals
// ---------------------------------------------------------------------------

/**
 * A single contribution to a health score.
 *
 * The score has to be decomposable. Being able to say "this dropped 28 points
 * and these three events account for 24 of them" is the difference between a
 * number an operator acts on and a number they ignore — and it is a real
 * architectural constraint, not a presentation detail.
 */
export interface HealthContribution {
  /** The event this contribution is attributed to, where there is one. */
  eventId?: string;
  label: string;
  /** Signed points. Negative reduces the score. */
  points: number;
  weight: number;
}

export interface HealthScore {
  accountId: string;
  /** 0–100. A simulated heuristic, not a validated predictive model. */
  score: number;
  band: HealthBand;
  contributions: HealthContribution[];
  computedAt: string;
  /**
   * True when the inputs have changed since `computedAt`. The interface shows
   * this rather than silently presenting a stale number as current.
   */
  stale: boolean;
}

export type SignalKind =
  | 'activation_stalled'
  | 'usage_declining'
  | 'usage_spike'
  | 'payment_failure_cluster'
  | 'downgrade_risk'
  | 'expansion_opportunity';

export interface Signal {
  id: string;
  kind: SignalKind;
  accountIds: string[];
  /** What happened, in an operator's language. */
  headline: string;
  severity: Severity;
  /** 0–1, derived from a stated heuristic. Never presented as accuracy. */
  confidence: number;
  evidenceEventIds: string[];
  recommendedAction: string;
  detectedAt: string;
}

// ---------------------------------------------------------------------------
// Retention
// ---------------------------------------------------------------------------

export type CancellationReason =
  | 'too_expensive'
  | 'not_enough_value'
  | 'missing_feature'
  | 'switching_provider'
  | 'temporary_pause'
  | 'budget_change'
  | 'implementation_difficulty';

export type InterventionKind =
  | 'recommend_downgrade'
  | 'recommend_pause'
  | 'offer_assisted_setup'
  | 'connect_to_specialist'
  | 'none';

export interface Intervention {
  kind: InterventionKind;
  rationale: string;
  /**
   * Deliberately allowed to be false. Not every customer should be saved, and
   * a product that manufactures an offer for someone who needs a feature that
   * does not exist is lying to both parties.
   */
  offersSave: boolean;
}

// ---------------------------------------------------------------------------
// Audit
// ---------------------------------------------------------------------------

export interface AuditEvent {
  id: string;
  actorId: string;
  accountId?: string;
  action: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}
