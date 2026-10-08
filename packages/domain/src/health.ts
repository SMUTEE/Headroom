/**
 * Account health.
 *
 * A simulated heuristic. It is not a model, it has not been validated against
 * churn, and the interface says so wherever it appears. What it is instead is
 * **decomposable**: every point the score moves is attributed to the thing
 * that moved it, so an operator can click a drop and see the three events
 * responsible rather than being handed a number and asked to trust it.
 *
 * That constraint shapes the whole module. A score computed as one weighted
 * formula would be shorter and would make the core question — "why did this
 * change?" — unanswerable, which is the question that decides whether anyone
 * acts on it.
 *
 * Scoring deliberately ignores `risk_signal` events. Those are emitted *because*
 * health fell, so counting them would charge the account twice for one problem
 * and make the attribution circular.
 */

import { type ActivationState } from './activation';
import type { AccountEvent, HealthBand, HealthContribution, HealthScore } from './types';
import type { UsageEvent } from './types';

const MS_PER_DAY = 86_400_000;

/** Where every account starts before its own history is applied. */
export const BASELINE = 70;

/** Band thresholds. Stated here rather than scattered through the UI. */
export const BANDS: ReadonlyArray<{ band: HealthBand; min: number }> = [
  { band: 'healthy', min: 80 },
  { band: 'watch', min: 60 },
  { band: 'at_risk', min: 40 },
  { band: 'critical', min: 0 },
];

export function bandFor(score: number): HealthBand {
  for (const { band, min } of BANDS) if (score >= min) return band;
  return 'critical';
}

/** How far back usage is compared. */
export const USAGE_WINDOW_DAYS = 14;

/** Weights, in one place so the heuristic can be read in ten seconds. */
export const WEIGHTS = {
  activation: { habitual: 14, activated: 8, configured: 0, connected: -8, setup: -12 },
  /** Points per percent of usage change, capped either side. */
  usagePerPercent: { up: 0.3, down: 0.45 },
  usageCap: { up: 12, down: 22 },
  paymentFailedOpen: -14,
  paymentRecovered: -3,
  supportWarning: -4,
  supportCritical: -9,
  supportCap: -16,
} as const;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

// ---------------------------------------------------------------------------
// Usage trend
// ---------------------------------------------------------------------------

/**
 * Percent change between the two windows ending at `asOf`.
 *
 * Deduplicates by idempotency key for the same reason billing does: the meter
 * delivers at-least-once, and a redelivered event would read as a usage spike.
 */
export function usageTrend(
  usage: readonly UsageEvent[],
  asOf: Date,
  windowDays = USAGE_WINDOW_DAYS,
): { changePercent: number; recent: number; prior: number } | null {
  const end = asOf.getTime();
  const mid = end - windowDays * MS_PER_DAY;
  const start = end - windowDays * 2 * MS_PER_DAY;

  const seen = new Set<string>();
  let recent = 0;
  let prior = 0;

  for (const event of usage) {
    if (seen.has(event.idempotencyKey)) continue;
    const at = new Date(event.occurredAt).getTime();
    if (at < start || at > end) continue;
    seen.add(event.idempotencyKey);
    if (at >= mid) recent += event.units;
    else prior += event.units;
  }

  // Without a prior window there is no trend, only a first reading. Returning
  // zero here would claim "flat", which is a different and untrue statement.
  if (prior === 0) return null;

  return { changePercent: ((recent - prior) / prior) * 100, recent, prior };
}

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

export interface HealthInputs {
  accountId: string;
  events: readonly AccountEvent[];
  usage: readonly UsageEvent[];
  activation: ActivationState;
  asOf: Date;
}

