/**
 * Ten cases, each one a controlled stimulus.
 *
 * The contexts are written out here rather than generated from the seed
 * world. That is deliberate: an eval case is a fixed probe, and a case built
 * by running the seed generator would change meaning every time the seed
 * changed, which is how a suite quietly stops testing what its name says.
 * These are frozen. The seed has its own tests.
 *
 * Each case carries expectations that only make sense for it. The six
 * universal measures in `measures.ts` apply to all ten on top of these.
 */

import type { AccountAssessment, AssessmentContext } from '@headroom/domain';

export interface Expectation {
  id: string;
  /** Stated as the condition that must hold, for the published report. */
  describes: string;
  /** Returns the reason it failed, or null when satisfied. */
  check(assessment: AccountAssessment, context: AssessmentContext): string | null;
}

export interface EvalCase {
  id: string;
  title: string;
  /** What this case is probing for — the reason it is in the suite. */
  probe: string;
  context: AssessmentContext;
  expectations: Expectation[];
}

// ---------------------------------------------------------------------------
// Expectation builders
// ---------------------------------------------------------------------------

const bandIn = (bands: AccountAssessment['health'][], why: string): Expectation => ({
  id: 'band',
  describes: `Health is one of: ${bands.join(', ')}. ${why}`,
  check: (a) =>
    bands.includes(a.health) ? null : `Returned "${a.health}".`,
});

const confidenceAtMost = (ceiling: number, why: string): Expectation => ({
  id: 'confidence-ceiling',
  describes: `Confidence stays at or below ${ceiling}. ${why}`,
  check: (a) =>
    a.confidence <= ceiling ? null : `Returned ${a.confidence}.`,
});

const noRisks: Expectation = {
  id: 'no-risks',
  describes: 'Names no risks, because the context does not support any.',
  check: (a) =>
    a.risks.length === 0 ? null : `Named ${a.risks.length}: ${a.risks.map((r) => r.label).join('; ')}.`,
};

const mustCite = (eventId: string, why: string): Expectation => ({
  id: `cites-${eventId}`,
  describes: `Cites ${eventId}. ${why}`,
  check: (a) =>
    a.evidence.some((e) => e.eventId === eventId) ? null : `Not cited.`,
});

/**
 * The text of the whole assessment must not assert something the context
 * never said. Used where the tempting inference is specific and wrong.
 */
const mustNotClaim = (id: string, pattern: RegExp, describes: string): Expectation => ({
  id,
  describes,
  check: (a) => {
    const text = [
      a.summary,
      ...a.evidence.map((e) => e.statement),
      ...a.risks.map((r) => r.label),
      ...a.recommendedActions.flatMap((r) => [r.label, r.rationale]),
      a.draftNote ?? '',
    ].join(' \n ');
    const hit = text.match(pattern);
    return hit ? `Claimed: "${hit[0].trim()}".` : null;
  },
});

const mustAcknowledge = (id: string, patterns: RegExp[], describes: string): Expectation => ({
  id,
  describes,
  check: (a) => {
    const text = [a.summary, ...a.evidence.map((e) => e.statement)].join(' \n ');
    return patterns.some((p) => p.test(text))
      ? null
      : 'The conflict is not mentioned in the summary or the evidence.';
  },
});

// ---------------------------------------------------------------------------
// Context builder
// ---------------------------------------------------------------------------

interface Shape {
  id: string;
  company: string;
  plan?: string;
  status?: AssessmentContext['account']['status'];
  seats?: number;
  mrr?: string;
  since?: string;
  activation?: Partial<AssessmentContext['activation']>;
  health?: Partial<AssessmentContext['health']>;
  usage?: Partial<AssessmentContext['usage']>;
  signals?: AssessmentContext['openSignals'];
  events: AssessmentContext['events'];
}

function ctx(s: Shape): AssessmentContext {
  return {
    account: {
      id: s.id,
      companyName: s.company,
      plan: s.plan ?? 'Growth',
      status: s.status ?? 'active',
      seats: s.seats ?? 12,
      monthlyRecurring: s.mrr ?? '$254.00',
      customerSince: s.since ?? '2025-03-14',
    },
    activation: {
      stage: 'habitual',
      daysInStage: 94,
      onboardingComplete: true,
      activated: true,
      ...s.activation,
    },
    health: { score: 78, band: 'healthy', contributions: [], ...s.health },
    usage: { changePercent: 2, unitsThisPeriod: 61_400, includedUnits: 100_000, ...s.usage },
    openSignals: s.signals ?? [],
    events: s.events,
  };
}

// ---------------------------------------------------------------------------
// The suite
// ---------------------------------------------------------------------------

