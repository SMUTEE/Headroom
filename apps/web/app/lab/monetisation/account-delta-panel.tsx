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

/**
 * Explain the cause, in the reader's language rather than the schema's.
 *
 * Built compositionally rather than as a chain of early returns. The earlier
 * version narrated whichever lever it checked first and ignored the rest, so
 * changing the allowance and the rate together produced "increases the
 * billable overage" beside a bill that had gone *down*. A sentence that
 * contradicts the number above it is worse than no sentence.
 *
 * So: list every lever that moved, then let the delta — not any one lever —
 * state the direction.
 */
function explain(
  account: Account,
  currentPlan: PricingPlan,
  proposedPlan: PricingPlan,
  usedUnits: number,
  delta: number,
): string {
  const name = account.companyName;
  const used = usedUnits.toLocaleString();
  const causes: string[] = [];

  if (currentPlan.monthlyBase !== proposedPlan.monthlyBase) {
    causes.push(
      `the base moves from ${format(currentPlan.monthlyBase, { showCents: false })} to ${format(proposedPlan.monthlyBase, { showCents: false })}`,
    );
  }

  if (currentPlan.includedUnits !== proposedPlan.includedUnits) {
    causes.push(
      `the allowance moves from ${currentPlan.includedUnits.toLocaleString()} to ${proposedPlan.includedUnits.toLocaleString()} units`,
    );
  }

  if (currentPlan.overageRatePerUnit !== proposedPlan.overageRatePerUnit) {
    causes.push(
      `the overage rate moves from ${currentPlan.overageRatePerUnit}c to ${proposedPlan.overageRatePerUnit}c per unit`,
    );
  }

  if (currentPlan.perSeatMonthly !== proposedPlan.perSeatMonthly) {
    causes.push(
      `the per-seat price moves from ${format(currentPlan.perSeatMonthly)} to ${format(proposedPlan.perSeatMonthly)}`,
    );
  }

  if (causes.length === 0) {
    return `This proposal does not change anything on ${name}'s plan.`;
  }

  const lever =
    causes.length === 1
      ? causes[0]!
      : `${causes.slice(0, -1).join(', ')} and ${causes[causes.length - 1]!}`;

  // Direction comes from the total, never from a single lever.
  if (delta === 0) {
    return `For ${name}, ${lever} — but at ${used} units used, none of it reaches their bill.`;
  }

  const wasOver = usedUnits > currentPlan.includedUnits;
  const nowOver =
    usedUnits > proposedPlan.includedUnits && proposedPlan.overageRatePerUnit > 0;

  const consequence =
    !wasOver && nowOver
      ? ` That puts them ${(usedUnits - proposedPlan.includedUnits).toLocaleString()} units into billable overage for the first time.`
      : wasOver && !nowOver
        ? ' That takes them out of billable overage entirely.'
        : nowOver
          ? ` They are ${(usedUnits - proposedPlan.includedUnits).toLocaleString()} units over either way, and every one of those units reprices.`
          : '';

  return `${name} used ${used} units. Under this proposal ${lever}.${consequence}`;
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
            {explain(account, currentPlan, proposedPlan, consumption.totalUnits, diff.delta)}
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
