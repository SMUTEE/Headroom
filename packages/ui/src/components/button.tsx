import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '../lib/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md';

const VARIANTS: Record<ButtonVariant, string> = {
  // Exactly one filled action per view. The colour goes on the background, not
  // the label — accent text on a neutral button reads as a link.
  primary:
    'bg-accent-solid text-text-on-accent hover:bg-accent-solid-hover active:bg-accent-solid-hover',
  secondary:
    'bg-bg-component text-text-primary border border-border hover:bg-bg-component-hover active:bg-bg-component-active',
  ghost: 'text-text-secondary hover:bg-bg-component hover:text-text-primary',
  danger: 'bg-danger-solid text-text-on-accent hover:brightness-110',
};

const SIZES: Record<ButtonSize, string> = {
  // 32px and 36px tall. Both clear the 24px WCAG 2.2 target minimum; anything
  // in a dense table row still needs surrounding space rather than a smaller
  // button.
  sm: 'h-8 px-3 text-label gap-1.5',
  md: 'h-9 px-4 text-label gap-2',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Shows a spinner and blocks interaction without changing layout width. */
  loading?: boolean;
  iconLeft?: ReactNode;
}

export function Button({
  variant = 'secondary',
  size = 'md',
  loading = false,
  iconLeft,
  disabled,
  className,
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      // A loading button is still disabled for pointer input, but keeping it
      // focusable would strand the keyboard user mid-flow, so it is genuinely
      // disabled and announced as busy.
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        'relative inline-flex items-center justify-center rounded-md font-medium',
        'transition-colors duration-(--duration-fast)',
        'disabled:cursor-not-allowed disabled:opacity-50',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...rest}
    >
      {loading ? (
        <span
          aria-hidden
          className="absolute size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      ) : null}
      <span className={cn('inline-flex items-center', SIZES[size], 'h-auto p-0', loading && 'invisible')}>
        {iconLeft}
        {children}
      </span>
    </button>
  );
}
