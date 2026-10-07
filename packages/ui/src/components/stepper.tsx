import type { ReactNode } from 'react';
import { cn } from '../lib/cn';

/**
 * An ordered list of steps with their state.
 *
 * Rendered as an `<ol>` because it is one — the order carries meaning, and a
 * screen reader should announce "3 of 5". State is carried by a word in the
 * accessible name, never by the marker's colour alone, so "done" and "next"
 * are distinguishable without seeing either.
 *
 * Deliberately has no completion celebration. A progress indicator that
 * congratulates inflates the metric it is measuring, which is the failure this
 * component exists inside a build about.
 */

export type StepState = 'done' | 'next' | 'todo' | 'skipped';

export interface Step {
  id: string;
  label: ReactNode;
  state: StepState;
  /** Timestamp, duration, or whatever belongs under the label. */
  meta?: ReactNode;
  /** Shown beside the step when it is the next one. */
  action?: ReactNode;
}

const STATE_WORD: Record<StepState, string> = {
  done: 'done',
  next: 'next up',
  todo: 'not started',
  skipped: 'skipped',
};

function Marker({ state }: { state: StepState }) {
  if (state === 'done') {
    return (
      <span
        aria-hidden
        className="grid size-5 shrink-0 place-items-center rounded-full bg-success-solid text-text-on-accent"
      >
        {/* A tick, so completion is a shape and not only a hue. */}
        <svg viewBox="0 0 12 12" className="size-3" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M2.5 6.5l2.5 2.5 4.5-5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    );
  }
  if (state === 'next') {
    return (
      <span
        aria-hidden
        className="grid size-5 shrink-0 place-items-center rounded-full border-2 border-accent-solid"
      >
        <span className="size-1.5 rounded-full bg-accent-solid" />
      </span>
    );
  }
  return (
    <span
      aria-hidden
      className={cn(
        'size-5 shrink-0 rounded-full border-2 border-border-control',
        state === 'skipped' && 'border-dashed',
      )}
    />
  );
}

export interface StepperProps {
  steps: readonly Step[];
  /** Names the sequence for assistive technology. */
  label: string;
  className?: string;
}

export function Stepper({ steps, label, className }: StepperProps) {
  return (
    <ol aria-label={label} className={cn('flex flex-col', className)}>
      {steps.map((step, i) => {
        const last = i === steps.length - 1;
        return (
          <li key={step.id} className="relative flex gap-3 pb-4 last:pb-0">
            {/* The connector is decoration; the list order carries the sequence. */}
            {!last ? (
              <span
                aria-hidden
                className={cn(
                  'absolute left-2.5 top-5 h-full w-px -translate-x-1/2',
                  step.state === 'done' ? 'bg-success-solid/40' : 'bg-border',
                )}
              />
            ) : null}

            <Marker state={step.state} />

            <div className="min-w-0 flex-1 pt-px">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <p
                  className={cn(
                    'text-label',
                    step.state === 'todo' || step.state === 'skipped'
                      ? 'text-text-secondary'
                      : 'text-text-primary',
                  )}
                >
                  {step.label}
                  {/* The state as a word, so it survives without colour. */}
                  <span className="sr-only"> — {STATE_WORD[step.state]}</span>
                </p>
                {step.action ? <span className="shrink-0">{step.action}</span> : null}
              </div>
              {step.meta ? (
                <p className="mt-0.5 text-metadata text-text-disabled">{step.meta}</p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

// ---------------------------------------------------------------------------
// Distribution
// ---------------------------------------------------------------------------

export interface DistributionSegment {
  id: string;
  label: string;
  value: number;
  /** Highlights this segment as the one under discussion. */
  emphasis?: boolean;
}

/**
 * A single stacked bar showing how a population splits across ordered stages.
 *
 * Counts are printed beside every label rather than relying on segment width,
 * because a stage holding one account out of eleven is a sliver nobody can
 * compare by eye.
 */
export function Distribution({
  segments,
  label,
  className,
}: {
  segments: readonly DistributionSegment[];
  label: string;
  className?: string;
}) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);

  return (
    <div className={className}>
      <div
        role="img"
        aria-label={`${label}: ${segments.map((s) => `${s.value} ${s.label}`).join(', ')}`}
        className="flex h-2 w-full gap-0.5 overflow-hidden rounded-sm"
      >
        {segments.map((s) => (
          <span
            key={s.id}
            className={cn(
              'h-full first:rounded-l-sm last:rounded-r-sm',
              s.emphasis ? 'bg-accent-solid' : 'bg-bg-component-active',
            )}
            style={{ width: total === 0 ? '0%' : `${(s.value / total) * 100}%` }}
          />
        ))}
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
        {segments.map((s) => (
          <li key={s.id} className="flex items-baseline gap-1.5">
            <span data-numeric className="text-label text-text-primary">
              {s.value}
            </span>
            <span className="text-metadata text-text-secondary">{s.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
