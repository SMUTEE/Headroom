/**
 * Signals.
 *
 * Most analytics surfaces hand the reader fifteen charts and a sentence
 * suggesting they investigate something. This module does the interpreting:
 * it scans the book, states what it found, cites the events it found it in,
 * and says what to do about it.
 *
 * Every rule here is a deterministic threshold, written out below so anyone
 * can check what fired and why. None of it is prediction. `confidence`
 * describes how much corroborating evidence a rule found, not a probability
 * that anything will happen, and the interface has to say so.
 */

import type { ActivationState } from './activation';
import { usageTrend } from './health';
import type { PricingPlan } from './types';
import type { AccountEvent, Account, Severity, Signal, SignalKind, UsageEvent } from './types';

const MS_PER_DAY = 86_400_000;

/**
 * Every threshold in one block. A heuristic nobody can read is indistinguishable
 * from a model nobody can audit.
 */
export const RULES = {
  /** Usage down by at least this much over the trend window. */
  decliningPercent: -15,
  /** Usage up by at least this much. */
  spikePercent: 60,
  /** Accounts with an open payment failure before it counts as a cluster. */
  clusterMinAccounts: 2,
  /** How recent a payment failure has to be to join a cluster. */
  clusterWindowDays: 21,
  /** Consumption below this share of the allowance suggests the plan is too big. */
  underusingRatio: 0.35,
  /** Consumption above this share suggests the plan is too small. */
  expansionRatio: 1.1,
} as const;

const SEVERITY_RANK: Record<Severity, number> = { info: 0, warning: 1, critical: 2 };

export interface SignalInput {
  accounts: readonly Account[];
  plans: readonly PricingPlan[];
  events: readonly AccountEvent[];
  usage: readonly UsageEvent[];
  /** Activation state per account, already derived. */
  activation: ReadonlyMap<string, ActivationState>;
  asOf: Date;
}

/**
 * Confidence from corroboration, nothing more.
 *
 * Two independent pieces of evidence beat one. It is capped below 1 because a
 * deterministic rule on synthetic data has no business claiming certainty, and
 * a surface showing 100% would invite exactly the reading this avoids.
 */
function confidenceFrom(evidenceCount: number): number {
  return Math.min(0.9, 0.45 + evidenceCount * 0.15);
}

function usageFor(usage: readonly UsageEvent[], accountId: string): UsageEvent[] {
  return usage.filter((u) => u.accountId === accountId);
}

/** Deduplicated units inside the trailing window. */
function recentUnits(usage: readonly UsageEvent[], asOf: Date, days: number): number {
  const from = asOf.getTime() - days * MS_PER_DAY;
  const seen = new Set<string>();
  let total = 0;
  for (const event of usage) {
    const at = new Date(event.occurredAt).getTime();
    if (at < from || at > asOf.getTime()) continue;
    if (seen.has(event.idempotencyKey)) continue;
    seen.add(event.idempotencyKey);
    total += event.units;
  }
  return total;
}

