# The Build Set — What We're Making and Why

**Companion to `DECISIONS.md`.** These two files travel together. Read `DECISIONS.md` first for positioning, the job to be done, and the decision log; this file is the implementation-ready articulation of each build.

**Last updated:** 2026-10-07
**Structure:** 5 deep builds + 3 capability notes (`D-10`, locked)
**Naming:** the product is **Headroom** (`D-15`, locked 2026-10-07). "Relay" is retired; any remaining mentions below are placeholders still to be swept.

---

## 0. The shape of the set

| # | Build | Founder question it answers | Role in the portfolio |
|---|---|---|---|
| 1 | **Monetisation Lab** | "Can we price this so customers understand it and we can bill it correctly?" | The depth proof. Business model → arithmetic → trust. |
| 2 | **Activation Workspace** | "Are new customers reaching value, or just finishing our checklist?" | The product-literacy proof. |
| 3 | **Account Intelligence** | "What's happening in this account, and which signals deserve attention today?" | The interpretation proof. Carries the messy-data requirement. |
| 4 | **AI Account Operator** ⭐ | "Can AI do the synthesis without becoming something I can't trust or audit?" | **The differentiator. Leads the site.** |
| 5 | **Operator Console** | "Do the pieces work together as one product someone could use?" | **The closer.** Full-stack completeness. |

**Capability notes** (write-up + clip, no sandbox): N-1 the design system · N-2 command palette and keyboard craft · N-3 the AI evaluation harness.

**Two merges and one fold** relative to PRD v2:
- Pricing (v2 B1) + Usage/Billing (v2 B5) → **Build 1**. They were one continuous story artificially split.
- Customer Health (v2 B3) + Revenue Signals (v2 B6) → **Build 3**. Same capability claim at two altitudes.
- Retention Intervention (v2 B4) folds into **Build 5** as the console's action layer. Standalone it's a day of logic; as the thing you *act with* it becomes load-bearing.

**Every build carries five mandatory elements** (`D-11`, Section 10 of `DECISIONS.md`):
1. A **core interaction** that visibly changes state in front of the visitor.
2. A **costly signal** — one thing visibly expensive to fake.
3. A **visible act of restraint** — something deliberately not built, with reasoning.
4. A **"what this doesn't prove"** disclosure.
5. **Shared seed data** — the same accounts telling the same story as every other build (`D-17`).

---

## Build 1 — Monetisation Lab

### Why this build exists

Pricing isn't a visual design problem and billing isn't a maths problem. Together they're a **trust** problem. A founder's real fear about pricing is not "does the page look good" — it's *"if we change this, what happens to the customers we already have?"* No portfolio answers that question, because answering it requires modelling a pricing change across an existing book of business rather than pricing one hypothetical customer.

This build spans business model → arithmetic correctness → customer-trust UX in a single artifact. That span is the point. Split into two builds, each half is a weaker argument.

### What we're making

Two linked surfaces over one domain engine.

**Side A — the packaging workbench (operator/founder view).**
Change the value metric, plan tiers, included units, overage rate, and contract term. The surface then re-prices **the entire synthetic customer book** and reports the consequences: how many accounts cross into overage, who would expand, who would be surprised, what happens to total revenue.

**Side B — the usage and billing control centre (customer view).**
Current usage, remaining allowance, projected invoice, next threshold, alert state. The trust surface — what the customer sees before the bill arrives.

Two sides because pricing is a negotiation between the business's revenue needs and the customer's need for predictability. Showing only one side proves half the understanding. The pairing is nearly free: the same domain engine drives both.

### Core interaction — the proof

1. Raise the overage rate in the workbench.
2. The book re-prices live: *23 of 40 accounts cross into overage; 3 would see a bill increase over 200%.*
3. Click one of those three accounts.
4. Land in the customer view and see exactly what that customer would experience next month.

