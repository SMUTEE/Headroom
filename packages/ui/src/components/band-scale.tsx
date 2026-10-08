import { cn } from '../lib/cn';

/**
 * A value's position on a banded scale, with the thresholds drawn in.
 *
 * A score on its own is a number. The useful question is which band it is in
 * and how close it is to leaving — 45 reads very differently once you can see
 * the next threshold is five points away. Drawing the bands makes that
 * legible without the reader holding the cutoffs in their head.
 *
 * Band widths are proportional to their real ranges rather than equal, so the
 * picture does not misrepresent how wide each band actually is.
 */

export interface ScaleBand {
  id: string;
  label: string;
  /** Inclusive lower bound. Bands are given low to high. */
  min: number;
  tone: 'danger' | 'warning' | 'neutral' | 'success';
}

const FILL: Record<ScaleBand['tone'], string> = {
  danger: 'bg-danger-solid',
  warning: 'bg-warning-solid',
  neutral: 'bg-bg-component-active',
  success: 'bg-success-solid',
};

export interface BandScaleProps {
  value: number;
  /** Low to high. The last band runs to `max`. */
  bands: readonly ScaleBand[];
  min?: number;
  max?: number;
  label: string;
  className?: string;
}

export function BandScale({
  value,
  bands,
  min = 0,
  max = 100,
  label,
  className,
}: BandScaleProps) {
  const span = max - min;
  const clamped = Math.min(max, Math.max(min, value));
  const position = ((clamped - min) / span) * 100;

  const current =
    [...bands].reverse().find((b) => clamped >= b.min) ?? bands[0];

  // The next boundary in either direction, and how far away it is. This is
  // the part a bare number cannot tell you.
  const above = bands.find((b) => b.min > clamped);
  const below = [...bands].reverse().find((b) => b.min <= clamped);
  const toAbove = above ? above.min - clamped : null;
  const toBelow = below && below.min > min ? clamped - below.min + 1 : null;

  const nearest =
    toAbove !== null && (toBelow === null || toAbove <= toBelow)
      ? { points: toAbove, band: above!.label, direction: 'up' as const }
      : toBelow !== null
        ? { points: toBelow, band: bands[bands.indexOf(below!) - 1]?.label, direction: 'down' as const }
        : null;

  return (
    <div className={className}>
      <div
        role="meter"
        aria-valuenow={value}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-label={`${label}: ${value}, ${current?.label}`}
        className="relative flex h-2 w-full gap-px"
      >
        {bands.map((band, i) => {
          const upper = bands[i + 1]?.min ?? max;
          const width = ((upper - band.min) / span) * 100;
          return (
            <span
              key={band.id}
              className={cn(
                'h-full first:rounded-l-xs last:rounded-r-xs',
                FILL[band.tone],
                // Bands the value is not in recede, so the eye lands on the
                // one that applies rather than reading four equal stripes.
                band.id === current?.id ? 'opacity-100' : 'opacity-25',
              )}
              style={{ width: `${width}%` }}
            />
          );
        })}

        {/* The marker. A notch through the full height, so its position is
            readable against the band edges rather than floating above them. */}
        <span
          aria-hidden
          className="absolute top-1/2 h-4 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-text-primary ring-2 ring-bg-surface"
          style={{ left: `${position}%` }}
        />
      </div>

      <div className="mt-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <span className="text-metadata text-text-secondary">
          {bands.map((b) => b.label).join(' · ')}
        </span>
        {nearest?.points !== undefined && nearest.band ? (
          <span className="text-metadata text-text-primary">
            <span data-numeric>{nearest.points}</span>{' '}
            {nearest.points === 1 ? 'point' : 'points'} from {nearest.band.toLowerCase()}
          </span>
        ) : null}
      </div>
    </div>
  );
}
