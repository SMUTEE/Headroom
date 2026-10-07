/**
 * Activation.
 *
 * The distinction this module exists to hold: **finishing onboarding is not
 * activation.** A product's checklist measures what the product asked the
 * customer to do. Activation measures whether the customer got anything out of
 * it. Conflating them is why dashboards report healthy onboarding for accounts
 * that are about to churn.
 *
 * So there are two separate tracks here, and the interesting state is the gap
 * between them: checklist complete, activation not.
 *
 * Everything is DERIVED from events. Nothing is stored as a flag, because a
 * stored flag drifts from the events that justify it the first time someone
 * backfills, replays or corrects a record — and then the number nobody can
 * explain is the one the team plans against.
 */

import type { ActivationStage, AccountEvent } from './types';

export type ActivationStep =
  | 'source_connected'
  | 'team_invited'
  | 'billing_added'
  | 'rule_created'
  | 'list_viewed';

/**
 * What the onboarding checklist nags about. Completing all of these is what a
 * naive dashboard calls "onboarded".
 */
export const CHECKLIST_STEPS: readonly ActivationStep[] = [
  'source_connected',
  'team_invited',
  'billing_added',
];

/**
 * The activation event, stated explicitly: create a health rule AND look at
 * the accounts it returns.
 *
 * Both are required. Configuration without consumption is someone following
 * instructions; it is not value received. This is the single most important
 * definition in the build and it is deliberately narrow.
 */
export const ACTIVATION_STEPS: readonly ActivationStep[] = ['rule_created', 'list_viewed'];

/** Distinct days the account returned to the list after activating. */
export const HABIT_RETURN_DAYS = 3;
export const HABIT_WINDOW_DAYS = 14;

/** Days in a pre-activation stage before the account counts as stalled. */
export const DEFAULT_STALL_AFTER_DAYS = 7;

const MS_PER_DAY = 86_400_000;

export interface StepRecord {
  step: ActivationStep;
  completedAt: string;
}

export interface ActivationState {
  accountId: string;
  stage: ActivationStage;

  completed: StepRecord[];
  /** Checklist steps not yet done, in the order the product presents them. */
  checklistRemaining: ActivationStep[];
  checklistComplete: boolean;

  activated: boolean;
  activatedAt?: string;

  /**
   * The state the whole build exists to make visible: the product's own
   * checklist says finished, and the customer has still had nothing from it.
   */
  onboardedButNotActivated: boolean;

  enteredStageAt: string;
  daysInStage: number;
  stalled: boolean;

  /** The one thing worth doing next, or undefined once habitual. */
  nextStep?: ActivationStep;
  /** Why that step, in an operator's words. */
  recommendation: string;
}

export const STEP_LABELS: Record<ActivationStep, string> = {
  source_connected: 'Connect a data source',
  team_invited: 'Invite a teammate',
  billing_added: 'Add billing details',
  rule_created: 'Create an account health rule',
  list_viewed: 'View the accounts the rule returns',
};

/** Pull completed steps out of the event stream, earliest occurrence wins. */
function completedSteps(events: readonly AccountEvent[]): Map<ActivationStep, string> {
  const found = new Map<ActivationStep, string>();

  for (const event of events) {
    if (event.type !== 'activation_step' && event.type !== 'activation') continue;
    const step = event.payload.step;
    if (typeof step !== 'string') continue;
    if (!(step in STEP_LABELS)) continue;

    const typed = step as ActivationStep;
    const existing = found.get(typed);
    // A step can be emitted more than once — re-invites, a second rule. The
    // first occurrence is the one that moved the account forward.
    if (!existing || new Date(event.occurredAt) < new Date(existing)) {
      found.set(typed, event.occurredAt);
    }
  }

  return found;
}

function stageOf(done: Map<ActivationStep, string>, habitual: boolean): ActivationStage {
  if (habitual) return 'habitual';
  if (done.has('rule_created') && done.has('list_viewed')) return 'activated';
  if (done.has('rule_created')) return 'configured';
  if (done.has('source_connected')) return 'connected';
  return 'setup';
}

/** When the account entered the stage it is in now. */
function stageEnteredAt(
  stage: ActivationStage,
  done: Map<ActivationStep, string>,
  createdAt: string,
): string {
  switch (stage) {
    case 'habitual':
    case 'activated':
      return done.get('list_viewed') ?? done.get('rule_created') ?? createdAt;
    case 'configured':
      return done.get('rule_created') ?? createdAt;
    case 'connected':
      return done.get('source_connected') ?? createdAt;
    case 'setup':
      return createdAt;
  }
}

function isHabitual(
  events: readonly AccountEvent[],
  activatedAt: string | undefined,
): boolean {
  if (!activatedAt) return false;
  const from = new Date(activatedAt).getTime();
  const until = from + HABIT_WINDOW_DAYS * MS_PER_DAY;

  // Distinct calendar days on which the account came back to the list.
  const days = new Set<string>();
  for (const event of events) {
    // Both types carry steps — the activation event itself is typed
    // `activation` for narrative display. Counting only `activation_step`
    // here silently dropped the first visit, so an account that returned
    // three times was only ever credited with two.
    if (event.type !== 'activation_step' && event.type !== 'activation') continue;
    if (event.payload.step !== 'list_viewed') continue;
    const at = new Date(event.occurredAt).getTime();
    if (at < from || at > until) continue;
    days.add(event.occurredAt.slice(0, 10));
  }
  return days.size >= HABIT_RETURN_DAYS;
}

