import { Card, CardHeader, Skeleton, SkeletonText } from '@headroom/ui';
import { monthPeriod, type Account } from '@headroom/domain';
import { REFERENCE_NOW, seedWorld } from '@headroom/data';
import { CustomerBillingView } from '../../customer-billing-view';

/**
 * The customer's billing page.
 *
 * Only the usage and estimate are built. The rest of the page is drawn as
 * scenery so the surface reads as a real page in a real product rather than a
 * lone widget — but it is labelled as not built, because a skeleton that never
 * resolves is a lie if it is presented as loading.
 */

const world = seedWorld();
const CURRENT_PERIOD = monthPeriod(REFERENCE_NOW);

function NotBuilt({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="relative">
      <CardHeader
        title={title}
        action={
          <span className="rounded-sm border border-border px-1.5 py-0.5 text-metadata text-text-disabled">
            Not built
          </span>
        }
      />
      <div className="mt-4">{children}</div>
    </Card>
  );
}

export function CustomerBilling({ account }: { account: Account }) {
  const plan = world.plans.find((p) => p.id === account.planId)!;
  const usage = world.usageEvents.filter((e) => e.accountId === account.id);

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,20rem)]">
      <div className="flex min-w-0 flex-col gap-5">
        <CustomerBillingView
          account={account}
          plan={plan}
          usage={usage}
          period={CURRENT_PERIOD}
          asOf={REFERENCE_NOW}
        />

        <NotBuilt title="Invoice history">
          <div className="flex flex-col gap-3">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between gap-4">
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <Skeleton purpose="absent" className="h-3 w-28" />
                  <Skeleton purpose="absent" className="h-2.5 w-40" />
                </div>
                <Skeleton purpose="absent" className="h-3 w-16" />
                <Skeleton purpose="absent" className="h-6 w-20 rounded-md" />
              </div>
            ))}
          </div>
        </NotBuilt>

        <NotBuilt title="Usage by source">
          <div className="flex h-40 items-end gap-1.5">
            {[38, 52, 44, 61, 49, 70, 58, 66, 41, 55, 72, 63].map((h, i) => (
              <Skeleton
                key={i}
                purpose="absent"
                /* Varied heights so it reads as a chart that has not loaded
                   rather than one grey block. */
                className={`flex-1 rounded-t-sm h-[${h}%]`}
              />
            ))}
          </div>
        </NotBuilt>
      </div>

      <div className="flex flex-col gap-5">
        <NotBuilt title="Payment method">
          <div className="flex items-center gap-3">
            <Skeleton purpose="absent" className="h-8 w-12 rounded-md" />
            <div className="flex flex-1 flex-col gap-1.5">
              <Skeleton purpose="absent" className="h-3 w-32" />
              <Skeleton purpose="absent" className="h-2.5 w-20" />
            </div>
          </div>
        </NotBuilt>

        <NotBuilt title="Your plan">
          <SkeletonText purpose="absent" lines={3} />
          <Skeleton purpose="absent" className="mt-4 h-8 w-28 rounded-md" />
        </NotBuilt>

        <NotBuilt title="Billing contacts">
          <div className="flex flex-col gap-3">
            {[0, 1].map((i) => (
              <div key={i} className="flex items-center gap-2.5">
                <Skeleton purpose="absent" className="size-7 rounded-full" />
                <div className="flex flex-1 flex-col gap-1.5">
                  <Skeleton purpose="absent" className="h-2.5 w-24" />
                  <Skeleton purpose="absent" className="h-2.5 w-32" />
                </div>
              </div>
            ))}
          </div>
        </NotBuilt>
      </div>
    </div>
  );
}
