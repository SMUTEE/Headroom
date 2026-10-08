import type { ReactNode } from 'react';
import { cn } from '../lib/cn';

/**
 * A chronological list of what happened.
 *
 * Built as an ordered list, because the order is the information. Highlighting
 * marks the entries that explain something selected elsewhere — the events
 * behind a score change, say — and it is carried by a left bar and a word in
 * the accessible name, not by colour alone.
 *
 * `incomplete` is deliberately part of the API. Events arrive with fields
 * missing, and a timeline that renders around the gap tells the reader
 * everything is known. Saying so costs one line and is the difference between
 * a record and a reassuring fiction.
 */

export type TimelineTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

export interface TimelineItem {
  id: string;
  /** Pre-formatted. The component never formats dates. */
  at: ReactNode;
  title: ReactNode;
  detail?: ReactNode;
  tone?: TimelineTone;
  /** Marks this entry as explaining whatever is currently selected. */
  highlighted?: boolean;
  /** What is missing or untrustworthy about this record. */
  incomplete?: string;
  /** Rendered at the trailing edge — a points delta, a badge. */
  trailing?: ReactNode;
}

const DOT: Record<TimelineTone, string> = {
  neutral: 'bg-border-strong',
  info: 'bg-info-solid',
  success: 'bg-success-solid',
  warning: 'bg-warning-solid',
  danger: 'bg-danger-solid',
};

export function Timeline({
  items,
  label,
  emptyMessage = 'Nothing recorded yet.',
  className,
}: {
  items: readonly TimelineItem[];
  label: string;
  emptyMessage?: string;
  className?: string;
}) {
  if (items.length === 0) {
    return (
      <p className={cn('text-body-sm text-text-secondary', className)}>{emptyMessage}</p>
    );
  }

  return (
    <ol aria-label={label} className={cn('flex flex-col', className)}>
      {items.map((item, i) => {
        const last = i === items.length - 1;
        return (
          <li
            key={item.id}
            className={cn(
              'relative flex gap-3 pb-4 pl-3 last:pb-0',
              item.highlighted && 'bg-accent-bg',
            )}
          >
            {/* The highlight is a bar as well as a tint, so it survives without
                colour and reads at a glance down a long list. */}
            {item.highlighted ? (
              <span aria-hidden className="absolute left-0 top-0 h-full w-0.5 bg-accent-solid" />
            ) : null}

            {!last ? (
              <span aria-hidden className="absolute left-[1.0625rem] top-4 h-full w-px bg-border" />
            ) : null}

            <span
              aria-hidden
              className={cn(
                'relative mt-1.5 size-2 shrink-0 rounded-full ring-2 ring-bg-surface',
                DOT[item.tone ?? 'neutral'],
              )}
            />

            <div className="min-w-0 flex-1 pb-1">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                <p className="text-body-sm text-text-primary">
                  {item.title}
                  {item.highlighted ? (
                    <span className="sr-only"> — explains the selected change</span>
                  ) : null}
                </p>
                {item.trailing ? <span className="shrink-0">{item.trailing}</span> : null}
              </div>

              <p className="mt-0.5 text-metadata text-text-disabled">{item.at}</p>

              {item.detail ? (
                <p className="mt-1 text-metadata text-text-secondary">{item.detail}</p>
              ) : null}

              {item.incomplete ? (
                <p className="mt-1 flex items-start gap-1.5 text-metadata text-warning-text">
                  <span aria-hidden className="mt-1 size-1.5 shrink-0 rounded-full bg-warning-solid" />
                  <span>{item.incomplete}</span>
                </p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