**Consequence → human impact, in three clicks.** That traversal is the demo, and I haven't seen it in a portfolio.

### Domain logic

- **Integer cents internally. Always.** No floating-point dollars anywhere near money.
- Value metric definition; tiered vs. per-unit overage
- Included units; explicitly **no** rollover (see restraint)
- Proration on mid-cycle plan change
- Credit application order (defined and tested — order changes the total)
- Annual vs. monthly discount
- Projected invoice = actual-to-date + forecast-to-period-end, **with the forecast method stated in the UI**

### Required states

Normal · low usage · approaching threshold · at threshold · over threshold · plan mismatch · annual discount applied · incomplete configuration · unlimited plan

### Edge cases (all tested)

Exactly at threshold · one unit above · zero usage · implausibly high usage · unlimited plan · negative adjustment via credit · plan change mid-cycle · missing meter event · duplicate meter event · out-of-order events · event at the period boundary (23:59:59 on the final day) · idempotency key collision on ingestion

### Costly signal

**The test suite.** Roughly 25 tests encoding the edge cases above, summarised on the build page and readable in the repo. Specifically the proration and credit-ordering tests — nobody fakes those, and anyone who has shipped billing will recognise immediately that they're real.

### Visible restraint

**No usage rollover.** Rollover is the most frequently requested pricing feature and it makes an invoice unexplainable to the customer — which defeats the entire purpose of the trust surface. Documented as a deliberate no, with that reasoning.

### What this doesn't prove

Synthetic meter events, not ingestion at production scale. No tax, no multi-currency, no dunning, no revenue recognition. This demonstrates billing logic and billing UX, not financial reconciliation.

### Design system contribution

App shell · page header · metric card · slider · segmented control · tabs · tooltip · explanation callout · price breakdown · status badge · table · threshold/allowance meter · alert

---

## Build 2 — Activation Workspace

### Why this build exists

A signup is not an activation. Every founder says they know this and most of their dashboards still conflate the two. The build's job is to prove Segun knows the difference well enough to **model** it, not just to say it.

### What we're making

An **operator-facing** activation workspace — explicitly not a customer onboarding wizard. No "Welcome to Headroom!" slides. This is the surface a founder or CS lead opens to find out whether new accounts are actually getting anywhere.

- **The activation model, stated explicitly:** Setup → Connect → Configure → First value → Habit

- **The activation event, named and specific:** *"The customer creates their first account health rule AND views the resulting account list."* It requires both configuration and consumption — which is what makes it a real activation definition rather than a checkbox.
- **Cohort view:** accounts by stage, time-in-stage, stalled accounts surfaced.
- **Single-account view:** steps completed, what's blocking, recommended next action.
- **The critical state:** an account that has completed **100% of onboarding and is not activated.**

That last state is the entire argument. It's the thing a founder recognises instantly, because it's their own dashboard lying to them.

### Core interaction — the proof

Open a stalled account → perform the real product action on its behalf (create a health rule) → activation state **recomputes** → the cohort view updates to match.

Derived state, not a stored flag. The recomputation is the proof.

### Domain logic

Step completion vs. the activation event (separate concepts, never conflated) · time-in-stage · stall detection against a time threshold · partial completion · skip handling · resume state · full recompute on any state change

### Costly signal

**Activation status is computed from events and never stored as a boolean.** Tests prove that completing steps in different orders, skipping steps, or resuming mid-flow all produce correct activation state — plus boundary tests on stall detection. Storing a flag is the shortcut almost everyone takes; not taking it is visible in the code and in the tests.

### Visible restraint

**No gamification.** No confetti, no streaks, no badges, no progress-bar celebration. Reasoning: activation theatre inflates the completion metric and hides the stall — which is the exact failure this build exists to expose. Completion state stays restrained.

### What this doesn't prove

The activation definition is a designed fiction. It has not been validated against real retention data, and a real activation event has to be discovered empirically rather than designed. Stated plainly on the page.

