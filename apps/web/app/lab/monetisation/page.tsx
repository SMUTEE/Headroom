import type { Metadata } from 'next';
import Link from 'next/link';
import { ThemeToggle } from '@headroom/ui';
import { Workbench } from './workbench';

export const metadata: Metadata = {
  title: 'Monetisation Lab',
  description:
    'A working exploration of plan packaging and usage-based billing: change a plan and watch an existing book of business re-price, then see what one customer would experience. Synthetic data.',
};

export default function MonetisationPage() {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <header className="flex flex-wrap items-start justify-between gap-6">
        <div className="max-w-3xl">
          <p className="text-metadata text-text-secondary">
            <Link href="/" className="underline-offset-2 hover:underline">
              Headroom
            </Link>{' '}
            · Build 01
          </p>
          <h1 className="mt-1 text-h1">
            If we change this price, what happens to the customers we already have?
          </h1>
          <p className="mt-3 text-body text-text-secondary">
            A pricing page answers what something costs. It cannot answer the question a founder
            actually loses sleep over. This models a packaging change across a whole book of
            business, then drops you into what one of those customers would see before the bill
            arrives.
          </p>
        </div>
        <ThemeToggle />
      </header>

      <div className="mt-10">
        <Workbench />
      </div>

      <section className="mt-14 grid gap-10 border-t border-border pt-10 lg:grid-cols-2">
        <div>
          <h2 className="text-h3">The decisions</h2>
          <dl className="mt-4 flex flex-col gap-4 text-body-sm">
            <div>
              <dt className="text-label text-text-primary">The problem</dt>
              <dd className="mt-1 text-text-secondary">
                Usage-based pricing couples a business model to arithmetic to customer trust. Most
                pricing work shows the first and skips the other two.
              </dd>
            </div>
            <div>
              <dt className="text-label text-text-primary">The key decision</dt>
              <dd className="mt-1 text-text-secondary">
                Two surfaces over one engine. The operator view re-prices the existing book; the
                customer view shows the same maths from the other side. Either alone is half the
                argument, and the pairing costs almost nothing because the engine is shared.
              </dd>
            </div>
            <div>
              <dt className="text-label text-text-primary">Two periods, on purpose</dt>
              <dd className="mt-1 text-text-secondary">
                The workbench models against the last complete period, because that is what a
                founder reasons about. The control centre projects the current one, because that
                is where bill shock comes from.
              </dd>
            </div>
            <div>
              <dt className="text-label text-text-primary">What I cut</dt>
              <dd className="mt-1 text-text-secondary">
                Usage rollover. It is the most requested pricing feature and it makes an invoice
                unexplainable to the customer, which defeats the point of the trust surface.
                Also cut: tax, multi-currency, dunning.
              </dd>
            </div>
            <div>
              <dt className="text-label text-text-primary">The trade-off</dt>
              <dd className="mt-1 text-text-secondary">
                The projection is a linear extrapolation from the observed daily average. A
                cleverer forecast the customer cannot reason about is worse than a simple one they
                can, because the job is preventing a surprise, not being right to the cent.
              </dd>
            </div>
          </dl>
        </div>

        <div>
          <h2 className="text-h3">Under it</h2>
          <ul className="mt-4 flex list-disc flex-col gap-2 pl-5 text-body-sm text-text-secondary">
            <li>
              Every amount is integer cents behind a branded type, so passing float dollars is a
              compile error. <code className="font-mono text-metadata">fromDollars</code> shifts
              the decimal string rather than multiplying by 100 — because{' '}
              <code className="font-mono text-metadata">1.005 * 100</code> is{' '}
              <code className="font-mono text-metadata">100.49999999999999</code>, and the obvious
              implementation returns the wrong cent. Its own test caught that.
            </li>
            <li>
              Meter events deduplicate by idempotency key, not by id, because redeliveries arrive
              with a fresh id. The seeded data contains a real duplicate; summing it naively
              overcharges Orbit Health.
            </li>
            <li>
              Period boundaries are half-open, so an event at midnight on the first belongs to
              exactly one period and is never billed twice nor dropped.
            </li>
            <li>
              Exactly at the allowance is a warning, not an overage — nothing has been charged at
              that point.
            </li>
            <li>
              52 tests cover the billing engine, including proration across a mid-cycle plan
              change, credit application order, unlimited plans, and a matrix assertion that an
              invoice total always equals the sum of its own lines.
            </li>
          </ul>
        </div>
      </section>

      <section className="mt-10 border-t border-border pt-10">
        <h2 className="text-h3">What this does not prove</h2>
        <ul className="mt-4 flex max-w-3xl list-disc flex-col gap-2 pl-5 text-body-sm text-text-secondary">
          <li>
            This is a synthetic billing environment. It demonstrates billing logic and billing UX,
            not production financial reconciliation.
          </li>
          <li>
            No tax, multi-currency, revenue recognition or dunning. Each is a real problem this
            deliberately does not touch.
          </li>
          <li>
            Usage is seeded, not ingested. Nothing here proves the meter survives production
            volume or late-arriving events beyond the ordering cases that are tested.
          </li>
          <li>
            Annual billing is modelled as a discount on the monthly subscription rather than a
            true annual invoice with its own period. That is a simplification, not an oversight.
          </li>
        </ul>
      </section>
    </main>
  );
}
