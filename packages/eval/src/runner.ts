/**
 * Runs the suite against the model and writes the results.
 *
 *     ANTHROPIC_API_KEY=... pnpm --filter @headroom/eval eval
 *
 * The call here is deliberately identical to the one the application makes —
 * same prompt, same schema, same model. An eval that exercises a slightly
 * different request measures something the product does not do.
 *
 * Results land in `evals/` as JSON the site reads and a markdown report for
 * reading in the repository. Both get committed, failures included.
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { AccountAssessmentSchema, ASSESSMENT_SYSTEM_PROMPT } from '@headroom/domain';

import { EVAL_CASES } from './cases';
import { buildRun, toMarkdown } from './report';
import { scoreCase, scoreUnparseable, type CaseResult } from './score';

const MODEL = 'claude-opus-5-5';
const OUT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../../../evals');

/**
 * A fixed stand-in response, used only by `--dry-run`.
 *
 * It is not a model output and is never written to `latest.json`. Its one job
 * is to prove the plumbing — the loop, the scoring, the files — before a run
 * that costs money. Reused unchanged across all ten cases, so it passes some
 * and fails others, which exercises both halves of the report.
 */
const STAND_IN = {
  summary: 'A fixed placeholder used to exercise the harness. No model produced this text.',
  health: 'watch' as const,
  confidence: 0.6,
  evidence: [{ statement: 'A placeholder statement standing in for real evidence.', eventId: null }],
  risks: [],
  recommendedActions: [],
};

async function dryRun() {
  const results = EVAL_CASES.map((testCase) => scoreCase(testCase, STAND_IN));
  const run = buildRun(results, 'none — no model was called', 'saved');

  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(
    resolve(OUT_DIR, 'dry-run.md'),
    `> Plumbing check. No model was called and these are not results.\n\n${toMarkdown(run)}`,
  );

  console.log(
    `Dry run: scored ${run.summary.total} cases against a fixed placeholder ` +
      `(${run.summary.passed} would pass). Wrote evals/dry-run.md. No model was called.`,
  );
}

async function main() {
  if (process.argv.includes('--dry-run')) {
    await dryRun();
    return;
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error(
      'ANTHROPIC_API_KEY is not set.\n\n' +
        'This script calls the model and costs money, so it does not fall back to\n' +
        'saved responses. A published result has to come from a real run.',
    );
    process.exitCode = 1;
    return;
  }

  const anthropic = new Anthropic();
  const results: CaseResult[] = [];

  for (const [i, testCase] of EVAL_CASES.entries()) {
    process.stdout.write(`[${i + 1}/${EVAL_CASES.length}] ${testCase.title} … `);
    const startedAt = Date.now();

    try {
      const message = await anthropic.messages.parse({
        model: MODEL,
        max_tokens: 4096,
        system: ASSESSMENT_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: JSON.stringify(testCase.context, null, 2) }],
        output_config: { format: zodOutputFormat(AccountAssessmentSchema) },
      });

      const elapsed = Date.now() - startedAt;
      const assessment = message.parsed_output;

      if (!assessment) {
        results.push(scoreUnparseable(testCase, 'The response did not fit the schema.'));
        console.log('unparseable');
        continue;
      }

      const scored = scoreCase(testCase, assessment, elapsed);
      results.push(scored);
      console.log(scored.passed ? 'pass' : 'FAIL');
    } catch (error) {
      // A transport failure is not a model failure, and recording it as one
      // would understate the model in the published table.
      const detail = error instanceof Error ? error.message : String(error);
      console.log(`error — ${detail}`);
      results.push(scoreUnparseable(testCase, `Request failed: ${detail}`));
    }
  }

  const run = buildRun(results, MODEL, 'live');

  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(resolve(OUT_DIR, 'latest.json'), `${JSON.stringify(run, null, 2)}\n`);
  await writeFile(resolve(OUT_DIR, 'REPORT.md'), toMarkdown(run));

  console.log(
    `\n${run.summary.passed}/${run.summary.total} cases passed. ` +
      `Written to evals/latest.json and evals/REPORT.md`,
  );

  // A failing case is information, not a broken build. The point of
  // publishing this is that some of it fails.
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
