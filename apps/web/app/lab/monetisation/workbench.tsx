'use client';

import { useMemo, useState } from 'react';
import {
  Badge,
  Button,
  Callout,
  Card,
  CardHeader,
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
  format,
  fromDollars,
  monthPeriod,
  type PlanId,
  type PlanOverride,
  repriceBook,
} from '@headroom/domain';
import { HERO_ACCOUNT_ID, REFERENCE_NOW, seedWorld } from '@headroom/data';
import { AccountDeltaPanel } from './account-delta-panel';
import { CustomerBillingView } from './customer-billing-view';

/**
 * Two periods, deliberately, and each confined to one surface.
 *
 * The operator flow — controls, book impact, account delta — works entirely
 * over the LAST COMPLETE period, because a founder reasons about "what would
 * this have done to last month". Every figure in that flow agrees with every
 * other one.
 *
 * The customer billing view is the only thing that projects, because the
 * customer's question is "what is this month going to cost me". Keeping the
 * projection out of the operator flow is what stops two periods sitting side
 * by side as unlabelled money.
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
  const selectedBasePlan = world.plans.find((p) => p.id === selected.planId)!;
  const selectedPlan = applyOverride(selectedBasePlan, overrides[selected.planId] ?? {});
  const selectedUsage = useMemo(
    () => world.usageEvents.filter((e) => e.accountId === selectedId),
    [selectedId],
  );

  return (
    <div className="flex flex-col gap-6">
      <Callout
        tone="info"
        title="Try this: drag Included usage down to 40k, then look at Loomline."
      >
        Every figure is synthetic. The book re-prices against September, the last complete
        billing period.
      </Callout>

      {/* Controls and their immediate consequence, side by side. */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        <Card className="flex flex-col gap-5 self-start">
          <CardHeader
            title="Packaging"
            description="Change the shape of a plan and watch your current customers re-price."
            action={
              <Button size="sm" variant="ghost" onClick={() => setOverrides({})} disabled={!dirty}>
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
            hint={`${format(fromDollars((current.overageRatePerUnit / 100) * 10_000))} per 10,000 units`}
            onChange={(value) => update({ overageRatePerUnit: value })}
          />
        </Card>

        <Card className="self-start">
          <CardHeader
            title="Impact on your current customers"
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
      </div>

      {/* Master and detail, adjacent, so a click has a visible response. */}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
        <Card flush className="self-start overflow-hidden">
          <div className="p-4">
            <CardHeader
              title="Every account, largest increase first"
              description="Select one to see what the change does to them."
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
                      /* aria-current is valid on any element and is announced.
                         aria-selected is not supported on a row outside a grid,
                         so the previous markup announced nothing at all. */
                      aria-current={isSelected ? 'true' : undefined}
                      className={isSelected ? 'bg-accent-bg' : undefined}
                      onClick={() => setSelectedId(row.accountId)}
                    >
                      <Td>
                        <span className="flex items-center gap-2">
                          {/* A shape, not only a tint: selection must not rest
                              on colour alone. */}
                          <span
                            aria-hidden
                            className={`h-4 w-0.5 shrink-0 rounded-full ${
                              isSelected ? 'bg-accent-solid' : ''
                            }`}
                          />
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
                        </span>
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

        <div className="self-start xl:sticky xl:top-6">
          <AccountDeltaPanel
            account={selected}
            currentPlan={selectedBasePlan}
            proposedPlan={selectedPlan}
            usage={selectedUsage}
            period={LAST_COMPLETE_PERIOD}
            periodLabel="September"
            hasProposal={dirty}
          />
        </div>
      </div>

      {/* The other side of the same engine: what the customer is shown. */}
      <div className="border-t border-border pt-6">
        <h2 className="text-h3">The same maths, from the customer&rsquo;s side</h2>
        <p className="mt-2 max-w-prose text-body-sm text-text-secondary">
          A pricing change only works if the customer can see it coming. This is{' '}
          {selected.companyName}&rsquo;s own billing page for the current month, driven by the
          same engine and the same plan configuration as everything above.
        </p>
      </div>

      <CustomerBillingView
        account={selected}
        plan={selectedPlan}
        usage={selectedUsage}
        period={CURRENT_PERIOD}
        asOf={REFERENCE_NOW}
      />
    </div>
  );
}