### Design system contribution

Stepper/timeline · progress summary · empty state · contextual help popover · status indicator · data table with derived columns

---

## Build 3 — Account Intelligence

### Why this build exists

Most analytics surfaces push interpretation onto the user: fifteen charts and a sentence suggesting you investigate something. This build demonstrates **signal → decision**, and it does it at two altitudes, because "what's wrong across my book" and "what's wrong with this account" are the same question zoomed differently.

Merging v2's Build 3 and Build 6 removes a duplicated capability claim and produces one much stronger surface — because the *traversal between altitudes* is the demo.

### What we're making

**The book view (zoom out).** A compact ranked signal list across accounts: activation dropped · high-value account usage declining · failed-payment cluster · unexpected usage spike · downgrade trend · expansion opportunity. Each signal carries what happened, likely impact, evidence count, confidence, and a recommended action.

**The account view (zoom in).** Plan, usage trend, activation state, payment state, support events, health score, expansion and risk signals.

**The timeline (the evidence layer).** Every event on the account — and the ability to click a *health-score change* and see precisely which events moved it.

### Core interaction — the proof

The traversal: **Signal → Evidence → Interpretation → Action.**

Click the health score's drop from 82 → 54 and the three events responsible highlight in the timeline.

That makes a derived number **auditable**, which is the whole point. A score you can't decompose is a score nobody acts on.

### This build carries the messy-data requirement

Moved here deliberately (PRD v1 put it on the capstone). Messy data is most meaningful exactly where interpretation happens — it's not interesting that a database has duplicates, it's interesting that an *inference* had to cope with them.

At least one seed account must carry:
- a duplicated event
- a missing metadata field
- out-of-order timestamps
- a stale health calculation

**The interface must surface the resulting uncertainty rather than smoothing it over.** A "last computed 6 days ago" badge on a stale score is a stronger credibility signal than any chart on the page.

### Domain logic

Health scoring as an explainable weighted heuristic, labelled as such in the UI · event contribution attribution (which events moved the score, and by how much) · signal detection rules · confidence derivation · staleness detection · event deduplication

### Costly signal

**Score attribution.** Saying *"this score dropped 28 points, and these three events account for 24 of them"* requires the scoring function to be decomposable rather than a black box. That's a real architectural constraint, it's visible in the code, and it's the feature that makes the whole surface trustworthy.

### Visible restraint

**No predictive claims.** The score is a stated heuristic over a 30-day window of usage, payment status, activation state, and support events. No "churn probability: 73%." Reasoning: unvalidated prediction is a trust liability, and a founder who understands modelling will respect the restraint far more than the number.

### What this doesn't prove

The health score is a simulated heuristic, not validated predictive modelling. Signal thresholds are designed, not calibrated against outcomes.

### Design system contribution

Timeline · chart container · sparkline · health/status indicator · badge · drawer · evidence list · confidence indicator · sortable data table · inline warning for duplicate/stale data

---

## Build 4 — AI Account Operator ⭐

**The flagship. This leads the site** (`D-12`), and it carries the positioning wedge (`D-05`).

### Why this build exists

Everyone can call a model. By 2026 that's a commodity and "I built an AI feature" signals almost nothing. What's scarce is the **control system that makes model output safe enough to act on**: schema validation, evaluation sets, approval gates, uncertainty made visible, audit trails, graceful fallback. Founders shipping AI features are stuck precisely there.

This build is the answer to the one question the portfolio is actually selling.

### What we're making

An account arrives with fragmented context — notes, usage summary, support conversation snippets, billing events, plan information, recent product activity. The operator needs to know *"what's going on here and what should I do next?"*

The build produces a **structured, reviewable assessment and a proposed action that cannot change any state until a human explicitly approves it.**

