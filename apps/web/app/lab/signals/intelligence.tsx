'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Badge,
  Callout,
  Card,
  CardHeader,
  Metric,
  Timeline,
  type TimelineItem,
  type TimelineTone,
} from '@headroom/ui';
import {
  type AccountEvent,
  calculateHealth,
  deriveActivation,
  detectSignals,
  explainChange,
  type HealthBand,
  type Severity,
  type Signal,
  usageTrend,
} from '@headroom/domain';
import { REFERENCE_NOW, seedWorld } from '@headroom/data';

const world = seedWorld();
const MS_PER_DAY = 86_400_000;

/** How far back the comparison score is taken. */
const LOOKBACK_DAYS = 30;
const LOOKBACK = new Date(REFERENCE_NOW.getTime() - LOOKBACK_DAYS * MS_PER_DAY);

const BAND_TONE: Record<HealthBand, 'success' | 'warning' | 'danger' | 'neutral'> = {
  healthy: 'success',
  watch: 'neutral',
  at_risk: 'warning',
  critical: 'danger',
};

const SEVERITY_TONE: Record<Severity, 'info' | 'warning' | 'danger'> = {
  info: 'info',
  warning: 'warning',
  danger: 'danger',
} as never;

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

/**
 * Names what is wrong with a record, where anything is.
 *
 * Payment webhooks drop fields in reality, and the seeded data reproduces that
 * rather than pretending ingestion is clean. The timeline says so instead of
 * rendering around the gap.
 */
function incompletenessOf(event: AccountEvent): string | undefined {
  if (event.type === 'payment_failed' && event.payload.reason === undefined) {
    return 'The provider sent no decline reason. Not inferred.';
  }
  return undefined;
}