export function detectSignals(input: SignalInput): Signal[] {
  const { accounts, events, usage, activation, asOf } = input;
  const plans = new Map(input.plans.map((p) => [p.id, p]));
  const detectedAt = asOf.toISOString();
  const signals: Signal[] = [];

  const push = (
    kind: SignalKind,
    accountIds: string[],
    headline: string,
    severity: Severity,
    evidenceEventIds: string[],
    recommendedAction: string,
  ) => {
    signals.push({
      id: `sig_${kind}_${accountIds.join('_')}`,
      kind,
      accountIds,
      headline,
      severity,
      confidence: confidenceFrom(evidenceEventIds.length),
      evidenceEventIds,
      recommendedAction,
      detectedAt,
    });
  };

  // ---- Per-account rules -------------------------------------------------
  for (const account of accounts) {
    const plan = plans.get(account.planId);
    if (!plan) continue;

    const accountUsage = usageFor(usage, account.id);
    const accountEvents = events.filter((e) => e.accountId === account.id);
    const trend = usageTrend(accountUsage, asOf);
    const state = activation.get(account.id);

    // Activation stalled. Deliberately reported from the derived state rather
    // than re-implemented, so the two surfaces cannot disagree.
    if (state?.stalled) {
      const evidence = accountEvents
        .filter((e) => e.type === 'activation_step')
        .map((e) => e.id);
      push(
        'activation_stalled',
        [account.id],
        `${account.companyName} has sat at ${state.stage} for ${state.daysInStage} days`,
        state.onboardedButNotActivated ? 'critical' : 'warning',
        evidence,
        state.onboardedButNotActivated
          ? 'Onboarding is complete and the account has reached nothing. Reach out before the trial decides for them.'
          : `Help them past ${state.nextStep ? state.nextStep.replace(/_/g, ' ') : 'the next step'}.`,
      );
    }

    if (trend && trend.changePercent <= RULES.decliningPercent) {
      const evidence = accountEvents
        .filter((e) => e.type === 'usage_change' || e.type === 'support_event')
        .map((e) => e.id);
      push(
        'usage_declining',
        [account.id],
        `${account.companyName} usage down ${Math.abs(Math.round(trend.changePercent))}%`,
        Math.abs(trend.changePercent) > 40 ? 'critical' : 'warning',
        evidence,
        'Find out what changed on their side before the renewal conversation does it for you.',
      );
    }

    if (trend && trend.changePercent >= RULES.spikePercent) {
      push(
        'usage_spike',
        [account.id],
        `${account.companyName} usage up ${Math.round(trend.changePercent)}%`,
        'info',
        [],
        'Check whether this is growth or a runaway integration, before the invoice answers it.',
      );
    }

    // Plan fit, in both directions. Only meaningful on a metered plan.
    if (!plan.unlimitedUsage && plan.includedUnits > 0) {
      const monthUnits = recentUnits(accountUsage, asOf, 30);
      const ratio = monthUnits / plan.includedUnits;

      if (ratio >= RULES.expansionRatio && account.status === 'active') {
        push(
          'expansion_opportunity',
          [account.id],
          `${account.companyName} is using ${Math.round(ratio * 100)}% of its ${plan.name} allowance`,
          'info',
          accountEvents.filter((e) => e.type === 'usage_change').map((e) => e.id),
          'A larger plan would lower their effective rate and raise committed revenue. Worth the conversation.',
        );
      }

      if (ratio <= RULES.underusingRatio && account.status === 'active' && state?.activated) {
        push(
          'downgrade_risk',
          [account.id],
          `${account.companyName} is using ${Math.round(ratio * 100)}% of what it pays for`,
          'warning',
          [],
          'They will notice at renewal. Better to find out now whether the plan or the adoption is wrong.',
        );
      }
    }
  }

  // ---- Cross-account rules ----------------------------------------------
  // A payment cluster is a different problem from two unrelated failures: it
  // usually means something broke on your side, so it is reported as one
  // signal rather than scattered across the accounts it happened to.
  const clusterFrom = asOf.getTime() - RULES.clusterWindowDays * MS_PER_DAY;
  const openFailures = new Map<string, AccountEvent>();
  for (const account of accounts) {
    const theirs = events
      .filter((e) => e.accountId === account.id)
      .sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
    let open: AccountEvent | undefined;
    for (const event of theirs) {
      if (event.type === 'payment_failed') open = event;
      else if (event.type === 'payment_recovered') open = undefined;
    }
    if (open && new Date(open.occurredAt).getTime() >= clusterFrom) {
      openFailures.set(account.id, open);
    }
  }

  if (openFailures.size >= RULES.clusterMinAccounts) {
    const ids = [...openFailures.keys()];
    push(
      'payment_failure_cluster',
      ids,
      `${ids.length} accounts have an unrecovered payment failure in the last ${RULES.clusterWindowDays} days`,
      'critical',
      [...openFailures.values()].map((e) => e.id),
      'Check whether this is a dunning problem on your side before chasing the customers.',
    );
  }

  // Most severe first, then best-corroborated. An operator works down this list.
  signals.sort(
    (a, b) =>
      SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity] || b.confidence - a.confidence,
  );

  return signals;
}
