import type { Metadata } from 'next';
import Link from 'next/link';
import { ThemeToggle } from '@headroom/ui';

export const metadata: Metadata = {
  title: 'Segun Akinnibosun — product engineering',
  description:
    'I design and build the product surfaces where business logic, money and AI judgment meet. Headroom is a public lab of working examples you can click through and try to break.',
};

/**
 * The front door.
 *
 * Everything else on this site is product chrome and deliberately reads as a
 * real application. This page is the only one that is not: it is the author
 * speaking, so it drops the shell entirely. That contrast is the signal — this
 * is me, that is the work.
 *
 * Written for someone with ninety seconds who has seen a lot of portfolios.
 * The three things to try are the whole argument, so they come before any
 * explanation of how it was built.
 */

const TRY = [
  {
    href: '/lab/monetisation',
    label: 'Pricing',
    question: 'If we change this price, what happens to the customers we already have?',
    instruction: 'Drag Included usage down to 40k.',
    outcome:
      'Three of eleven accounts move. Loomline, sitting at 98,252 units against a 100,000 allowance, crosses into overage for the first time and its bill goes up 28%. The other eight do not move at all. A single revenue number hides every part of that.',
  },
  {
    href: '/lab/activation',
    label: 'Activation',
    question: 'Are new customers reaching value, or just finishing our checklist?',
    instruction: 'Open Slate Labs and record the two steps it is missing.',
    outcome:
      'Slate Labs finished every onboarding step the product asks for and got nothing out of it. Recording the two steps that actually constitute activation moves the whole cohort: 64% to 73%, and the count of accounts the dashboard was calling successful drops to zero.',
  },
  {
    href: '/lab/operator',
    label: 'AI',
    question: 'Can AI do the synthesis without becoming something you cannot check?',
    instruction: 'Assess Verge Robotics.',
    outcome:
      'It refuses. The account signed up three days ago with no history, so the assessment returns "not enough evidence" at 20% confidence with no risks and no recommendations. Assess Orbit Health instead and every claim it makes links to the specific event it came from.',
  },
];

const WENT_WRONG = [
  {
    title: 'A cent that rounded the wrong way',
    body: 'Converting dollars to cents with Math.round(dollars * 100) returns 100 for $1.005, where the answer is 101. In floating point 1.005 * 100 is 100.49999999999999, so the error exists before the rounding and nothing downstream recovers it. A test caught it.',
  },
  {
    title: 'A meter labelled “used” that showed a forecast',
    body: 'An account that had consumed 23% of its allowance rendered a full red bar, because the bar filled from the projection while the label said used so far. Every test passed: the arithmetic was right and the arithmetic was not the problem.',
  },
  {
    title: 'A test I had written to pass',
    body: 'The account the whole dataset is built around is described as down 23% over a fortnight. It was down 6%. The seed test asserted the drop was greater than 3%, a threshold I picked because it passed. It now checks the data against the figure the record claims.',
  },
];