export function Intelligence() {
  const [selectedId, setSelectedId] = useState<string>('acc_orbit_health');
  const [showCauses, setShowCauses] = useState(false);

  const activation = useMemo(
    () =>
      new Map(
        world.accounts.map((a) => [
          a.id,
          deriveActivation({
            accountId: a.id,
            createdAt: a.createdAt,
            events: world.accountEvents,
            asOf: REFERENCE_NOW,
          }),
        ]),
      ),
    [],
  );

  const signals = useMemo(
    () =>
      detectSignals({
        accounts: world.accounts,
        plans: world.plans,
        events: world.accountEvents,
        usage: world.usageEvents,
        activation,
        asOf: REFERENCE_NOW,
      }),
    [activation],
  );

  const account = world.accounts.find((a) => a.id === selectedId)!;
  const accountUsage = useMemo(
    () => world.usageEvents.filter((u) => u.accountId === selectedId),
    [selectedId],
  );

  const now = useMemo(
    () =>
      calculateHealth({
        accountId: selectedId,
        events: world.accountEvents,
        usage: accountUsage,
        activation: activation.get(selectedId)!,
        asOf: REFERENCE_NOW,
      }),
    [selectedId, accountUsage, activation],
  );

  const then = useMemo(
    () =>
      calculateHealth({
        accountId: selectedId,
        events: world.accountEvents,
        usage: accountUsage,
        activation: activation.get(selectedId)!,
        asOf: LOOKBACK,
      }),
    [selectedId, accountUsage, activation],
  );

  const change = useMemo(() => explainChange(then, now), [then, now]);
  const causeEventIds = useMemo(
    () => new Set(change.causes.map((c) => c.eventId).filter(Boolean) as string[]),
    [change],
  );

  const trend = useMemo(() => usageTrend(accountUsage, REFERENCE_NOW), [accountUsage]);

  /** Sorted here, because events arrive out of order and nothing may assume otherwise. */
  const timeline: TimelineItem[] = useMemo(() => {
    const theirs = world.accountEvents
      .filter((e) => e.accountId === selectedId)
      .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));

    return theirs.map((event) => {
      const cause = change.causes.find((c) => c.eventId === event.id);
      const incomplete = incompletenessOf(event);
      return {
        id: event.id,
        at: relative(event.occurredAt),
        title: event.summary,
        tone: EVENT_TONE[event.type] ?? 'neutral',
        highlighted: showCauses && causeEventIds.has(event.id),
        ...(incomplete ? { incomplete } : {}),
        ...(cause
          ? {
              trailing: (
                <span
                  data-numeric
                  className={cause.delta < 0 ? 'text-metadata text-danger-text' : 'text-metadata text-success-text'}
                >
                  {cause.delta > 0 ? '+' : ''}
                  {cause.delta}
                </span>
              ),
            }
          : {}),
      };
    });
  }, [selectedId, change, causeEventIds, showCauses]);

  function openSignal(signal: Signal) {
    setSelectedId(signal.accountIds[0]!);
    setShowCauses(true);
  }

  return (
    <div className="flex flex-col gap-5">
      <Callout
        tone="neutral"
        title="Try this: open the Orbit Health signal, then click the health change to see what caused it."
      >
        The timeline marks the events that account for the move, with the points each one cost.
      </Callout>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,27rem)]">
        {/* ---- The book ---- */}
        <div className="flex min-w-0 flex-col gap-5">
          <Card flush className="overflow-hidden">
            <div className="p-4">
              <CardHeader
                title="What deserves attention"
                headingLevel={2}
                description={`${signals.length} signals, most severe first. Every threshold is a stated rule, not a prediction.`}
              />
            </div>

            <ul className="flex flex-col">
              {signals.map((signal) => {
                const active = signal.accountIds.includes(selectedId);
                return (
                  <li key={signal.id} className="border-t border-border-subtle">
                    <button
                      type="button"
                      onClick={() => openSignal(signal)}
                      aria-pressed={active}
                      className={`flex w-full flex-col gap-1.5 px-4 py-3 text-left transition-colors hover:bg-bg-component ${
                        active ? 'bg-accent-bg' : ''
                      }`}
                    >
                      <span className="flex flex-wrap items-center gap-2">
                        <Badge tone={SEVERITY_TONE[signal.severity]}>
                          {signal.severity === 'critical'
                            ? 'Critical'
                            : signal.severity === 'warning'
                              ? 'Warning'
                              : 'Info'}
                        </Badge>
                        <span className="text-body-sm text-text-primary">{signal.headline}</span>
                      </span>
                      <span className="text-metadata text-text-secondary">
                        {signal.recommendedAction}
                      </span>
                      <span className="flex flex-wrap items-center gap-3 text-metadata text-text-disabled">
                        <span data-numeric>
                          Confidence {Math.round(signal.confidence * 100)}%
                        </span>
                        <span>
                          {signal.evidenceEventIds.length === 0
                            ? 'No corroborating events'
                            : `${signal.evidenceEventIds.length} corroborating ${signal.evidenceEventIds.length === 1 ? 'event' : 'events'}`}
                        </span>
                        {signal.accountIds.length > 1 ? (
                          <span>{signal.accountIds.length} accounts</span>
                        ) : null}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </Card>

          <Card>
            <CardHeader
              title="How these are produced"
              headingLevel={2}
              description="So the number is auditable rather than trusted."
            />
            <p className="mt-3 max-w-prose text-body-sm text-text-secondary">
              Each signal is a deterministic threshold over the last 14 to 30 days of usage,
              payment state, activation state and support events. Confidence measures how much
              corroborating evidence the rule found and nothing else. None of it is a prediction,
              and no part of it has been validated against churn.
            </p>
          </Card>
        </div>

        {/* ---- The account ---- */}
        <div className="flex flex-col gap-5">
          <Card className="flex flex-col gap-4">
            <CardHeader
              title={account.companyName}
              headingLevel={2}
              description={`${world.plans.find((p) => p.id === account.planId)?.name} · ${account.status.replace('_', ' ')}`}
              action={<Badge tone={BAND_TONE[now.band]}>{now.band.replace('_', ' ')}</Badge>}
            />

            <div className="grid grid-cols-3 gap-4">
              <Metric label="Health" value={String(now.score)} emphasis />
              <Metric
                label={`${LOOKBACK_DAYS} days ago`}
                value={String(then.score)}
                hint={change.delta === 0 ? 'unchanged' : undefined}
                {...(change.delta !== 0
                  ? { trend: change.delta > 0 ? ('up' as const) : ('down' as const) }
                  : {})}
              />
              <Metric
                label="Usage trend"
                value={trend ? `${trend.changePercent > 0 ? '+' : ''}${Math.round(trend.changePercent)}%` : '—'}
                hint={trend ? 'over 14 days' : 'no prior window'}
                upIsGood
                {...(trend ? { trend: trend.changePercent >= 0 ? ('up' as const) : ('down' as const) } : {})}
              />
            </div>

            {change.delta !== 0 ? (
              <button
                type="button"
                onClick={() => setShowCauses((v) => !v)}
                aria-expanded={showCauses}
                className="flex w-full items-center justify-between gap-3 rounded-md border border-border bg-bg-component px-3 py-2 text-left text-label transition-colors hover:bg-bg-component-hover"
              >
                <span>
                  {change.delta < 0 ? 'Down' : 'Up'} {Math.abs(change.delta)} points.{' '}
                  {change.causes.length} {change.causes.length === 1 ? 'cause' : 'causes'}.
                </span>
                <span aria-hidden className="text-text-secondary">
                  {showCauses ? 'Hide' : 'Show'}
                </span>
              </button>
            ) : null}

            {showCauses && change.causes.length > 0 ? (
              <ul className="flex flex-col gap-1.5">
                {change.causes.map((cause) => (
                  <li
                    key={cause.label}
                    className="flex items-baseline justify-between gap-3 border-b border-border-subtle pb-1.5 last:border-0"
                  >
                    <span className="text-metadata text-text-secondary">{cause.label}</span>
                    <span
                      data-numeric
                      className={
                        cause.delta < 0
                          ? 'text-label text-danger-text'
                          : 'text-label text-success-text'
                      }
                    >
                      {cause.delta > 0 ? '+' : ''}
                      {cause.delta}
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}

            {now.stale ? (
              <Callout tone="warning" title="This score is out of date">
                Events have arrived since it was last computed.
              </Callout>
            ) : null}

            <p className="text-metadata text-text-disabled">
              A simulated heuristic over usage, payment state, activation and support events.
              Not a validated model.
            </p>

            <Link
              href={`/lab/monetisation/customer/${account.id}`}
              className="rounded-md border border-border px-3 py-2 text-center text-label text-text-secondary transition-colors hover:bg-bg-component hover:text-text-primary"
            >
              See what {account.companyName} is billed &rarr;
            </Link>
          </Card>

          <Card>
            <CardHeader
              title="Account timeline"
              headingLevel={2}
              description={
                showCauses && causeEventIds.size > 0
                  ? 'Marked entries account for the change above.'
                  : 'Most recent first.'
              }
            />
            <Timeline
              className="mt-4"
              label={`Event history for ${account.companyName}`}
              items={timeline}
              emptyMessage="No events recorded for this account."
            />
          </Card>
        </div>
      </div>
    </div>
  );
}
