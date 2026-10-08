import type { Metadata } from 'next';
import { AppShell, AppShellMobileNav } from '@headroom/ui';
import { Brand } from '../_shell/brand';
import { OPERATOR_NAV } from '../_shell/nav';
import { OperatorBar, OperatorFooter } from '../_shell/bar';
import { Operator } from './operator';
import { OperatorNotes } from './decision-notes';

export const metadata: Metadata = {
  title: 'AI operator',
  description:
    'An AI assessment that cites its evidence, declines when the evidence is thin, and cannot act on its own. Structured output, schema validation and human approval. Synthetic data.',
};

export default function OperatorPage() {
  return (
    <AppShell
      brand={<Brand subtitle="Operator" />}
      nav={OPERATOR_NAV}
      barEnd={<OperatorBar />}
      footer={<OperatorFooter />}
      title="AI operator"
      description="Can AI do the synthesis without becoming something you cannot check?"
      notice={
        <>
          <AppShellMobileNav nav={OPERATOR_NAV} />
          <div className="border-b border-info-border bg-info-bg px-4 py-2 sm:px-6">
            <p className="text-metadata text-info-text">
              Demo environment. All data synthetic. With no API key configured this serves saved
              assessments, labelled as saved — never a canned answer dressed up as a live one.
            </p>
          </div>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <Operator />
        <OperatorNotes />
      </div>
    </AppShell>
  );
}
