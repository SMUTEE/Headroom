'use client';

import { useMemo, useState } from 'react';
import {
  Badge,
  Button,
  Callout,
  Card,
  CardHeader,
  Meter,
  Metric,
  NumberField,
  SegmentedControl,
  Slider,
  Table,
  Td,
  Th,
  Tr,
} from '@headroom/ui';
import {
  applyOverride,
  computeInvoice,
  format,
  fromDollars,
  monthPeriod,
  type PlanId,
  type PlanOverride,
  projectInvoice,
  repriceBook,
  summariseUsage,
  WARNING_THRESHOLD,
} from '@headroom/domain';
import { HERO_ACCOUNT_ID, REFERENCE_NOW, seedWorld } from '@headroom/data';
import { AccountDeltaPanel } from './account-delta-panel';

/**
 * Two periods, deliberately.
 *
 * The workbench models a packaging change against the LAST COMPLETE period,
 * because a founder reasons about "what would this have done to last month's
 * book" — projected figures would make the model argue with itself.
 *
 * The control centre shows the CURRENT period with a projection, because the
 * customer's question is "what is this month going to cost me", and that is
 * the question bill shock comes from.
 */
const LAST_COMPLETE_PERIOD = monthPeriod(new Date('2026-09-15T00:00:00Z'));
const CURRENT_PERIOD = monthPeriod(REFERENCE_NOW);

const EDITABLE_PLANS: ReadonlyArray<{ value: PlanId; label: string }> = [
  { value: 'starter', label: 'Starter' },
  { value: 'growth', label: 'Growth' },
  { value: 'scale', label: 'Scale' },
];

const world = seedWorld();

type Overrides = Partial<Record<PlanId, PlanOverride>>;

function compactUnits(units: number): string {
  if (units >= 1_000_000) return `${(units / 1_000_000).toFixed(2)}M`;
  if (units >= 1_000) return `${Math.round(units / 1_000)}k`;
  return String(units);
}

