'use client';

import { Badge, Card, CardHeader, EmptyState } from '@headroom/ui';
import {
  type Account,
  type BillingPeriod,
  compareInvoices,
  computeInvoice,
  format,
  type PricingPlan,
  summariseUsage,
  type UsageEvent,
} from '@headroom/domain';

/**
 * The revised account panel.
 *
 * It answers exactly one question — *what does the proposed pricing change do
 * to this customer* — because that is the question the reader asked by
 * clicking the row. The panel it replaces answered "here is everything the
 * billing engine knows about this account", which is a different question
 * nobody had asked, and buried the one number that mattered.
 *
 * Everything is computed over the SAME period as the table above, so the
 * figures here are the figures there. The previous panel mixed a closed period
 * with a projection of the current one, side by side, both rendered as money.
 */

export interface AccountDeltaPanelProps {
  account: Account;
  /** The plan as it stands today. */
  currentPlan: PricingPlan;
  /** The plan with the workbench's overrides applied. */
  proposedPlan: PricingPlan;
  usage: readonly UsageEvent[];
  period: BillingPeriod;
  periodLabel: string;
  /** False when nothing has been changed yet. */
  hasProposal: boolean;
}

/** One sentence naming the cause, in the reader's language rather than the schema's. */
function explain(
  account: Account,
  currentPlan: PricingPlan,
  proposedPlan: PricingPlan,
  usedUnits: number,
): string {
  const name = account.companyName;
  const used = usedUnits.toLocaleString();

  if (currentPlan.includedUnits !== proposedPlan.includedUnits) {
    const wasOver = usedUnits > currentPlan.includedUnits;
    const nowOver = usedUnits > proposedPlan.includedUnits;

    if (!wasOver && nowOver) {
      return `${name} used ${used} units. Today ${currentPlan.includedUnits.toLocaleString()} are included, so they pay no overage. The proposal includes ${proposedPlan.includedUnits.toLocaleString()}, putting them ${(usedUnits - proposedPlan.includedUnits).toLocaleString()} units over for the first time.`;
    }
    if (wasOver && nowOver) {
      return `${name} was already over. Lowering the allowance from ${currentPlan.includedUnits.toLocaleString()} to ${proposedPlan.includedUnits.toLocaleString()} increases the billable overage from ${(usedUnits - currentPlan.includedUnits).toLocaleString()} to ${(usedUnits - proposedPlan.includedUnits).toLocaleString()} units.`;
    }
    if (wasOver && !nowOver) {
      return `${name} used ${used} units and pays overage today. The proposal includes ${proposedPlan.includedUnits.toLocaleString()}, which covers them entirely.`;
    }
    return `${name} used ${used} units, inside the allowance either way. The change does not reach them.`;
  }

  if (currentPlan.overageRatePerUnit !== proposedPlan.overageRatePerUnit) {
    const over = Math.max(0, usedUnits - proposedPlan.includedUnits);
    if (over === 0) {
      return `${name} used ${used} units, inside the ${proposedPlan.includedUnits.toLocaleString()} included. A rate change only reaches customers who exceed their allowance.`;
    }
    return `${name} is ${over.toLocaleString()} units over. The rate moves from ${currentPlan.overageRatePerUnit}c to ${proposedPlan.overageRatePerUnit}c per unit, and every one of those units reprices.`;
  }

  if (currentPlan.monthlyBase !== proposedPlan.monthlyBase) {
    return `The base price moves from ${format(currentPlan.monthlyBase, { showCents: false })} to ${format(proposedPlan.monthlyBase, { showCents: false })}. This reaches every ${proposedPlan.name} customer regardless of usage.`;
  }

  return `This proposal does not change anything on ${name}'s plan.`;
}

