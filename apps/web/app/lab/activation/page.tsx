import type { Metadata } from 'next';
import { AppShell, AppShellMobileNav, ThemeToggle } from '@headroom/ui';
import { Brand } from '../_shell/brand';
import { ACTIVATION_NAV } from '../_shell/nav';
import { ActivationWorkspace } from './workspace';
import { ActivationNotes } from './decision-notes';

export const metadata: Metadata = {
  title: 'Activation',
  description:
    'A signup is not an activation. An operator workspace that separates the onboarding checklist from reaching value, and surfaces the accounts that finished one without the other. Synthetic data.',
};

export default function ActivationPage() {
  return (
    <AppShell
      brand={<Brand subtitle="Operator" />}
      nav={ACTIVATION_NAV}
      barEnd={<ThemeToggle />}
      title="Activation"
      description="Are new customers reaching value, or just finishing our checklist?"
      notice={
        <>
          <AppShellMobileNav nav={ACTIVATION_NAV} />
          <div className="border-b border-info-border bg-info-bg px-4 py-2 sm:px-6">
            <p className="text-metadata text-info-text">
              Demo environment. Every account and event below is synthetic. Dimmed sections of
              the product are not built yet.
            </p>
          </div>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <ActivationWorkspace />
        <ActivationNotes />
      </div>
    </AppShell>
  );
}
