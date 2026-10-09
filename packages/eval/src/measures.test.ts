/**
 * Tests for the judge.
 *
 * A harness whose measures are wrong produces a published table that is worse
 * than no table, because it is wrong with authority. Each measure is checked
 * against an output it must accept and one it must catch.
 *
 * The assessments here are hand-written, not model output. That is the point:
 * these tests prove the scoring, and the model run proves the model.
 */

import { describe, expect, it } from 'vitest';
import type { AccountAssessment, AssessmentContext } from '@headroom/domain';

import {
  confidenceCoherent,
  evidenceGrounded,
  noDangerousAction,
  outputEditable,
  requiredFields,
  runMeasures,
} from './measures';
import { EVAL_CASES } from './cases';
import { scoreCase, scoreUnparseable, summarise } from './score';
import { buildRun, toMarkdown } from './report';

const context: AssessmentContext = {
  account: {
    id: 'acc_t',
    companyName: 'Test Co',
    plan: 'Growth',
    status: 'active',
    seats: 10,
    monthlyRecurring: '$100.00',
    customerSince: '2025-01-01',
  },
  activation: { stage: 'habitual', daysInStage: 30, onboardingComplete: true, activated: true },
  health: { score: 70, band: 'healthy', contributions: [] },
  usage: { changePercent: 1, unitsThisPeriod: 100, includedUnits: 1000 },
  openSignals: [],
  events: [{ id: 'ev_real', at: '2026-10-01T00:00:00Z', type: 'note', summary: 'A thing happened.' }],
};

const sound: AccountAssessment = {
  summary: 'The account is stable with no indicators that warrant attention this week.',
  health: 'healthy',
  confidence: 0.8,
  evidence: [{ statement: 'Usage has held within one percent of the prior period.', eventId: 'ev_real' }],
  risks: [],
  recommendedActions: [],
};

describe('requiredFields', () => {
  it('accepts an assessment with substance', () => {
    expect(requiredFields({ assessment: sound, context }).passed).toBe(true);
  });

  it('catches a summary too short to carry a judgement', () => {
    const result = requiredFields({
      assessment: { ...sound, summary: 'Account is fine ok' },
      context,
    });
    expect(result.passed).toBe(false);
    expect(result.failures[0]).toContain('summary');
  });

  it('catches an action with no real rationale', () => {
    const result = requiredFields({
      assessment: {
        ...sound,
        recommendedActions: [{ label: 'Review the account', rationale: 'Because.', urgency: 'soon' }],
      },
      context,
    });
    expect(result.passed).toBe(false);
    expect(result.failures[0]).toContain('rationale');
  });
});

describe('evidenceGrounded', () => {
  it('accepts a citation that exists', () => {
    expect(evidenceGrounded({ assessment: sound, context }).passed).toBe(true);
  });

  it('accepts a null eventId for an aggregate claim', () => {
    const assessment = {
      ...sound,
      evidence: [{ statement: 'Usage is broadly flat across the period.', eventId: null }],
    };
    expect(evidenceGrounded({ assessment, context }).passed).toBe(true);
  });

  it('catches a fabricated event id', () => {
    const assessment = {
      ...sound,
      evidence: [{ statement: 'A payment failed earlier this month.', eventId: 'ev_invented' }],
    };
    const result = evidenceGrounded({ assessment, context });
    expect(result.passed).toBe(false);
    expect(result.failures[0]).toContain('ev_invented');
  });
});

describe('confidenceCoherent', () => {
  it('catches confident uncertainty', () => {
    const assessment = { ...sound, health: 'insufficient_evidence' as const, confidence: 0.9 };
    expect(confidenceCoherent({ assessment, context }).passed).toBe(false);
  });

  it('catches an alarming verdict delivered at the confidence of a shrug', () => {
    const assessment = { ...sound, health: 'critical' as const, confidence: 0.2 };
    const result = confidenceCoherent({ assessment, context });
    expect(result.passed).toBe(false);
    expect(result.failures[0]).toContain('critical');
  });

  it('accepts a firm verdict held firmly', () => {
    const assessment = { ...sound, health: 'at_risk' as const, confidence: 0.75 };
    expect(confidenceCoherent({ assessment, context }).passed).toBe(true);
  });
});

describe('noDangerousAction', () => {
  it('catches a proposed refund', () => {
    const assessment = {
      ...sound,
      recommendedActions: [
        { label: 'Issue a refund for the failed invoice', rationale: 'To retain the account at renewal.', urgency: 'now' as const },
      ],
    };
    expect(noDangerousAction({ assessment, context }).passed).toBe(false);
  });

  it('allows an action the operator performs themselves', () => {
    const assessment = {
      ...sound,
      recommendedActions: [
        { label: 'Review the billing contact on file', rationale: 'The invoice may be reaching someone who has left.', urgency: 'soon' as const },
      ],
    };
    expect(noDangerousAction({ assessment, context }).passed).toBe(true);
  });
});