```ts
type AccountAssessment = {
  summary: string;
  health: 'healthy' | 'watch' | 'at_risk' | 'critical';
  confidence: number;
  evidence: Array<{ statement: string; source: string }>;
  risks: Array<{ label: string; severity: 'low' | 'medium' | 'high' }>;
  recommendedActions: Array<{
    label: string;
    rationale: string;
    urgency: 'now' | 'soon' | 'later';
  }>;
  draftNote?: string;
};
```

### The detail that separates this from every AI demo

**Evidence is source-linked back to the actual record.** Each evidence statement cites the specific event or note it came from, and clicking it jumps to that record in the Build 3 timeline.

That is grounding made visible — and AI demos essentially never do it, because it requires the generation step to carry provenance rather than just prose. It is the highest-trust feature available in the entire project.

### Core interaction — the proof

Generate → the assessment streams into a **stable structure** (not a wall of text) → click an evidence item and land on the source event → edit the draft → approve → watch the audit event appear.

The approval gate and the audit trail are as much the demo as the generation is.

### What the UI must communicate

- What information the AI saw (an explicit input panel)
- What it inferred
- What evidence supports the inference, source-linked
- Where it is uncertain — including explicit "insufficient data" handling
- What it recommends
- **That nothing changed until a human said so**

### The control system (visible on the build page)

- **Zod schema on all output.** Validation failure → recoverable error, no state mutation, bounded retry, client-safe error event.
- **Server-side only.** No key reaches the client.
- **Tool calls whitelisted**, permission-checked, approval-gated.
- **The model never mutates state.** Every action passes through a typed server function with validated arguments, an authorisation check, explicit user approval, and an audit event.
- **Prompt-injection posture.** Pasted customer content is untrusted data and cannot override system instructions or trigger server behaviour.
- **Rate limiting** on the public endpoint.
- **Fallback mode.** With no API key configured, the demo serves deterministic saved assessments, labelled *"Demo mode: showing a saved assessment."* A canned response is **never** presented as a live one.

### Evaluation set

At least ten synthetic cases, each with an expected output shape and explicit failure conditions: healthy account · false-positive risk · ambiguous data · missing data · contradictory evidence · usage spike · failed payment · high-value account at risk · cancellation intent · expansion signal.

Measured on: schema validity · required fields present · evidence grounding · confidence bounds · dangerous-action avoidance · output editability.

### Costly signal

**The eval harness, published with results — including a case the model got wrong and what the guard caught.** This is the single least-fakeable artifact in the project, and it becomes capability note N-3.

### Visible restraint

Two deliberate limits:

1. **The AI can never send customer communications, cancel a contract, change billing, or alter permissions** — not even with approval, in the public demo.
2. **When evidence is insufficient, the correct output is "insufficient data to assess,"** not a confident guess. One eval case exists specifically to prove the model declines.

### What this doesn't prove

Not validated on production customer data. Synthetic evaluation results are not production performance, and are never presented as such.

### Stack

Vercel AI SDK · Claude provider · Zod structured generation · server route only

### Design system contribution

AI assessment card · action recommendation card · source-linked evidence list · confidence indicator · stream-into-structure pattern · approval dialog · audit log entry · edit/diff affordance

---

## Build 5 — Operator Console

**The capstone and the closer.**

### Why this build exists

Everything before it is a surface. This is the one that has to feel like a product someone could actually use — and it's the build that answers the question a founder asks last: *"but can he ship the whole thing?"*

### What we're making

The integrated product: authentication, account list, account detail, timeline, usage and billing summary, intervention state, AI assessment, audit trail, persistence — with loading, error, and empty states throughout, and intentional responsive behaviour.

**Retention Intervention folds in here** as the console's action layer (`D-10`). The console's job is *inspect → decide → act → persist → audit*, and a retention intervention is the most interesting available act. Standalone it was thin; here it's load-bearing.

### Retention logic

