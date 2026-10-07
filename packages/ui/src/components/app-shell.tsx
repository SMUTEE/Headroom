import type { ReactNode } from 'react';
import { cn } from '../lib/cn';

/**
 * The product chrome: sidebar, top bar, page header.
 *
 * Deliberately generic — it takes nav items, a brand node and children, and
 * knows nothing about accounts, billing or any domain concept. The same shell
 * frames an operator console and a customer portal by passing different nav.
 *
 * `available: false` renders a section that exists in the product's shape but
 * not yet in the build. It is dimmed and inert rather than a link to nowhere,
 * because a nav item that silently does nothing is worse than one that says
 * it is not ready.
 */

export interface NavItem {
  label: string;
  href?: string;
  /** Marks the current section. */
  current?: boolean;
  /** Default true. False renders it dimmed and non-interactive. */
  available?: boolean;
}

export interface NavGroup {
  label?: string;
  items: NavItem[];
}

export interface AppShellProps {
  brand: ReactNode;
  nav: NavGroup[];
  /** Rendered at the top right of the bar — a user chip, a theme toggle. */
  barEnd?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  /** Actions beside the page title. */
  actions?: ReactNode;
  /** A persistent strip under the bar, for an environment or demo notice. */
  notice?: ReactNode;
  children: ReactNode;
}

function NavLink({ item }: { item: NavItem }) {
  const available = item.available ?? true;
  const classes = cn(
    'block rounded-md px-2.5 py-1.5 text-label transition-colors',
    item.current
      ? 'bg-bg-component-active text-text-primary'
      : available
        ? 'text-text-secondary hover:bg-bg-component hover:text-text-primary'
        : 'cursor-not-allowed text-text-disabled',
  );

  if (!available) {
    return (
      <span className={classes} aria-disabled="true">
        {item.label}
        <span className="sr-only"> — not built yet</span>
      </span>
    );
  }

  return (
    <a href={item.href} aria-current={item.current ? 'page' : undefined} className={classes}>
      {item.label}
    </a>
  );
}

export function AppShell({
  brand,
  nav,
  barEnd,
  title,
  description,
  actions,
  notice,
  children,
}: AppShellProps) {
  return (
    <div className="flex min-h-full flex-col">
      {/* Repeated chrome precedes the content on every page, so the first
          focusable element is a way past it. Visible only on focus. */}
      <a
        href="#main"
        className="sr-only focus-visible:not-sr-only focus-visible:absolute focus-visible:left-3 focus-visible:top-3 focus-visible:z-50 focus-visible:rounded-md focus-visible:bg-bg-surface focus-visible:px-3 focus-visible:py-2 focus-visible:text-label focus-visible:text-text-primary focus-visible:shadow-md"
      >
        Skip to content
      </a>

      {/* Top bar spans the full width so the brand sits above the sidebar,
          which is what makes the thing read as an application rather than a
          document with a menu beside it. */}
      <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center justify-between gap-4 border-b border-border bg-bg-page/90 px-4 backdrop-blur">
        <div className="flex items-center gap-2">{brand}</div>
        {barEnd ? <div className="flex items-center gap-2">{barEnd}</div> : null}
      </header>

      {notice}

      <div className="flex min-h-0 flex-1">
        <nav
          aria-label="Sections"
          className="hidden w-56 shrink-0 border-r border-border p-3 lg:block"
        >
          <div className="flex flex-col gap-5">
            {nav.map((group, i) => (
              <div key={group.label ?? i}>
                {group.label ? (
                  <p className="px-2.5 pb-1.5 text-metadata text-text-disabled">{group.label}</p>
                ) : null}
                <ul className="flex flex-col gap-0.5">
                  {group.items.map((item) => (
                    <li key={item.label}>
                      <NavLink item={item} />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </nav>

        <main id="main" tabIndex={-1} className="min-w-0 flex-1">
          <div className="border-b border-border px-4 py-5 sm:px-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <h1 className="text-h2">{title}</h1>
                {description ? (
                  <p className="mt-1 max-w-prose text-body-sm text-text-secondary">
                    {description}
                  </p>
                ) : null}
              </div>
              {actions ? <div className="flex shrink-0 gap-2">{actions}</div> : null}
            </div>
          </div>

          <div className="px-4 py-6 sm:px-6">{children}</div>
        </main>
      </div>
    </div>
  );
}

/** Horizontal nav for narrow viewports, where the sidebar is hidden. */
export function AppShellMobileNav({ nav }: { nav: NavGroup[] }) {
  const items = nav.flatMap((g) => g.items);
  return (
    <nav
      aria-label="Sections"
      className="flex gap-1 overflow-x-auto border-b border-border px-4 py-2 lg:hidden"
    >
      {items.map((item) => (
        <span key={item.label} className="shrink-0">
          <NavLink item={item} />
        </span>
      ))}
    </nav>
  );
}
