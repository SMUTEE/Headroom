# Headroom — Core Decisions & Working Context

**Owner:** Segun Akinnibosun / MAD
**Started:** 2026-10-07
**Status:** Strategy under construction. No code written yet.
**Purpose of this file:** the single portable context document. Anyone picking this up cold — a new session, another editor, a collaborator — should be able to read this file alone and know what we are building, why, what is settled, and what is still open. It supersedes nothing; it sits *above* the two PRDs as the decision layer.

**Companion file:** `BUILDS.md` — the per-build articulation. **These two files travel together.** This one holds strategy and decisions; that one holds what each build is and why.

**Source documents:**
- `Relay Series PRD AI-Guided Engineering Portfolio Track (1).md` — PRD v1, Oct 4 2026
- `Relay_Product_Systems_Lab_PRD.md` — PRD v2, Oct 5 2026 (a revision of v1)

---

## 0. How to use this file

- **Section 2** is the 60-second catch-up. Read it first.
- **Section 6** is the decision log. Every decision has an ID (`D-01`…), a status, and a reason. Never delete a decision — supersede it and note why.
- **Section 12** tracks which claims are verified vs. assumed. Important: parts of the strategy rest on unverified market claims. They are labelled.
- **Section 13** is the changelog. Append to it whenever this file changes.
- When a decision moves from `OPEN` to `LOCKED`, record the date and the reasoning. The reasoning is the valuable part, not the choice.

---

## 1. One-paragraph summary

Headroom is a public product lab: one fictional B2B SaaS company (customer revenue operations), a set of connected product builds, and a visible record of how each problem travels from business context → product decision → design → working, tested software. Its purpose is not to be a gallery. Its purpose is to be *usable evidence inside a founder's hiring decision*, so that founders and product leaders start conversations with Segun about paid work.

---

## 2. Where things stand (catch-up)

**What exists:** two PRDs. PRD v2 is a significant improvement on v1 and most of it should be kept.

