'use client';

import { useMemo, useState } from 'react';
import {
  Badge,
  Button,
  Callout,
  Card,
  CardHeader,
  SegmentedControl,
  Skeleton,
  SkeletonText,
  Timeline,
  type TimelineItem,
  type TimelineTone,
} from '@headroom/ui';
import type { AccountAssessment, GuardFailure } from '@headroom/domain';
import { REFERENCE_NOW, seedWorld } from '@headroom/data';

const world = seedWorld();
const MS_PER_DAY = 86_400_000;

/** Accounts with a saved assessment, so demo mode always has something to show. */
const ASSESSABLE = ['acc_orbit_health', 'acc_slate_labs', 'acc_fieldstack', 'acc_verge'] as const;

const HEALTH_LABEL: Record<AccountAssessment['health'], string> = {
  healthy: 'Healthy',
  watch: 'Watch',
  at_risk: 'At risk',
  critical: 'Critical',
  insufficient_evidence: 'Not enough evidence',
};

const HEALTH_TONE: Record<AccountAssessment['health'], 'success' | 'neutral' | 'warning' | 'danger'> = {
  healthy: 'success',
  watch: 'neutral',
  at_risk: 'warning',
  critical: 'danger',
  insufficient_evidence: 'neutral',
};

const URGENCY_TONE = { now: 'danger', soon: 'warning', later: 'neutral' } as const;
const SEVERITY_TONE = { high: 'danger', medium: 'warning', low: 'neutral' } as const;

const EVENT_TONE: Record<string, TimelineTone> = {
  payment_failed: 'danger',
  payment_recovered: 'success',
  support_event: 'warning',
  risk_signal: 'danger',
  usage_change: 'warning',
  plan_change: 'info',
  activation: 'success',
  activation_step: 'info',
  note: 'neutral',
};

function relative(iso: string): string {
  const days = Math.floor((REFERENCE_NOW.getTime() - new Date(iso).getTime()) / MS_PER_DAY);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 60) return `${days} days ago`;
  return `${Math.round(days / 30)} months ago`;
}

interface AssessResult {
  mode: 'live' | 'saved';
  assessment: AccountAssessment;
  context: { events: Array<{ id: string }> };
  warnings: GuardFailure[];
  model?: string;
}

interface AuditEntry {
  id: string;
  action: string;
  detail: string;
  at: string;
}