export function Workbench() {
  const [editing, setEditing] = useState<PlanId>('growth');
  const [overrides, setOverrides] = useState<Overrides>({});
  const [selectedId, setSelectedId] = useState<string>(HERO_ACCOUNT_ID);

  const basePlan = world.plans.find((p) => p.id === editing)!;
  const current = applyOverride(basePlan, overrides[editing] ?? {});
  const dirty = Object.keys(overrides).length > 0;

  function update(patch: PlanOverride) {
    setOverrides((prev) => ({ ...prev, [editing]: { ...prev[editing], ...patch } }));
  }

  const impact = useMemo(
    () =>
      repriceBook({
        accounts: world.accounts,
        plans: world.plans,
        usage: world.usageEvents,
        period: LAST_COMPLETE_PERIOD,
        overrides,
      }),
    [overrides],
  );

  const selected = world.accounts.find((a) => a.id === selectedId)!;
  const selectedPlan = applyOverride(
    world.plans.find((p) => p.id === selected.planId)!,
    overrides[selected.planId] ?? {},
  );
  const selectedUsage = useMemo(
    () => world.usageEvents.filter((e) => e.accountId === selectedId),
    [selectedId],
  );

  const projection = useMemo(
    () =>
      projectInvoice({
        account: selected,
        plan: selectedPlan,
        usage: selectedUsage,
        period: CURRENT_PERIOD,
        asOf: REFERENCE_NOW,
      }),
    [selected, selectedPlan, selectedUsage],
  );

  const observed = useMemo(
    () =>
      summariseUsage(selectedUsage, selectedPlan, {
        start: CURRENT_PERIOD.start,
        end: REFERENCE_NOW,
      }),
    [selectedUsage, selectedPlan],
  );

  const lastPeriodInvoice = useMemo(
    () =>
      computeInvoice({
        account: selected,
        plan: selectedPlan,
        usage: selectedUsage,
        period: LAST_COMPLETE_PERIOD,
      }),
    [selected, selectedPlan, selectedUsage],
  );

  const projectedRatio =
    selectedPlan.unlimitedUsage || selectedPlan.includedUnits === 0
      ? 0
      : projection.projectedUnits / selectedPlan.includedUnits;

  return (
    <div className="flex flex-col gap-6">
      <Callout
        tone="info"
        title="Try this: drag the overage rate up, then open an account that turns red."
      >
        Every figure below is synthetic. The book re-prices live against September, the last
        complete billing period.
      </Callout>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        {/* ---------------------------------------------------------------- */}
        {/* Packaging workbench                                               */}
        {/* ---------------------------------------------------------------- */}
        <Card className="flex flex-col gap-5 self-start">
          <CardHeader
            title="Packaging"
            description="Change the shape of a plan and watch the existing book re-price."
            action={
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setOverrides({})}
                disabled={!dirty}
              >
                Reset
              </Button>
            }
          />

          <SegmentedControl
            label="Plan to edit"
            options={EDITABLE_PLANS}
            value={editing}
            onChange={(value) => setEditing(value)}
          />

          <Slider
            label="Monthly base"
            min={0}
            max={200000}
            step={1000}
            value={current.monthlyBase}
            valueLabel={format(current.monthlyBase, { showCents: false })}
            valueText={`${format(current.monthlyBase, { showCents: false })} per month`}
            onChange={(value) => update({ monthlyBase: value as never })}
          />

          <Slider
            label="Included usage"
            min={0}
            max={1_000_000}
            step={5_000}
            value={current.includedUnits}
            valueLabel={`${compactUnits(current.includedUnits)} units`}
            valueText={`${current.includedUnits.toLocaleString()} units included`}
            onChange={(value) => update({ includedUnits: value })}
          />

          <NumberField
            label="Overage rate"
            value={current.overageRatePerUnit}
            min={0}
            max={5}
            step={0.01}
            suffix="cents per unit"
            hint={`${format(fromDollars(current.overageRatePerUnit / 100 * 10_000))} per 10,000 units`}
            onChange={(value) => update({ overageRatePerUnit: value })}
          />

          {dirty ? (
            <Callout tone="warning" title="Unsaved pricing change">
              Nothing is persisted. This models the change against the existing book only.
            </Callout>
          ) : null}
        </Card>

        {/* ---------------------------------------------------------------- */}
        {/* Impact on the book                                                */}
        {/* ---------------------------------------------------------------- */}
        <div className="flex min-w-0 flex-col gap-6">
          <Card>
            <CardHeader
              title="Impact on the existing book"
              description="September · 8 accounts · synthetic"
            />
            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Metric label="Revenue now" value={format(impact.revenueBefore, { showCents: false })} />
              <Metric
                label="After change"
                value={format(impact.revenueAfter, { showCents: false })}
                emphasis
              />
              <Metric
                label="Change"
                value={`${impact.revenueDelta >= 0 ? '+' : ''}${format(impact.revenueDelta, { showCents: false })}`}
                trend={impact.revenueDelta === 0 ? 'flat' : impact.revenueDelta > 0 ? 'up' : 'down'}
                hint={impact.revenueDelta === 0 ? 'no change' : undefined}
              />
              <Metric
                label="Newly in overage"
                value={String(impact.crossingIntoOverage)}
                hint={impact.crossingIntoOverage === 1 ? 'account' : 'accounts'}
                trend={impact.crossingIntoOverage > 0 ? 'up' : 'flat'}
                upIsGood={false}
              />
            </div>

            {impact.sharplyIncreased > 0 ? (
              <Callout
                className="mt-4"
                tone="danger"
                title={`${impact.sharplyIncreased} ${impact.sharplyIncreased === 1 ? 'account sees its bill' : 'accounts see their bills'} more than double`}
              >
                These are the customers who will email you. A pricing change is not a revenue
                number, it is a distribution — and this is the tail of it.
              </Callout>
            ) : null}
          </Card>

          <Card flush>
            <div className="p-4">
              <CardHeader
                title="Every account, largest increase first"
                description="Select an account to see what that customer would experience."
              />
            </div>
            <div className="overflow-x-auto">
              <Table caption="Billing impact per account under the proposed packaging">
                <thead>
                  <tr>
                    <Th>Account</Th>
                    <Th numeric>Now</Th>
                    <Th numeric>After</Th>
                    <Th numeric>Change</Th>
                    <Th>Status</Th>
                  </tr>
                </thead>
                <tbody>
                  {impact.accounts.map((row) => {
                    const isSelected = row.accountId === selectedId;
                    return (
                      <Tr
                        key={row.accountId}
                        interactive
                        aria-selected={isSelected}
                        className={isSelected ? 'bg-accent-bg' : undefined}
                        onClick={() => setSelectedId(row.accountId)}
                      >
                        <Td>
                          <button
                            type="button"
                            className="text-left underline-offset-2 hover:underline"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedId(row.accountId);
                            }}
                          >
                            {row.companyName}
                          </button>
                        </Td>
                        <Td numeric>{format(row.before, { showCents: false })}</Td>
                        <Td numeric>{format(row.after, { showCents: false })}</Td>
                        <Td numeric>
                          {row.delta === 0 ? (
                            <span className="text-text-secondary">—</span>
                          ) : (
                            <span className={row.delta > 0 ? 'text-danger-text' : 'text-success-text'}>
                              {row.delta > 0 ? '+' : ''}
                              {format(row.delta, { showCents: false })}
                            </span>
                          )}
                        </Td>
                        <Td>
                          {row.crossesIntoOverage ? (
                            <Badge tone="danger">Newly in overage</Badge>
                          ) : row.zoneAfter === 'overage' ? (
                            <Badge tone="warning">In overage</Badge>
                          ) : (
                            <Badge tone="neutral">Within plan</Badge>
                          )}
                        </Td>
                      </Tr>
                    );
                  })}
                </tbody>
              </Table>
            </div>
          </Card>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Account detail — two versions, side by side for comparison.         */}
      {/* ------------------------------------------------------------------ */}
      <div className="border-t border-border pt-6">
        <h2 className="text-label text-text-secondary">Account detail — version A (current)</h2>
        <p className="mt-1 max-w-prose text-metadata text-text-disabled">
          Answers &ldquo;everything the billing engine knows about this account&rdquo;. Mixes a
          closed period with a projection of the current one, and mixes customer-facing figures
          with operator and engineering notes.
        </p>
      </div>

      <Card className="flex flex-col gap-5">
        <CardHeader
          title={`What ${selected.companyName} sees`}
          description={`${selectedPlan.name} · ${selected.billingInterval} · current period, ${projection.daysElapsed} of ${projection.daysElapsed + projection.daysRemaining} days elapsed`}
          action={
            selected.status === 'past_due' ? (
              <Badge tone="danger">Past due</Badge>
            ) : (
              <Badge tone="success">Active</Badge>
            )
          }
        />

        <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,20rem)]">
          <div className="flex flex-col gap-5">
            <Meter
              label="Included usage consumed"
              value={projectedRatio}
              tone={
                selectedPlan.unlimitedUsage
                  ? 'success'
                  : projectedRatio > 1
                    ? 'danger'
                    : projectedRatio >= WARNING_THRESHOLD
                      ? 'warning'
                      : 'accent'
              }
              valueLabel={
                selectedPlan.unlimitedUsage
                  ? 'Unlimited'
                  : `${projection.projectedUnits.toLocaleString()} of ${selectedPlan.includedUnits.toLocaleString()} projected`
              }
              markers={
                selectedPlan.unlimitedUsage
                  ? undefined
                  : [{ at: WARNING_THRESHOLD, label: '80% of allowance' }]
              }
            />

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <Metric
                label="Used so far"
                value={observed.totalUnits.toLocaleString()}
                hint={`over ${projection.daysElapsed} days`}
              />
              <Metric
                label="Projected usage"
                value={projection.projectedUnits.toLocaleString()}
                hint="by period end"
              />
              <Metric
                label="Projected bill"
                value={format(projection.total)}
                emphasis
                hint={`last period ${format(lastPeriodInvoice.total, { showCents: false })}`}
              />
            </div>

            {selectedPlan.unlimitedUsage ? (
              <Callout tone="success" title="Usage is unlimited on this plan">
                No overage can be charged, so no threshold warning is shown.
              </Callout>
            ) : projection.zone === 'overage' ? (
              <Callout
                tone="warning"
                title={`Projected to exceed the allowance by ${(projection.projectedUnits - selectedPlan.includedUnits).toLocaleString()} units`}
              >
                {projection.method}. Telling the customer now is the entire difference between a
                usage-based bill and a surprise.
              </Callout>
            ) : (
              <Callout tone="neutral" title="Projected to stay within the allowance">
                {projection.method}.
              </Callout>
            )}

            {observed.duplicatesDropped > 0 ? (
              <Callout
                tone="info"
                title={`${observed.duplicatesDropped} duplicate meter ${observed.duplicatesDropped === 1 ? 'event' : 'events'} excluded`}
              >
                The meter delivered the same event twice. Counting it would have inflated this
                bill, so it is deduplicated by idempotency key and reported rather than hidden.
              </Callout>
            ) : null}
          </div>

          <div className="rounded-md border border-border bg-bg-component p-4">
            <p className="text-label text-text-primary">Projected invoice</p>
            <dl className="mt-3 flex flex-col gap-2">
              {projection.lines.map((line, i) => (
                <div key={`${line.label}-${i}`} className="flex items-baseline justify-between gap-3">
                  <dt className="text-metadata text-text-secondary">
                    {line.label}
                    {line.quantity !== undefined ? (
                      <span className="block text-text-disabled">
                        {line.quantity.toLocaleString()} units
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
              <span className="text-label text-text-primary">Total</span>
              <span data-numeric className="text-h3 text-text-primary">
                {format(projection.total)}
              </span>
            </div>
            <p className="mt-3 text-metadata text-text-secondary">
              Totals are computed in integer cents and always equal the sum of these lines.
            </p>
          </div>
        </div>
      </Card>

      <div className="border-t border-border pt-6">
        <h2 className="text-label text-text-secondary">Account detail — version B (revised)</h2>
        <p className="mt-1 max-w-prose text-metadata text-text-disabled">
          Answers only &ldquo;what does the proposed change do to this customer&rdquo;, over the
          same period as the table above. One reader, one question, four elements.
        </p>
      </div>

      <AccountDeltaPanel
        account={selected}
        currentPlan={world.plans.find((p) => p.id === selected.planId)!}
        proposedPlan={selectedPlan}
        usage={selectedUsage}
        period={LAST_COMPLETE_PERIOD}
        periodLabel="September"
        hasProposal={dirty}
      />
    </div>
  );
}
