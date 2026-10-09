import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { EvalRun } from '@headroom/eval';

/**
 * Reads the committed eval run.
 *
 * Returns null when there isn't one, and the page says so plainly. The
 * alternative — shipping sample results so the page always looks finished —
 * would make this the one page in the lab that lies, which is a poor choice
 * for the page whose whole subject is whether the output can be trusted.
 */
export async function loadRun(): Promise<EvalRun | null> {
  // The run is a committed file, so it is build-time data. Without this the
  // file read counts as runtime data and prerendering refuses the route.
  'use cache';
  try {
    const path = resolve(process.cwd(), '../../evals/latest.json');
    return JSON.parse(await readFile(path, 'utf8')) as EvalRun;
  } catch {
    return null;
  }
}