export function AccountDeltaPanel({
  account,
  currentPlan,
  proposedPlan,
  usage,
  period,
  periodLabel,
  hasProposal,
}: AccountDeltaPanelProps) {
  const before = computeInvoice({ account, plan: currentPlan, usage, period });
  const after = computeInvoice({ account, plan: proposedPlan, usage, period });
  const diff = compareInvoices(before, after);
  const consumption = summariseUsage(usage, currentPlan, period);

  const headroom = currentPlan.unlimitedUsage
    ? null
    : currentPlan.includedUnits - consumption.totalUnits;

  return (
    <Card className="flex flex-col gap-5">
      <CardHeader
        title={account.companyName}
        description={`${proposedPlan.name} · ${account.billingInterval} · ${periodLabel}`}
        action={
          hasProposal ? (
            <Badge tone={diff.delta > 0 ? 'danger' : diff.delta < 0 ? 'success' : 'neutral'}>
              {diff.delta === 0
                ? 'Unaffected'
                : `${diff.delta > 0 ? '+' : ''}${format(diff.delta)}`}
            </Badge>
          ) : (
            <Badge tone="neutral">No change proposed</Badge>
          )
        }
      />

      {!hasProposal ? (
        <EmptyState
          title={`${account.companyName} pays ${format(before.total)} in ${periodLabel}`}
          description={
            headroom === null
              ? 'Usage is unlimited on this plan, so no allowance applies.'
              : headroom >= 0
                ? `Using ${consumption.totalUnits.toLocaleString()} of ${currentPlan.includedUnits.toLocaleString()} included units — ${headroom.toLocaleString()} from the limit. Change a price to see what it would do to them.`
                : `Already ${Math.abs(headroom).toLocaleString()} units over the allowance. Change a price to see what it would do to them.`
          }
        />
      ) : (
        <>
          {/* The delta, as the single most prominent thing on the panel. */}
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
            <span data-numeric className="text-h2 text-text-secondary line-through decoration-1">
              {format(diff.totalBefore)}
            </span>
            <span aria-hidden className="text-h3 text-text-disabled">
              →
            </span>
            <span data-numeric className="text-display text-text-primary">
              {format(diff.totalAfter)}
            </span>
            {diff.deltaRatio !== null && diff.delta !== 0 ? (
              <span
                data-numeric
                className={diff.delta > 0 ? 'text-label text-danger-text' : 'text-label text-success-text'}
              >
                {diff.delta > 0 ? '+' : ''}
                {Math.round(diff.deltaRatio * 100)}%
              </span>
            ) : null}
          </div>

          <p className="max-w-prose text-body-sm text-text-secondary">
            {explain(account, currentPlan, proposedPlan, consumption.totalUnits)}
          </p>

          {diff.changedLines.length > 0 ? (
            <div>
              <p className="text-label text-text-primary">What changed on the invoice</p>
              <ul className="mt-2 flex flex-col gap-1.5">
                {diff.changedLines.map((line) => (
                  <li
                    key={line.kind}
                    className="flex items-baseline justify-between gap-3 border-b border-border-subtle pb-1.5 last:border-0"
                  >
                    <span className="text-metadata text-text-secondary">
                      {line.label}
                      {line.quantityAfter !== undefined ? (
                        <span className="block text-text-disabled">
                          {/* Both quantities when they differ — showing only the
                              new one implies the old charge covered the same
                              volume, which is exactly what did not happen. */}
                          {line.quantityBefore !== undefined &&
                          line.quantityBefore !== line.quantityAfter
                            ? `${line.quantityBefore.toLocaleString()} → `
                            : null}
                          {line.quantityAfter.toLocaleString()} {line.unit ?? 'unit'}
                          {line.quantityAfter === 1 ? '' : 's'}
                        </span>
                      ) : null}
                    </span>
                    <span className="flex shrink-0 items-baseline gap-2">
                      {line.before === null ? (
                        <Badge tone="warning">New</Badge>
                      ) : (
                        <span data-numeric className="text-metadata text-text-secondary line-through">
                          {format(line.before)}
                        </span>
                      )}
                      <span data-numeric className="text-body-sm text-text-primary">
                        {format(line.after ?? (0 as never))}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-body-sm text-text-secondary">
              No line on this customer&rsquo;s invoice moves.
            </p>
          )}
        </>
      )}
    </Card>
  );
}