export interface DeriveActivationInput {
  accountId: string;
  createdAt: string;
  events: readonly AccountEvent[];
  asOf: Date;
  stallAfterDays?: number;
}

/**
 * Derive an account's activation state from its events.
 *
 * Pure, and order-independent: the events may arrive in any sequence, repeat,
 * or be replayed, and the result is the same. That is the property a stored
 * flag cannot offer.
 */
export function deriveActivation(input: DeriveActivationInput): ActivationState {
  const { accountId, createdAt, events, asOf } = input;
  const stallAfter = input.stallAfterDays ?? DEFAULT_STALL_AFTER_DAYS;

  const forAccount = events.filter((e) => e.accountId === accountId);
  const done = completedSteps(forAccount);

  const activatedAt =
    done.has('rule_created') && done.has('list_viewed')
      ? // Activation happens when the LATER of the two lands, not the earlier.
        [done.get('rule_created')!, done.get('list_viewed')!].sort().at(-1)!
      : undefined;

  const habitual = isHabitual(forAccount, activatedAt);
  const stage = stageOf(done, habitual);

  const checklistRemaining = CHECKLIST_STEPS.filter((s) => !done.has(s));
  const checklistComplete = checklistRemaining.length === 0;
  const activated = Boolean(activatedAt);

  const enteredStageAt = stageEnteredAt(stage, done, createdAt);
  const daysInStage = Math.max(
    0,
    Math.floor((asOf.getTime() - new Date(enteredStageAt).getTime()) / MS_PER_DAY),
  );

  // Only a pre-activation stage can stall. An activated account that has gone
  // quiet is a health problem, not an activation one, and belongs to Build 3.
  const stalled = !activated && daysInStage >= stallAfter;

  const nextStep: ActivationStep | undefined = !done.has('rule_created')
    ? 'rule_created'
    : !done.has('list_viewed')
      ? 'list_viewed'
      : checklistRemaining[0];

  return {
    accountId,
    stage,
    completed: [...done.entries()]
      .map(([step, completedAt]) => ({ step, completedAt }))
      .sort((a, b) => a.completedAt.localeCompare(b.completedAt)),
    checklistRemaining,
    checklistComplete,
    activated,
    ...(activatedAt ? { activatedAt } : {}),
    onboardedButNotActivated: checklistComplete && !activated,
    enteredStageAt,
    daysInStage,
    stalled,
    ...(nextStep ? { nextStep } : {}),
    recommendation: recommend({
      stage,
      stalled,
      daysInStage,
      checklistComplete,
      activated,
      nextStep,
    }),
  };
}

function recommend(input: {
  stage: ActivationStage;
  stalled: boolean;
  daysInStage: number;
  checklistComplete: boolean;
  activated: boolean;
  nextStep?: ActivationStep | undefined;
}): string {
  const { stage, stalled, daysInStage, checklistComplete, activated, nextStep } = input;

  if (stage === 'habitual') return 'Activated and returning. Nothing needed.';

  if (checklistComplete && !activated) {
    // The case worth naming explicitly, because the dashboard says done.
    return `Onboarding is complete and this account still has not reached value. ${STEP_LABELS[nextStep ?? 'rule_created']} is the step that would change that.`;
  }

  if (activated) return 'Activated. Watch for a second and third return visit.';

  if (stalled) {
    return `${daysInStage} days at ${stage} with no progress. Reach out before the trial decides for them.`;
  }

  return nextStep
    ? `${STEP_LABELS[nextStep]} is the next step.`
    : 'No next step.';
}

// ---------------------------------------------------------------------------
// Cohort
// ---------------------------------------------------------------------------

export interface CohortSummary {
  byStage: Record<ActivationStage, number>;
  total: number;
  activated: number;
  /** Activated ÷ total. The number a team usually reports. */
  activationRate: number;
  stalled: number;
  /** The number that contradicts the first one. */
  onboardedButNotActivated: number;
}

export const STAGES: readonly ActivationStage[] = [
  'setup',
  'connected',
  'configured',
  'activated',
  'habitual',
];

export function summariseCohort(states: readonly ActivationState[]): CohortSummary {
  const byStage = Object.fromEntries(STAGES.map((s) => [s, 0])) as Record<
    ActivationStage,
    number
  >;
  for (const state of states) byStage[state.stage] += 1;

  const activated = states.filter((s) => s.activated).length;

  return {
    byStage,
    total: states.length,
    activated,
    activationRate: states.length === 0 ? 0 : activated / states.length,
    stalled: states.filter((s) => s.stalled).length,
    onboardedButNotActivated: states.filter((s) => s.onboardedButNotActivated).length,
  };
}
