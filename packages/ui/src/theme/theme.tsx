'use client';

import { useEffect, useState } from 'react';

export type Appearance = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'headroom-theme';

/**
 * Runs before first paint to apply the stored appearance, so a dark-mode
 * visitor never sees a white flash. Injected as an inline script in the root
 * layout — it cannot be a component, because by the time React hydrates the
 * flash has already happened.
 *
 * Kept deliberately tiny and dependency-free. It sets `data-theme` only for an
 * explicit choice; absent a choice the CSS `prefers-color-scheme` block takes
 * over, which is why there is one switching mechanism rather than two.
 */
export const themeScript = `(function(){try{var t=localStorage.getItem('${STORAGE_KEY}');if(t==='light'||t==='dark'){document.documentElement.setAttribute('data-theme',t)}}catch(e){}})();`;

function apply(appearance: Appearance) {
  const root = document.documentElement;
  if (appearance === 'system') {
    root.removeAttribute('data-theme');
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* Private mode, blocked storage. The choice just will not persist. */
    }
    return;
  }
  root.setAttribute('data-theme', appearance);
  try {
    localStorage.setItem(STORAGE_KEY, appearance);
  } catch {
    /* As above — applying the theme matters more than remembering it. */
  }
}

function read(): Appearance {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
  } catch {
    /* Fall through to system. */
  }
  return 'system';
}

const OPTIONS: ReadonlyArray<{ value: Appearance; label: string }> = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
];

export function ThemeToggle() {
  const [appearance, setAppearance] = useState<Appearance>('system');
  const [mounted, setMounted] = useState(false);

  // The server cannot know the stored preference, so the control renders in a
  // neutral state until mount. Without this the markup mismatches on hydration.
  useEffect(() => {
    setAppearance(read());
    setMounted(true);
  }, []);

  function select(next: Appearance) {
    setAppearance(next);
    apply(next);
  }

  return (
    <fieldset className="inline-flex items-center gap-0.5 rounded-md border border-border bg-bg-component p-0.5">
      <legend className="sr-only">Appearance</legend>
      {OPTIONS.map((option) => {
        const active = mounted && appearance === option.value;
        return (
          <label
            key={option.value}
            className={[
              'cursor-pointer rounded-sm px-2 py-1 text-metadata transition-colors',
              'has-focus-visible:outline-2 has-focus-visible:outline-offset-2',
              'has-focus-visible:outline-accent-focus',
              active
                ? 'bg-bg-page text-text-primary shadow-sm'
                : 'text-text-secondary hover:text-text-primary',
            ].join(' ')}
          >
            <input
              type="radio"
              name="appearance"
              value={option.value}
              checked={active}
              onChange={() => select(option.value)}
              className="sr-only"
            />
            {option.label}
          </label>
        );
      })}
    </fieldset>
  );
}
