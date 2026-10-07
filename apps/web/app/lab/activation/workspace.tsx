'use client';

import { useMemo, useState } from 'react';
import {
  Badge,
  Button,
  Callout,
  Card,
  CardHeader,
  Distribution,
  Metric,
  Stepper,
  Table,
  Td,
  Th,
  Tr,
  type Step,
  type StepState,
} from '@headroom/ui';
import {
  ACTIVATION_STEPS,
  type ActivationStep,
  CHECKLIST_STEPS,
  deriveActivation,
  STAGES,
  STEP_LABELS,
  summariseCohort,
  type AccountEvent,
} from '@headroom/domain';
import { REFERENCE_NOW, seedWorld } from '@headroom/data';

const world = seedWorld();

/** The product's own order: checklist first, then the steps that matter. */
const ALL_STEPS: readonly ActivationStep[] = [...CHECKLIST_STEPS, ...ACTIVATION_STEPS];

const STAGE_LABELS: Record<string, string> = {
  setup: 'Setup',
  connected: 'Connected',
  configured: 'Configured',
  activated: 'Activated',
  habitual: 'Habitual',
};

function relative(iso: string): string {
  const days = Math.floor((REFERENCE_NOW.getTime() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 60) return `${days} days ago`;
  return `${Math.round(days / 30)} months ago`;
}

export function ActivationWorkspace() {
  // Actions taken in this session are appended as events; nothing is stored as
  // a flag. Everything below recomputes from the event stream, which is the
  // claim this build is making and the easiest one to quietly cheat on.
  const [added, setAdded] = useState<AccountEvent[]>([]);
  const [selectedId, setSelectedId] = useState<string>('acc_slate_labs');

  const events = useMemo(() => [...world.accountEvents, ...added], [added]);

  const states = useMemo(
    () =>
      world.accounts.map((account) =>
        deriveActivation({
          accountId: account.id,
          createdAt: account.createdAt,
          events,
          asOf: REFERENCE_NOW,
        }),
      ),
    [events],
  );

  const cohort = useMemo(() => summariseCohort(states), [states]);

  const selected = world.accounts.find((a) => a.id === selectedId)!;
  const state = states.find((s) => s.accountId === selectedId)!;
  const completed = new Map(state.completed.map((c) => [c.step, c.completedAt]));

  function recordStep(step: ActivationStep) {
    setAdded((prev) => [
      ...prev,
      {
        id: `ev_session_${selectedId}_${step}_${prev.length}`,
        accountId: selectedId,
        type: step === 'list_viewed' ? 'activation' : 'activation_step',
        occurredAt: REFERENCE_NOW.toISOString(),
        severity: 'info',
        summary: STEP_LABELS[step],
        payload: { step },
      },
    ]);
  }

  const steps: Step[] = ALL_STEPS.map((step) => {
    const at = completed.get(step);
    const isNext = state.nextStep === step;
    const stepState: StepState = at ? 'done' : isNext ? 'next' : 'todo';
    return {
      id: step,
      label: STEP_LABELS[step],
      state: stepState,
      meta: at
        ? relative(at)
        : CHECKLIST_STEPS.includes(step)
          ? 'Part of the onboarding checklist'
          : 'Required for activation',
      action: isNext ? (
        <Button size="sm" variant="secondary" onClick={() => recordStep(step)}>
          Record
        </Button>
      ) : undefined,
    };
  });

  const sorted = [...states].sort((a, b) => {
    // Stalled first, then least progressed, then longest waiting.
    if (a.stalled !== b.stalled) return a.stalled ? -1 : 1;
    const byStage = STAGES.indexOf(a.stage) - STAGES.indexOf(b.stage);
    return byStage !== 0 ? byStage : b.daysInStage - a.daysInStage;
  });

  return (
    <div className="flex flex-col gap-5">
      <Callout
        tone="neutral"
        title="Try this: open Slate Labs, then record the two steps that activation actually needs."
      >
        Watch the cohort move. Nothing is stored as a flag — every number here is derived from
        the event stream, including the ones you add.
      </Callout>

      {/* Two numbers that disagree, side by side. That is the argument. */}
      <Card>
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-4">
          <Metric
            label="Activation rate"
            value={`${Math.round(cohort.activationRate * 100)}%`}
            emphasis
            hint={`${cohort.activated} of ${cohort.total} accounts`}
          />
          <Metric
            label="Onboarding complete"
            value={String(
              states.filter((s) => s.checklistComplete).length,
            )}
            hint="finished every step we ask for"
          />
          <Metric
            label="…but not activated"
            value={String(cohort.onboardedButNotActivated)}
            hint="reached no value"
            trend={cohort.onboardedButNotActivated > 0 ? 'up' : 'flat'}
            upIsGood={false}
          />
          <Metric
            label="Stalled"
            value={String(cohort.stalled)}
            hint="7+ days, no progress"
            trend={cohort.stalled > 0 ? 'up' : 'flat'}
            upIsGood={false}
          />
        </div>

        {cohort.onboardedButNotActivated > 0 ? (
          <Callout
            className="mt-4"
            tone="warning"
            title={`${cohort.onboardedButNotActivated} ${cohort.onboardedButNotActivated === 1 ? 'account has' : 'accounts have'} finished onboarding without reaching value`}
          >
            A completion-rate dashboard reports these as a success. They are the accounts most
            likely to leave quietly, because the product has already stopped asking them for
            anything.
          </Callout>
        ) : null}
      </Card>

      <Card>
        <CardHeader
          title="Where the book sits"
          headingLevel={2}
          description="Stages are derived from events, not from a stored status."
        />
        <Distribution
          className="mt-4"
          label="Accounts by activation stage"
          segments={STAGES.map((stage) => ({
            id: stage,
            label: STAGE_LABELS[stage] ?? stage,
            value: cohort.byStage[stage],
            emphasis: stage === state.stage,
          }))}
        />
      </Card>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,25rem)]">
        <Card flush className="self-start overflow-hidden">
          <div className="p-4">
            <CardHeader
              title="Accounts"
              headingLevel={2}
              description="Stalled first, then least progressed. Select one to work it."
            />
          </div>
          <div className="overflow-x-auto">
            <Table caption="Accounts by activation stage, time in stage and status">
              <thead>
                <tr>
                  <Th>Account</Th>
                  <Th>Stage</Th>
                  <Th numeric>In stage</Th>
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((row) => {
                  const account = world.accounts.find((a) => a.id === row.accountId)!;
                  const isSelected = row.accountId === selectedId;
                  return (
                    <Tr
                      key={row.accountId}
                      aria-current={isSelected ? 'true' : undefined}
                      className={isSelected ? 'bg-accent-bg' : undefined}
                    >
                      <Td className="p-0">
                        <button
                          type="button"
                          aria-pressed={isSelected}
                          className="flex w-full items-center gap-2 px-3 py-2.5 text-left underline-offset-2 hover:underline"
                          onClick={() => setSelectedId(row.accountId)}
                        >
                          <span
                            aria-hidden
                            className={`h-4 w-0.5 shrink-0 rounded-full ${isSelected ? 'bg-accent-solid' : ''}`}
                          />
                          {account.companyName}
                        </button>
                      </Td>
                      <Td>{STAGE_LABELS[row.stage] ?? row.stage}</Td>
                      <Td numeric>{row.daysInStage}d</Td>
                      <Td>
                        {row.onboardedButNotActivated ? (
                          <Badge tone="danger">Onboarded, not activated</Badge>
                        ) : row.stalled ? (
                          <Badge tone="warning">Stalled</Badge>
                        ) : row.stage === 'habitual' ? (
                          <Badge tone="success">Returning</Badge>
                        ) : row.activated ? (
                          <Badge tone="success">Activated</Badge>
                        ) : (
                          <Badge tone="neutral">In progress</Badge>
                        )}
                      </Td>
                    </Tr>
                  );
                })}
              </tbody>
            </Table>
          </div>
        </Card>

        <div className="flex flex-col gap-3 self-start xl:sticky xl:top-20">
          <Card className="flex flex-col gap-4">
            <CardHeader
              title={selected.companyName}
              headingLevel={2}
              description={`${STAGE_LABELS[state.stage]} · ${state.daysInStage} days in stage`}
              action={
                state.onboardedButNotActivated ? (
                  <Badge tone="danger">Not activated</Badge>
                ) : state.activated ? (
                  <Badge tone="success">Activated</Badge>
                ) : (
                  <Badge tone="neutral">In progress</Badge>
                )
              }
            />

            <Callout
              tone={state.onboardedButNotActivated ? 'warning' : state.stalled ? 'warning' : 'neutral'}
              title="Recommended"
            >
              {state.recommendation}
            </Callout>

            <Stepper label={`Activation steps for ${selected.companyName}`} steps={steps} />

            {state.activated ? (
              <p className="text-metadata text-text-secondary">
                {/* Restraint: no celebration. A progress indicator that congratulates
                    inflates the metric it is measuring. */}
                Activated {relative(state.activatedAt!)}.{' '}
                {state.stage === 'habitual'
                  ? 'Returning regularly.'
                  : 'Not yet returning regularly.'}
              </p>
            ) : null}
          </Card>

          {added.length > 0 ? (
            <Button variant="ghost" size="sm" onClick={() => setAdded([])}>
              Reset {added.length} recorded {added.length === 1 ? 'step' : 'steps'}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