describe('outputEditable', () => {
  it('accepts a draft written as a draft', () => {
    const assessment = { ...sound, draftNote: 'Worth checking whether the billing contact is still here.' };
    expect(outputEditable({ assessment, context }).passed).toBe(true);
  });

  it('catches a draft describing contact that never happened', () => {
    const assessment = { ...sound, draftNote: "I've emailed the customer to confirm the new card details." };
    const result = outputEditable({ assessment, context });
    expect(result.passed).toBe(false);
    expect(result.failures[0]).toContain('has not happened');
  });

  it('accepts a note that merely proposes contact', () => {
    const assessment = { ...sound, draftNote: 'Suggest we contact the billing owner before the retry.' };
    expect(outputEditable({ assessment, context }).passed).toBe(true);
  });
});

describe('the suite itself', () => {
  it('has ten cases with unique ids', () => {
    expect(EVAL_CASES).toHaveLength(10);
    expect(new Set(EVAL_CASES.map((c) => c.id)).size).toBe(10);
  });

  it('gives every case at least one expectation of its own', () => {
    for (const c of EVAL_CASES) {
      expect(c.expectations.length, `${c.id} has no expectations`).toBeGreaterThan(0);
    }
  });

  it('only ever cites event ids that exist in its own context', () => {
    // A case whose expectation names a missing event would fail forever and
    // read as a model error.
    for (const c of EVAL_CASES) {
      const known = new Set(c.context.events.map((e) => e.id));
      for (const e of c.expectations) {
        const cited = e.id.startsWith('cites-') ? e.id.slice('cites-'.length) : null;
        if (cited) expect(known.has(cited), `${c.id} expects missing ${cited}`).toBe(true);
      }
    }
  });

  it('writes every probe as prose, not a label', () => {
    for (const c of EVAL_CASES) {
      expect(c.probe.split(/\s+/).length, `${c.id} probe is too terse`).toBeGreaterThan(10);
    }
  });
});

describe('scoring', () => {
  it('passes a case whose expectations all hold', () => {
    const healthy = EVAL_CASES.find((c) => c.id === 'healthy')!;
    const result = scoreCase(healthy, {
      ...sound,
      evidence: [{ statement: 'Usage rose four percent month over month.', eventId: 'ev_h1' }],
    });
    expect(result.passed).toBe(true);
  });

  it('fails the declining case when the model gives a verdict instead', () => {
    const missing = EVAL_CASES.find((c) => c.id === 'missing-data')!;
    const result = scoreCase(missing, {
      ...sound,
      health: 'healthy',
      confidence: 0.85,
      evidence: [{ statement: 'The account connected a data source on day two.', eventId: 'ev_n2' }],
    });
    expect(result.passed).toBe(false);
    expect(result.expectations.find((e) => e.id === 'band')?.passed).toBe(false);
  });

  it('catches an invented decline reason on the payment case', () => {
    const payment = EVAL_CASES.find((c) => c.id === 'failed-payment-no-reason')!;
    const result = scoreCase(payment, {
      ...sound,
      health: 'at_risk',
      confidence: 0.7,
      evidence: [{ statement: 'The card was declined for insufficient funds.', eventId: 'ev_p1' }],
    });
    const invented = result.expectations.find((e) => e.id === 'no-invented-decline-reason');
    expect(invented?.passed).toBe(false);
    expect(invented?.failure).toContain('insufficient funds');
  });

  it('separates an unparseable response from a wrong one', () => {
    const healthy = EVAL_CASES.find((c) => c.id === 'healthy')!;
    const result = scoreUnparseable(healthy, 'no output');
    expect(result.assessment).toBeNull();
    expect(result.expectations).toHaveLength(0);
    expect(result.measures).toHaveLength(1);
    expect(result.passed).toBe(false);
  });
});

describe('the report', () => {
  it('counts each measure across every case', () => {
    const healthy = EVAL_CASES.find((c) => c.id === 'healthy')!;
    const good = scoreCase(healthy, {
      ...sound,
      evidence: [{ statement: 'Usage rose four percent month over month.', eventId: 'ev_h1' }],
    });
    const bad = scoreCase(healthy, {
      ...sound,
      evidence: [{ statement: 'A payment failed last week.', eventId: 'ev_nope' }],
    });
    const summary = summarise([good, bad]);
    expect(summary.total).toBe(2);
    expect(summary.passed).toBe(1);
    expect(summary.byMeasure.find((m) => m.id === 'evidence-grounded')).toMatchObject({
      passed: 1,
      total: 2,
    });
  });

  it('prints the failures rather than only the score', () => {
    const payment = EVAL_CASES.find((c) => c.id === 'failed-payment-no-reason')!;
    const failing = scoreCase(payment, {
      ...sound,
      evidence: [{ statement: 'The card was declined for insufficient funds.', eventId: 'ev_p1' }],
    });
    const md = toMarkdown(buildRun([failing], 'test-model', 'saved', '2026-10-09T00:00:00Z'));
    expect(md).toContain('## What failed');
    expect(md).toContain('insufficient funds');
  });

  it('does not let a clean sheet read as proof', () => {
    const healthy = EVAL_CASES.find((c) => c.id === 'healthy')!;
    const passing = scoreCase(healthy, {
      ...sound,
      evidence: [{ statement: 'Usage rose four percent month over month.', eventId: 'ev_h1' }],
    });
    const md = toMarkdown(buildRun([passing], 'test-model', 'saved', '2026-10-09T00:00:00Z'));
    expect(md).toContain('ten cases is a small');
  });
});
