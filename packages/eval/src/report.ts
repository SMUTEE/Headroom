/**
 * The published artifact.
 *
 * Two outputs: a JSON run the site reads, and a markdown report for reading
 * in the repository. Both include the failures. A harness whose published
 * results are all green is either lucky or not being published honestly, and
 * the failing case is the most informative row in the table.
 */

import type { CaseResult, Summary } from './score';
import { summarise } from './score';

export interface EvalRun {
  /** ISO timestamp of the run. */
  ranAt: string;
  model: string;
  /** How the run was produced: against the live model, or saved responses. */
  mode: 'live' | 'saved';
  summary: Summary;
  results: CaseResult[];
}

export function buildRun(
  results: CaseResult[],
  model: string,
  mode: EvalRun['mode'],
  ranAt = new Date().toISOString(),
): EvalRun {
  return { ranAt, model, mode, summary: summarise(results), results };
}

const tick = (ok: boolean) => (ok ? 'pass' : 'FAIL');

export function toMarkdown(run: EvalRun): string {
  const lines: string[] = [];
  const { summary } = run;

  lines.push('# AI assessment evaluation');
  lines.push('');
  lines.push(
    'Ten cases run against the account assessment prompt. Every case is scored on six',
    'universal measures plus expectations written for that case alone. Failures are listed.',
    '',
  );
  lines.push(`- **Run** ${run.ranAt}`);
  lines.push(`- **Model** \`${run.model}\``);
  lines.push(`- **Mode** ${run.mode === 'live' ? 'live model call' : 'saved responses'}`);
  lines.push(`- **Result** ${summary.passed} of ${summary.total} cases passed`);
  lines.push('');

  lines.push('## By measure');
  lines.push('');
  lines.push('| Measure | Held | What it checks |');
  lines.push('|---|---|---|');
  for (const m of summary.byMeasure) {
    lines.push(`| \`${m.id}\` | ${m.passed}/${m.total} | ${m.describes} |`);
  }
  lines.push('');

  lines.push('## By case');
  lines.push('');
  lines.push('| Case | Result | Band | Confidence |');
  lines.push('|---|---|---|---|');
  for (const r of run.results) {
    const band = r.assessment?.health ?? '—';
    const conf = r.assessment ? r.assessment.confidence.toFixed(2) : '—';
    lines.push(`| ${r.title} | ${tick(r.passed)} | \`${band}\` | ${conf} |`);
  }
  lines.push('');

  const failed = run.results.filter((r) => !r.passed);
  if (failed.length > 0) {
    lines.push('## What failed');
    lines.push('');
    for (const r of failed) {
      lines.push(`### ${r.title}`);
      lines.push('');
      lines.push(`*${r.probe}*`);
      lines.push('');
      for (const m of r.measures.filter((x) => !x.passed)) {
        for (const f of m.failures) lines.push(`- **\`${m.id}\`** — ${f}`);
      }
      for (const e of r.expectations.filter((x) => !x.passed)) {
        lines.push(`- **\`${e.id}\`** — ${e.describes} ${e.failure ?? ''}`);
      }
      if (r.assessment) {
        lines.push('');
        lines.push('> ' + r.assessment.summary.replace(/\n/g, ' '));
      }
      lines.push('');
    }
  } else {
    lines.push('## What failed');
    lines.push('');
    lines.push('Nothing in this run. That is worth less than it looks: ten cases is a small');
    lines.push('suite, and a clean sheet mostly means the cases have not yet found the edge.');
    lines.push('');
  }

  return lines.join('\n');
}
