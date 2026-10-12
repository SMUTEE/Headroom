/**
 * Where an assessment comes from.
 *
 * The application calls one model. The evaluation deliberately runs against
 * several, because the claim being tested is not "this model is good" — it is
 * "the guards catch what a model gets wrong", and that is only demonstrated by
 * a model actually getting something wrong.
 *
 * Every provider is held to the same contract: the same system prompt, the
 * same Zod schema, the same guards on whatever comes back. Only the engine
 * changes, which is what makes the results comparable.
 */

import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { z } from 'zod';
import {
  AccountAssessmentSchema,
  ASSESSMENT_SYSTEM_PROMPT,
  type AssessmentContext,
} from '@headroom/domain';

/** Raised when the model could not be reached. Never a model failure. */
export class TransportError extends Error {
  constructor(
    message: string,
    readonly fatal = false,
  ) {
    super(message);
    this.name = 'TransportError';
  }
}

export interface ProviderResponse {
  /** Unvalidated. The caller parses it, so a bad shape is a recorded result. */
  raw: unknown;
}

export interface Provider {
  /** Written into the published run, so a reader knows what produced it. */
  readonly model: string;
  assess(context: AssessmentContext): Promise<ProviderResponse>;
}

/** The schema as JSON Schema, for providers that take one directly. */
export function assessmentJsonSchema(): Record<string, unknown> {
  return z.toJSONSchema(AccountAssessmentSchema, { io: 'output' }) as Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Anthropic — the path the application itself uses
// ---------------------------------------------------------------------------

export function anthropicProvider(model = 'claude-opus-5-5'): Provider {
  const client = new Anthropic({ maxRetries: 3 });

  return {
    model,
    async assess(context) {
      try {
        const message = await client.messages.parse({
          model,
          max_tokens: 4096,
          system: ASSESSMENT_SYSTEM_PROMPT,
          messages: [{ role: 'user', content: JSON.stringify(context, null, 2) }],
          output_config: { format: zodOutputFormat(AccountAssessmentSchema) },
        });
        // `parsed_output` is already validated; returning the raw object keeps
        // every provider on the same path through the caller's own parse.
        return { raw: message.parsed_output ?? message.content };
      } catch (error) {
        if (error instanceof Anthropic.AuthenticationError) {
          throw new TransportError(`${error.message}`, true);
        }
        throw new TransportError(error instanceof Error ? error.message : String(error));
      }
    },
  };
}

// ---------------------------------------------------------------------------
// OpenAI-compatible — Ollama, Groq, OpenRouter, Gemini's compat layer
// ---------------------------------------------------------------------------

export interface OpenAICompatibleOptions {
  /** e.g. http://localhost:11434/v1 for Ollama. */
  baseURL: string;
  model: string;
  /** Omitted for a local runtime that does not check it. */
  apiKey?: string;
  /** Some gateways reject an unknown response_format outright. */
  structuredOutput?: boolean;
}

export function openAICompatibleProvider(opts: OpenAICompatibleOptions): Provider {
  const { baseURL, model, apiKey, structuredOutput = true } = opts;

  return {
    model,
    async assess(context) {
      const body: Record<string, unknown> = {
        model,
        max_tokens: 4096,
        messages: [
          { role: 'system', content: ASSESSMENT_SYSTEM_PROMPT },
          { role: 'user', content: JSON.stringify(context, null, 2) },
        ],
      };

      if (structuredOutput) {
        body.response_format = {
          type: 'json_schema',
          json_schema: {
            name: 'account_assessment',
            strict: true,
            schema: assessmentJsonSchema(),
          },
        };
      }

      let response: Response;
      try {
        response = await fetch(`${baseURL.replace(/\/$/, '')}/chat/completions`, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {}),
          },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(180_000),
        });
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        // Nothing listening is almost always a local runtime that is not
        // running, which no amount of retrying will fix.
        throw new TransportError(
          `Could not reach ${baseURL} — ${detail}`,
          /ECONNREFUSED|fetch failed/i.test(detail),
        );
      }

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new TransportError(
          `${response.status} from ${baseURL}: ${text.slice(0, 300)}`,
          response.status === 401 || response.status === 403,
        );
      }

      const payload = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const content = payload.choices?.[0]?.message?.content;

      if (typeof content !== 'string') {
        throw new TransportError('The response contained no message content.');
      }

      // A model that ignores the schema and emits prose is a model failure,
      // not a transport one: it gets recorded and published as such.
      return { raw: extractJson(content) };
    },
  };
}

/**
 * Pulls the JSON object out of a completion.
 *
 * Smaller models wrap the object in a fenced block or a sentence of
 * preamble even when handed a schema. Recovering from that is fair — the
 * question being measured is whether the content is defensible, not whether
 * the model can resist saying "Here is the assessment:". Anything that is not
 * recoverable JSON is returned as-is and fails the schema measure.
 */
export function extractJson(content: string): unknown {
  const trimmed = content.trim();

  const candidates = [trimmed];
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced?.[1]) candidates.push(fenced[1].trim());

  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    candidates.push(trimmed.slice(firstBrace, lastBrace + 1));
  }

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch {
      // Try the next shape.
    }
  }
  return content;
}

// ---------------------------------------------------------------------------
// Selection
// ---------------------------------------------------------------------------

/** Ollama's OpenAI-compatible endpoint, which needs no key and no account. */
const OLLAMA_DEFAULT = 'http://localhost:11434/v1';

/**
 * Builds the provider named by the environment.
 *
 *   EVAL_PROVIDER=anthropic            ANTHROPIC_API_KEY=…
 *   EVAL_PROVIDER=ollama               EVAL_MODEL=qwen2.5:14b
 *   EVAL_PROVIDER=openai-compatible    EVAL_BASE_URL=… EVAL_API_KEY=… EVAL_MODEL=…
 *
 * Defaults to Ollama, because it is the one that costs nothing and needs no
 * account.
 */
export function providerFromEnv(env: NodeJS.ProcessEnv = process.env): Provider {
  const choice = (env.EVAL_PROVIDER ?? 'ollama').toLowerCase();

  if (choice === 'anthropic') {
    if (!env.ANTHROPIC_API_KEY) {
      throw new TransportError('EVAL_PROVIDER=anthropic needs ANTHROPIC_API_KEY.', true);
    }
    return anthropicProvider(env.EVAL_MODEL ?? 'claude-opus-5-5');
  }

  if (choice === 'ollama') {
    return openAICompatibleProvider({
      baseURL: env.EVAL_BASE_URL ?? OLLAMA_DEFAULT,
      model: env.EVAL_MODEL ?? 'qwen2.5:14b',
    });
  }

  if (choice === 'openai-compatible') {
    if (!env.EVAL_BASE_URL || !env.EVAL_MODEL) {
      throw new TransportError(
        'EVAL_PROVIDER=openai-compatible needs EVAL_BASE_URL and EVAL_MODEL.',
        true,
      );
    }
    return openAICompatibleProvider({
      baseURL: env.EVAL_BASE_URL,
      model: env.EVAL_MODEL,
      ...(env.EVAL_API_KEY ? { apiKey: env.EVAL_API_KEY } : {}),
      structuredOutput: env.EVAL_NO_SCHEMA !== '1',
    });
  }

  throw new TransportError(
    `Unknown EVAL_PROVIDER "${choice}". Use anthropic, ollama or openai-compatible.`,
    true,
  );
}
