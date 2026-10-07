import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../lib/cn';

// ---------------------------------------------------------------------------
// Card
// ---------------------------------------------------------------------------

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Removes padding so the card can hold a flush table or chart. */
  flush?: boolean;
}

export function Card({ flush = false, className, children, ...rest }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-lg border border-border bg-bg-surface',
        !flush && 'p-4',
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  description,
  action,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex items-start justify-between gap-4', className)}>
      <div className="min-w-0">
        <h3 className="text-label text-text-primary">{title}</h3>
        {description ? (
          <p className="mt-1 text-metadata text-text-secondary">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Metric
// ---------------------------------------------------------------------------

export type Trend = 'up' | 'down' | 'flat';

export interface MetricProps {
  label: ReactNode;
  /** Pre-formatted. The component never formats money or numbers itself. */
  value: ReactNode;
  hint?: ReactNode;
  trend?: Trend;
  /**
   * Whether an upward trend is good. Revenue up is good; churn up is not, so
   * the caller decides rather than the component assuming.
   */
  upIsGood?: boolean;
  emphasis?: boolean;
}

const TREND_GLYPH: Record<Trend, string> = { up: '↑', down: '↓', flat: '→' };

export function Metric({
  label,
  value,
  hint,
  trend,
  upIsGood = true,
  emphasis = false,
}: MetricProps) {
  const good = trend === 'flat' ? null : trend === 'up' ? upIsGood : !upIsGood;
  const trendClass =
    good === null ? 'text-text-secondary' : good ? 'text-success-text' : 'text-danger-text';

  return (
    <div>
      <p className="text-metadata text-text-secondary">{label}</p>
      <p
        data-numeric
        className={cn(
          'mt-1 tracking-tight text-text-primary',
          emphasis ? 'text-h1' : 'text-h2',
        )}
      >
        {value}
      </p>
      {trend || hint ? (
        <p className={cn('mt-1 flex items-center gap-1 text-metadata', trendClass)}>
          {trend ? (
            // The glyph carries the direction so the meaning does not rest on
            // colour alone.
            <span aria-hidden>{TREND_GLYPH[trend]}</span>
          ) : null}
          {hint ? <span className={trend ? undefined : 'text-text-secondary'}>{hint}</span> : null}
        </p>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Callout
// ---------------------------------------------------------------------------

export type CalloutTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

const TONES: Record<CalloutTone, { wrap: string; label: string }> = {
  neutral: { wrap: 'border-border bg-bg-component', label: 'text-text-secondary' },
  info: { wrap: 'border-info-border bg-info-bg', label: 'text-info-text' },
  success: { wrap: 'border-success-border bg-success-bg', label: 'text-success-text' },
  warning: { wrap: 'border-warning-border bg-warning-bg', label: 'text-warning-text' },
  danger: { wrap: 'border-danger-border bg-danger-bg', label: 'text-danger-text' },
};

export interface CalloutProps {
  tone?: CalloutTone;
  /**
   * Required. Status is never carried by colour alone, so every callout names
   * its own state in text.
   */
  title: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function Callout({ tone = 'neutral', title, children, action, className }: CalloutProps) {
  const styles = TONES[tone];
  return (
    <div
      // Only genuinely urgent tones interrupt a screen reader mid-task.
      role={tone === 'danger' || tone === 'warning' ? 'alert' : undefined}
      className={cn('rounded-md border p-3', styles.wrap, className)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={cn('text-label', styles.label)}>{title}</p>
          {children ? (
            <div className="mt-1 text-metadata text-text-secondary">{children}</div>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

export function EmptyState({
  title,
  description,
  action,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-md border border-dashed border-border px-6 py-10 text-center">
      <p className="text-label text-text-primary">{title}</p>
      {description ? (
        <p className="mt-1 max-w-sm text-metadata text-text-secondary">{description}</p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
