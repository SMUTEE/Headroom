/**
 * Working a signal list down.
 *
 * The action a signals surface actually needs is triage, not intervention.
 * Approving a retention offer, persisting it and writing an audit event is the
 * operator console's job; here the question is narrower — which of these have
 * I dealt with, and which am I saying no to.
 *
 * Dismissal requires a reason, for two reasons of its own. A list that can be
 * cleared silently gets cleared silently, and more usefully, the reasons are
 * feedback about the rules. Several people dismissing the same kind of signal
 * as too sensitive is a bug report about the threshold, not noise to absorb.
 */

import type { Signal, SignalKind } from './types';

export type Disposition = 'open' | 'acknowledged' | 'dismissed';

export interface DismissalReason {
  id: string;
  label: string;
  /**
   * True when this reason says the rule misfired rather than that the
   * situation was handled. These are the ones worth counting.
   */
  faultsTheRule: boolean;
}

export const DISMISSAL_REASONS: readonly DismissalReason[] = [
  { id: 'already_handled', label: 'Already dealt with', faultsTheRule: false },
  { id: 'expected', label: 'Expected for this account', faultsTheRule: false },
  { id: 'not_worth_it', label: 'Real, but not worth acting on', faultsTheRule: false },
  { id: 'too_sensitive', label: 'The rule is too sensitive', faultsTheRule: true },
  { id: 'wrong', label: 'The rule is simply wrong here', faultsTheRule: true },
];

export interface TriageEntry {
  signalId: string;
  kind: SignalKind;
  disposition: Exclude<Disposition, 'open'>;
  /** Required when dismissed. */
  reasonId?: string | undefined;
  at: string;
}

export function dispositionOf(
  signalId: string,
  entries: readonly TriageEntry[],
): Disposition {
  return entries.find((e) => e.signalId === signalId)?.disposition ?? 'open';
}

export interface TriageSummary {
  open: number;
  acknowledged: number;
  dismissed: number;
  worked: number;
  total: number;
  /**
   * Signal kinds dismissed as the rule's fault, with a count. A kind that
   * keeps appearing here needs its threshold revisited, which is the whole
   * point of asking for a reason.
   */
  rulesUnderQuestion: Array<{ kind: SignalKind; count: number }>;
}

export function summariseTriage(
  signals: readonly Signal[],
  entries: readonly TriageEntry[],
): TriageSummary {
  const byId = new Map(entries.map((e) => [e.signalId, e]));
  const reasons = new Map(DISMISSAL_REASONS.map((r) => [r.id, r]));

  let acknowledged = 0;
  let dismissed = 0;
  const faulted = new Map<SignalKind, number>();

  for (const signal of signals) {
    const entry = byId.get(signal.id);
    if (!entry) continue;
    if (entry.disposition === 'acknowledged') acknowledged += 1;
    else {
      dismissed += 1;
      const reason = entry.reasonId ? reasons.get(entry.reasonId) : undefined;
      if (reason?.faultsTheRule) {
        faulted.set(signal.kind, (faulted.get(signal.kind) ?? 0) + 1);
      }
    }
  }

  const worked = acknowledged + dismissed;

  return {
    open: signals.length - worked,
    acknowledged,
    dismissed,
    worked,
    total: signals.length,
    rulesUnderQuestion: [...faulted.entries()]
      .map(([kind, count]) => ({ kind, count }))
      .sort((a, b) => b.count - a.count),
  };
}
