import type { Metadata } from 'next';
import {
  AppShell,
  AppShellMobileNav,
  Badge,
  Callout,
  Card,
  CardHeader,
  EmptyState,
  Metric,
  Table,
  Td,
  Th,
  Tr,
} from '@headroom/ui';
import { EVAL_CASES } from '@headroom/eval';
import { Brand } from '../../_shell/brand';
import { EVALS_NAV } from '../../_shell/nav';
import { OperatorBar, OperatorFooter } from '../../_shell/bar';
import { loadRun } from './results';

export const metadata: Metadata = {
  title: 'Evaluation',
  description:
    'Ten cases run against the account assessment prompt, scored on six measures, published with the failures. The case the model gets wrong is the most useful row in the table.',
};

/**
 * The evaluation, published.
 *
 * This page exists because every claim the AI build makes about being
 * trustworthy is, without it, a claim about itself. Ten cases, the scoring
 * written down, the failures left in.
 *
 * When no run has been committed the page says so rather than showing
 * samples. A page about whether output can be trusted is the worst possible
 * place to put a plausible-looking placeholder.
 */
export default async function EvalsPage() {
  const run = await loadRun();

  return (
    <AppShell
      brand={<Brand subtitle="Operator" />}
      nav={EVALS_NAV}
      barEnd={<OperatorBar />}
      footer={<OperatorFooter />}
      title="Evaluation"
      description="How the assessment behaves on cases built to break it."
      notice={<AppShellMobileNav nav={EVALS_NAV} />}
    >
      <div className="flex flex-col gap-5">
        <Card>
          <CardHeader
            headingLevel={2}
            title="What this measures"
            description="Six properties that must hold for any assessment, plus expectations written for each case alone. Every case and every threshold is in the repository."
          />
          <div className="px-4 pb-4 sm:px-5 sm:pb-5">
            <p className="max-w-prose text-body-sm text-text-secondary">
              An assessment can satisfy its schema and still be wrong in ways that matter:
              citing a record that does not exist, declining at high confidence, inventing a
              reason the payment provider never supplied, proposing a refund it has no
              authority to offer. The schema cannot express any of that, so it is checked
              separately.
            </p>
          </div>
        </Card>

        {run ? <Results run={run} /> : <NotRunYet />}

        <Card>
          <CardHeader headingLevel={2} title="The cases" description={`${EVAL_CASES.length} probes, each with a reason for being in the suite.`} />
          <div className="flex flex-col">
            {EVAL_CASES.map((c) => (
              <div key={c.id} className="border-t border-border-subtle px-4 py-3.5 sm:px-5">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <h3 className="text-label text-text-primary">{c.title}</h3>
                  <code className="text-metadata text-text-disabled">{c.id}</code>
                </div>
                <p className="mt-1 max-w-prose text-body-sm text-text-secondary">{c.probe}</p>
              </div>
            ))}
          </div>
        </Card>

        <Callout tone="info" title="What ten cases do not prove">
          A suite this size finds obvious failures and misses subtle ones. It is not a
          benchmark, the cases are written by the same person who wrote the prompt, and
          nothing here has been validated against a real outcome. It is a floor, not a
          guarantee.
        </Callout>
      </div>
    </AppShell>
  );
}

function NotRunYet() {
  return (
    <Card>
      <EmptyState
        title="No run has been published yet"
        description="The harness is written and tested; these results come from calling the model, which needs an API key. Nothing is shown here until a real run is committed — sample results on this page in particular would be self-defeating."
      />
      <div className="border-t border-border-subtle px-4 py-3.5 sm:px-5">
        <p className="text-metadata text-text-secondary">
          Run it with{' '}
          <code className="rounded bg-neutral-3 px-1.5 py-0.5 text-text-primary">
            ANTHROPIC_API_KEY=… pnpm eval
          </code>
          . Results are written to <code>evals/latest.json</code> and committed with the
          failures included.
        </p>
      </div>
    </Card>
  );
}

function Results({ run }: { run: NonNullable<Awaited<ReturnType<typeof loadRun>>> }) {
  const { summary } = run;
  const failed = run.results.filter((r) => !r.passed);

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <Metric label="Cases passed" value={`${summary.passed} of ${summary.total}`} />
        </Card>
        <Card>
          <Metric label="Model" value={run.model} />
        </Card>
        <Card>
          <Metric label="Run" value={run.ranAt.slice(0, 10)} />
        </Card>
      </div>

      <Card>
        <CardHeader headingLevel={2} title="By measure" description="How often each property held across the ten cases." />
        <Table caption="Each scoring measure and how many of the ten cases it held on.">
          <thead>
            <Tr>
              <Th>Measure</Th>
              <Th numeric>Held</Th>
              <Th>What it checks</Th>
            </Tr>
          </thead>
          <tbody>
            {summary.byMeasure.map((m) => (
              <Tr key={m.id}>
                <Td>
                  <code className="text-metadata">{m.id}</code>
                </Td>
                <Td numeric>
                  {m.passed}/{m.total}
                </Td>
                <Td>{m.describes}</Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </Card>

      <Card>
        <CardHeader headingLevel={2} title="By case" />
        <Table caption="Every case in the suite, with the health band and confidence the model returned.">
          <thead>
            <Tr>
              <Th>Case</Th>
              <Th>Result</Th>
              <Th>Band returned</Th>
              <Th numeric>Confidence</Th>
            </Tr>
          </thead>
          <tbody>
            {run.results.map((r) => (
              <Tr key={r.caseId}>
                <Td>{r.title}</Td>
                <Td>
                  <Badge tone={r.passed ? 'success' : 'danger'}>
                    {r.passed ? 'Pass' : 'Fail'}
                  </Badge>
                </Td>
                <Td>
                  <code className="text-metadata">{r.assessment?.health ?? '—'}</code>
                </Td>
                <Td numeric>{r.assessment ? r.assessment.confidence.toFixed(2) : '—'}</Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </Card>

      {failed.length > 0 ? (
        <Card>
          <CardHeader
            headingLevel={2}
            title="What failed"
            description="Left in deliberately. A harness that only ever publishes a clean sheet is not evidence of anything."
          />
          <div className="flex flex-col">
            {failed.map((r) => (
              <div key={r.caseId} className="border-t border-border-subtle px-4 py-4 sm:px-5">
                <h3 className="text-label text-text-primary">{r.title}</h3>
                <p className="mt-1 max-w-prose text-body-sm text-text-secondary">{r.probe}</p>
                <ul className="mt-3 flex flex-col gap-1.5">
                  {r.measures
                    .filter((m) => !m.passed)
                    .flatMap((m) =>
                      m.failures.map((f, i) => (
                        <li key={`${m.id}-${i}`} className="text-body-sm text-danger-text">
                          <code className="text-metadata">{m.id}</code> — {f}
                        </li>
                      )),
                    )}
                  {r.expectations
                    .filter((e) => !e.passed)
                    .map((e) => (
                      <li key={e.id} className="text-body-sm text-danger-text">
                        <code className="text-metadata">{e.id}</code> — {e.describes}{' '}
                        {e.failure}
                      </li>
                    ))}
                </ul>
                {r.assessment ? (
                  <blockquote className="mt-3 border-l-2 border-border pl-3 text-body-sm text-text-secondary">
                    {r.assessment.summary}
                  </blockquote>
                ) : null}
              </div>
            ))}
          </div>
        </Card>
      ) : null}
    </>
  );
}
