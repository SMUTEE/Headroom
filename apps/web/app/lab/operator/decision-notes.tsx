import type { ReactNode } from 'react';

function Note({ term, children }: { term: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-label text-text-primary">{term}</dt>
      <dd className="mt-1 text-body-sm text-text-secondary">{children}</dd>
    </div>
  );
}

export function OperatorNotes() {
  return (
    <div className="flex flex-col gap-10 border-t border-border pt-10">
      <div className="grid gap-10 lg:grid-cols-2">
        <section>
          <h2 className="text-h3">The decisions</h2>
          <dl className="mt-4 flex flex-col gap-4">
            <Note term="The problem">
              Calling a model is easy and has been for years. What is still hard is making the
              output safe enough to act on: knowing what it saw, whether its reasoning is real,
              where it is unsure, and what it is allowed to do.
            </Note>
            <Note term="The key decision">
              The schema proves the shape and separate guards prove the content. Zod catches a
              malformed object; it cannot catch a well-formed one citing a record that does not
              exist. That second failure is the dangerous one, because it reads as rigour, and
              it is rejected outright rather than shown with a warning.
            </Note>
            <Note term="Declining is a first-class answer">
              <code className="font-mono text-metadata">insufficient_evidence</code> is a value
              the schema allows, and claiming it above 0.4 confidence — or alongside named
              risks — is incoherent and flagged. An assessment that will not say “I do not know”
              is not telling you when it does not know.
            </Note>
            <Note term="What the model cannot do">
              It cannot contact a customer, cancel, refund, discount, waive a charge or delete
              anything. Not with approval either, in this build. Approval records a decision; it
              does not carry one out.
            </Note>
            <Note term="The trade-off">
              Forbidden actions are matched on the text of the proposed label, because the model
              writes that label. A whitelist of permitted actions would be tighter and would
              need the model to pick from a fixed menu, which is a different and smaller
              product. This is the looser half of that trade, and it is checked by tests.
            </Note>
          </dl>
        </section>

        <section>
          <h2 className="text-h3">Under it</h2>
          <ul className="mt-4 flex list-disc flex-col gap-2.5 pl-5 text-body-sm text-text-secondary">
            <li>
              The context is built as a typed object rather than serialised from the whole
              world, so the interface can show what the model saw beside what it said. That is
              the first question anyone asks, and a system that cannot answer it is asking for
              trust it has not earned.
            </li>
            <li>
              Account data is passed as data in its own turn and never folded into the
              instructions. Support messages are customer-written, and text that can rewrite the
              instructions above it is an injection.
            </li>
            <li>
              Records with missing fields say so in the context. An absent field otherwise reads
              as an absent fact, and “no decline reason was supplied” is a different statement
              from “the payment did not fail for a reason”.
            </li>
            <li>
              24 eval cases run against outputs a model plausibly produces, including the wrong
              ones: a fabricated citation, confident uncertainty, six forbidden actions. A guard
              nobody has seen reject anything is not known to work.
            </li>
            <li>
              Saved demo assessments pass the same schema and the same grounding guard as live
              output. A hand-written one citing a missing event would be the same lie told more
              slowly, and a test checks every id against the data.
            </li>
          </ul>
        </section>
      </div>

      <section>
        <h2 className="text-h3">What this does not prove</h2>
        <ul className="mt-4 flex max-w-3xl list-disc flex-col gap-2.5 pl-5 text-body-sm text-text-secondary">
          <li>
            The eval set tests the guards, not the model. It says what happens when output is
            wrong; it does not measure how often that is.
          </li>
          <li>
            Nothing here has been run against production data, and the assessments shown in the
            demo are saved rather than generated.
          </li>
          <li>
            Rate limiting is in memory on one instance. It resets on deploy and does not
            coordinate across instances.
          </li>
          <li>
            Approvals are not persisted and no durable audit trail exists yet. Recording a
            decision so it survives a reload belongs to the operator console.
          </li>
        </ul>
      </section>
    </div>
  );
}
