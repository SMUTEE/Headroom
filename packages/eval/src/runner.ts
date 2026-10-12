/**
 * Runs the suite against a model and writes the results.
 *
 *     pnpm eval                                  # local, free, no account
 *     EVAL_PROVIDER=anthropic ANTHROPIC_API_KEY=… pnpm eval
 *     EVAL_PROVIDER=openai-compatible EVAL_BASE_URL=… EVAL_API_KEY=… EVAL_MODEL=… pnpm eval
 *
 * Whatever the provider, the prompt, the schema and the guards are the ones
 * the application uses. An eval that exercises a slightly different request
 * measures something the product does not do.
 *
 * Results land in `evals/` as JSON the site reads and a markdown report for
 * reading in the repository, keyed by model so runs accumulate rather than
 * overwrite one another. Both get committed, failures included.
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { AccountAssessmentSchema } from '@headroom/domain';

import { EVAL_CASES } from './cases';
import { providerFromEnv, TransportError, type Provider } from './providers';
import { buildRun, toMarkdown } from './report';
import { scoreCase, scoreUnparseable, type CaseResult } from './score';

const OUT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../../../evals');

/** A filename-safe form of a model id, so `qwen2.5:14b` is not a path. */
function slug(model: string): string {
  return model
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * A fixed stand-in response, used only by `--dry-run`.
 *
 * It is not a model output and is never written to a results file. Its one
 * job is to prove the plumbing before a run that costs money or time. Reused
 * unchanged across all ten cases, so it passes some and fails others, which
 * exercises both halves of the report.
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

async function runSuite(provider: Provider) {
  const results: CaseResult[] = [];
  const transportErrors: string[] = [];

  console.log(`Running ${EVAL_CASES.length} cases against ${provider.model}\n`);

  for (const [i, testCase] of EVAL_CASES.entries()) {
    process.stdout.write(`[${i + 1}/${EVAL_CASES.length}] ${testCase.title} … `);
    const startedAt = Date.now();

    try {
      const { raw } = await provider.assess(testCase.context);
      const elapsed = Date.now() - startedAt;

      // One schema, every provider. A response that does not fit is a real
      // result about that model and gets published as one.
      const parsed = AccountAssessmentSchema.safeParse(raw);
      if (!parsed.success) {
        const first = parsed.error.issues[0];
        results.push(
          scoreUnparseable(
            testCase,
            first
              ? `${first.path.join('.') || 'root'}: ${first.message}`
              : 'Did not fit the schema.',
          ),
        );
        console.log('did not fit the schema');
        continue;
      }

      const scored = scoreCase(testCase, parsed.data, elapsed);
      results.push(scored);
      console.log(scored.passed ? 'pass' : 'FAIL');
    } catch (error) {
      if (!(error instanceof TransportError)) throw error;

      console.log('could not reach the model');
      transportErrors.push(`${testCase.title}: ${error.message}`);

      // A rejected key, or a local runtime that is not running, fails
      // identically for all ten. Stopping saves nine more round trips and
      // nine repetitions of the same message.
      if (error.fatal) {
        console.error('\nThis will fail for every case. Stopping.');
        break;
      }
    }
  }

  return { results, transportErrors };
}

async function main() {
  if (process.argv.includes('--dry-run')) {
    await dryRun();
    return;
  }

  let provider: Provider;
  try {
    provider = providerFromEnv();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
    return;
  }

  const { results, transportErrors } = await runSuite(provider);

  if (transportErrors.length > 0) {
    // Nothing is written. A partial run is not a publishable result, and a
    // network failure recorded as a model failure would be the single most
    // misleading thing this harness could produce.
    console.error(
      `\n${transportErrors.length} of ${EVAL_CASES.length} cases could not reach the model:\n` +
        transportErrors.map((e) => `  - ${e}`).join('\n') +
        '\n\nNothing was written. Fix the cause and run it again.',
    );
    process.exitCode = 1;
    return;
  }

  const run = buildRun(results, provider.model, 'live');

  await mkdir(OUT_DIR, { recursive: true });
  const name = slug(provider.model);
  await writeFile(resolve(OUT_DIR, `${name}.json`), `${JSON.stringify(run, null, 2)}\n`);
  await writeFile(resolve(OUT_DIR, `${name}.md`), toMarkdown(run));

  console.log(
    `\n${run.summary.passed}/${run.summary.total} cases passed. ` +
      `Written to evals/${name}.json and evals/${name}.md`,
  );

  // A failing case is information, not a broken build. The point of
  // publishing this is that some of it fails.
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