**What PRD v2 got right** (defend these, don't relitigate):
- One coherent fictional company instead of scattered demos.
- Explicitly labelling all data as synthetic; no fake testimonials, logos, or revenue claims.
- Moving the domain from customer support/CX to **customer revenue operations** — higher-value founder problems, and support-AI demos are the single most saturated category in existence.
- Killing the standalone command palette build; keeping it as a shared capability.
- Making the AI build *structured and action-oriented* (evidence, confidence, human approval, audit) rather than generic text generation.
- The **"What this does not prove"** honesty section per build. This is the strongest single idea in either document.
- Deterministic domain logic separated from UI; integer cents for money; tests on business rules.
- Refusing to let a daily-posting streak dictate shipping quality.
- One shared seed dataset where the *same account tells the same story across every build* (the "Orbit Health" example in PRD v2 §36). Cheapest coherence win available.

**What this file changes or adds** — the substance of the work done on 2026-10-07:
1. A proper two-sided job-to-be-done (Section 3). Both PRDs describe Segun's job and skip the founder's job, which is the one that determines design priorities.
2. An explicit statement of **what the lab cannot prove** (Section 4), and a parallel track that covers the gap.
3. A sharper positioning wedge (Section 5) — neither "AI-guided engineering" (commodity) nor "product systems" (vague).
4. **Distribution promoted to a first-class product** (Section 8). It is currently unowned in both PRDs and is where the goal actually succeeds or fails.
5. A **minimum viable portfolio** and hard stop rules (Section 9), because the dominant failure mode here is abandonment at 60% completion.
6. A **costly-signal requirement** per build (Section 10) — the counter to "AI made this, so anyone could have."
7. A proposed consolidation from 8 builds to 5 deep builds + 3 capability notes (Section 7, `D-10`, still OPEN).
8. A realistic timeline (Section 9) — 11 and 14 days are both fantasy for this scope.

---

## 3. The job to be done

Both PRDs answer "what should we build." Neither answers "whose job are we doing." There are two, stacked, and they pull in different directions.

### 3.1 Segun's job (the client)

| Layer | The job |
|---|---|
| Functional | Convert anonymous attention into paid, high-value engagements with SaaS founders and product leaders. |
| Emotional | Stop feeling unproven. Have something to point at that ends the "but where have you shipped?" conversation. |
| Social | Be *categorised* by founders as a peer-level product owner — not a freelancer, not a junior, not a vendor. |

**The deepest version:** Segun is manufacturing credibility that employment history has not granted him. That is the actual job. A portfolio is one instrument for it, and not self-evidently the best one — which is why Section 8 exists.

### 3.2 The founder's job (the audience)

A founder does not wake up wanting to look at portfolios. Their job is:

> *"I have a product problem sitting between design and engineering. The people I can hire are either designers who can't ship or engineers with no taste. I need to de-risk betting on one person who can do both — fast, and without running a six-week interview loop."*

| Layer | The job |
|---|---|
| Functional | De-risk a hiring or contracting decision, cheaply and quickly. |
| Emotional | Avoid the pain of a bad hire. At an early-stage company a bad product hire costs months, not money. |
| Social | Be able to justify the choice to a cofounder or an investor without feeling foolish. |

### 3.3 The reframe that follows

**The portfolio's job is not to impress. It is to be usable as evidence inside someone else's risk decision.**

That single sentence changes design priorities:

- *Impressing* optimises for polish, breadth, and novelty.
- *De-risking* optimises for legibility, honesty, edge cases, and evidence of judgment under constraint.

Concretely, de-risking means a founder must be able to answer, in under five minutes and without reading prose: **Can he scope? Can he ship? Will he be easy to work with? What will he refuse to do?**

That last one is underrated. Restraint is the hardest thing to fake and the most reassuring thing to see.

### 3.4 The thing neither PRD proves

The number-one killer in design-engineer contracting is **not capability — it's communication and scoping.** Nothing in either PRD produces an artifact that shows what it is like to brief Segun and get something back. The decision write-ups gesture at it. They are not the same thing.

→ Addressed by `D-08` (Teardowns) and `D-13` (collaboration artifact).

---

## 4. What the lab can and cannot prove

PRD v2 §4.3 lists ten beliefs the visitor should hold by the end. Being honest about which ones the lab actually supports is both more useful internally and — published — a conversion asset.

**The lab can prove (7/10):**
1. Understands a business problem quickly ✓
2. Decides what *not* to build ✓ (if restraint is made visible — see `D-11`)
3. Translates business logic into a clear experience ✓
4. Builds the interface himself ✓
5. Builds enough backend to make it real ✓
6. Uses AI without surrendering judgment ✓
9. Moves quickly without making software disposable ✓

**The lab cannot prove (3/10):**
7. *Handles ugly states and edge cases* — **partially.** Messy seed data ≠ a messy codebase ≠ a messy organisation. PRD v2 addresses the first and silently skips the other two.
8. *Explains trade-offs to a founder* — a write-up is a monologue. The real skill is handling pushback live.
10. *Works directly with founders and small teams* — a solo synthetic project is structurally incapable of demonstrating this.

**Consequence:** the Relay lab alone caps out at roughly "probably competent, unknown to work with." Closing the last 30% requires contact with something real. That is the entire argument for the Teardowns track (`D-08`).

**Publish this.** A site section titled *"What this work doesn't prove"* that names these three gaps is a costly honesty signal almost no portfolio has, and it pre-empts the exact objection a sharp founder would form privately and never voice.

---

## 5. Positioning

### 5.1 The problem with both existing positions

| Position | Source | Problem |
|---|---|---|
| "I direct AI to ship real product" | PRD v1 | Commodity. By 2026 AI-assisted development is the default, not a differentiator. Invites "then anyone could have done this." |
| "I design and ship the product systems early-stage companies need when things get messy" | PRD v2 §4.1 | Better, but vague and crowded. "Product systems" means nothing specific to a founder, and every agency says a version of it. |

### 5.2 The proposed wedge

The scarce skill in 2026 is not building AI features. It is **building the control system that makes AI output safe enough to act on** — schema validation, evaluation sets, human approval gates, uncertainty made visible in the UI, audit trails, graceful fallback. Founders shipping AI features are stuck on exactly this, and almost nobody demonstrates it.

Proposed primary position:

> **I build the product surfaces where business logic, money, and AI judgment meet — and I make them safe enough to ship.**

Supporting line:

> **Relay is a public lab where I work through monetisation, activation, account health, retention, billing, and AI-assisted decisions in a realistic B2B SaaS environment.**

### 5.3 Positioning hierarchy

PRD v2 ranked: product judgment → design quality → technical execution → AI leverage → speed. I would keep that ordering for *how the work is evaluated*, but note that AI leverage is the **differentiator** even though it is not the **headline**. The distinction matters: judgment is the price of entry, AI control systems are the reason to pick Segun over the other ten people with judgment.

Status: `D-05`, **LOCKED 2026-10-07.** Build 4 (AI Account Operator) therefore leads the site (`D-12`).

**Research support.** DORA 2025 found AI adoption at 90% of software professionals (up 14 points year on year, median two hours a day) — but only **24%** report trusting AI output "a lot" or "a great deal," while **30%** trust it "a little" or "not at all." That gap is the entire market opportunity. Adoption is settled; trustworthiness is not. A portfolio that demonstrates *making AI output trustworthy* is aimed at the live problem rather than the solved one. See `R-03`.

### 5.4 The finding that cuts against the premise (`D-18`)

The research turned up something that deserves to be uncomfortable rather than buried.

The design-engineer portfolios that demonstrably work — Paco Coursey, Emil Kowalski, Rauno Freiberg — are **minimal, text-forward, and point at real shipped things.** Paco's is mostly text and links, centred on `cmdk`, a command bar used in thousands of real applications. Emil's is typographic and fast. None of them is built around an elaborate simulated company.

Their credibility comes from **real adoption plus good writing**, not from a synthetic lab.

**Why this doesn't invalidate the project:** those three are already credentialed. They shipped the surfaces of Vercel, Linear, and Arc. They don't need to manufacture credibility — employment and real open-source usage granted it. Segun's job (Section 3.1) is to manufacture it *without* that, so their format can't simply be copied; the thing that makes their minimal sites work is precisely the thing Segun doesn't yet have.

**But it does imply a strong recommendation:** one real artifact that actual people use is worth more than three more synthetic builds. Candidates, cheapest first:

1. **Extract a component from the lab and open-source it properly.** The most natural candidate is the AI evaluation harness or the source-linked evidence component from Build 4 — both solve a problem people currently have no good tool for, and both come free from work already planned.
2. **The teardowns track** (`D-08`) — real products, real diagnosis.
3. **A paid micro-engagement**, however small. One real client reference outranks the entire lab for the purpose in Section 3.1.

**The honest synthesis:** the lab is the right vehicle for *demonstrating range* and it is a weak vehicle for *proving adoption*. It should be paired with one real thing, not asked to do both jobs. Decision pending — see Section 11, question 1.

---

## 6. Decision log

Legend — **LOCKED**: settled, don't relitigate. **OPEN**: needs a call. **REVISIT**: settled but with a known expiry condition.

| ID | Decision | Status | Reasoning |
|---|---|---|---|
| D-01 | One fictional company, not scattered demos | **LOCKED** | Coherence is itself evidence of systems thinking. Shared seed data makes every build reinforce the others. Inherited from both PRDs. |
| D-02 | All data explicitly labelled synthetic. No fake testimonials, logos, metrics, or claimed outcomes. | **LOCKED** | Non-negotiable integrity floor. Also a credibility asset — see `D-11`. |
| D-03 | Domain = B2B SaaS customer revenue operations (not support/CX) | **LOCKED** | Higher-value founder problems; support-AI is the most saturated demo category. From PRD v2 §2.2. |
| D-04 | Command palette is a shared capability, not a standalone build | **LOCKED** | Good craft, weak standalone founder evidence. From PRD v2 §2.3. |
| D-05 | Positioning wedge = "business logic + money + AI judgment, made safe to ship" | **LOCKED** 2026-10-07 | Segun's call. Confirmed by research: DORA 2025 finds 90% AI adoption but only 24% of practitioners trust AI output a lot or a great deal. Adoption is commodity; *trustworthiness* is the open problem. See Section 5 and `R-02`/`R-03`. |
| D-06 | AI build is structured, evidence-backed, human-approved, audited — never free-text generation | **LOCKED** | The differentiator. From PRD v2 §2.4, §13, §24. Research confirms hiring managers now assess "evaluation rigor" explicitly (`R-02`). |
| D-07 | Distribution is a first-class product — **sequenced after the MVP build set** | **LOCKED** 2026-10-07 | Segun's call: build first so there is something to reach people *with*, then run outbound. Accepted risk: the conversion ceiling stays low until outbound starts, so the build phase must not expand to fill all available time. See Section 8. |
| D-08 | **Teardowns** track: public diagnosis + partial rebuild of *real* products | **LOCKED as deferred** 2026-10-07 | Agreed in principle, deferred until after the MVP set. Still the only way to close the "can't prove it on real mess" gap (Section 4) and the highest-converting outbound artifact available. Do not drop it — it is the bridge from synthetic competence to paid work. |
| D-09 | Declare a minimum viable portfolio and hard stop rules | **LOCKED** | Dominant failure mode is abandonment at 60%, which signals worse than nothing. MVP set = Foundation + Build 1 + Build 4 + portfolio layer. See Section 9. |
| D-10 | Consolidate 8 builds → 5 deep builds + 3 capability notes | **LOCKED** 2026-10-07 | Segun's call. Several builds overlapped heavily; depth beats breadth for this audience. Full articulation in `BUILDS.md`. |
| D-11 | Every build must carry a visible **costly signal** and a visible act of **restraint** | **LOCKED** 2026-10-07 | The counter to "AI made this." Strongly confirmed by research: AI-generated work "neither helps nor hurts on its own" but has raised the bar for everything around it, and reasoning behind decisions is now the differentiator (`R-02`). See Section 10. |
| D-12 | Lead the site with the AI build (Build 4); close with the capstone (Build 5) | **LOCKED** 2026-10-07 | Follows from `D-05`. Build 4 proves *differentiation*; Build 5 proves *completeness*. |
| D-13 | Produce one artifact showing what collaboration with Segun is like | **OPEN** | Section 3.4. Candidate: a public "brief → questions I asked → what I cut → what I shipped" record on a teardown. Naturally lands with `D-08`. |
| D-14 | Timeline is 6–10 weeks, not 11–14 days | **LOCKED** | Both PRD estimates omit content, recording, and distribution work — ~30% of total effort and the least AI-compressible part. See Section 9. |
| D-15 | Product is named **Headroom**. "Relay" retired. | **LOCKED** 2026-10-07 | Segun's call: rename while it was free. "Relay" collided with Relay.app, Relay Financial, Relay (GraphQL), and several delivery brands, undercutting PRD v2 §27's SEO goals. "Headroom" is apt across the whole set — remaining allowance (Build 1), room to grow (Build 3), capacity — with low collision. Mentions of "Relay" that remain in this file are historical (source-document names, changelog) and are intentional. |
| D-19 | `packages/ui` is built as a **portable design system**, extractable and referenceable from other projects | **LOCKED** 2026-10-07 | Segun's call: the system must grow across builds and be reusable on other explorations afterwards. Architectural consequences, enforced from Build 1 onward: (a) `@headroom/ui` never imports `@headroom/domain` or `@headroom/data` — a component takes primitives and callbacks, never a domain object; (b) tokens are consumable standalone via `@headroom/ui/styles.css`; (c) every component has an explicit public API through the barrel; (d) nothing app-specific leaks in. Also a live candidate for `D-18`, since a design system other people use is third-party evidence. |
| D-18 | Pair the lab with one genuinely real, used artifact | **CLOSED — not doing it** 2026-10-07 | Segun's call after costing it out. The candidate was a contrast-gate package extracted from the token generator. Skipped because the value depends entirely on adoption, and adoption depends on a year of answering issues — an abandoned package reads worse than none. **Accepted consequence: the lab stays entirely self-asserted** (Section 4). The other route to third-party evidence is the teardowns (`D-08`, deferred), which should now be treated as the *only* one. Revisit only if the eval harness from Build 4 turns out to be genuinely scarce and Segun wants to maintain it. The original research finding stands and is unchanged — see Section 5.4 and `R-04`. |
| D-16 | Keep public shipping cadence; drop daily-completion pressure | **LOCKED** | From PRD v2 §2.5, Decision 7. A broken streak is cheaper than a broken build. |
| D-17 | One shared, internally coherent synthetic dataset across all builds | **LOCKED** | PRD v2 §36. The same account must tell the same story everywhere. Highest coherence-per-hour item in the project. |

---

## 7. The build set — what each one is for

### 7.1 Critique of PRD v2's eight

PRD v2's list: Pricing → Activation → Customer Health → Retention → Billing → Revenue Signals → AI Operator → Operator Console.

Overlaps that waste effort:
- **Builds 3 and 6 are the same skill.** Customer Health and Revenue Signal Explorer are both "interpret signals about accounts and recommend action." Different surface, identical capability claim.
- **Builds 1 and 5 are one continuous story.** Pricing configurator → usage meter → projected invoice is *one* monetisation narrative, artificially split. Together they are the strongest possible single artifact, because they span business model → math correctness → customer-trust UX. Split apart, each is half an argument.
- **Build 4 is small.** Retention branching is a day of logic, not a build.

### 7.2 Proposed structure (`D-10`, OPEN)

**Five deep builds:**

| # | Build | The founder question it answers | Capability proven | Why it earns its place |
|---|---|---|---|---|
| 1 | **Monetisation Lab** (pricing + packaging + usage meter + invoice) | "Can we price this in a way customers understand and we can bill correctly?" | Business-model reasoning, money math under edge cases, trust UX | Spans strategy → arithmetic → customer trust in one artifact. Billing is where business rules become trust problems, so it proves judgment *and* rigour simultaneously. |
| 2 | **Activation Workspace** | "Are new customers actually reaching value, or just signing up?" | Journey design, derived state, the signup/activation distinction | The distinction between account creation and first value is a genuine product-literacy test. Founders feel this pain directly. |
| 3 | **Account Intelligence** (health + timeline + signals, merged) | "What is actually happening inside this account, and what deserves action?" | Information architecture, data interpretation, signal → decision | Merging health and signals removes the duplicate capability claim and produces one much stronger surface: evidence → interpretation → recommended action, traceable end to end. |
| 4 | **AI Account Operator** ⭐ | "Can AI reduce operator work without becoming a black box we can't trust?" | Structured generation, uncertainty UX, human-in-the-loop, evals, audit | **The differentiator.** Leads the site. This is the scarce skill (Section 5.2). |
| 5 | **Operator Console** (capstone) | "Do all the pieces work together as one real product?" | Full-stack ownership: auth, persistence, audit, integration | **The closer.** Proves completeness. Sign in → inspect → act → persist → reload → audit. |

**Three capability notes** — real public content, not builds. Each is a short write-up plus a clip, costing hours rather than days:

| Note | Subject | Why it's content, not a build |
|---|---|---|
| N-1 | The design system itself | Tokens, state rules, accessibility decisions. Interesting to engineers and product leaders; doesn't need its own sandbox. |
| N-2 | Command palette & keyboard craft | Pure craft signal. Lives inside the shell (`D-04`), demonstrated in a 15-second clip. |
| N-3 | The AI evaluation harness | How the eval set is built, what failure conditions look like, what it caught. Arguably the highest-credibility piece of writing in the whole project for a technical audience. |

**Net effect:** eight pieces of public content, roughly half the build load, materially more depth per build, and the duplicate capability claims removed.

**Cost of this change:** fewer distinct live sandboxes, so slightly less SEO surface area (PRD v2 §27 treats each build as a landing page). Judgment call: depth wins for a founder audience, breadth wins for search. Given that the target is "ten of the right people" rather than volume, depth should win.

### 7.3 Build-order logic

Foundation → shared UI → domain models → synthetic data → Build 1 → 2 → 3 → 4 → 5 → portfolio layer.

Unchanged from PRD v2, and correct: domain logic and seed data must exist before any surface, or the builds will contradict each other.

---

## 8. The three products (`D-07`)

PRD v2 says there are two products. There are three, and the third is the one that determines whether the goal is met.

### 8.1 Relay Lab — the work
The builds, design system, domain logic, tests, AI control system. Covered well by PRD v2.

### 8.2 Portfolio layer — the conversion surface
Home, build pages, decision layer, honesty layer, contact flow, SEO, analytics. Covered well by PRD v2 §16–18. Keep it.

### 8.3 Distribution engine — unowned, and the actual bottleneck

Both PRDs contain a contradiction. PRD v1 says *"ten of the right people beat ten thousand of the wrong ones."* Both then prescribe organic LinkedIn and X posting. **Organic posting is a reach instrument, not a targeting instrument.** If the target is roughly 50 named founders, posting is the wrong primary tool.

The correct structure:

| Motion | Role | Instrument |
|---|---|---|
| **Outbound (primary)** | Reaches the specific people who can say yes | A named list of 30–50 founders/product leaders in reachable companies. Contact carries a *specific artifact about their product* — i.e. a teardown (`D-08`). |
| **Public posting (secondary)** | Ambient credibility; warms the outbound; compounds | Decision-led posts on the four PRD v2 pillars. Never "I built this with AI" unless the workflow is the subject. |
| **Inbound (tertiary)** | Compounding, slow, mostly SEO and referral | Build pages as landing pages; teardowns as search bait. |

**Why teardowns are the hinge:** a cold message saying "here is my portfolio" is ignored. A cold message saying "I spent three hours on your onboarding flow — here are the two places you're losing activation, and here's a rebuilt version of one of them" is nearly unignorable. It simultaneously:
- closes the "can't prove it on real mess" gap (Section 4),
- demonstrates scoping and communication (Section 3.4),
- *is* the outbound artifact,
- and costs less than a full Relay build.

**Open question for Segun:** is he willing to do named outbound? If not, the realistic ceiling on this project drops substantially and we should know that now rather than at week eight.

---

## 9. Scope, timeline, and stop rules (`D-09`, `D-14`)

### 9.1 Timeline honesty

PRD v1: 11 days. PRD v2: 14 days. Both are fantasy for the stated scope — design system + 8 builds + full-stack capstone with auth/persistence/audit + AI with an eval set + portfolio layer + SEO + analytics + contact flow + recordings for each build.

Both estimates also omit the content work entirely: write-ups, clips, screenshots, posts, outbound. That is roughly 30% of total effort and it is not compressible by AI nearly as much as code is.

**Realistic:** 6–10 weeks of focused solo work for the consolidated five-build structure. Longer for the original eight.

### 9.2 Minimum viable portfolio

The dominant failure mode for a project like this is **abandonment at 60%**, which leaves a half-finished lab that signals *worse* than having shipped nothing. The defence is to define the smallest set that does the whole job, ship that first, and treat everything after it as expansion.

**MVP set:**
1. Foundation (design system, domain models, synthetic data, app shell)
2. Build 1 — Monetisation Lab
3. Build 4 — AI Account Operator
4. Portfolio layer (home, two build pages, decision layer, honesty layer, contact)

That combination already proves business reasoning, money rigour, design quality, the scarce AI-control skill, and full-stack capability. **Everything else is expansion, and the plan should say so out loud** so that stopping early is a planned outcome rather than a failure.

### 9.3 Stop rules

- Never post a build that fails the Definition of Done, regardless of cadence.
- If the MVP set is not complete by week four, cut Build 2 and Build 3 rather than lowering quality.
- If a build exceeds its budget by 50%, cut scope inside the build rather than extending the timeline.
- The capstone (Build 5) ships only if the MVP set is complete. It is the strongest piece but also the most expensive, and a missing capstone is far cheaper than four thin builds.

---

## 10. Standards that apply to every build

Inherit PRD v2's Definition of Done (§31) in full. Add three requirements.

### 10.1 The costly-signal requirement (`D-11`)

By 2026 there is a glut of AI-generated, SaaS-shaped demos. "Built fast with AI" therefore invites the suspicion *"then anyone could have done this."*

The counter is to include, in every build, at least one thing that is **visibly expensive to fake** — something AI does not produce by default and a casual builder would skip:

- A test suite that encodes real business edge cases (exactly-at-threshold, one-unit-over, duplicate meter event, mid-cycle plan change, credit application order, proration).
- An evaluation set with explicit failure conditions.
- A full keyboard and screen-reader pass on a complex surface.
- Idempotency handling on event ingestion.
- A documented decision *not* to build something, with the reasoning.

### 10.2 Visible restraint

Every build must contain one thing deliberately **not** built, stated plainly with the reasoning. PRD v2 already has the best example: a cancellation reason that produces *no save offer* because the customer genuinely needs a feature that doesn't exist. Recording the churn reason honestly instead of manufacturing a coupon is a stronger judgment signal than any retention metric.

Restraint is the single hardest quality to fake and the most reassuring to a founder, because it tells them Segun won't quietly build the wrong thing for three weeks.

### 10.3 Money and data correctness

Non-negotiable, because this is the domain where a knowledgeable founder will immediately spot amateurism:

- Integer cents internally, always. Never floating-point dollars.
- Explicit handling of: proration, mid-cycle plan change, credit application order, duplicate and missing meter events, exactly-at-threshold boundaries, unlimited plans, negative adjustments.
- Where a heuristic is used (health scoring, risk flags), say so in the interface. PRD v2 §12.4 has the right instinct: *"Risk is flagged using a simulated heuristic based on…"* Honesty about method increases credibility rather than reducing it.

---

## 11. Open questions for Segun

**Resolved 2026-10-07:** build structure (`D-10`, five deep + three notes) · distribution sequencing (`D-07`, build first then outbound) · positioning wedge (`D-05`, business logic + money + AI safety) · the name (`D-15`, rename now).

**Also resolved:** the name (`D-15`, **Headroom**) and the hours-per-week question, which was **withdrawn** — a self-reported forecast is worse data than observed velocity. Foundation is the calibration unit: build it, measure what it actually took, set the `D-14` checkpoints from that.

**Still open, in priority order:**

1. **The collaboration artifact.** (`D-13`) Nothing currently shows what it's like to brief Segun and get something back. Naturally lands with the teardowns (`D-08`), which are deferred — so this stays open until then.

**With `D-18` closed, the teardowns (`D-08`) are now the only route to third-party evidence.** They were deferred behind the build set; that deferral is worth revisiting once Build 2 ships, because nothing else in the plan produces a signal Segun did not author himself.

---

## 12. Research status — verified vs. assumed

**Status: research completed 2026-10-07.** Network tools failed early in the session and recovered; five searches landed. Findings below are cited. Items still unverified are marked ⚠.

### R-01 — Founding design-engineer roles bundle product ownership with implementation ✅ VERIFIED

The 2026 market asks a founding design engineer to own "how the product feels, how the brand communicates, how the frontend is built, how engineers use the design system." Required: strong React/Next.js plus experience **building or extending design systems.** Compensation typically $150k–$250k plus equity. Demand is live across AI platforms, health tech, and developer infrastructure.

**Implication:** PRD v2 §3.1's claim holds. The design-system requirement is explicit in the market, which justifies treating the shared system as a first-class deliverable (capability note N-1) rather than scaffolding.

### R-02 — AI-generated portfolio work has raised the bar rather than lowered it ✅ VERIFIED, and stronger than assumed

- **29%** of hiring managers have already received AI-generated portfolio or creative work.
- **86%** agree AI creates new challenges in assessing whether application materials reflect real ability.
- **82%** are concerned about candidates' use of AI tools in applications.
- The pivotal finding: *AI-generated mockups neither help nor hurt on their own, but they have raised the bar for everything around them.* Because polished screens are now trivial, **what differentiates a candidate is the reasoning behind decisions.**
- Hiring managers are described as assessing four things: **AI fluency, design taste, evaluation rigor, and shipping ability.** AI fluency is explicitly a *baseline*, not a differentiator.

**Implication:** this is direct confirmation of `D-11` (costly signal + visible restraint) and of demoting "I use AI" as positioning. Note that **"evaluation rigor" is named outright** — which makes capability note N-3 (the AI eval harness) one of the highest-value artifacts in the project, not a technical footnote.

### R-03 — DORA 2025, verified, plus a finding the PRDs missed ✅ VERIFIED

PRD v2's citation is accurate: **90%** of software professionals now use AI (up **14 points** year on year), median **two hours daily**. Over **80%** report productivity gains; **59%** report positive effects on code quality. The "mirror and multiplier" framing is confirmed — AI reflects an organisation's true capabilities, boosting efficiency in cohesive organisations and exposing weakness in fragmented ones.

**The finding neither PRD caught — the trust paradox:** only **24%** of respondents trust AI output "a great deal" (4%) or "a lot" (20%), while **30%** trust it "a little" (23%) or "not at all" (7%).

**Implication:** this is the strongest single piece of evidence for `D-05` and for making Build 4 the flagship. Adoption is a solved problem; *trust* is wide open. A portfolio demonstrating how to make AI output trustworthy enough to act on is aimed squarely at the unsolved problem.

### R-04 — The portfolios that work are minimal and backed by real adoption ⚠ TENSION WITH PREMISE

Paco Coursey, Emil Kowalski, and Rauno Freiberg are the reference points. Their sites are text-forward and minimal — Paco's is mostly text and links, centred on `cmdk`, used in thousands of real apps. The pattern: *"a design portfolio and an engineering blog at the same time."* Credibility derives from **real shipped products and real open-source adoption**, not from simulated companies.

**Implication:** see Section 5.4 and `D-18`. This does not invalidate the lab — those three are already credentialed and don't need to manufacture credibility — but it strongly suggests pairing the lab with one genuinely used artifact. **The most important open question in the project.**

### R-05 — The domain is real, crowded, and actively consolidating ✅ VERIFIED

- **Stripe acquired Metronome in January 2026**; usage-based billing is now part of Stripe's monetisation stack.
- **Orb** is the developer-first independent: raw usage events, query-based metrics, **historical simulations**, retroactive change workflows, invoicing.
- **Lago** is open-source billing infrastructure (AGPLv3), self-hosted or managed.
- Customer success: **Vitally** (product-led, real-time telemetry), **Catalyst** (expansion and retention inside the CRM), plus Gainsight and ChurnZero.

**Two implications.** First, the category is valuable enough that Stripe bought the leading independent — which raises the stakes on Build 1 being *correct*, since a founder in this space will spot naive overage or proration maths instantly. Second, **Orb ships "historical simulations"** — re-pricing an existing book against a proposed model. That is precisely the Build 1 core interaction, which both validates the design and provides a real benchmark to study.

### Still unverified ⚠

| Claim | Status |
|---|---|
| Stripe's specific usage-based-pricing guidance wording (PRD v2 §3.5, §11.1) | ⚠ Not re-fetched — the DORA fetch failed on the classifier and wasn't retried. Verify before quoting publicly. |
| The three job listings cited in PRD v2 §3.1 | ⚠ Not individually verified; listings expire. `R-01` confirms the substance. |
| Portfolio-guidance sources in PRD v2 §3.3 | ⚠ Substance confirmed by `R-02`; specific sources unchecked. |
| Build-in-public as an inbound mechanism — effect sizes rather than anecdotes | ⚠ Not researched. Lower priority now that `D-07` sequences distribution after the build set. |
| Current SERP noise for "Relay billing" / "Relay SaaS" | ⚠ Not checked, but moot — `D-15` retires the name. |

**Rule: do not publish any factual claim sourced only from this file.** Re-verify at the point of publication.

### Sources

- [BigDATAwire — Google Cloud's 2025 DORA Report finds 90% of developers now use AI](https://www.hpcwire.com/bigdatawire/this-just-in/google-clouds-2025-dora-report-finds-90-of-developers-now-use-ai-in-daily-workflows/)
- [Google Cloud — Announcing the 2025 DORA Report](https://cloud.google.com/blog/products/ai-machine-learning/announcing-the-2025-dora-report)
- [IT Revolution — AI's Mirror Effect: the 2025 DORA Report](https://itrevolution.com/articles/ais-mirror-effect-how-the-2025-dora-report-reveals-your-organizations-true-capabilities/)
- [Scrum.org — DORA Report 2025 summary](https://www.scrum.org/resources/blog/dora-report-2025-summary-state-ai-assisted-software-development)
- [TechInterview — The AI Portfolio: what "Built With AI" means in 2026 interviews](https://www.techinterview.org/post/3233475399/ai-portfolio-built-with-ai-2026-interviews/)
- [Resume Genius — AI's impact on hiring in 2026](https://resumegenius.com/blog/job-hunting/ai-impact-on-hiring-2026)
- [Maggie Appleton — A Collection of Design Engineers](https://maggieappleton.com/design-engineers)
- [Process to Pixels — We Are Still Designers. But We Are More.](https://processtopixels.substack.com/p/we-are-still-designers-but-we-are)
- [Orb — Best billing and revenue management software in 2026](https://www.withorb.com/blog/billing-revenue-management-software)
- [Orb — Metronome reviews 2026](https://www.withorb.com/blog/metronome-reviews)
- [ValueAdd VC — Best customer success platforms for startups in 2026](https://valueaddvc.com/blog/best-customer-success-platforms-for-startups-in-2026-gainsight-vitally-churnzero-compared)
- [ZipRecruiter — Design Engineer jobs](https://www.ziprecruiter.com/Jobs/Design-Engineer)

---

## 13. Changelog

**2026-10-07 (e) — Build 1 reworked after a UX audit; repo public; `D-18` closed.** Commits `5612de5` → `7ac2ac5`, pushed to github.com/SMUTEE/Headroom (public, `main`).

Segun's read that the page "didn't make sense" was correct and better aimed than my own audit, which checked whether the page was well-built rather than whether its content earned its place. What it surfaced:

- **The account panel had no single reader** — customer figures, operator status and engineering notes in one card. Now two surfaces on two pages: an operator delta panel answering "what does this change do to this customer", and a customer billing page answering "what will this month cost me".
- **The meter said "consumed" and showed a forecast.** An account that had used 23% of its allowance rendered a full red bar.
- **Three successive passes at the same class of bug**: projected figures that a reader could not reproduce from the figures shown. Rate rounding, then day rounding, then the copy stating a different sum. Everything now derives from the displayed values — `used + rate × days remaining` lands exactly on the projection. **The lesson generalises: on a surface whose job is to be checkable, "close enough" is the bug.**
- **The app shell and skeletons** were specified in the PRD and never built. Now in the design system, and the two pages live in product chrome rather than floating on a portfolio page.
- **Restored the decision and honesty layers**, which I had silently dropped in a rewrite — the build demoed well and argued for nothing.
- **A real accessibility pass** (the earlier one was a spot-check): no skip link, `h1 → h3` outline skip, rows that were a pointer target and a keyboard target at different sizes, and a sticky bar that could hide focused elements. All fixed and re-verified.

117 tests. Also locked: no AI attribution anywhere in commits, code or repo (`~/.claude/CLAUDE.md`, global) — history was rewritten before the first push.

**Still open:** `D-13` (collaboration artifact) remains parked behind the teardowns.

**2026-10-09.** Build 4's costly signal shipped: the evaluation harness (`packages/eval`, capability note N-3) — ten frozen cases, six measures the schema cannot express, published at `/lab/operator/evals` with the failures left in. It has not been run against the model yet; the page says so rather than showing samples. Distribution moved out of planning into `DISTRIBUTION.md`: six stages, each gated, outbound at Stage 5 where `§8.3` says it actually converts. `D-07` is therefore now in execution rather than deferred.

**2026-10-07 (d) — Build 1 shipped.** Commit `755825b`. Monetisation Lab live at `/lab/monetisation`. 105 tests; typecheck, lint, build clean.

The core interaction works and is sharper than planned: lowering Growth's included usage moves **only Growth accounts** — Orbit Health and Fieldstack (already over) rise together, and **Loomline crosses into overage for the first time**. That one row is the whole argument, and it exists because the seed was built coherently (`D-17`): Loomline sits at 99,000 units against a 100,000 allowance, deliberately on the edge.

**Three bugs found by building, all worth keeping for the write-up:**
1. **Hydration mismatch present since Foundation** — the no-flash theme script sets `data-theme` before React hydrates, so server and client markup disagreed on every page load. Fixed with `suppressHydrationWarning`.
2. **"7 of 32 days elapsed" in a 31-day month** — elapsed and remaining were rounded independently. Now remaining is derived from elapsed. Caught by looking at the rendered page, not by a test; a regression test over every day of every month was added after.
3. **Slider used `CSS.escape` inside a `<style>` tag**, a browser global that crashes during SSR. Track and thumb now styled once in `styles.css` against a custom property.

**Design system grew to 12 components** and holds `D-19`: `@headroom/ui` still imports nothing from `domain` or `data`. Two rules that earned their place — badges always render text (no icon-only variant, so state is never colour alone), and inputs use `border-control` rather than `border`, because a control's boundary is what identifies it and answers to 3:1.

**Velocity:** Build 1 took roughly one session, matching Foundation. Two sessions for Foundation + a deep build holds the 3–5 session MVP estimate.

**2026-10-07 (c) — Foundation shipped.** Commit `d95fb84`. pnpm monorepo (`apps/web` + `packages/ui|domain|data`) on Next 16.4 / React 19.3 / Tailwind v4, typecheck + lint + build + 51 tests all clean.

What landed, and the three things worth remembering:

1. **Colour is generated, not hand-picked.** `packages/ui/scripts/generate-tokens.mjs` computes six OKLCH ramps and measures all 58 rendered pairs on every run. Steps are **role-defined (Radix model) rather than lightness-defined**, so step 9 is the solid fill in both appearances and the semantic tier never branches on theme — only primitives swap. This is the single highest-leverage structural decision in the system and it should not be revisited casually.
2. **The measurement loop earned its keep immediately.** It caught 10 real contrast failures on first run, and separately exposed that `@theme inline` was self-referential, so Tailwind silently generated **no rule at all** for `outline-accent-focus` — every focus ring on a themed control was falling back to `currentColor`. That is a genuine accessibility bug that no amount of looking at the page would have revealed.
3. **`fromDollars` had a real bug its own test caught.** `1.005 * 100` is `100.49999999999999` in IEEE 754, so the obvious implementation returns 100 where 101 is correct — and no careful rounding afterwards recovers it, because the multiply introduced the error. Now shifts the decimal string instead. **This is failure-mode material for the portfolio narrative** (PRD v2 §38) and belongs in a decision note.

**Velocity data point (resolves the `D-14` calibration question).** Foundation — repo, generated token system with contrast measurement, design-system reference page, domain model, money module, synthetic world, 51 tests — took roughly one focused working session. On that rate the MVP set (Foundation + Build 1 + Build 4 + portfolio layer) is credible in 3–5 sessions, not the 14 days either PRD assumed. Re-measure after Build 1, which is the first build with real surface area.

**Still open:** `D-18` (one real, used artifact) and `D-13` (collaboration artifact). Neither blocks Build 1. The monorepo layout means `D-18` can be resolved any time before Build 4 at no retrofit cost.

**2026-10-07 (b) — research completed, four decisions locked, `BUILDS.md` created.** Network tools recovered; five searches landed (Section 12, `R-01`–`R-05`). Verified PRD v2's DORA citation (90% adoption, +14pts, median 2h/day) and found the **trust paradox** both PRDs missed — only 24% of practitioners trust AI output a lot or more, which is the strongest evidence yet for the `D-05` positioning. Confirmed the costly-signal thesis hard: 29% of hiring managers have received AI-generated portfolio work, and "evaluation rigor" is now an explicit assessment criterion, which promotes capability note N-3 to a top-tier artifact. Confirmed the domain is live and consolidating (Stripe acquired Metronome, Jan 2026) and that Orb already ships "historical simulations" — validating the Build 1 core interaction and giving it a real benchmark. **Surfaced one finding that cuts against the premise** (`R-04`, `D-18`, Section 5.4): the design-engineer portfolios that work are minimal and backed by real adoption, not simulated companies — so the lab should be paired with one genuinely used artifact rather than asked to prove adoption by itself. Locked `D-05`, `D-07` (sequenced: build first, outbound after), `D-08` (deferred, not dropped), `D-10` (5 builds + 3 notes), `D-11`, `D-12`, `D-15` (rename, name TBD). Opened `D-18`. Wrote `BUILDS.md` with full per-build articulation. **Still no code written.**

**2026-10-07 (a) — initial version.** Read both PRDs. Established the two-sided job to be done (Section 3) and the reframe that the portfolio's job is to be *usable evidence in someone else's risk decision*. Named the three beliefs the lab structurally cannot prove (Section 4). Proposed a sharper positioning wedge around AI control systems (Section 5). Promoted distribution to a first-class product and identified named outbound + teardowns as the primary motion (Section 8). Added a minimum viable portfolio and stop rules (Section 9). Added the costly-signal and visible-restraint requirements (Section 10). Proposed consolidating 8 builds → 5 deep builds + 3 capability notes (Section 7). Opened decisions `D-05`, `D-07`–`D-15`. Logged that network research was blocked and which claims remain unverified (Section 12). **No code written. No build started.**