function Section({
  eyebrow,
  title,
  children,
}: {
  eyebrow?: string;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-border pt-10">
      {eyebrow ? <p className="text-metadata text-text-disabled">{eyebrow}</p> : null}
      {title ? <h2 className="mt-1 text-h2">{title}</h2> : null}
      {children}
    </section>
  );
}

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <header className="flex flex-col gap-6">
        <div className="flex items-start justify-between gap-6">
          <p className="text-label text-text-primary">Segun Akinnibosun</p>
          <ThemeToggle />
        </div>

        <h1 className="text-display">
          I design and build the product surfaces where business logic, money and AI judgment
          meet.
        </h1>

        <p className="max-w-prose text-body text-text-secondary">
          Pricing that has to be billed correctly. Activation that has to mean something.
          AI output that has to be safe enough to act on. The work that sits between a
          product decision and the code that enforces it.
        </p>
      </header>

      {/* ---- The argument, before any explanation of it ---- */}
      <div className="mt-14 flex flex-col gap-10">
        <Section eyebrow="Three things to try" title="Everything below is live and clickable.">
          <p className="mt-3 max-w-prose text-body-sm text-text-secondary">
            Headroom is a fictional B2B SaaS company I built so I could work on real product
            problems without waiting for a client to hand me one. Every customer, figure and
            event in it is synthetic and labelled as such. Nothing needs a login.
          </p>

          <ol className="mt-8 flex flex-col gap-8">
            {TRY.map((item, i) => (
              <li key={item.href} className="flex gap-4">
                <span
                  aria-hidden
                  data-numeric
                  className="mt-1 text-metadata text-text-disabled"
                >
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-metadata text-text-disabled">{item.label}</p>
                  <h3 className="mt-1 text-h3">{item.question}</h3>
                  <p className="mt-3 rounded-md border border-accent-border bg-accent-bg px-3 py-2 text-label text-text-primary">
                    {item.instruction}
                  </p>
                  <p className="mt-3 max-w-prose text-body-sm text-text-secondary">
                    {item.outcome}
                  </p>
                  <Link
                    href={item.href}
                    className="mt-3 inline-block rounded-md bg-accent-solid px-3.5 py-2 text-label text-text-on-accent transition-colors hover:bg-accent-solid-hover"
                  >
                    Open it &rarr;
                  </Link>
                </div>
              </li>
            ))}
          </ol>
        </Section>

        {/* ---- Credibility ---- */}
        <Section eyebrow="How I work" title="The argument is in the edge cases.">
          <div className="mt-4 grid gap-x-8 gap-y-5 sm:grid-cols-2">
            <div>
              <p className="text-label text-text-primary">Money is integer cents</p>
              <p className="mt-1 text-body-sm text-text-secondary">
                Behind a type that makes passing a float a compile error. Proration, credit
                ordering, duplicate meter events and period boundaries are all tested, because
                that is where billing actually breaks.
              </p>
            </div>
            <div>
              <p className="text-label text-text-primary">State is derived, not stored</p>
              <p className="mt-1 text-body-sm text-text-secondary">
                Activation and account health are computed from events every time. A stored
                flag drifts from the events that justify it the first time anything is
                backfilled, and then nobody can explain the number.
              </p>
            </div>
            <div>
              <p className="text-label text-text-primary">The colour system fails the build</p>
              <p className="mt-1 text-body-sm text-text-secondary">
                Palettes are computed rather than picked, and every rendered pair is
                contrast-measured on each run in both themes. It has caught two real
                accessibility bugs I would otherwise have shipped.
              </p>
            </div>
            <div>
              <p className="text-label text-text-primary">AI output is guarded, not trusted</p>
              <p className="mt-1 text-body-sm text-text-secondary">
                Schema validation proves shape; separate checks prove content. An assessment
                citing a record that does not exist is rejected outright — that failure reads
                as rigour, which is what makes it dangerous.
              </p>
            </div>
          </div>
        </Section>

        <Section eyebrow="What went wrong" title="These are more useful than the finished screens.">
          <div className="mt-4 flex flex-col">
            {WENT_WRONG.map((bug) => (
              <div key={bug.title} className="border-b border-border-subtle py-4 last:border-0">
                <h3 className="text-label text-text-primary">{bug.title}</h3>
                <p className="mt-1 max-w-prose text-body-sm text-text-secondary">{bug.body}</p>
              </div>
            ))}
          </div>
        </Section>

        <Section eyebrow="Honestly" title="What this does not prove.">
          <ul className="mt-4 flex max-w-prose list-disc flex-col gap-2 pl-5 text-body-sm text-text-secondary">
            <li>
              A synthetic environment. It shows billing logic and billing UX, not production
              reconciliation. No tax, no multi-currency, no dunning.
            </li>
            <li>
              Nothing about working inside an existing codebase, with its history and its
              constraints.
            </li>
            <li>
              Nothing about what collaborating on a problem like this is actually like. That
              needs a different kind of evidence than a lab can produce.
            </li>
          </ul>
        </Section>

        {/* ---- Engage ---- */}
        <Section eyebrow="Next" title="Bring me a product problem.">
          <p className="mt-3 max-w-prose text-body-sm text-text-secondary">
            If something in your product is stuck between design and engineering — pricing you
            cannot reason about, a metric that is lying to you, an AI feature you do not trust
            enough to ship — I would like to hear about it.
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3">
            <a
              href="mailto:akinnibosun50@gmail.com"
              className="rounded-md bg-accent-solid px-4 py-2.5 text-label text-text-on-accent transition-colors hover:bg-accent-solid-hover"
            >
              Start a conversation
            </a>
            {/* Shown as selectable text as well: mail links do not always work
                inside embedded viewers, and a dead button is worse than none. */}
            <span className="text-body-sm text-text-secondary">
              akinnibosun50@gmail.com
            </span>
            <a
              href="https://github.com/SMUTEE/Headroom"
              className="text-body-sm text-accent-text underline underline-offset-4"
            >
              Read the source
            </a>
          </div>
        </Section>

        <Section>
          <div className="flex flex-wrap items-baseline justify-between gap-4">
            <p className="text-metadata text-text-secondary">
              Built with Next.js and TypeScript. Around 230 tests covering the business rules.
            </p>
            <Link
              href="/system"
              className="text-metadata text-accent-text underline underline-offset-4"
            >
              The design system
            </Link>
          </div>
        </Section>
      </div>
    </main>
  );
}
