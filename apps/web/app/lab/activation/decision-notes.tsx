import type { ReactNode } from 'react';

function Note({ term, children }: { term: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-label text-text-primary">{term}</dt>
      <dd className="mt-1 text-body-sm text-text-secondary">{children}</dd>
    </div>
  );
}

export function ActivationNotes() {
  return (
    <div className="flex flex-col gap-10 border-t border-border pt-10">
      <div className="grid gap-10 lg:grid-cols-2">
        <section>
          <h2 className="text-h3">The decisions</h2>
          <dl className="mt-4 flex flex-col gap-4">
            <Note term="The problem">
              Every team agrees that signup is not activation, and most dashboards still measure
              the checklist. The gap between the two is where accounts leave quietly, because the
              product has already stopped asking them for anything.
            </Note>
            <Note term="The activation event, stated">
              Create an account health rule <em>and</em> view the accounts it returns. Both.
              Configuration without consumption is someone following instructions; it is not
              value received. Naming it precisely is most of the work — a vague definition can be
              satisfied by anything.
            </Note>
            <Note term="The key decision">
              Two tracks kept apart, and both shown. The checklist is what the product nags
              about; activation is what the customer got. The headline pairs the rate a team
              would quote with the count that contradicts it.
            </Note>
            <Note term="What I cut">
              Gamification. No confetti, no streaks, no badges, no completion celebration. A
              progress indicator that congratulates inflates the number it is measuring, and this
              build exists because that number was already lying.
            </Note>
            <Note term="The trade-off">
              Deriving state from events on every render costs more than reading a column. For
              eleven accounts that is free; at a hundred thousand it would need a materialised
              view, and the honest answer is that the view would then have to be rebuilt from
              the same events rather than maintained alongside them.
            </Note>
          </dl>
        </section>

        <section>
          <h2 className="text-h3">Under it</h2>
          <ul className="mt-4 flex list-disc flex-col gap-2.5 pl-5 text-body-sm text-text-secondary">
            <li>
              There is no <code className="font-mono text-metadata">activatedAt</code> column.
              It was removed from the account model while building this: storing activation while
              also deriving it invites the two to disagree the first time anything is backfilled
              or replayed.
            </li>
            <li>
              <code className="font-mono text-metadata">deriveActivation</code> is pure and
              order-independent. Tests cover replayed events, shuffled order, a step recorded
              twice, and events belonging to another account.
            </li>
            <li>
              Activation lands on the <em>later</em> of the two required steps, not the earlier.
              A habit needs three distinct days of returning inside a fortnight — several visits
              in one afternoon is enthusiasm, not a habit.
            </li>
            <li>
              Only pre-activation stages can stall. An activated account that has gone quiet is a
              health problem, not an activation one, and belongs to a different surface.
            </li>
            <li>
              Seeding the cohort caught a real bug: the first list view is emitted as an{' '}
              <code className="font-mono text-metadata">activation</code> event while later ones
              are steps, and the habit rule only counted the latter — so accounts that returned
              three times were credited with two.
            </li>
          </ul>
        </section>
      </div>

      <section>
        <h2 className="text-h3">What this does not prove</h2>
        <ul className="mt-4 flex max-w-3xl list-disc flex-col gap-2.5 pl-5 text-body-sm text-text-secondary">
          <li>
            The activation event here is designed, not discovered. A real one is found by
            correlating candidate events against retention, and nothing in this build does that.
          </li>
          <li>
            The stall threshold is seven days because that is a plausible number, not because it
            was fitted to anything.
          </li>
          <li>
            Recording a step on an account&rsquo;s behalf is a demo affordance. In a real product
            an operator cannot activate a customer for them, and pretending otherwise would be
            the whole error this build is about.
          </li>
          <li>
            Eleven synthetic accounts. Nothing here shows the derivation holding at a scale where
            it would need to be precomputed.
          </li>
        </ul>
      </section>
    </div>
  );
}