export function Operator() {
  const [accountId, setAccountId] = useState<string>('acc_orbit_health');
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [result, setResult] = useState<AssessResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [focusedEventId, setFocusedEventId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [approved, setApproved] = useState(false);

  const account = world.accounts.find((a) => a.id === accountId)!;

  function reset() {
    setResult(null);
    setError(null);
    setStatus('idle');
    setFocusedEventId(null);
    setDraft('');
    setApproved(false);
  }

  async function generate() {
    setStatus('loading');
    setError(null);
    setResult(null);
    setFocusedEventId(null);
    setApproved(false);

    try {
      const response = await fetch('/api/assess', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ accountId }),
      });
      const body = await response.json();

      if (!body.ok) {
        setError(body.detail ? `${body.error} ${body.detail}` : body.error);
        setStatus('error');
        return;
      }

      setResult(body);
      setDraft(body.assessment.draftNote ?? '');
      setStatus('done');
    } catch {
      setError('Could not reach the assessment service. Nothing was changed.');
      setStatus('error');
    }
  }

  function approve(label: string, detail: string) {
    setAudit((prev) => [
      {
        id: `audit_${prev.length}`,
        action: label,
        detail,
        at: REFERENCE_NOW.toISOString(),
      },
      ...prev,
    ]);
    setApproved(true);
  }

  const citedIds = useMemo(
    () =>
      new Set(
        (result?.assessment.evidence ?? [])
          .map((e) => e.eventId)
          .filter((id): id is string => Boolean(id)),
      ),
    [result],
  );

  const timeline: TimelineItem[] = useMemo(() => {
    const theirs = world.accountEvents
      .filter((e) => e.accountId === accountId)
      .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));

    return theirs.map((event) => {
      const missingReason =
        event.type === 'payment_failed' && event.payload.reason === undefined;
      return {
        id: event.id,
        at: relative(event.occurredAt),
        title: event.summary,
        tone: EVENT_TONE[event.type] ?? 'neutral',
        highlighted: focusedEventId === event.id,
        ...(missingReason
          ? { incomplete: 'The provider sent no decline reason. Not inferred.' }
          : {}),
        ...(citedIds.has(event.id)
          ? { trailing: <Badge tone="accent">Cited</Badge> }
          : {}),
      };
    });
  }, [accountId, focusedEventId, citedIds]);

  const assessment = result?.assessment;

  return (
    <div className="flex flex-col gap-5">
      <Callout
        tone="neutral"
        title="Try this: assess Verge Robotics, the account that signed up three days ago."
      >
        It declines. An assessment that will not say “not enough evidence” is not telling you
        when it does not know.
      </Callout>

      <Card className="flex flex-col gap-4">
        <CardHeader
          title="Assess an account"
          headingLevel={2}
          description="The model reads the context below, returns a typed object, and changes nothing."
          action={
            <div className="flex gap-2">
              {result ? (
                <Button size="sm" variant="ghost" onClick={reset}>
                  Clear
                </Button>
              ) : null}
              <Button
                size="sm"
                variant="primary"
                onClick={generate}
                loading={status === 'loading'}
              >
                {result ? 'Assess again' : 'Generate assessment'}
              </Button>
            </div>
          }
        />
        <SegmentedControl
          label="Account to assess"
          value={accountId}
          onChange={(value) => {
            setAccountId(value);
            reset();
          }}
          options={ASSESSABLE.map((id) => ({
            value: id,
            label: world.accounts.find((a) => a.id === id)!.companyName,
          }))}
        />
      </Card>

      {status === 'error' && error ? (
        <Callout tone="danger" title="The assessment did not run">
          {error}{' '}
          <button type="button" onClick={generate} className="underline underline-offset-2">
            Try again
          </button>
          .
        </Callout>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
        {/* ---- Assessment ---- */}
        <div className="flex min-w-0 flex-col gap-5">
          {status === 'loading' ? (
            <Card className="flex flex-col gap-4">
              <CardHeader title="Reading the account" headingLevel={2} />
              <SkeletonText lines={3} label="Generating the assessment" />
              <div className="flex flex-col gap-2">
                <Skeleton className="h-3 w-3/4" />
                <Skeleton className="h-3 w-2/3" />
                <Skeleton className="h-3 w-5/6" />
              </div>
            </Card>
          ) : null}

          {status === 'idle' ? (
            <Card>
              <CardHeader
                title="Nothing generated yet"
                headingLevel={2}
                description={`${account.companyName} has ${timeline.length} events on record. Generate an assessment to see what the model makes of them.`}
              />
            </Card>
          ) : null}

          {assessment && result ? (
            <>
              <Card className="flex flex-col gap-4">
                <CardHeader
                  title="Assessment"
                  headingLevel={2}
                  description={
                    result.mode === 'saved'
                      ? 'Demo mode: showing a saved assessment, not a live model call.'
                      : `Generated live by ${result.model ?? 'the model'}.`
                  }
                  action={
                    <div className="flex items-center gap-2">
                      <Badge tone={HEALTH_TONE[assessment.health]}>
                        {HEALTH_LABEL[assessment.health]}
                      </Badge>
                      <Badge tone="neutral">
                        {Math.round(assessment.confidence * 100)}% confidence
                      </Badge>
                    </div>
                  }
                />

                <p className="max-w-prose text-body text-text-primary">{assessment.summary}</p>

                {assessment.health === 'insufficient_evidence' ? (
                  <Callout tone="info" title="The model declined to assess this account">
                    Thin evidence produces a refusal rather than a confident guess. The schema
                    makes that an answer it can give, instead of something it has to phrase its
                    way into.
                  </Callout>
                ) : null}

                {result.warnings.length > 0 ? (
                  <Callout tone="warning" title="A guard flagged something">
                    {result.warnings.map((w) => w.detail).join(' ')}
                  </Callout>
                ) : null}
              </Card>

              <Card className="flex flex-col gap-3">
                <CardHeader
                  title="Evidence"
                  headingLevel={2}
                  description="Each claim names the record it came from. Select one to find it in the timeline."
                />
                <ul className="flex flex-col gap-1.5">
                  {assessment.evidence.map((item, i) => (
                    <li key={i}>
                      {item.eventId ? (
                        <button
                          type="button"
                          onClick={() => setFocusedEventId(item.eventId)}
                          aria-pressed={focusedEventId === item.eventId}
                          className={`flex w-full items-start gap-2.5 rounded-md border px-3 py-2 text-left text-body-sm transition-colors ${
                            focusedEventId === item.eventId
                              ? 'border-accent-border bg-accent-bg'
                              : 'border-border hover:bg-bg-component'
                          }`}
                        >
                          <span aria-hidden className="mt-1.5 size-1.5 shrink-0 rounded-full bg-accent-solid" />
                          <span className="min-w-0">
                            {item.statement}
                            <span className="mt-0.5 block text-metadata text-accent-text">
                              From a recorded event &rarr;
                            </span>
                          </span>
                        </button>
                      ) : (
                        <div className="flex items-start gap-2.5 rounded-md border border-border-subtle px-3 py-2 text-body-sm">
                          <span aria-hidden className="mt-1.5 size-1.5 shrink-0 rounded-full bg-border-strong" />
                          <span className="min-w-0">
                            {item.statement}
                            {/* Said plainly rather than left as a dead link. */}
                            <span className="mt-0.5 block text-metadata text-text-disabled">
                              From an aggregate, not a single event
                            </span>
                          </span>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </Card>

              {assessment.risks.length > 0 ? (
                <Card>
                  <CardHeader title="Risks" headingLevel={2} />
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {assessment.risks.map((risk) => (
                      <li key={risk.label}>
                        <Badge tone={SEVERITY_TONE[risk.severity]}>
                          {risk.label} · {risk.severity}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                </Card>
              ) : null}

              {assessment.recommendedActions.length > 0 ? (
                <Card className="flex flex-col gap-3">
                  <CardHeader
                    title="Recommended actions"
                    headingLevel={2}
                    description="For the operator to carry out. Approving records the decision; it does not perform it."
                  />
                  <ul className="flex flex-col gap-2">
                    {assessment.recommendedActions.map((action) => (
                      <li
                        key={action.label}
                        className="flex flex-wrap items-start justify-between gap-3 rounded-md border border-border px-3 py-2.5"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-center gap-2">
                            <span className="text-label text-text-primary">{action.label}</span>
                            <Badge tone={URGENCY_TONE[action.urgency]}>{action.urgency}</Badge>
                          </span>
                          <span className="mt-1 block text-metadata text-text-secondary">
                            {action.rationale}
                          </span>
                        </span>
                        <Button
                          size="sm"
                          onClick={() => approve(action.label, action.rationale)}
                        >
                          Approve
                        </Button>
                      </li>
                    ))}
                  </ul>
                </Card>
              ) : null}

              {assessment.draftNote !== undefined ? (
                <Card className="flex flex-col gap-3">
                  <CardHeader
                    title="Draft note"
                    headingLevel={2}
                    description="An internal note for you to edit. Nothing is sent to the customer from here."
                  />
                  <label htmlFor="draft-note" className="sr-only">
                    Draft internal note
                  </label>
                  <textarea
                    id="draft-note"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    rows={5}
                    className="w-full rounded-md border border-border-control bg-bg-page p-3 text-body-sm text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-focus"
                  />
                  <div className="flex flex-wrap items-center gap-3">
                    <Button
                      onClick={() => approve('Saved internal note', draft.slice(0, 120))}
                      disabled={draft.trim().length === 0}
                    >
                      Save note
                    </Button>
                    {draft !== (assessment.draftNote ?? '') ? (
                      <span className="text-metadata text-text-secondary">Edited</span>
                    ) : null}
                  </div>
                </Card>
              ) : null}

              {approved ? (
                <Callout tone="success" title="Recorded">
                  The decision was yours. The model proposed it and could not have carried it
                  out.
                </Callout>
              ) : null}
            </>
          ) : null}
        </div>

        {/* ---- What it saw ---- */}
        <div className="flex flex-col gap-5">
          <Card>
            <CardHeader
              title="What the model is shown"
              headingLevel={2}
              description={`${timeline.length} events, the health breakdown, activation state, usage and plan. Nothing else.`}
            />
            <p className="mt-3 text-metadata text-text-secondary">
              Account data is passed as data in its own turn, never folded into the
              instructions. Support messages are customer-written, and text that can rewrite
              the instructions above it is an injection.
            </p>
          </Card>

          <Card>
            <CardHeader
              title="Account timeline"
              headingLevel={2}
              description={
                citedIds.size > 0
                  ? 'Entries the assessment cites are marked.'
                  : 'Most recent first.'
              }
            />
            <Timeline
              className="mt-4"
              label={`Event history for ${account.companyName}`}
              items={timeline}
              emptyMessage="No events recorded. This is the account the model declines to assess."
            />
          </Card>

          {audit.length > 0 ? (
            <Card>
              <CardHeader
                title="Audit"
                headingLevel={2}
                description="Every approval, with who proposed it and who agreed."
              />
              <ul className="mt-3 flex flex-col gap-2">
                {audit.map((entry) => (
                  <li
                    key={entry.id}
                    className="border-b border-border-subtle pb-2 last:border-0"
                  >
                    <p className="text-label text-text-primary">{entry.action}</p>
                    <p className="mt-0.5 text-metadata text-text-secondary">{entry.detail}</p>
                    <p className="mt-0.5 text-metadata text-text-disabled">
                      Proposed by the model, approved by you
                    </p>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-metadata text-text-disabled">
                Not persisted. A durable audit trail belongs to the operator console.
              </p>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
