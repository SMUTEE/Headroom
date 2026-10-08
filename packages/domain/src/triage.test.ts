import { describe, expect, it } from 'vitest';
import {
  DISMISSAL_REASONS,
  dispositionOf,
  summariseTriage,
  type TriageEntry,
} from './triage';
import type { Signal, SignalKind } from './types';

function signal(id: string, kind: SignalKind): Signal {
  return {
    id, kind, accountIds: ['a1'], headline: id, severity: 'warning',
    confidence: 0.6, evidenceEventIds: [], recommendedAction: 'Do the thing.',
    detectedAt: '2026-10-01T00:00:00Z',
  };
}

function entry(
  signalId: string,
  kind: SignalKind,
  disposition: 'acknowledged' | 'dismissed',
  reasonId?: string,
): TriageEntry {
  return { signalId, kind, disposition, reasonId, at: '2026-10-01T00:00:00Z' };
}

const signals = [
  signal('s1', 'usage_declining'),
  signal('s2', 'usage_declining'),
  signal('s3', 'downgrade_risk'),
  signal('s4', 'activation_stalled'),
];

describe('disposition', () => {
  it('treats an untouched signal as open', () => {
    expect(dispositionOf('s1', [])).toBe('open');
  });

  it('reads back what was recorded', () => {
    const entries = [entry('s1', 'usage_declining', 'acknowledged')];
    expect(dispositionOf('s1', entries)).toBe('acknowledged');
    expect(dispositionOf('s2', entries)).toBe('open');
  });
});

describe('summary', () => {
  it('counts an untouched list as entirely open', () => {
    const s = summariseTriage(signals, []);
    expect(s).toMatchObject({ open: 4, worked: 0, acknowledged: 0, dismissed: 0, total: 4 });
  });

  it('separates acknowledged from dismissed', () => {
    const s = summariseTriage(signals, [
      entry('s1', 'usage_declining', 'acknowledged'),
      entry('s3', 'downgrade_risk', 'dismissed', 'already_handled'),
    ]);
    expect(s.acknowledged).toBe(1);
    expect(s.dismissed).toBe(1);
    expect(s.open).toBe(2);
    expect(s.worked).toBe(2);
  });

  it('ignores entries for signals no longer in the list', () => {
    // A signal can stop firing between runs; its triage entry should not then
    // count against a list it is no longer part of.
    const s = summariseTriage(signals, [entry('gone', 'usage_spike', 'dismissed', 'wrong')]);
    expect(s.worked).toBe(0);
    expect(s.open).toBe(4);
  });
});

describe('dismissals are feedback about the rules', () => {
  it('counts only the reasons that fault the rule', () => {
    const s = summariseTriage(signals, [
      entry('s1', 'usage_declining', 'dismissed', 'already_handled'),
      entry('s2', 'usage_declining', 'dismissed', 'too_sensitive'),
    ]);
    expect(s.rulesUnderQuestion).toEqual([{ kind: 'usage_declining', count: 1 }]);
  });

  it('groups repeated complaints about one rule', () => {
    const s = summariseTriage(signals, [
      entry('s1', 'usage_declining', 'dismissed', 'too_sensitive'),
      entry('s2', 'usage_declining', 'dismissed', 'wrong'),
      entry('s3', 'downgrade_risk', 'dismissed', 'too_sensitive'),
    ]);
    // The rule dismissed twice sorts above the one dismissed once.
    expect(s.rulesUnderQuestion).toEqual([
      { kind: 'usage_declining', count: 2 },
      { kind: 'downgrade_risk', count: 1 },
    ]);
  });

  it('does not treat acknowledgement as a complaint', () => {
    const s = summariseTriage(signals, [entry('s1', 'usage_declining', 'acknowledged')]);
    expect(s.rulesUnderQuestion).toHaveLength(0);
  });

  it('offers reasons of both kinds, so dismissing is not always a complaint', () => {
    expect(DISMISSAL_REASONS.some((r) => r.faultsTheRule)).toBe(true);
    expect(DISMISSAL_REASONS.some((r) => !r.faultsTheRule)).toBe(true);
  });
});
