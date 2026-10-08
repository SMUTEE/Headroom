import type { Metadata } from 'next';
import { AppShell, AppShellMobileNav } from '@headroom/ui';
import { Brand } from '../_shell/brand';
import { SIGNALS_NAV } from '../_shell/nav';
import { OperatorBar, OperatorFooter } from '../_shell/bar';
import { Intelligence } from './intelligence';
import { SignalNotes } from './decision-notes';

export const metadata: Metadata = {
  title: 'Signals',
  description:
    'A working exploration of account health as something you can audit: every point the score moves is traced to the event that moved it. Synthetic data.',
};

export default function SignalsPage() {
  return (
    <AppShell
      brand={<Brand subtitle="Operator" />}
      nav={SIGNALS_NAV}
      barEnd={<OperatorBar />}
      footer={<OperatorFooter />}
      title="Signals"
      description="What is happening inside these accounts, and which of it deserves attention today?"
      notice={
        <>
          <AppShellMobileNav nav={SIGNALS_NAV} />
          <div className="border-b border-info-border bg-info-bg px-4 py-2 sm:px-6">
            <p className="text-metadata text-info-text">
              Demo environment. Every account, event and score below is synthetic. Dimmed
              sections of the product are not built yet.
            </p>
          </div>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <Intelligence />
        <SignalNotes />
      </div>
    </AppShell>
  );
}
