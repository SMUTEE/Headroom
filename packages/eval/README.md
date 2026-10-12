# @headroom/eval

Ten cases built to break the account assessment, scored on six measures the
schema cannot express, published with the failures left in.

## Running it

```bash
pnpm eval --dry-run    # no model, no account — checks the plumbing
pnpm eval              # the real thing
```

Results are written per model to `evals/<model>.json` and `evals/<model>.md`,
so runs accumulate rather than overwrite one another. The site renders every
committed run.

### Free, with no account — a local model

[Ollama](https://ollama.com) runs a model on your own machine. Nothing to sign
up for, no key, no per-token cost.

```bash
brew install ollama
ollama serve                 # leave running in one terminal
ollama pull qwen2.5:14b      # ~9GB, comfortable on 18GB of RAM
pnpm eval                    # this is the default provider
```

Smaller or larger as the machine allows — `llama3.1:8b` is about 5GB,
`qwen2.5:32b` wants 32GB or more:

```bash
EVAL_MODEL=llama3.1:8b pnpm eval
```

### Free, hosted — any OpenAI-compatible endpoint

Groq, OpenRouter, Google AI Studio's compatibility layer and most others all
expose the same interface and all have a free tier.

```bash
EVAL_PROVIDER=openai-compatible \
EVAL_BASE_URL=https://api.groq.com/openai/v1 \
EVAL_API_KEY=… \
EVAL_MODEL=… \
pnpm eval
```

Add `EVAL_NO_SCHEMA=1` for a gateway that rejects `response_format`. The output
is then validated against the same schema anyway — it just is not enforced at
generation time, which usually means more schema failures and is itself a
result worth recording.

### The model the application actually uses

```bash
EVAL_PROVIDER=anthropic ANTHROPIC_API_KEY=… pnpm eval
```

Needs a key from [console.anthropic.com](https://console.anthropic.com), which
is pay-as-you-go and separate from any Claude subscription.

## Why run it against more than one model

The claim under test is not "this model is good". It is "the guards catch what
a model gets wrong" — and that is only demonstrated by a model actually
getting something wrong.

A small local model fabricates event ids, declines at high confidence and
proposes actions it has no authority to propose. Those are the runs worth
publishing, because the failures are the evidence. A frontier model passing
nine of ten says almost nothing, and the report says so itself.

Every provider is held to the same contract: the same system prompt, the same
Zod schema, the same guards on whatever comes back. Only the engine changes,
which is what makes the runs comparable.

## What it will not do

- **Publish a run it could not complete.** Any case that fails to reach the
  model and nothing is written at all. A network failure recorded as a model
  failure would be the most misleading thing this harness could produce.
- **Fall back to saved responses.** A published result has to come from a real
  run.
- **Treat a failing case as a broken build.** Some of it failing is the point.

## Layout

| | |
|---|---|
| `cases.ts` | The ten cases. Frozen fixtures, not generated from the seed. |
| `measures.ts` | The six universal measures, as pure functions. |
| `score.ts` | Scoring, kept separate from running so a saved run can be rescored. |
| `report.ts` | The published JSON and markdown. |
| `providers.ts` | Anthropic and OpenAI-compatible engines behind one interface. |
| `runner.ts` | The CLI. The only thing that touches the network. |
