import Link from 'next/link';
import { ThemeToggle } from '@headroom/ui';

/**
 * The top-right of every product page.
 *
 * Carries the author link as well as the theme control, because a visitor who
 * arrives on a shared link to one screen would otherwise see an anonymous SaaS
 * app with no indication that it is anyone's work. AppShell stays generic;
 * this is the app supplying what it needs.
 */
export function OperatorBar() {
  return (
    <div className="flex items-center gap-3">
      <Link
        href="/"
        className="hidden text-metadata text-text-secondary underline-offset-4 transition-colors hover:text-text-primary hover:underline sm:block"
      >
        A lab by Segun Akinnibosun
      </Link>
      <ThemeToggle />
    </div>
  );
}

/**
 * Closes every product page. The top bar hides its author link at phone width
 * for space, and a shared link opening on a phone would otherwise show an
 * anonymous application.
 */
export function OperatorFooter() {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
      <p className="text-metadata text-text-secondary">
        A lab by{' '}
        <Link href="/" className="text-accent-text underline underline-offset-4">
          Segun Akinnibosun
        </Link>
        . Everything here is synthetic.
      </p>
      <a
        href="https://github.com/SMUTEE/Headroom"
        className="text-metadata text-text-secondary underline underline-offset-4 hover:text-text-primary"
      >
        Source
      </a>
    </div>
  );
}
