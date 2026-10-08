import { describe, expect, it } from 'vitest';
import {
  AccountAssessmentSchema,
  type AccountAssessment,
  checkAssessment,
  INSUFFICIENT_MAX_CONFIDENCE,
} from './assessment';

/**
 * The evaluation set.
 *
 * These are not tests of the model. They are tests of the guards that stand
 * between the model and the interface, run against outputs a model plausibly
 * produces — including the ones it gets wrong. A guard nobody has seen reject
 * anything is not known to work.
 */

const KNOWN = new Set(['ev_1', 'ev_2', 'ev_3']);

function assessment(over: Partial<AccountAssessment> = {}): AccountAssessment {
  return {
    summary: 'The account is over its allowance and one payment has not cleared.',
    health: 'at_risk',
    confidence: 0.7,
    evidence: [{ statement: 'A card payment was declined four days ago.', eventId: 'ev_1' }],
    risks: [{ label: 'Unrecovered payment', severity: 'high' }],
    recommendedActions: [
      {
        label: 'Review the failed payment with finance',
        rationale: 'The decline has not been retried and the reason is unknown.',
        urgency: 'now',
      },
    ],
    ...over,
  };
}

// ---------------------------------------------------------------------------
// Shape
// ---------------------------------------------------------------------------

describe('schema', () => {
  it('accepts a well-formed assessment', () => {
    expect(AccountAssessmentSchema.safeParse(assessment()).success).toBe(true);
  });

  it('rejects an unknown health band', () => {
    const r = AccountAssessmentSchema.safeParse({ ...assessment(), health: 'doomed' });
    expect(r.success).toBe(false);
  });

  it('rejects confidence outside 0 to 1', () => {
    expect(AccountAssessmentSchema.safeParse({ ...assessment(), confidence: 1.4 }).success).toBe(false);
    expect(AccountAssessmentSchema.safeParse({ ...assessment(), confidence: -0.1 }).success).toBe(false);
  });

  it('requires at least one piece of evidence', () => {
    expect(AccountAssessmentSchema.safeParse({ ...assessment(), evidence: [] }).success).toBe(false);
  });

  it('rejects an evidence item with no eventId key at all', () => {
    // `null` is a deliberate value meaning "aggregate". Omitting the key is a
    // malformed item, and the two must not be conflated.
    const r = AccountAssessmentSchema.safeParse({
      ...assessment(),
      evidence: [{ statement: 'Usage fell by about a quarter this fortnight.' }],
    });
    expect(r.success).toBe(false);
  });

  it('accepts null eventId for a claim from an aggregate', () => {
    const r = AccountAssessmentSchema.safeParse({
      ...assessment(),
      evidence: [{ statement: 'Usage fell by about a quarter this fortnight.', eventId: null }],
    });
    expect(r.success).toBe(true);
  });

  it('rejects a summary long enough to be speculation', () => {
    const r = AccountAssessmentSchema.safeParse({ ...assessment(), summary: 'x'.repeat(700) });
    expect(r.success).toBe(false);
  });

  it('strips nothing silently: an extra field does not become part of the output', () => {
    const parsed = AccountAssessmentSchema.parse({ ...assessment(), invented: 'yes' });
    expect(parsed).not.toHaveProperty('invented');
  });
});

// ---------------------------------------------------------------------------
// Grounding
// ---------------------------------------------------------------------------

