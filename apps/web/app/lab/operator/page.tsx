import type { Metadata } from 'next';
import { AppShell, AppShellMobileNav } from '@headroom/ui';
import Link from 'next/link';
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
        {/* The question anyone sensible asks after reading one assessment is
            how it behaves on the ones designed to break it. */}
        <div className="rounded-lg border border-border bg-surface px-4 py-3.5 sm:px-5">
          <p className="max-w-prose text-body-sm text-text-secondary">
            One assessment proves nothing on its own.{' '}
            <Link
              href="/lab/operator/evals"
              className="text-accent-text underline underline-offset-4"
            >
              See how it behaves across ten cases built to break it
            </Link>
            , including the ones it gets wrong.
          </p>
        </div>
        <OperatorNotes />
      </div>
    </AppShell>
  );
}
