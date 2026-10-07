import type { ReactNode } from 'react';

/**
 * The decision and honesty layers.
 *
 * Progressive disclosure: the demo is above, this is below, and the technical
 * detail is further down again. A founder may read only the first block; an
 * engineer may skip straight to the last. Nobody is made to scroll past a case
 * study to reach the working thing.
 *
 * The closing section is not a disclaimer. Naming what a piece of work does
 * not establish is the part that makes the rest of it credible.
 */

function Note({ term, children }: { term: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-label text-text-primary">{term}</dt>
      <dd className="mt-1 text-body-sm text-text-secondary">{children}</dd>
    </div>
  );
}

export function DecisionNotes() {
  return (
    <div className="flex flex-col gap-10 border-t border-border pt-10">
      <div className="grid gap-10 lg:grid-cols-2">
        <section>
          <h2 className="text-h3">The decisions</h2>
          <dl className="mt-4 flex flex-col gap-4">
            <Note term="The problem">
              Usage-based pricing couples a business model to arithmetic to customer trust. Most
              pricing work shows the first and skips the other two.
            </Note>
            <Note term="The key decision">
              Two surfaces over one engine, each on its own page. The operator models a change
              across the existing book; the customer sees the same maths from the other side.
              Either alone is half the argument, and the pairing costs almost nothing because the
              engine is shared.
            </Note>
            <Note term="Two periods, kept apart">
              The operator side works only on the last complete period, because that is what a
              founder reasons about. The customer side projects only the current one, because
              that is where bill shock comes from. They were on one page and read as one figure,
              which is why they are now on two.
            </Note>
            <Note term="What I cut">
              Usage rollover — the most requested pricing feature, and the one that makes an
              invoice unexplainable, which defeats the purpose of a trust surface. Also cut: tax,
              multi-currency, dunning, and real payment processing.
            </Note>
            <Note term="The trade-off">
              The projection is a linear extrapolation from the observed daily average, and every
              input to it is the figure shown on screen rather than a more precise one held
              behind it. That costs a fraction of a percent of accuracy and buys arithmetic a
              customer can check by hand. On a billing surface that is the right way round.
            </Note>
          </dl>
        </section>

        <section>
          <h2 className="text-h3">Under it</h2>
          <ul className="mt-4 flex list-disc flex-col gap-2.5 pl-5 text-body-sm text-text-secondary">
            <li>
              Every amount is integer cents behind a branded type, so passing float dollars is a
              compile error. <code className="font-mono text-metadata">fromDollars</code> shifts
              the decimal string instead of multiplying by 100 — because{' '}
              <code className="font-mono text-metadata">1.005 * 100</code> is{' '}
              <code className="font-mono text-metadata">100.49999999999999</code> and the obvious
              implementation returns the wrong cent. Its own test caught that.
            </li>
            <li>
              Meter events deduplicate by idempotency key rather than id, because redeliveries
              arrive with a fresh id. The seeded data contains a real duplicate; summing it
              naively overcharges one of these accounts.
            </li>
            <li>
              Period boundaries are half-open, so an event at midnight on the first belongs to
              exactly one period and is never billed twice nor dropped.
            </li>
            <li>
              Exactly at the allowance is a warning, not an overage — nothing has been charged at
              that point. A plan that cannot bill for excess is never flagged as over at all.
            </li>
            <li>
              94 tests cover the engine: proration across a mid-cycle plan change, credit
              application order, unlimited plans, and a matrix assertion that an invoice total
              always equals the sum of its own lines.
            </li>
          </ul>
        </section>
      </div>

      <section>
        <h2 className="text-h3">What this does not prove</h2>
        <ul className="mt-4 flex max-w-3xl list-disc flex-col gap-2.5 pl-5 text-body-sm text-text-secondary">
          <li>
            This is a synthetic billing environment. It demonstrates billing logic and billing UX,
            not production financial reconciliation.
          </li>
          <li>
            No tax, multi-currency, revenue recognition or dunning. Each is a real problem this
            deliberately does not touch.
          </li>
          <li>
            Usage is seeded, not ingested. Nothing here shows the meter surviving production
            volume or late-arriving events beyond the ordering cases that are tested.
          </li>
          <li>
            Annual billing is modelled as a discount on the monthly subscription rather than a
            true annual invoice with its own period. A simplification, not an oversight.
          </li>
          <li>
            It says nothing about working inside an existing codebase, or about what collaborating
            on a problem like this would actually be like. Those need a different kind of
            evidence than a lab can produce.
          </li>
        </ul>
      </section>
    </div>
  );
}
