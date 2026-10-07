'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
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
import { HERO_ACCOUNT_ID, seedWorld } from '@headroom/data';
import { AccountDeltaPanel } from './account-delta-panel';

/**
 * The operator surface works entirely over the LAST COMPLETE period, because a
 * founder reasons about "what would this have done to last month". Every
 * figure here agrees with every other one. The projection lives on the
 * customer page, which is the only place it answers a real question.
 */
const PERIOD = monthPeriod(new Date('2026-09-15T00:00:00Z'));

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
        period: PERIOD,
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
    <div className="flex flex-col gap-5">
      {/* Controls span the width rather than sitting in a tall rail beside a
          short card, which left a column of dead space. */}
      <Card className="flex flex-col gap-4">
        <CardHeader
          title="Model a packaging change"
          description="Nothing is saved. This re-prices September against the proposed shape."
          action={
            <Button size="sm" variant="ghost" onClick={() => setOverrides({})} disabled={!dirty}>
              Reset
            </Button>
          }
        />
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <div>
            <p className="pb-2 text-label text-text-primary">Plan</p>
            <SegmentedControl
              label="Plan to edit"
              options={EDITABLE_PLANS}
              value={editing}
              onChange={(value) => setEditing(value)}
            />
          </div>

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
            suffix="c / unit"
            hint={`${format(fromDollars((current.overageRatePerUnit / 100) * 10_000))} per 10,000 units`}
            onChange={(value) => update({ overageRatePerUnit: value })}
          />
        </div>
      </Card>

      {/* The consequence, immediately under the cause. */}
      <Card>
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-4">
          <Metric
            label="Revenue, September"
            value={format(impact.revenueBefore, { showCents: false })}
          />
          <Metric
            label="Under the proposal"
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
            These are the customers who will email you. A pricing change is not a revenue number,
            it is a distribution — and this is the tail of it.
          </Callout>
        ) : null}
      </Card>

      {/* Master and detail, adjacent, so a click has a visible response. */}
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,25rem)]">
        <Card flush className="self-start overflow-hidden">
          <div className="p-4">
            <CardHeader
              title="Accounts"
              description="Largest increase first. Select one to see what the change does to them."
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
                         aria-selected is not supported on a row outside a grid. */
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
                            className={`h-4 w-0.5 shrink-0 rounded-full ${isSelected ? 'bg-accent-solid' : ''}`}
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

        <div className="flex flex-col gap-3 self-start xl:sticky xl:top-20">
          <AccountDeltaPanel
            account={selected}
            currentPlan={selectedBasePlan}
            proposedPlan={selectedPlan}
            usage={selectedUsage}
            period={PERIOD}
            periodLabel="September"
            hasProposal={dirty}
          />
          <Link
            href={`/lab/monetisation/customer/${selected.id}`}
            className="rounded-md border border-border px-3 py-2 text-center text-label text-text-secondary transition-colors hover:bg-bg-component hover:text-text-primary"
          >
            See what {selected.companyName} is shown &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
}