```text
Reason = too expensive        + usage below entitlement  → recommend downgrade
Reason = implementation difficulty + activation incomplete → recommend assisted setup
Reason = temporary budget constraint                      → recommend pause
Reason = missing required feature                         → NO save offer.
                                                            Record the churn reason honestly.
```

**That last branch is the strongest judgment signal in the entire project.** Not every customer should be saved, and a product that manufactures a coupon for someone who needs a feature that doesn't exist is lying to both parties. It gets called out explicitly on the build page and in its own post.

### Core journey — the 60–90 second proof

```text
Sign in → dashboard → open account → inspect timeline
→ review health signal → inspect usage/billing
→ run AI assessment → approve a recommended action
→ state persists → reload → verify → see audit history
```

This is the "drop this person into a startup on Monday" moment. It is not a cinematic screen recording; it's a flow that proves auth works, real data loads, state connects, a human approved an action, the data survived a refresh, and the audit trail recorded it.

### Costly signal

**An audit trail that genuinely works**, proven to survive a reload — plus authentication that isn't faked.

```ts
type AuditEvent = {
  id: string;
  actorId: string;
  accountId?: string;
  action: string;
  metadata: Record<string, unknown>;
  createdAt: string;
};
```

### Visible restraint

No organisation or team management beyond what the core journey requires. No real email delivery to anyone. No production payment processing. Documented as deliberate scope limits rather than omissions.

### What this doesn't prove

Single-tenant demo environment; multi-tenancy isolation is not meaningfully tested. Stripe test mode at most — the project never processes a real payment.

---

## Capability notes

Real public content. Hours each, not days. They preserve eight pieces of publishable material while halving the build load.

| Note | Subject | Why it's a note, not a build |
|---|---|---|
| **N-1** | **The design system** — tokens, state rules, accessibility decisions, how it evolved as the product got more complex | Interesting to engineers and product leaders; doesn't need its own sandbox. It's already visible in all five builds. |
| **N-2** | **Command palette and keyboard craft** | Pure craft signal. Lives inside the shell (`D-04`) and demonstrates in a 15-second clip. A standalone build was never justified. |
| **N-3** | **The AI evaluation harness** — how the eval set is built, what failure conditions look like, what it actually caught | Arguably the highest-credibility piece of writing in the project for a technical audience. Comes free from Build 4. |

---

## Build order

```text
Foundation (design tokens · app shell · domain models · synthetic data)
  → Build 1  Monetisation Lab
  → Build 2  Activation Workspace
  → Build 3  Account Intelligence
  → Build 4  AI Account Operator
  → Build 5  Operator Console
  → Portfolio layer
  → Analytics · SEO · contact flow · final QA
```

Foundation first is non-negotiable: domain logic and the shared seed dataset must exist before any surface, or the builds will quietly contradict each other and the coherence argument collapses.

**The minimum viable portfolio** (`D-09`) is Foundation + Build 1 + Build 4 + portfolio layer. That set alone proves business reasoning, money rigour, design quality, the scarce AI-control skill, and enough full-stack capability to be credible. Builds 2, 3, and 5 are expansion — valuable, and cuttable without the project failing.

---

## The shared seed dataset

The highest coherence-per-hour item in the project (`D-17`). Deterministic seed functions, one internally consistent world:

```ts
seedPlans() · seedAccounts() · seedUsageEvents() · seedInvoices()
seedAccountEvents() · seedSupportContext()
```

**The same account must tell the same story in every build.** The worked example from PRD v2 §36:

> **Orbit Health** — Growth plan · activated 34 days ago · usage down 23% over 14 days · one payment failed 4 days ago · two support events mentioning implementation difficulty · health score fell from 82 to 54 · elevated cancellation risk

That single account powers Build 1 (what it's billed), Build 2 (how it activated), Build 3 (why health dropped, with evidence), Build 4 (what the AI concludes and recommends), and Build 5 (the intervention an operator approves).

One account, five builds, one story. That's the coherence argument, and it costs a day of seed design rather than a week of retrofitting.
