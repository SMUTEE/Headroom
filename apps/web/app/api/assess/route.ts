import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  AccountAssessmentSchema,
  ASSESSMENT_SYSTEM_PROMPT,
  buildAssessmentContext,
  calculateHealth,
  checkAssessment,
  citableEventIds,
  deriveActivation,
  detectSignals,
  type GuardFailure,
  usageTrend,
} from '@headroom/domain';
import { REFERENCE_NOW, savedAssessmentFor, seedWorld } from '@headroom/data';

/**
 * Generate an account assessment.
 *
 * The model never touches account state. This route reads, calls, validates,
 * and returns — nothing it produces is written anywhere, and the only thing
 * that can act on it is a person clicking approve in the interface.
 *
 * Without an API key it serves a saved assessment and says so in the response.
 * The public demo runs that way, because a lab only its author can use is not
 * a demo, and a canned answer presented as a live one would be the dishonesty
 * this whole build argues against.
 */

const RequestSchema = z.object({
  accountId: z.string().min(1).max(64),
});

export type AssessResponse =
  | {
      ok: true;
      mode: 'live' | 'saved';
      assessment: z.infer<typeof AccountAssessmentSchema>;
      /** Exactly what the model was shown. Rendered beside the output. */
      context: ReturnType<typeof buildAssessmentContext>;
      /** Guard failures that did not block. Empty on a clean result. */
      warnings: GuardFailure[];
      model?: string;
    }
  | { ok: false; error: string; detail?: string };

// ---------------------------------------------------------------------------
// Rate limiting
// ---------------------------------------------------------------------------

/**
 * A fixed window per client, held in memory.
 *
 * Enough for a public demo on one instance and honestly not more than that:
 * it resets on deploy and does not coordinate across instances. A real
 * deployment puts this in shared storage, and saying so is cheaper than
 * implying this is production rate limiting.
 */
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 10;
const hits = new Map<string, { count: number; resetAt: number }>();

function rateLimited(key: string): boolean {
  const now = Date.now();
  const entry = hits.get(key);
  if (!entry || now > entry.resetAt) {
    hits.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > MAX_PER_WINDOW;
}

// ---------------------------------------------------------------------------

const world = seedWorld();

function contextFor(accountId: string) {
  const account = world.accounts.find((a) => a.id === accountId);
  if (!account) return null;

  const plan = world.plans.find((p) => p.id === account.planId)!;
  const usage = world.usageEvents.filter((u) => u.accountId === accountId);

  const activation = new Map(
    world.accounts.map((a) => [
      a.id,
      deriveActivation({
        accountId: a.id,
        createdAt: a.createdAt,
        events: world.accountEvents,
        asOf: REFERENCE_NOW,
      }),
    ]),
  );

  const health = calculateHealth({
    accountId,
    events: world.accountEvents,
    usage,
    activation: activation.get(accountId)!,
    asOf: REFERENCE_NOW,
  });

  const signals = detectSignals({
    accounts: world.accounts,
    plans: world.plans,
    events: world.accountEvents,
    usage: world.usageEvents,
    activation,
    asOf: REFERENCE_NOW,
  });

  const trend = usageTrend(usage, REFERENCE_NOW);

  return buildAssessmentContext({
    account,
    plan,
    activation: activation.get(accountId)!,
    health,
    events: world.accountEvents,
    signals,
    usageChangePercent: trend ? Math.round(trend.changePercent) : null,
    unitsThisPeriod: trend ? trend.recent : 0,
  });
}

export async function POST(request: Request): Promise<NextResponse<AssessResponse>> {
  const client = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'local';
  if (rateLimited(client)) {
    return NextResponse.json(
      { ok: false, error: 'Too many requests. Wait a minute and try again.' },
      { status: 429 },
    );
  }

  let accountId: string;
  try {
    const parsed = RequestSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: 'Expected an accountId.' }, { status: 400 });
    }
    accountId = parsed.data.accountId;
  } catch {
    return NextResponse.json({ ok: false, error: 'Expected a JSON body.' }, { status: 400 });
  }

  const context = contextFor(accountId);
  if (!context) {
    return NextResponse.json({ ok: false, error: 'No such account.' }, { status: 404 });
  }

  // ---- Demo mode -------------------------------------------------------
  if (!process.env.ANTHROPIC_API_KEY) {
    const saved = savedAssessmentFor(accountId);
    if (!saved) {
      return NextResponse.json(
        {
          ok: false,
          error: 'No saved assessment for this account.',
          detail:
            'Demo mode serves saved assessments and only some accounts have one. Configure an API key to generate live.',
        },
        { status: 404 },
      );
    }
    return NextResponse.json({
      ok: true,
      mode: 'saved',
      assessment: saved,
      context,
      warnings: checkAssessment(saved, citableEventIds(context)),
    });
  }

  // ---- Live ------------------------------------------------------------
  try {
    const anthropic = new Anthropic();

    const message = await anthropic.messages.parse({
      model: 'claude-opus-5-5',
      max_tokens: 4096,
      system: ASSESSMENT_SYSTEM_PROMPT,
      // The account arrives as data in its own turn. Nothing from the record
      // is interpolated into the instructions above, because support messages
      // are customer-written and text that can rewrite its own instructions
      // is an injection.
      messages: [{ role: 'user', content: JSON.stringify(context, null, 2) }],
      output_config: { format: zodOutputFormat(AccountAssessmentSchema) },
    });

    const assessment = message.parsed_output;
    if (!assessment) {
      // Schema failure. No state was touched, and the caller can retry.
      return NextResponse.json(
        {
          ok: false,
          error: 'The model returned something that did not fit the schema.',
          detail: 'Nothing was changed. Try again.',
        },
        { status: 502 },
      );
    }

    // Shape is proven; now check the content. Guards run on live and saved
    // output alike — a hand-written assessment citing a missing event would
    // be the same error, told more slowly.
    const warnings = checkAssessment(assessment, citableEventIds(context));
    const fabricated = warnings.filter((w) => w.rule === 'evidence-grounded');

    if (fabricated.length > 0) {
      // Citing a record that does not exist is the one failure that must not
      // reach the interface: it reads as rigour and is the opposite.
      return NextResponse.json(
        {
          ok: false,
          error: 'The assessment cited evidence that does not exist, so it was discarded.',
          detail: fabricated.map((f) => f.detail).join(' '),
        },
        { status: 502 },
      );
    }

    return NextResponse.json({
      ok: true,
      mode: 'live',
      assessment,
      context,
      warnings,
      model: message.model,
    });
  } catch (error) {
    // Never leak a stack trace or an upstream message to a public caller.
    const status =
      error instanceof Anthropic.RateLimitError
        ? 429
        : error instanceof Anthropic.AuthenticationError
          ? 500
          : 502;
    const message =
      error instanceof Anthropic.RateLimitError
        ? 'The model is rate limited. Try again shortly.'
        : 'Could not generate an assessment. Nothing was changed.';
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