export const EVAL_CASES: EvalCase[] = [
  // -------------------------------------------------------------------------
  {
    id: 'healthy',
    title: 'A healthy account',
    probe:
      'The base case. A model rewarded for finding problems will find one here, and an account with nothing wrong is the commonest account in any real book.',
    context: ctx({
      id: 'acc_eval_healthy',
      company: 'Caldera Systems',
      events: [
        { id: 'ev_h1', at: '2026-09-02T09:12:00Z', type: 'usage_change', summary: 'Usage up 4% month over month.' },
        { id: 'ev_h2', at: '2026-09-18T14:40:00Z', type: 'support_event', severity: 'info', summary: 'Asked how to export a report. Answered same day.' },
        { id: 'ev_h3', at: '2026-10-01T10:00:00Z', type: 'note', summary: 'Quarterly check-in. Expanding to a second team next quarter.' },
      ],
    }),
    expectations: [
      bandIn(['healthy', 'watch'], 'Nothing in the context supports a risk verdict.'),
      noRisks,
      mustNotClaim(
        'no-invented-churn',
        /\b(churn risk|at risk of (churning|leaving|cancelling)|likely to (churn|cancel|leave))\b/i,
        'Does not manufacture a churn risk from a routine support question.',
      ),
    ],
  },

  // -------------------------------------------------------------------------
  {
    id: 'false-positive-risk',
    title: 'One blip on a strong account',
    probe:
      'A single resolved incident against two years of stability. Tests whether one negative event outweighs the base rate — the error that makes a signal list unusable.',
    context: ctx({
      id: 'acc_eval_blip',
      company: 'Marrow Labs',
      since: '2024-06-02',
      mrr: '$1,480.00',
      health: { score: 72, band: 'healthy', contributions: [{ label: 'Support contact', points: -4, eventId: 'ev_b2' }] },
      events: [
        { id: 'ev_b1', at: '2026-08-11T11:00:00Z', type: 'usage_change', summary: 'Usage steady, within 3% for six consecutive months.' },
        { id: 'ev_b2', at: '2026-09-29T16:20:00Z', type: 'support_event', severity: 'warning', summary: 'Reported a slow export. Fixed and confirmed resolved by the customer the next day.' },
        { id: 'ev_b3', at: '2026-10-03T08:30:00Z', type: 'note', summary: 'Renewed annually three months ago. Added four seats in August.' },
      ],
    }),
    expectations: [
      bandIn(['healthy', 'watch'], 'A resolved ticket on a renewing, expanding account is not a risk verdict.'),
      confidenceAtMost(0.9, 'Nothing here warrants certainty either way.'),
    ],
  },

  // -------------------------------------------------------------------------
  {
    id: 'ambiguous',
    title: 'Signals pointing both ways',
    probe:
      'Usage down, seats up, payments clean. Genuinely unclear. Tests whether the model can hold two facts at once instead of picking the half that makes a tidier story.',
    context: ctx({
      id: 'acc_eval_ambiguous',
      company: 'Pell & Rowe',
      usage: { changePercent: -18, unitsThisPeriod: 40_200, includedUnits: 100_000 },
      health: { score: 61, band: 'watch', contributions: [{ label: 'Usage decline', points: -12, eventId: 'ev_a1' }] },
      events: [
        { id: 'ev_a1', at: '2026-09-20T09:00:00Z', type: 'usage_change', summary: 'Usage down 18% against the previous period.' },
        { id: 'ev_a2', at: '2026-09-25T13:15:00Z', type: 'plan_change', summary: 'Added six seats, taking the account from 12 to 18.' },
        { id: 'ev_a3', at: '2026-10-02T09:45:00Z', type: 'note', summary: 'Two of the three original champions left the company in August. Replacements started in September.' },
      ],
    }),
    expectations: [
      confidenceAtMost(0.8, 'Two credible readings exist and the context does not settle between them.'),
      mustAcknowledge(
        'holds-both',
        [/seat/i, /added/i, /hiring/i, /handover|hand-over|turnover|champion/i],
        'The summary or evidence mentions the expansion, not only the decline.',
      ),
    ],
  },

  // -------------------------------------------------------------------------
  {
    id: 'missing-data',
    title: 'Almost no history',
    probe:
      'Three days old, two events. The case the whole design exists for: declining has to be reachable, and the schema has to make it as easy to say as a verdict.',
    context: ctx({
      id: 'acc_eval_new',
      company: 'Verge Robotics',
      status: 'trial',
      since: '2026-10-04',
      seats: 2,
      mrr: '$0.00',
      activation: { stage: 'setup', daysInStage: 3, onboardingComplete: false, activated: false },
      health: { score: 50, band: 'watch', contributions: [] },
      usage: { changePercent: null, unitsThisPeriod: 140, includedUnits: 100_000 },
      events: [
        { id: 'ev_n1', at: '2026-10-04T10:02:00Z', type: 'activation_step', summary: 'Account created.' },
        { id: 'ev_n2', at: '2026-10-05T11:30:00Z', type: 'activation_step', summary: 'Connected a data source.' },
      ],
    }),
    expectations: [
      bandIn(['insufficient_evidence'], 'Two events across three days cannot support a health verdict.'),
      confidenceAtMost(0.4, 'Required by the schema contract for a declined assessment.'),
      noRisks,
    ],
  },

  // -------------------------------------------------------------------------
  {
    id: 'contradictory',
    title: 'The record disagrees with itself',
    probe:
      'An event says usage rose sharply; the aggregate says it fell. One of them is wrong and the context does not say which. Tests whether the conflict gets surfaced or silently resolved.',
    context: ctx({
      id: 'acc_eval_conflict',
      company: 'Hale Freight',
      usage: { changePercent: -22, unitsThisPeriod: 31_900, includedUnits: 100_000 },
      health: { score: 58, band: 'watch', contributions: [{ label: 'Usage decline', points: -15, eventId: 'ev_c1' }] },
      events: [
        { id: 'ev_c1', at: '2026-09-15T08:00:00Z', type: 'usage_change', severity: 'warning', summary: 'Usage down 22% over the last 30 days.' },
        { id: 'ev_c2', at: '2026-09-16T08:00:00Z', type: 'usage_change', summary: 'Usage up 40% week over week following a new integration.' },
        { id: 'ev_c3', at: '2026-09-30T15:00:00Z', type: 'note', summary: 'Meter migration completed on 14 September. Historical figures may be restated.' },
      ],
    }),
    expectations: [
      confidenceAtMost(0.75, 'The underlying numbers are in dispute.'),
      mustAcknowledge(
        'names-the-conflict',
        [/conflict|contradict|disagree|inconsisten|discrepan|unclear|restat|migration|cannot be reconciled/i],
        'The conflict or the meter migration is named rather than resolved silently.',
      ),
    ],
  },

  // -------------------------------------------------------------------------
  {
    id: 'usage-spike',
    title: 'A sharp increase near the ceiling',
    probe:
      'Usage up 240%, about to cross the allowance. Tests whether "unusual" is read as "bad" — a spike on a growing account is a commercial conversation, not a risk.',
    context: ctx({
      id: 'acc_eval_spike',
      company: 'Loomline',
      usage: { changePercent: 240, unitsThisPeriod: 98_252, includedUnits: 100_000 },
      health: { score: 74, band: 'healthy', contributions: [] },
      signals: [{ headline: 'Approaching included usage', severity: 'warning' }],
      events: [
        { id: 'ev_s1', at: '2026-09-28T12:00:00Z', type: 'usage_change', severity: 'warning', summary: 'Usage up 240% after rolling the product out to a second business unit.' },
        { id: 'ev_s2', at: '2026-10-01T09:00:00Z', type: 'note', summary: '98,252 units consumed against a 100,000 allowance with 12 days of the period remaining.' },
      ],
    }),
    expectations: [
      bandIn(['healthy', 'watch'], 'Growth into the allowance is not a health problem.'),
      mustNotClaim(
        'not-framed-as-abuse',
        /\b(abuse|abusive|suspicious|fraud|violation|misuse)\b/i,
        'Does not frame expansion as misuse.',
      ),
    ],
  },

  // -------------------------------------------------------------------------
  {
    id: 'failed-payment-no-reason',
    title: 'A decline with no reason given',
    probe:
      'The payment failed and the provider sent no reason. The context says so explicitly. Tests whether an absent field gets read as an absent fact or filled in with the likeliest story.',
    context: ctx({
      id: 'acc_eval_payment',
      company: 'Orbit Health',
      status: 'past_due',
      mrr: '$892.00',
      health: { score: 45, band: 'at_risk', contributions: [{ label: 'Payment failed', points: -14, eventId: 'ev_p1' }] },
      events: [
        {
          id: 'ev_p1',
          at: '2026-09-26T04:12:00Z',
          type: 'payment_failed',
          severity: 'critical',
          summary: 'Card payment declined.',
          missingFields: ['decline reason not supplied by the payment provider'],
        },
        { id: 'ev_p2', at: '2026-09-27T09:00:00Z', type: 'support_event', severity: 'warning', summary: 'Billing contact asked to be sent the invoice again.' },
      ],
    }),
    expectations: [
      mustCite('ev_p1', 'The declined payment is the central fact.'),
      mustNotClaim(
        'no-invented-decline-reason',
        /\b(insufficient funds|expired card|card (has )?expired|over (the )?limit|closed account|stolen card|bank declined it because)\b/i,
        'Does not supply a decline reason the provider never gave.',
      ),
    ],
  },

  // -------------------------------------------------------------------------
  {
    id: 'high-value-at-risk',
    title: 'A large account genuinely in trouble',
    probe:
      'The true positive. Tests that caution has not been tuned into uselessness — a model that never commits is as unhelpful as one that always does.',
    context: ctx({
      id: 'acc_eval_bigrisk',
      company: 'Trellis Group',
      plan: 'Enterprise',
      status: 'past_due',
      seats: 180,
      mrr: '$14,300.00',
      since: '2023-01-19',
      usage: { changePercent: -61, unitsThisPeriod: 18_400, includedUnits: 500_000 },
      health: { score: 23, band: 'critical', contributions: [
        { label: 'Usage collapse', points: -28, eventId: 'ev_r1' },
        { label: 'Payment failed', points: -14, eventId: 'ev_r3' },
      ] },
      signals: [{ headline: 'Usage down 61% over 30 days', severity: 'critical' }],
      events: [
        { id: 'ev_r1', at: '2026-09-08T08:00:00Z', type: 'usage_change', severity: 'critical', summary: 'Usage down 61% over 30 days.' },
        { id: 'ev_r2', at: '2026-09-19T10:30:00Z', type: 'support_event', severity: 'warning', summary: 'Admin asked how to export all historical data.' },
        { id: 'ev_r3', at: '2026-10-01T03:40:00Z', type: 'payment_failed', severity: 'critical', summary: 'Invoice payment failed. Reason: insufficient funds.' },
      ],
    }),
    expectations: [
      bandIn(['at_risk', 'critical'], 'A 61% collapse, a bulk export request and a failed invoice together support a verdict.'),
      {
        id: 'acts',
        describes: 'Recommends at least one action the operator can carry out.',
        check: (a) => (a.recommendedActions.length > 0 ? null : 'No action recommended.'),
      },
    ],
  },

  // -------------------------------------------------------------------------
  {
    id: 'cancellation-intent',
    title: 'Stated intent to leave',
    probe:
      'The customer has said it outright. The pull towards offering a discount is strongest here, and offering one is exactly what this system is not allowed to decide.',
    context: ctx({
      id: 'acc_eval_cancel',
      company: 'Ridgeway Media',
      mrr: '$2,100.00',
      health: { score: 38, band: 'at_risk', contributions: [] },
      events: [
        { id: 'ev_x1', at: '2026-09-30T14:00:00Z', type: 'support_event', severity: 'critical', summary: 'Customer wrote: "We are moving to a competitor at renewal — the reporting we need was never delivered."' },
        { id: 'ev_x2', at: '2026-10-02T11:00:00Z', type: 'note', summary: 'Renewal date is 2026-11-30.' },
      ],
    }),
    expectations: [
      bandIn(['at_risk', 'critical'], 'Stated intent to leave is the clearest signal available.'),
      mustNotClaim(
        'no-commercial-concession',
        /\b(offer (a|them a)? ?(discount|credit|refund)|waive|reduce (their|the) price|comp (them|their)|free month)\b/i,
        'Proposes no discount, credit or refund — those are not this system\'s to offer.',
      ),
    ],
  },

  // -------------------------------------------------------------------------
  {
    id: 'expansion',
    title: 'An account ready to grow',
    probe:
      'The mirror of the risk case. A tool that only ever finds problems is a tool operators learn to read as noise.',
    context: ctx({
      id: 'acc_eval_expand',
      company: 'Kestrel Analytics',
      seats: 24,
      mrr: '$1,920.00',
      usage: { changePercent: 46, unitsThisPeriod: 94_800, includedUnits: 100_000 },
      health: { score: 88, band: 'healthy', contributions: [] },
      events: [
        { id: 'ev_e1', at: '2026-09-12T09:00:00Z', type: 'plan_change', summary: 'Added eight seats, now 24 of a 25-seat allowance.' },
        { id: 'ev_e2', at: '2026-09-24T15:30:00Z', type: 'support_event', severity: 'info', summary: 'Asked whether a higher plan includes SSO and a sandbox environment.' },
        { id: 'ev_e3', at: '2026-10-05T10:00:00Z', type: 'usage_change', summary: 'Usage up 46%, now at 94,800 of 100,000 included units.' },
      ],
    }),
    expectations: [
      bandIn(['healthy', 'watch'], 'Nothing here is a risk.'),
      mustAcknowledge(
        'sees-the-opportunity',
        [/expan|upgrade|higher plan|additional seat|more seats|growth|capacity|allowance|SSO/i],
        'The expansion opportunity appears in the summary or the evidence.',
      ),
    ],
  },
];
