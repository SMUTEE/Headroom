/**
 * @headroom/eval — the evaluation harness for the AI assessment.
 *
 * The cases and the scoring are pure data and pure functions; only
 * `runner.ts` touches the network. That split is what lets the harness be
 * tested, and lets a saved run be rescored without paying for it again.
 */

export * from './cases';
export * from './measures';
export * from './score';
export * from './report';
