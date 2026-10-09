/**
 * Turning one model response into one row of the published table.
 *
 * Scoring is kept separate from running so it can be tested without a network
 * call, and so a saved transcript can be rescored later when a measure
 * changes. A result that can only be reproduced by spending money again is
 * not a result anyone will check.
 */

import type { AccountAssessment } from '@headroom/domain';
import type { EvalCase } from './cases';
import { runMeasures, schemaValid, type MeasureResult } from './measures';

export interface ExpectationResult {
  id: string;
  describes: string;
  passed: boolean;
  /** Why it failed. Empty when it passed. */
  failure: string | null;
}

export interface CaseResult {
  caseId: string;
  title: string;
  probe: string;
  /** Null when the response never parsed. */
  assessment: AccountAssessment | null;
  measures: MeasureResult[];
  expectations: ExpectationResult[];
  /** True only when every measure and every expectation held. */
  passed: boolean;
  /** Milliseconds for the model call. */
  elapsedMs?: number;
}

/** Score a parsed assessment against its case. */
export function scoreCase(
  testCase: EvalCase,
  assessment: AccountAssessment,
  elapsedMs?: number,
): CaseResult {
  const measures = runMeasures({ assessment, context: testCase.context });

  const expectations: ExpectationResult[] = testCase.expectations.map((e) => {
    const failure = e.check(assessment, testCase.context);
    return { id: e.id, describes: e.describes, passed: failure === null, failure };
  });

  return {
    caseId: testCase.id,
    title: testCase.title,
    probe: testCase.probe,
    assessment,
    measures,
    expectations,
    passed: measures.every((m) => m.passed) && expectations.every((e) => e.passed),
    ...(elapsedMs === undefined ? {} : { elapsedMs }),
  };
}

/**
 * Score a response that never parsed.
 *
 * Reported as a single failed measure with no expectations, rather than as
 * expectations that silently all failed — the distinction between "the model
 * was wrong" and "there was nothing to judge" matters to a reader.
 */
export function scoreUnparseable(testCase: EvalCase, detail: string): CaseResult {
  return {
    caseId: testCase.id,
    title: testCase.title,
    probe: testCase.probe,
    assessment: null,
    measures: [schemaValid(false, detail)],
    expectations: [],
    passed: false,
  };
}

export interface Summary {
  total: number;
  passed: number;
  failed: number;
  /** Per measure, how many cases it held on. */
  byMeasure: Array<{ id: string; describes: string; passed: number; total: number }>;
}

export function summarise(results: CaseResult[]): Summary {
  const byMeasure = new Map<string, { describes: string; passed: number; total: number }>();

  for (const result of results) {
    for (const measure of result.measures) {
      const row = byMeasure.get(measure.id) ?? { describes: measure.describes, passed: 0, total: 0 };
      row.total += 1;
      if (measure.passed) row.passed += 1;
      byMeasure.set(measure.id, row);
    }
  }

  return {
    total: results.length,
    passed: results.filter((r) => r.passed).length,
    failed: results.filter((r) => !r.passed).length,
    byMeasure: [...byMeasure].map(([id, row]) => ({ id, ...row })),
  };
}
