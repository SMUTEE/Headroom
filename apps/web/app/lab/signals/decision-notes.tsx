import type { ReactNode } from 'react';

function Note({ term, children }: { term: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-label text-text-primary">{term}</dt>
      <dd className="mt-1 text-body-sm text-text-secondary">{children}</dd>
    </div>
  );
}

export function SignalNotes() {
  return (
    <div className="flex flex-col gap-10 border-t border-border pt-10">
      <div className="grid gap-10 lg:grid-cols-2">
        <section>
          <h2 className="text-h3">The decisions</h2>
          <dl className="mt-4 flex flex-col gap-4">
            <Note term="The problem">
              Most analytics surfaces hand you fifteen charts and a sentence suggesting you
              investigate something. The interpreting is left to the reader, which is the
              expensive part and the part nobody has time for.
            </Note>
            <Note term="The key decision">
              A health score is worthless unless you can ask why it moved. So it is a list of
              attributed contributions rather than one weighted formula, and clicking a change
              marks the events behind it with the points each one cost. That shaped the whole
              module: a formula would have been shorter and unanswerable.
            </Note>
            <Note term="What I cut">
              Prediction. There is no churn probability here, because nothing in this lab has
              been validated against an outcome and a number like that would be invented
              confidence. Thresholds are stated instead, so a reader can disagree with them.
            </Note>
            <Note term="The trade-off">
              Scoring ignores risk-signal events, even though they look like the most relevant
              thing in the stream. They are emitted because health already fell, so counting
              them would charge the account twice for one problem and make the attribution
              circular. The cost is that the score moves slightly later than the alert does.
            </Note>
          </dl>
        </section>

        <section>
          <h2 className="text-h3">Under it</h2>
          <ul className="mt-4 flex list-disc flex-col gap-2.5 pl-5 text-body-sm text-text-secondary">
            <li>
              Activation stalls are read from the same derived state the activation workspace
              uses rather than re-detected here, so the two surfaces cannot disagree about which
              accounts are stuck.
            </li>
            <li>
              A payment cluster is reported once across the accounts it touches, not once per
              account. Several unrecovered failures at the same time usually means something
              broke on your side, and chasing the customers is the wrong first move.
            </li>
            <li>
              Usage trend returns nothing rather than zero when there is no prior window to
              compare against. Reporting flat without a baseline is a different claim, and an
              untrue one.
            </li>
            <li>
              The timeline sorts on read, because the seeded events arrive out of order on
              purpose. Anything assuming the array was sorted would be wrong.
            </li>
            <li>
              Confidence is capped below 100%. A deterministic rule over synthetic data has no
              business showing certainty.
            </li>
          </ul>
        </section>
      </div>

      <section>
        <h2 className="text-h3">What this does not prove</h2>
        <ul className="mt-4 flex max-w-3xl list-disc flex-col gap-2.5 pl-5 text-body-sm text-text-secondary">
          <li>
            The weights are chosen, not fitted. A real scoring model comes from correlating
            candidate inputs against outcomes, and nothing here does that.
          </li>
          <li>
            Thresholds are plausible numbers rather than calibrated ones. Fourteen days and
            fifteen percent are judgement calls.
          </li>
          <li>
            Eleven synthetic accounts. Nothing here shows the attribution holding at a scale
            where scores would need to be precomputed rather than derived on read.
          </li>
          <li>
            Showing uncertainty in the interface is not the same as handling bad data upstream.
            This marks a missing decline reason; it does not reconcile the ledger.
          </li>
        </ul>
      </section>
    </div>
  );
}
