# Headroom

A public product lab. One fictional B2B SaaS company — customer revenue
operations — and a visible record of how each problem travels from business
context to product decision to working, tested software.

> **All data in Headroom is synthetic.** No real customer, company, usage
> figure, revenue number or outcome appears anywhere. Nothing here is presented
> as customer research or as real company results.

## Layout

```
apps/web          Next.js 16 app — the lab and the portfolio layer
packages/ui       Design system: generated colour tokens, foundations, components
packages/domain   Business rules as pure functions. No React.
packages/data     The synthetic world. Deterministic and internally coherent.
```

Business logic lives in `packages/domain` and never inside a component, which
is what makes it testable — and the tests are a large part of what the lab is
demonstrating.

## Commands

```bash
pnpm install
pnpm dev          # http://localhost:3000
pnpm build
pnpm check        # typecheck + lint + test
pnpm tokens       # regenerate colour tokens and re-measure every contrast pair
```

## The design system

Colour is **generated, not hand-picked** (`packages/ui/scripts/generate-tokens.mjs`).
Six ramps of twelve steps, computed in OKLCH with constant hue, vividness
peaking mid-ramp, and chroma set as a proportion of each hue's own in-gamut
maximum so amber does not come out washed out beside red.

The steps are **role-defined rather than lightness-defined**: step 9 is the
solid fill in both light and dark, so the semantic tier is identical across
appearances and component CSS never branches on theme.

Running `pnpm tokens` re-measures all 58 rendered colour pairs. WCAG 2.2 AA is
the gate and fails the build; APCA is reported alongside as advisory, and the
three pairs that clear WCAG but miss their APCA floor are listed with reasons
rather than quietly rounded away.

## Planning documents

- `DECISIONS.md` — positioning, the job to be done, and the decision log
- `BUILDS.md` — what each build is and why

These two travel together and are the portable context for this project.
