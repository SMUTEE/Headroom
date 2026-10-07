import type { Metadata } from 'next';
import { ThemeToggle } from '@headroom/ui';

export const metadata: Metadata = {
  title: 'Design system',
  description:
    'The tokens, type scale and foundations shared by every build in the Headroom lab. The colour ramps are generated and every rendered pair is contrast-measured.',
};

const RAMPS = ['neutral', 'accent', 'danger', 'warning', 'success', 'info'] as const;
const STEPS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;

/** The role each step carries. Role-defined, so it holds in both appearances. */
const STEP_ROLES: Record<number, string> = {
  1: 'Page background',
  2: 'Subtle background / surface',
  3: 'Component background',
  4: 'Component hover',
  5: 'Component active',
  6: 'Subtle border',
  7: 'Border, separator',
  8: 'Strong border',
  9: 'Solid fill',
  10: 'Solid fill hover, focus ring',
  11: 'Low-contrast text',
  12: 'High-contrast text',
};

const SEMANTIC_GROUPS = [
  {
    name: 'Surfaces',
    tokens: ['bg-page', 'bg-subtle', 'bg-surface', 'bg-component', 'bg-component-hover', 'bg-component-active'],
  },
  { name: 'Lines', tokens: ['border-subtle', 'border', 'border-strong', 'border-control'] },
  { name: 'Text', tokens: ['text-primary', 'text-secondary', 'text-disabled'] },
  {
    name: 'Accent',
    tokens: ['accent-bg', 'accent-bg-hover', 'accent-border', 'accent-focus', 'accent-solid', 'accent-solid-hover', 'accent-text'],
  },
  { name: 'Danger', tokens: ['danger-bg', 'danger-border', 'danger-solid', 'danger-text'] },
  { name: 'Warning', tokens: ['warning-bg', 'warning-border', 'warning-solid', 'warning-text'] },
  { name: 'Success', tokens: ['success-bg', 'success-border', 'success-solid', 'success-text'] },
  { name: 'Info', tokens: ['info-bg', 'info-border', 'info-solid', 'info-text'] },
];

const TYPE_SCALE = [
  { token: 'text-display', label: 'Display', sample: 'Headroom' },
  { token: 'text-h1', label: 'Heading 1', sample: 'Usage and billing' },
  { token: 'text-h2', label: 'Heading 2', sample: 'Projected invoice' },
  { token: 'text-h3', label: 'Heading 3', sample: 'Included usage' },
  { token: 'text-body', label: 'Body', sample: 'The account crossed its included allowance on 14 March.' },
  { token: 'text-body-sm', label: 'Body small', sample: 'The account crossed its included allowance on 14 March.' },
  { token: 'text-label', label: 'Label', sample: 'Overage rate' },
  { token: 'text-metadata', label: 'Metadata', sample: 'Last computed 6 days ago' },
];

function Section({
  title,
  note,
  children,
}: {
  title: string;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-border pt-10">
      <h2 className="text-h3">{title}</h2>
      {note ? <p className="mt-2 max-w-2xl text-body-sm text-text-secondary">{note}</p> : null}
      <div className="mt-6">{children}</div>
    </section>
  );
}

