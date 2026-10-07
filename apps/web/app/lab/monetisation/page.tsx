import type { Metadata } from 'next';
import { AppShell, AppShellMobileNav, Callout, ThemeToggle } from '@headroom/ui';
import { Brand } from '../_shell/brand';
import { PRICING_NAV } from '../_shell/nav';
import { DecisionNotes } from './decision-notes';
import { Workbench } from './workbench';

export const metadata: Metadata = {
  title: 'Pricing & packaging',
  description:
    'Model a plan change across an existing book of business and see which customers it reaches. A working exploration of usage-based packaging. Synthetic data.',
};

export default function PricingPage() {
  return (
    <AppShell
      brand={<Brand subtitle="Operator" />}
      nav={PRICING_NAV}
      barEnd={<ThemeToggle />}
      title="Pricing & packaging"
      description="If we change this price, what happens to the customers we already have?"
      notice={
        <>
          <AppShellMobileNav nav={PRICING_NAV} />
          <div className="border-b border-info-border bg-info-bg px-4 py-2 sm:px-6">
            <p className="text-metadata text-info-text">
              Demo environment. Every customer, usage figure and amount below is synthetic.
              Dimmed sections of the product are not built yet.
            </p>
          </div>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <Callout tone="neutral" title="Try this: drag Included usage down to 40k, then look at Loomline.">
          Three accounts move. Only one of them crosses into overage for the first time.
        </Callout>

        <Workbench />
        <DecisionNotes />
      </div>
    </AppShell>
  );
}
