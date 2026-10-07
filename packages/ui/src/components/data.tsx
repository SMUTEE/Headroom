import type { HTMLAttributes, ReactNode, ThHTMLAttributes } from 'react';
import { cn } from '../lib/cn';

// ---------------------------------------------------------------------------
// Badge
// ---------------------------------------------------------------------------

export type BadgeTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'accent';

const BADGE_TONES: Record<BadgeTone, string> = {
  neutral: 'bg-bg-component text-text-secondary border-border',
  info: 'bg-info-bg text-info-text border-info-border',
  success: 'bg-success-bg text-success-text border-success-border',
  warning: 'bg-warning-bg text-warning-text border-warning-border',
  danger: 'bg-danger-bg text-danger-text border-danger-border',
  accent: 'bg-accent-bg text-accent-text border-accent-border',
};

/**
 * Badges always render their own text. There is no icon-only variant, because
 * a coloured dot with no label is exactly the "meaning carried by colour
 * alone" case that fails for a third of men with colour vision deficiency.
 */
export function Badge({
  tone = 'neutral',
  children,
  className,
}: {
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-sm border px-1.5 py-0.5 text-metadata font-medium whitespace-nowrap',
        BADGE_TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Meter
// ---------------------------------------------------------------------------

export interface MeterMarker {
  /** 0–1 along the track. */
  at: number;
  label: string;
}

export interface MeterProps {
  /** 0–1. Values above 1 render as a full bar plus an overflow segment. */
  value: number;
  tone?: 'accent' | 'success' | 'warning' | 'danger';
  label: string;
  /** Pre-formatted value for display; the component never formats. */
  valueLabel?: ReactNode;
  markers?: readonly MeterMarker[];
  className?: string;
}

const METER_TONES = {
  accent: 'bg-accent-solid',
  success: 'bg-success-solid',
  warning: 'bg-warning-solid',
  danger: 'bg-danger-solid',
} as const;

/**
 * A consumption meter with threshold markers.
 *
 * Overflow is drawn as a distinct striped segment rather than by letting the
 * bar run past its track, because "how far over" is the question an operator
 * is actually asking once a threshold is crossed.
 */
export function Meter({ value, tone = 'accent', label, valueLabel, markers, className }: MeterProps) {
  const filled = Math.min(1, Math.max(0, value));
  const over = Math.max(0, value - 1);
  // Compress the overflow so a 5x overrun still fits beside the bar.
  const overWidth = over > 0 ? Math.min(0.3, 0.08 + over * 0.1) : 0;

  return (
    <div className={className}>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-metadata text-text-secondary">{label}</span>
        {valueLabel ? (
          <span data-numeric className="text-metadata text-text-primary">
            {valueLabel}
          </span>
        ) : null}
      </div>

      <div
        role="meter"
        aria-valuenow={Math.round(value * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
        className="relative mt-1.5 flex h-2 w-full overflow-hidden rounded-sm bg-bg-component-active"
      >
        <div
          className={cn('h-full transition-[width] duration-(--duration-base)', METER_TONES[tone])}
          style={{ width: `${filled * 100}%` }}
        />
        {over > 0 ? (
          <div
            className="h-full bg-danger-solid transition-[width] duration-(--duration-base)"
            style={{
              width: `${overWidth * 100}%`,
              // Stripes distinguish overflow from fill without relying on hue.
              backgroundImage:
                'repeating-linear-gradient(45deg, transparent 0 3px, color-mix(in oklab, black 25%, transparent) 3px 6px)',
            }}
          />
        ) : null}

        {markers?.map((marker) => (
          <span
            key={marker.label}
            aria-hidden
            title={marker.label}
            className="absolute top-0 h-full w-px bg-text-primary/40"
            style={{ left: `${Math.min(1, marker.at) * 100}%` }}
          />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Table
// ---------------------------------------------------------------------------

export function Table({
  caption,
  children,
  className,
}: {
  /** Required. A data table without a caption is unnavigable by screen reader. */
  caption: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <table className={cn('w-full border-collapse text-body-sm', className)}>
      <caption className="sr-only">{caption}</caption>
      {children}
    </table>
  );
}

export function Th({
  numeric = false,
  className,
  children,
  ...rest
}: ThHTMLAttributes<HTMLTableCellElement> & { numeric?: boolean }) {
  return (
    <th
      scope="col"
      className={cn(
        'border-b border-border px-3 py-2 text-metadata font-medium text-text-secondary',
        numeric ? 'text-right' : 'text-left',
        className,
      )}
      {...rest}
    >
      {children}
    </th>
  );
}

export function Td({
  numeric = false,
  className,
  children,
  ...rest
}: HTMLAttributes<HTMLTableCellElement> & { numeric?: boolean }) {
  return (
    <td
      className={cn(
        'border-b border-border-subtle px-3 py-2 text-text-primary',
        numeric && 'text-right',
        className,
      )}
      {...rest}
    >
      {children}
    </td>
  );
}

export function Tr({
  interactive = false,
  className,
  children,
  ...rest
}: HTMLAttributes<HTMLTableRowElement> & { interactive?: boolean }) {
  return (
    <tr
      className={cn(
        interactive && 'cursor-pointer transition-colors hover:bg-bg-component',
        className,
      )}
      {...rest}
    >
      {children}
    </tr>
  );
}