export default function DesignSystemPage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <header className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <p className="text-metadata text-text-secondary">Headroom</p>
          <h1 className="mt-1 text-h1">Design system</h1>
          <p className="mt-3 max-w-2xl text-body text-text-secondary">
            The foundations every build in the lab shares. Colour ramps are generated rather than
            hand-picked, and all 58 rendered colour pairs are contrast-measured against WCAG 2.2 AA
            in both appearances.
          </p>
        </div>
        <ThemeToggle />
      </header>

      <div className="mt-12 flex flex-col gap-10">
        <Section
          title="Colour ramps"
          note="Six ramps of twelve steps. Steps are role-defined rather than lightness-defined, so step 9 is the solid fill in both light and dark and component CSS never branches on appearance — only the primitive values swap. Hues sit at least 45° apart so a destructive action and a primary action can never read as the same button."
        >
          <div className="flex flex-col gap-3">
            {RAMPS.map((ramp) => (
              <div key={ramp}>
                <div className="mb-1.5 flex items-baseline gap-2">
                  <span className="text-label capitalize">{ramp}</span>
                  {ramp === 'neutral' ? (
                    <span className="text-metadata text-text-secondary">
                      tinted a few percent toward the accent
                    </span>
                  ) : null}
                </div>
                <div className="flex overflow-hidden rounded-md border border-border">
                  {STEPS.map((step) => (
                    <div
                      key={step}
                      title={`--${ramp}-${step} · ${STEP_ROLES[step]}`}
                      className="flex h-14 flex-1 items-end justify-center pb-1"
                      style={{ backgroundColor: `var(--${ramp}-${step})` }}
                    >
                      <span
                        className="text-metadata"
                        style={{ color: step >= 9 ? 'var(--neutral-1)' : 'var(--neutral-12)' }}
                      >
                        {step}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Section
          title="Semantic tokens"
          note="The only tier components reference. Primitives name a value; these name a job. A token is used only in its role — a separator is never borrowed as a text colour, because the day borders get lighter the text goes with them."
        >
          <div className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
            {SEMANTIC_GROUPS.map((group) => (
              <div key={group.name}>
                <h3 className="text-label text-text-secondary">{group.name}</h3>
                <ul className="mt-2 flex flex-col gap-1">
                  {group.tokens.map((token) => (
                    <li key={token} className="flex items-center gap-2.5">
                      <span
                        aria-hidden
                        className="size-5 shrink-0 rounded-sm border border-border-subtle"
                        style={{ backgroundColor: `var(--color-${token})` }}
                      />
                      <code className="font-mono text-metadata text-text-secondary">{token}</code>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Section>

        <Section
          title="Type scale"
          note="A dense scale with a 15px body, because this is operator software with tables and metrics rather than an article. Numbers use tabular figures everywhere by default, so a column of money or usage never reflows as values change."
        >
          <div className="flex flex-col gap-5">
            {TYPE_SCALE.map((row) => (
              <div key={row.token} className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-6">
                <div className="w-40 shrink-0">
                  <code className="font-mono text-metadata text-text-secondary">{row.token}</code>
                </div>
                <p className={row.token}>{row.sample}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 rounded-lg border border-border bg-bg-surface p-4">
            <p className="text-label">Tabular figures</p>
            <table className="mt-3 w-full text-body-sm">
              <caption className="sr-only">
                Demonstration that numeric columns align regardless of digit width
              </caption>
              <thead>
                <tr className="text-left text-metadata text-text-secondary">
                  <th scope="col" className="pb-2 font-medium">Account</th>
                  <th scope="col" className="pb-2 text-right font-medium">Usage</th>
                  <th scope="col" className="pb-2 text-right font-medium">Projected</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Orbit Health', '118,402', '$1,284.00'],
                  ['Northstar Logistics', '11,118', '$411.11'],
                  ['Loomline', '99,000', '$990.00'],
                ].map(([name, usage, projected]) => (
                  <tr key={name} className="border-t border-border-subtle">
                    <td className="py-1.5">{name}</td>
                    <td className="py-1.5 text-right">{usage}</td>
                    <td className="py-1.5 text-right">{projected}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        <Section
          title="Radius and elevation"
          note="Three shadows, not seventeen. Shadows are tinted with the neutral hue rather than pure black so they sit inside the palette, and they all but disappear in dark mode where surfaces separate by lightness instead."
        >
          <div className="flex flex-wrap gap-4">
            {(['sm', 'md', 'lg', 'xl'] as const).map((size) => (
              <div
                key={size}
                className="flex size-24 items-center justify-center border border-border bg-bg-surface"
                style={{ borderRadius: `var(--radius-${size})` }}
              >
                <code className="font-mono text-metadata text-text-secondary">radius-{size}</code>
              </div>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap gap-6">
            {(['sm', 'md', 'lg'] as const).map((size) => (
              <div
                key={size}
                className="flex size-24 items-center justify-center rounded-lg bg-bg-surface"
                style={{ boxShadow: `var(--shadow-${size})` }}
              >
                <code className="font-mono text-metadata text-text-secondary">shadow-{size}</code>
              </div>
            ))}
          </div>
        </Section>

        <Section
          title="What this does not prove"
          note="Every build in the lab carries one of these, and so does the system itself."
        >
          <ul className="flex max-w-2xl list-disc flex-col gap-2 pl-5 text-body-sm text-text-secondary">
            <li>
              Three colour pairs clear WCAG 2.2 AA but fall just below their APCA floor in dark mode.
              They are listed in the generator output with the reasoning, not rounded away.
            </li>
            <li>
              Automated contrast measurement is not an accessibility audit. Keyboard order, screen
              reader output and focus management are verified per build, not here.
            </li>
            <li>
              The palette has not been tested with users who have colour vision deficiency. Colour is
              never the only carrier of meaning in this system, which mitigates but does not replace
              that testing.
            </li>
          </ul>
        </Section>
      </div>
    </main>
  );
}
