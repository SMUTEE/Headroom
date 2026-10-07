'use client';

import { useId, type ReactNode } from 'react';
import { cn } from '../lib/cn';

// ---------------------------------------------------------------------------
// Slider
// ---------------------------------------------------------------------------

export interface SliderProps {
  label: ReactNode;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  /** Pre-formatted display of the current value. */
  valueLabel?: ReactNode;
  /** Spoken value, where the formatted one would read badly. */
  valueText?: string;
  hint?: ReactNode;
  disabled?: boolean;
}

export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  valueLabel,
  valueText,
  hint,
  disabled,
}: SliderProps) {
  const id = useId();
  const percent = max === min ? 0 : ((value - min) / (max - min)) * 100;

  return (
    <div className={cn(disabled && 'opacity-50')}>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-label text-text-primary">
          {label}
        </label>
        {valueLabel ? (
          <span data-numeric className="text-label text-text-primary">
            {valueLabel}
          </span>
        ) : null}
      </div>

      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        // The visible label already names the control; this carries the value
        // in words for cases where "118402" would be read digit by digit.
        aria-valuetext={valueText}
        onChange={(e) => onChange(Number(e.target.value))}
        // The track and thumb are styled once in styles.css against this
        // attribute. A per-instance <style> tag would need CSS.escape, which
        // is a browser global and crashes during server rendering.
        data-slider
        className="mt-2 h-5 w-full cursor-pointer appearance-none bg-transparent disabled:cursor-not-allowed"
        style={{
          // Tailwind cannot express a value-dependent gradient stop, so the one
          // genuinely dynamic value is set here and still reads from tokens.
          ['--slider-fill' as string]: `${percent}%`,
        }}
      />

      {hint ? <p className="mt-1.5 text-metadata text-text-secondary">{hint}</p> : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Segmented control
// ---------------------------------------------------------------------------

export interface SegmentedOption<T extends string> {
  value: T;
  label: ReactNode;
}

export interface SegmentedControlProps<T extends string> {
  /** Names the group for assistive technology. */
  label: string;
  options: ReadonlyArray<SegmentedOption<T>>;
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

/**
 * Radios rather than buttons, so arrow keys move between options and the
 * selected state is announced — which is what a segmented control actually is.
 */
export function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
  className,
}: SegmentedControlProps<T>) {
  const name = useId();
  return (
    <fieldset
      className={cn(
        'inline-flex items-center gap-0.5 rounded-md border border-border bg-bg-component p-0.5',
        className,
      )}
    >
      <legend className="sr-only">{label}</legend>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <label
            key={option.value}
            className={cn(
              'cursor-pointer rounded-sm px-2.5 py-1 text-label transition-colors',
              'has-focus-visible:outline-2 has-focus-visible:outline-offset-2',
              'has-focus-visible:outline-accent-focus',
              active
                ? 'bg-bg-page text-text-primary shadow-sm'
                : 'text-text-secondary hover:text-text-primary',
            )}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={active}
              onChange={() => onChange(option.value)}
              className="sr-only"
            />
            {option.label}
          </label>
        );
      })}
    </fieldset>
  );
}

// ---------------------------------------------------------------------------
// Number field
// ---------------------------------------------------------------------------

export interface NumberFieldProps {
  label: ReactNode;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: ReactNode;
  hint?: ReactNode;
}

export function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  step,
  suffix,
  hint,
}: NumberFieldProps) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="text-label text-text-primary">
        {label}
      </label>
      <div className="mt-1.5 flex items-center gap-2">
        <input
          id={id}
          type="number"
          value={value}
          min={min}
          max={max}
          step={step}
          data-numeric
          onChange={(e) => {
            const next = Number(e.target.value);
            if (Number.isFinite(next)) onChange(next);
          }}
          // border-control, not border — an input's boundary is what identifies
          // it as a control, so it answers to the 3:1 requirement.
          className={cn(
            'h-9 w-full rounded-md border border-border-control bg-bg-page px-2.5',
            'text-body-sm text-text-primary',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-focus',
          )}
        />
        {suffix ? <span className="text-metadata text-text-secondary">{suffix}</span> : null}
      </div>
      {hint ? <p className="mt-1.5 text-metadata text-text-secondary">{hint}</p> : null}
    </div>
  );
}
