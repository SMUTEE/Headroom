/**
 * Tests for the provider layer.
 *
 * The part worth testing hardest is `extractJson`. Smaller models wrap their
 * output in prose or a code fence even when handed a schema, and the
 * difference between recovering from that and not is the difference between
 * measuring a model's judgement and measuring its willingness to omit the
 * words "Here is the assessment:".
 */

import { describe, expect, it } from 'vitest';
import {
  assessmentJsonSchema,
  extractJson,
  providerFromEnv,
  TransportError,
} from './providers';

describe('extractJson', () => {
  it('parses a bare object', () => {
    expect(extractJson('{"health":"watch"}')).toEqual({ health: 'watch' });
  });

  it('recovers an object from a code fence', () => {
    const content = '```json\n{"health":"at_risk","confidence":0.7}\n```';
    expect(extractJson(content)).toEqual({ health: 'at_risk', confidence: 0.7 });
  });

  it('recovers an object from a fence with no language tag', () => {
    expect(extractJson('```\n{"health":"healthy"}\n```')).toEqual({ health: 'healthy' });
  });

  it('recovers an object buried in preamble', () => {
    const content = 'Here is the assessment:\n\n{"health":"critical"}\n\nLet me know if…';
    expect(extractJson(content)).toEqual({ health: 'critical' });
  });

  it('keeps nested braces intact', () => {
    const content = 'Sure!\n{"evidence":[{"statement":"a","eventId":null}]}\n';
    expect(extractJson(content)).toEqual({
      evidence: [{ statement: 'a', eventId: null }],
    });
  });

  it('returns the raw text when there is no JSON to find', () => {
    // Prose is a real result about a model and must reach the schema check as
    // a failure rather than being smoothed over here.
    expect(extractJson('The account looks fine to me.')).toBe('The account looks fine to me.');
  });

  it('returns the raw text for truncated JSON', () => {
    const truncated = '{"health":"watch","evidence":[{"statement":"cut off here';
    expect(extractJson(truncated)).toBe(truncated);
  });
});

describe('assessmentJsonSchema', () => {
  it('carries the same contract the application enforces', () => {
    const schema = assessmentJsonSchema() as {
      required?: string[];
      properties?: Record<string, { enum?: string[] }>;
    };
    expect(schema.required).toContain('summary');
    expect(schema.required).toContain('evidence');
    // Declining has to survive the conversion, or a provider given this
    // schema cannot return the one answer the design exists for.
    expect(schema.properties?.health?.enum).toContain('insufficient_evidence');
  });
});

describe('providerFromEnv', () => {
  it('defaults to the local runtime, which needs no account', () => {
    expect(providerFromEnv({}).model).toBe('qwen2.5:14b');
  });

  it('honours an explicit local model', () => {
    expect(providerFromEnv({ EVAL_MODEL: 'llama3.1:8b' }).model).toBe('llama3.1:8b');
  });

  it('refuses the Anthropic provider with no key rather than failing ten times', () => {
    expect(() => providerFromEnv({ EVAL_PROVIDER: 'anthropic' })).toThrow(TransportError);
  });

  it('requires a base URL and model for an arbitrary gateway', () => {
    expect(() => providerFromEnv({ EVAL_PROVIDER: 'openai-compatible' })).toThrow(
      /EVAL_BASE_URL/,
    );
  });

  it('names the valid choices when given an unknown one', () => {
    expect(() => providerFromEnv({ EVAL_PROVIDER: 'wat' })).toThrow(/anthropic, ollama/);
  });
});
