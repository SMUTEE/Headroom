import { cn } from '../lib/cn';

/**
 * A placeholder for content that is not there.
 *
 * Two distinct jobs, and they need different accessibility treatment:
 *
 *   - `loading` (the default): content is on its way. Announced as busy so a
 *     screen reader user knows to wait rather than concluding the page is empty.
 *   - `absent`: this part of the product does not exist yet. It is scenery,
 *     so it is hidden from assistive technology entirely — announcing a
 *     placeholder for something that will never arrive is worse than silence.
 *
 * Shimmer is suppressed under `prefers-reduced-motion` by the global rule in
 * styles.css, so nothing extra is needed here.
 */
export interface SkeletonProps {
  purpose?: 'loading' | 'absent';
  className?: string;
  /** Describes what is loading. Ignored when `purpose` is `absent`. */
  label?: string;
}

export function Skeleton({ purpose = 'loading', className, label }: SkeletonProps) {
  const loading = purpose === 'loading';
  return (
    <div
      role={loading ? 'status' : undefined}
      aria-busy={loading || undefined}
      aria-label={loading ? label : undefined}
      aria-hidden={loading ? undefined : true}
      className={cn(
        'rounded-sm bg-bg-component-active',
        loading && 'animate-pulse',
        className,
      )}
    >
      {loading && label ? <span className="sr-only">{label}</span> : null}
    </div>
  );
}

/** Several lines of placeholder text, with a ragged last line. */
export function SkeletonText({
  lines = 3,
  purpose = 'loading',
  className,
  label,
}: SkeletonProps & { lines?: number }) {
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton
          key={i}
          purpose={purpose}
          {...(i === 0 && label ? { label } : {})}
          className={cn('h-3', i === lines - 1 ? 'w-2/3' : 'w-full')}
        />
      ))}
    </div>
  );
}
