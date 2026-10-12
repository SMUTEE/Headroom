import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { EvalRun } from '@headroom/eval';

/**
 * Reads every committed eval run, one per model.
 *
 * Returns an empty list when there are none, and the page says so plainly.
 * The alternative — shipping sample results so the page always looks finished
 * — would make this the one page in the lab that lies, which is a poor choice
 * for the page whose whole subject is whether output can be trusted.
 */
export async function loadRuns(): Promise<EvalRun[]> {
  // The runs are committed files, so this is build-time data. Without the
  // directive the reads count as runtime data and prerendering refuses.
  'use cache';
  try {
    const dir = resolve(process.cwd(), '../../evals');
    const files = (await readdir(dir)).filter(
      (f) => f.endsWith('.json') && f !== 'dry-run.json',
    );

    const runs = await Promise.all(
      files.map(async (f) => JSON.parse(await readFile(resolve(dir, f), 'utf8')) as EvalRun),
    );

    // Most recent first, so the newest run leads.
    return runs.sort((a, b) => b.ranAt.localeCompare(a.ranAt));
  } catch {
    return [];
  }
}