describe('evidence has to be grounded', () => {
  it('passes when every cited event was in the context', () => {
    expect(checkAssessment(assessment(), KNOWN)).toHaveLength(0);
  });

  it('catches a fabricated event id', () => {
    // The worst failure mode available: schema-valid, confident, and citing a
    // record that does not exist. It reads as rigour.
    const bad = assessment({
      evidence: [{ statement: 'The customer threatened to leave.', eventId: 'ev_invented' }],
    });
    const failures = checkAssessment(bad, KNOWN);
    expect(failures).toHaveLength(1);
    expect(failures[0]!.rule).toBe('evidence-grounded');
    expect(failures[0]!.detail).toContain('ev_invented');
  });

  it('allows an ungrounded claim when it is marked as an aggregate', () => {
    const ok = assessment({
      evidence: [{ statement: 'Usage is down roughly a quarter this fortnight.', eventId: null }],
    });
    expect(checkAssessment(ok, KNOWN)).toHaveLength(0);
  });

  it('reports every fabricated citation, not just the first', () => {
    const bad = assessment({
      evidence: [
        { statement: 'A thing that did not happen happened.', eventId: 'nope_1' },
        { statement: 'Another thing that did not happen.', eventId: 'nope_2' },
      ],
    });
    expect(checkAssessment(bad, KNOWN)).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// Declining
// ---------------------------------------------------------------------------

describe('declining is a valid answer', () => {
  it('accepts a genuine decline', () => {
    const thin = assessment({
      health: 'insufficient_evidence',
      confidence: 0.2,
      risks: [],
      recommendedActions: [],
      evidence: [{ statement: 'The account has three events and no usage history.', eventId: null }],
    });
    expect(checkAssessment(thin, KNOWN)).toHaveLength(0);
  });

  it('catches confident uncertainty', () => {
    const incoherent = assessment({
      health: 'insufficient_evidence',
      confidence: 0.9,
      risks: [],
    });
    const failures = checkAssessment(incoherent, KNOWN);
    expect(failures.some((f) => f.rule === 'coherent-confidence')).toBe(true);
  });

  it('catches a decline that still names risks', () => {
    const incoherent = assessment({
      health: 'insufficient_evidence',
      confidence: 0.2,
      risks: [{ label: 'Churn risk', severity: 'high' }],
    });
    expect(checkAssessment(incoherent, KNOWN).some((f) => f.rule === 'coherent-confidence')).toBe(true);
  });

  it('allows confidence exactly at the ceiling', () => {
    const edge = assessment({
      health: 'insufficient_evidence',
      confidence: INSUFFICIENT_MAX_CONFIDENCE,
      risks: [],
    });
    expect(checkAssessment(edge, KNOWN)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Consequence
// ---------------------------------------------------------------------------

describe('the model cannot propose a consequential action', () => {
  const cases: Array<[string, string]> = [
    ['emailing the customer', 'Send the customer an email about the overage'],
    ['cancelling', 'Cancel the subscription at period end'],
    ['refunding', 'Refund last month in good faith'],
    ['discounting', 'Offer a discount to keep them'],
    ['waiving', 'Waive the overage charge this period'],
    ['deleting', 'Delete the duplicated account data'],
  ];

  for (const [name, label] of cases) {
    it(`rejects ${name}`, () => {
      const bad = assessment({
        recommendedActions: [{ label, rationale: 'Seems reasonable in the circumstances.', urgency: 'now' }],
      });
      const failures = checkAssessment(bad, KNOWN);
      expect(failures.some((f) => f.rule === 'no-autonomous-consequence')).toBe(true);
    });
  }

  it('allows an action the operator performs themselves', () => {
    const ok = assessment({
      recommendedActions: [
        {
          label: 'Review the failed payment with finance',
          rationale: 'No decline reason was supplied, so the cause is unknown.',
          urgency: 'now',
        },
        {
          label: 'Check whether the sync issue is still open',
          rationale: 'Two support conversations mention it and usage has fallen since.',
          urgency: 'soon',
        },
      ],
    });
    expect(checkAssessment(ok, KNOWN)).toHaveLength(0);
  });

  it('does not reject an evidence statement that merely mentions a refund', () => {
    // The ban is on proposing the action, not on observing that one happened.
    const ok = assessment({
      evidence: [{ statement: 'The customer asked about a refund in March.', eventId: 'ev_2' }],
    });
    expect(checkAssessment(ok, KNOWN)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Everything at once
// ---------------------------------------------------------------------------

describe('a plausible bad output fails several guards at once', () => {
  it('reports each problem separately rather than stopping at the first', () => {
    const bad = assessment({
      health: 'insufficient_evidence',
      confidence: 0.95,
      evidence: [{ statement: 'The account escalated to their legal team.', eventId: 'ev_nope' }],
      risks: [{ label: 'Legal escalation', severity: 'high' }],
      recommendedActions: [
        { label: 'Email the customer an apology', rationale: 'To defuse the situation.', urgency: 'now' },
      ],
    });
    const rules = new Set(checkAssessment(bad, KNOWN).map((f) => f.rule));
    expect(rules).toEqual(
      new Set(['evidence-grounded', 'coherent-confidence', 'no-autonomous-consequence']),
    );
  });
});
