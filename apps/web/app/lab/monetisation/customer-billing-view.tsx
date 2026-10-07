'use client';

import { Callout, Card, CardHeader, Meter, Metric } from '@headroom/ui';
import {
  type Account,
  type BillingPeriod,
  format,
  type PricingPlan,
  projectInvoice,
  summariseUsage,
  type UsageEvent,
  WARNING_THRESHOLD,
} from '@headroom/domain';

/**
 * The customer's own billing page.
 *
 * One reader: the customer. Nothing an operator would see and they would not —
 * no account status badges, no meter-deduplication notes, no implementation
 * commentary. Those are real and they belong to the operator console, not
 * here, and mixing them is what made the earlier version unreadable.
 *
 * The job is narrow: prevent a surprise. Show what has been used, what it is
 * on track to become, how that was worked out, and what it will cost.
 */

export interface CustomerBillingViewProps {
  account: Account;
  plan: PricingPlan;
  usage: readonly UsageEvent[];
  period: BillingPeriod;
  asOf: Date;
}

export function CustomerBillingView({
  account,
  plan,
  usage,
  period,
  asOf,
}: CustomerBillingViewProps) {
  const projection = projectInvoice({ account, plan, usage, period, asOf });
  const observed = summariseUsage(usage, plan, { start: period.start, end: asOf });

  const totalDays = projection.daysElapsed + projection.daysRemaining;

  // The meter shows what has ACTUALLY been consumed. The projection is a
  // marker on the same track, not the fill — a forecast rendered as a full red
  // bar tells a customer they are over when they have used a quarter of their
  // allowance.
  const consumedRatio = plan.unlimitedUsage
    ? 0
    : plan.includedUnits === 0
      ? 1
      : observed.totalUnits / plan.includedUnits;

  const projectedRatio = plan.unlimitedUsage
    ? 0
    : plan.includedUnits === 0
      ? 1
      : projection.projectedUnits / plan.includedUnits;

  const willExceed = !plan.unlimitedUsage && projection.projectedUnits > plan.includedUnits;

  return (
    <Card className="flex flex-col gap-5">
      <CardHeader
        title="Your usage this month"
        description={`${plan.name} · day ${projection.daysElapsed} of ${totalDays}`}
      />

      <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,18rem)]">
        <div className="flex flex-col gap-5">
          <Meter
            label="Used so far"
            value={consumedRatio}
            tone={
              plan.unlimitedUsage
                ? 'success'
                : consumedRatio > 1
                  ? 'danger'
                  : consumedRatio >= WARNING_THRESHOLD
                    ? 'warning'
                    : 'accent'
            }
            valueLabel={
              plan.unlimitedUsage
                ? 'Unlimited'
                : `${observed.totalUnits.toLocaleString()} of ${plan.includedUnits.toLocaleString()}`
            }
            markers={
              plan.unlimitedUsage || !willExceed
                ? undefined
                : [{ at: Math.min(1, 1 / projectedRatio), label: 'Where the allowance runs out' }]
            }
          />

          {/* The arithmetic, in full. A projected figure a customer cannot
              reproduce is a figure they will not trust. */}
          <div className="grid grid-cols-3 gap-4">
            <Metric label="Used" value={observed.totalUnits.toLocaleString()} hint="units" />
            <Metric
              label="Daily average"
              value={projection.dailyAverage.toLocaleString()}
              hint="units per day"
            />
            <Metric
              label="On track for"
              value={projection.projectedUnits.toLocaleString()}
              hint={`by day ${totalDays}`}
            />
          </div>

          {plan.unlimitedUsage ? (
            <Callout tone="success" title="Your plan includes unlimited usage">
              You will not be charged for usage beyond your allowance, because there is not one.
            </Callout>
          ) : willExceed ? (
            <Callout
              tone="warning"
              title={`On track to go ${(projection.projectedUnits - plan.includedUnits).toLocaleString()} units over`}
            >
              {`${projection.dailyAverage.toLocaleString()} units a day across ${totalDays} days comes to ${projection.projectedUnits.toLocaleString()}, against ${plan.includedUnits.toLocaleString()} included. Extra usage is billed at ${plan.overageRatePerUnit}c per unit.`}
            </Callout>
          ) : (
            <Callout tone="success" title="On track to stay within your allowance">
              {`${projection.dailyAverage.toLocaleString()} units a day across ${totalDays} days comes to ${projection.projectedUnits.toLocaleString()}, against ${plan.includedUnits.toLocaleString()} included.`}
            </Callout>
          )}
        </div>

        <div className="rounded-md border border-border bg-bg-component p-4">
          <p className="text-label text-text-primary">Estimated bill</p>
          <p className="mt-0.5 text-metadata text-text-secondary">
            Final amount depends on usage for the rest of the month.
          </p>
          <dl className="mt-3 flex flex-col gap-2">
            {projection.lines.map((line, i) => (
              <div key={`${line.kind}-${i}`} className="flex items-baseline justify-between gap-3">
                <dt className="text-metadata text-text-secondary">
                  {line.label}
                  {line.quantity !== undefined ? (
                    <span className="block text-text-disabled">
                      {line.quantity.toLocaleString()} {line.unit ?? 'unit'}
                      {line.quantity === 1 ? '' : 's'}
                    </span>
                  ) : null}
                </dt>
                <dd data-numeric className="text-body-sm text-text-primary">
                  {format(line.amount)}
                </dd>
              </div>
            ))}
          </dl>
          <div className="mt-3 flex items-baseline justify-between gap-3 border-t border-border pt-3">
            <span className="text-label text-text-primary">Estimated total</span>
            <span data-numeric className="text-h3 text-text-primary">
              {format(projection.total)}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}
