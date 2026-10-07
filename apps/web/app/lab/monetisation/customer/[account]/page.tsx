import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AppShell, AppShellMobileNav, ThemeToggle } from '@headroom/ui';
import { seedWorld } from '@headroom/data';
import { Brand } from '../../brand';
import { CUSTOMER_NAV } from '../../nav';
import { CustomerBilling } from './customer-billing';

const world = seedWorld();

/** Every account prerenders, so the page carries no runtime data. */
export function generateStaticParams() {
  return world.accounts.map((a) => ({ account: a.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ account: string }>;
}): Promise<Metadata> {
  const { account: id } = await params;
  const account = world.accounts.find((a) => a.id === id);
  return {
    title: account ? `${account.companyName} — usage & billing` : 'Usage & billing',
    description:
      'The customer-facing side of usage-based billing: what has been used, what it is on track to cost, and how that was worked out. Synthetic data.',
  };
}

export default async function CustomerPage({
  params,
}: {
  // Next 16: route params are async and must be awaited.
  params: Promise<{ account: string }>;
}) {
  const { account: id } = await params;
  const account = world.accounts.find((a) => a.id === id);
  if (!account) notFound();

  return (
    <AppShell
      brand={<Brand subtitle={account.companyName} />}
      nav={CUSTOMER_NAV}
      barEnd={<ThemeToggle />}
      title="Usage & billing"
      description="What you have used this month, and what it is on track to cost."
      notice={
        <>
          <AppShellMobileNav nav={CUSTOMER_NAV} />
          <div className="border-b border-info-border bg-info-bg px-4 py-2 sm:px-6">
            <p className="text-metadata text-info-text">
              Demo environment — the customer&rsquo;s own view of the same billing engine. All
              data synthetic.{' '}
              <Link href="/lab/monetisation" className="underline underline-offset-2">
                Back to the operator side
              </Link>
            </p>
          </div>
        </>
      }
    >
      <CustomerBilling account={account} />
    </AppShell>
  );
}
