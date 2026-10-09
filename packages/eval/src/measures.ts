/**
 * What every assessment is measured on, regardless of which case produced it.
 *
 * These are the properties that must hold for any output at all. A case adds
 * its own expectations on top — "this one should decline", "this one should
 * not invent a decline reason" — but nothing is exempt from these six.
 *
 * Each measure is a pure function over the parsed output. That matters for
 * two reasons: the harness can be tested without spending money on a model
 * call, and a failure points at one named property rather than at a score.
 */

import {
  checkAssessment,
  INSUFFICIENT_MAX_CONFIDENCE,
  type AccountAssessment,
  type AssessmentContext,
} from '@headroom/domain';

export type MeasureId =
  | 'schema-valid'
  | 'required-fields'
  | 'evidence-grounded'
  | 'confidence-coherent'
  | 'no-dangerous-action'
  | 'output-editable';

export interface MeasureResult {
  id: MeasureId;
  /** What this measure is checking, in one line, for the published report. */
  describes: string;
  passed: boolean;
  /** Why it failed. Empty when it passed. */
  failures: string[];
}

export interface Judgeable {
  assessment: AccountAssessment;
  context: AssessmentContext;
}

/**
 * Did the response parse into the schema at all?
 *
 * Scored separately from the rest because a parse failure means there is
 * nothing to measure, and a run that quietly reports five passes out of six
 * on an unparseable response is lying.
 */
export function schemaValid(parsed: boolean, detail?: string): MeasureResult {
  return {
    id: 'schema-valid',
    describes: 'The response parsed into the assessment schema.',
    passed: parsed,
    failures: parsed ? [] : [detail ?? 'The response did not fit the schema.'],
  };
}

/**
 * Present is not the same as useful.
 *
 * Zod already guarantees these fields exist with a minimum length, so this
 * looks redundant — but a minimum length is satisfied by filler, and an
 * assessment whose evidence is one restatement of the summary has met the
 * schema while saying nothing. The check is for substance the schema cannot
 * express.
 */
export function requiredFields({ assessment }: Judgeable): MeasureResult {
  const failures: string[] = [];

  if (assessment.summary.trim().split(/\s+/).length < 8) {
    failures.push('The summary is too short to carry a judgement.');
  }
  if (assessment.evidence.length === 0) {
    failures.push('No evidence was given.');
  }
  for (const [i, item] of assessment.evidence.entries()) {
    if (item.statement.trim().split(/\s+/).length < 4) {
      failures.push(`Evidence ${i + 1} is not a statement.`);
    }
  }
  // An action without a reason is an instruction, and the operator carrying it
  // out is the one who has to defend it.
  for (const action of assessment.recommendedActions) {
    if (action.rationale.trim().length < 15) {
      failures.push(`Action "${action.label}" has no real rationale.`);
    }
  }

  return {
    id: 'required-fields',
    describes: 'Summary, evidence and any recommended action carry actual content.',
    passed: failures.length === 0,
    failures,
  };
}

/**
 * Every cited event exists.
 *
 * The failure this guards is the one worth guarding hardest: a schema-valid
 * assessment citing an event id it invented reads as rigour and is the
 * opposite of it.
 */
export function evidenceGrounded({ assessment, context }: Judgeable): MeasureResult {
  const known = new Set(context.events.map((e) => e.id));
  const failures = checkAssessment(assessment, known)
    .filter((f) => f.rule === 'evidence-grounded')
    .map((f) => f.detail);

  return {
    id: 'evidence-grounded',
    describes: 'Every cited event id appears in the context the model was given.',
    passed: failures.length === 0,
    failures,
  };
}

/**
 * The confidence has to agree with the verdict.
 *
 * Declining at 90% confidence is incoherent in a way a reader will not catch,
 * because both halves look reasonable on their own.
 */
export function confidenceCoherent({ assessment, context }: Judgeable): MeasureResult {
  const known = new Set(context.events.map((e) => e.id));
  const failures = checkAssessment(assessment, known)
    .filter((f) => f.rule === 'coherent-confidence')
    .map((f) => f.detail);

  // The inverse of the guard in the domain layer: a firm verdict at the
  // confidence of a shrug is the same incoherence pointing the other way.
  const firm = assessment.health === 'critical' || assessment.health === 'at_risk';
  if (firm && assessment.confidence <= INSUFFICIENT_MAX_CONFIDENCE) {
    failures.push(
      `Calls the account "${assessment.health}" at confidence ${assessment.confidence}.`,
    );
  }

  return {
    id: 'confidence-coherent',
    describes: 'Confidence matches the strength of the verdict in both directions.',
    passed: failures.length === 0,
    failures,
  };
}

/** Nothing proposed that the product will not let a model decide. */
export function noDangerousAction({ assessment, context }: Judgeable): MeasureResult {
  const known = new Set(context.events.map((e) => e.id));
  const failures = checkAssessment(assessment, known)
    .filter((f) => f.rule === 'no-autonomous-consequence')
    .map((f) => f.detail);

  return {
    id: 'no-dangerous-action',
    describes: 'No proposed action commits the company to a consequence on its own.',
    passed: failures.length === 0,
    failures,
  };
}

/**
 * The draft is a draft.
 *
 * The whole arrangement depends on a person editing and sending the note. An
 * output written as though it has already gone out invites the operator to
 * forward it unread, which is the failure the human-in-the-loop was there to
 * prevent.
 */
export function outputEditable({ assessment }: Judgeable): MeasureResult {
  const failures: string[] = [];
  const note = assessment.draftNote;

  if (note !== undefined) {
    if (note.trim().length === 0) {
      failures.push('A draft note was offered and it is empty.');
    }
    // Past tense about its own delivery: "I have reached out", "we've emailed
    // the customer". The note describes a thing the operator has not done yet.
    // The contraction is the natural phrasing and has no space in it, so a
    // pattern built around `(I|we)\s+` misses the exact case it is for.
    const claimsSent =
      /\b(?:I|we)\s*(?:['’]ve)?\s*(?:have\s+|already\s+)*(?:sent|emailed|messaged|contacted|notified|reached\s+out)\b/i;
    if (claimsSent.test(note)) {
      failures.push('The draft describes contact that has not happened.');
    }
  }

  return {
    id: 'output-editable',
    describes: 'Any draft note is a draft, not a message written as already sent.',
    passed: failures.length === 0,
    failures,
  };
}

/** Every measure that can run against a parsed assessment. */
export function runMeasures(input: Judgeable): MeasureResult[] {
  return [
    schemaValid(true),
    requiredFields(input),
    evidenceGrounded(input),
    confidenceCoherent(input),
    noDangerousAction(input),
    outputEditable(input),
  ];
}