export function calculateHealth(input: HealthInputs): HealthScore {
  const { accountId, asOf } = input;
  const horizon = asOf.getTime();

  const events = input.events
    .filter((e) => e.accountId === accountId && new Date(e.occurredAt).getTime() <= horizon)
    .sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));

  const contributions: HealthContribution[] = [
    { label: 'Baseline', points: BASELINE, weight: 1 },
  ];

  // ---- Activation -------------------------------------------------------
  const activationPoints = WEIGHTS.activation[input.activation.stage];
  if (activationPoints !== 0) {
    contributions.push({
      label:
        activationPoints > 0
          ? `Reached ${input.activation.stage}`
          : `Still at ${input.activation.stage}`,
      points: activationPoints,
      weight: 1,
    });
  }

  // ---- Usage ------------------------------------------------------------
  const trend = usageTrend(input.usage, asOf);
  if (trend) {
    const pct = trend.changePercent;
    const raw =
      pct >= 0 ? pct * WEIGHTS.usagePerPercent.up : pct * WEIGHTS.usagePerPercent.down;
    const points = Math.round(clamp(raw, -WEIGHTS.usageCap.down, WEIGHTS.usageCap.up));
    if (points !== 0) {
      contributions.push({
        label: `Usage ${pct >= 0 ? 'up' : 'down'} ${Math.abs(Math.round(pct))}% over ${USAGE_WINDOW_DAYS} days`,
        points,
        weight: 1,
      });
    }
  }

  // ---- Payments ---------------------------------------------------------
  // A failure followed by a recovery is a smaller, different signal from one
  // still open, so they are resolved in order rather than counted separately.
  const payments = events.filter(
    (e) => e.type === 'payment_failed' || e.type === 'payment_recovered',
  );
  let openFailure: AccountEvent | undefined;
  let recoveredCount = 0;
  for (const event of payments) {
    if (event.type === 'payment_failed') openFailure = event;
    else if (openFailure) {
      openFailure = undefined;
      recoveredCount += 1;
    }
  }

  if (openFailure) {
    contributions.push({
      eventId: openFailure.id,
      label: 'Payment failed and not recovered',
      points: WEIGHTS.paymentFailedOpen,
      weight: 1,
    });
  } else if (recoveredCount > 0) {
    contributions.push({
      label: `${recoveredCount} payment ${recoveredCount === 1 ? 'failure' : 'failures'}, recovered`,
      points: WEIGHTS.paymentRecovered * recoveredCount,
      weight: 1,
    });
  }

  // ---- Support ----------------------------------------------------------
  let supportTotal = 0;
  for (const event of events) {
    if (event.type !== 'support_event') continue;
    const points =
      event.severity === 'critical' ? WEIGHTS.supportCritical : WEIGHTS.supportWarning;
    if (supportTotal + points < WEIGHTS.supportCap) break;
    supportTotal += points;
    contributions.push({
      eventId: event.id,
      label: event.summary,
      points,
      weight: 1,
    });
  }

  const score = clamp(
    Math.round(contributions.reduce((sum, c) => sum + c.points, 0)),
    0,
    100,
  );

  // Stale when anything happened after the inputs were read. Shown in the
  // interface rather than silently presenting an old number as current.
  const latest = events.at(-1);
  const stale = latest ? new Date(latest.occurredAt).getTime() > horizon : false;

  return {
    accountId,
    score,
    band: bandFor(score),
    contributions,
    computedAt: asOf.toISOString(),
    stale,
  };
}

// ---------------------------------------------------------------------------
// Explaining a change
// ---------------------------------------------------------------------------

export interface HealthChange {
  from: number;
  to: number;
  delta: number;
  /** Contributions that appeared, vanished or moved, largest effect first. */
  causes: Array<{
    label: string;
    // Explicitly `| undefined`: this package runs exactOptionalPropertyTypes,
    // which distinguishes an absent key from one present and undefined.
    eventId?: string | undefined;
    before: number | null;
    after: number | null;
    delta: number;
  }>;
  /** Share of the total move the listed causes account for. 1 when complete. */
  coverage: number;
}

/**
 * Diff two scores for the same account.
 *
 * This is the whole reason the score is built as a list rather than a formula.
 * "It dropped 28 points" is a number; "it dropped 28 points, and these three
 * events account for 25 of them" is something an operator can act on.
 */
export function explainChange(before: HealthScore, after: HealthScore): HealthChange {
  const key = (c: HealthContribution) => c.eventId ?? c.label;
  const beforeMap = new Map(before.contributions.map((c) => [key(c), c]));
  const afterMap = new Map(after.contributions.map((c) => [key(c), c]));

  const causes: HealthChange['causes'] = [];
  for (const k of new Set([...beforeMap.keys(), ...afterMap.keys()])) {
    const b = beforeMap.get(k);
    const a = afterMap.get(k);
    const delta = (a?.points ?? 0) - (b?.points ?? 0);
    if (delta === 0) continue;
    causes.push({
      label: a?.label ?? b?.label ?? k,
      ...(a?.eventId ?? b?.eventId ? { eventId: a?.eventId ?? b?.eventId } : {}),
      before: b ? b.points : null,
      after: a ? a.points : null,
      delta,
    });
  }

  causes.sort((x, y) => Math.abs(y.delta) - Math.abs(x.delta));

  const delta = after.score - before.score;
  const accounted = causes.reduce((sum, c) => sum + c.delta, 0);

  return {
    from: before.score,
    to: after.score,
    delta,
    causes,
    // Clamping at 0 and 100 means the causes can exceed the visible move. The
    // interface needs to know that rather than show arithmetic that overshoots.
    coverage: delta === 0 ? 1 : clamp(delta / accounted, 0, 1),
  };
}
