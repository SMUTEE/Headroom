# Distribution — the rollout

Companion to `DECISIONS.md` (`D-07`: build first, then outbound) and `BUILDS.md`.
This is the plan for putting out what exists. It is sequenced, and each stage has
a gate that has to be true before the next one starts.

**Status: Stage 0, not started.** Nothing has been published except the lab itself.

---

## 0. Who this is for, and what each of them wants

Two audiences, and they do not want the same post. Mixing them is why most
portfolio content lands with neither.

| | **B2B SaaS founders** | **Hiring managers / design and eng leads** |
|---|---|---|
| Reading for | "Does he understand my problem?" | "Can he do the work and is he safe to hire?" |
| Convinced by | The specific situation, named and costed | Judgment under constraint, and admitted mistakes |
| Switched off by | Craft talk, tokens, type scales, tooling | Hype, "revolutionising", undefended claims |
| Best material | Pricing distribution · activation vs onboarding · the AI refusal | The four bugs · the eval harness · the contrast gate |
| Converts to | A conversation about their product | An interview |

### The rule every post follows

**Say what the thing is, then show the problem inside it.**

A post that opens with a bug and never says where the bug lives reads as a
generic engineering tip. Anyone could have written it, and it does nothing to
show that Segun built something. The context is not preamble to skip past — for
a reader who has never heard of this, the context *is* the interesting part. A
person who built a working fake SaaS company to think properly about pricing is
more unusual than a person who knows about floating point.

So every post establishes three things before it gets to the payload:

1. **There is a thing, and he built it.** Headroom: a B2B SaaS company that does
   not exist, with a tested billing engine, usage meters, an activation funnel
   and an AI that reviews accounts.
2. **What is synthetic and what is not.** The customers and figures are
   invented and labelled. The logic is real and tested to the cent. That line
   has to be drawn in the post, not left to the click.
3. **Why it exists.** The product problems worth working on need a whole
   product. You cannot reason about a pricing change in a Figma file.

Vary the phrasing every time. Repeating the premise across posts is how people
learn what you are doing — repeating the *sentence* is how they learn to scroll
past.

### Two standing bans

1. Never "I built this with AI" unless the workflow is genuinely the subject
   (`DECISIONS.md` §8.3). It reframes the work as a prompt.
2. **Never write as though the customers are real.** No "a customer of ours",
   no "we asked them to", no implied outcomes. Every account in Headroom is
   invented (`D-02`). "Slate Labs, one of the eleven synthetic accounts" is
   fine. "A customer finished onboarding and got nothing" is not — it reads as
   a real company with real users, and that is the one dishonesty this whole
   project argues against.

---

## Stage 0 — Pre-flight

**Goal:** nothing goes out until a stranger clicking the link has a good first
ninety seconds.

- [ ] **Run the eval.** `ANTHROPIC_API_KEY=… pnpm eval`, commit `evals/latest.json`.
      Until this exists, the AI build's central claim is self-asserted and the
      evaluation page says "no run has been published yet" to every visitor.
- [ ] **Update the case study.** It still opens "Three builds are finished" and
      has nothing on Build 4 or the portfolio layer. Also fix the stray
      `</section>` that orphans the fourth bug entry.
- [ ] **Record the three clips** already specified in the case study: the pricing
      slider (12s), the activation cohort moving (10s), signal-to-cause (14s).
      Silent, no narration, no cursor trails. These are load-bearing — a still
      screenshot cannot show state changing, and state changing is the whole
      argument.
- [ ] **Profile alignment.** X and LinkedIn bios point at the lab. Same one-line
      positioning in both: *business logic, money and AI judgment — the product
      surfaces where those meet.*

**Gate:** the eval has run, the clips exist, the case study matches the site.

---

## Stage 1 — Establish what this is

**Goal:** two posts that together say *he built something real* and *it does
something unusual*. Nothing else works until a reader has this.

### Post 1 — what Headroom is

> For the last few weeks I've been building a B2B SaaS company that doesn't
> exist.
>
> Eleven customers, a billing engine, usage meters, an activation funnel, and an
> AI that reviews accounts and tells you what's going on with them. Every
> customer and every figure is invented and labelled as such. The logic isn't —
> the billing arithmetic is tested to the cent, and the account health scores
> are derived from an event stream rather than stored.
>
> I built it because the problems I wanted to work on need a whole product. You
> can't reason about a pricing change in a Figma file, and you can't think
> about activation without events to derive it from.
>
> Four parts are finished. Everything's clickable, nothing needs a login.
>
> [link]

*Why this one opens:* it is the only post that explains the premise, and the
premise is the most unusual thing on offer. Every later post can then be one
sentence of context and straight into the substance.

### Post 2 — the refusal *(with the clip)*

> One of the four parts is an AI that reviews a customer account and writes up
> what's happening with it — cites its evidence, says how confident it is,
> recommends what to do.
>
> I pointed it at a three-day-old account with two events and no history.
>
> It refused. Came back with "not enough evidence" at 20% confidence. No risks,
> no recommendations, nothing to act on.
>
> That took more work than getting an answer. "Insufficient evidence" had to be
> a value the schema could actually return. If it isn't, the model has to phrase
> its way into uncertainty — and a model phrasing its way into uncertainty will
> usually just guess instead.
>
> Synthetic account, real model, real refusal. Try it on any of the eleven:
> [link]

**Gate:** leave these up for a few days. Do not post again into the same silence.

---

## Stage 2 — The things that went wrong

**Goal:** earn the right to show finished work. These are the most relatable
material and the least like a portfolio — but each one has to say where the bug
lived, or it is just a tip.

One per post, spaced. No thread, no "here's what I learned".

### Post 3 — the float bug *(strongest; leads the stage)*

> The billing engine in my fake SaaS company was rounding money wrong, and I'd
> have shipped it.
>
> To store money as integer cents I'd written the obvious thing:
> `Math.round(dollars * 100)`.
>
> For $1.005 that returns 100. The answer is 101. In floating point
> `1.005 * 100` is `100.49999999999999` — the error is already there before the
> rounding happens, so nothing downstream can recover it. Every invoice built on
> it would be a cent light, on the kind of figure that only shows up when
> someone reconciles a year of them.
>
> It now shifts the decimal point on the number's string form and never
> multiplies at all.
>
> A test caught it. I wouldn't have — it's a cent, on one line, on one invoice.
>
> If you bill usage, go and check this one.

### Post 4 — the meter that lied

> I built a customer-facing billing page for a product I invented, so I could
> get the hard part right: showing someone what they owe before the invoice
> turns up.
>
> Then one of the synthetic accounts rendered with a full red usage bar. It had
> used 23% of its allowance.
>
> The label said "used so far". The bar was filling from the projection.
>
> Every test passed, because the arithmetic was correct. The arithmetic was
> never the problem. The bar now fills from real usage, with the allowance
> marked as a crossing on the same track.
>
> This is the class of bug tests don't catch: the number is right and the screen
> still lies.

### Post 5 — the test written to pass

> Every build in my lab runs off one shared dataset, so the same eleven accounts
> tell the same story everywhere. Orbit Health is the one in trouble — its own
> event record says usage fell 23% over a fortnight.
>
> When I built the signals surface, it produced no signal for Orbit Health at
> all.
>
> The generator had spread that decline evenly across sixty days. Over a
> fortnight it worked out at 6%. The account the entire dataset is built around
> wasn't actually in trouble by its own numbers.
>
> The seed test should have caught it two builds earlier. It asserted the drop
> was greater than 3% — a threshold I'd picked because it passed.
>
> I'd written a test to agree with me. It now checks the data against the figure
> the record claims, so the two can't drift apart again.

**Gate:** at least one of these outperforms Stage 1. If none do, the problem is
distribution, not content — go to Stage 5 early.

---

## Stage 3 — The builds, one at a time

**Goal:** convert attention into "he understands my problem". Founder-facing.
Each opens with the question a founder actually asks, and names the build it
lives in.

### Post 6 — pricing *(with the slider clip)*

> "If we change our pricing, what happens to the customers we already have?"
>
> That question is why I built the first part of Headroom. It re-prices an
> entire book of customers against a proposed packaging change and shows you the
> distribution instead of a total.
>
> Drop the Growth plan's included usage from 100k to 40k and three of the eleven
> accounts move. Eight don't — they're on different plans.
>
> The interesting one is Loomline. It had been sitting at 98,252 units against a
> 100,000 allowance — close enough that nobody had looked at it. It crosses into
> billable overage for the first time and the bill goes from $254.00 to $323.90.
>
> A single revenue number hides every part of that. You find out when the emails
> arrive.
>
> Drag the slider yourself — synthetic customers, real billing logic: [link]

### Post 7 — activation *(with the cohort clip)*

> Everyone agrees a signup isn't an activation. Almost every dashboard still
> measures the checklist.
>
> So in Headroom I kept them apart. The checklist is what the product nags you
> about — connect a source, invite someone, add billing. Activation is narrower,
> and I had to commit to something specific for it to mean anything: create an
> account health rule, *and* look at the accounts it returns. Both halves,
> because configuring something you never use isn't value.
>
> That gives three numbers that disagree. 64% of the synthetic accounts
> activated. Eight finished every onboarding step. One of those eight did all of
> them and got nothing out of it.
>
> That one is Slate Labs, stalled eleven days. Every completion metric in the
> product says it's fine. It's the account most likely to leave quietly, because
> the product has stopped asking it for anything.
>
> I also deleted the `activatedAt` column while building it. If you store
> activation and also derive it, the two drift apart the first time anyone
> backfills — and then you're planning against a number nobody can reconstruct.
>
> [link]

### Post 8 — signals *(with the signal-to-cause clip)*

> Most analytics surfaces hand you fifteen charts and a note suggesting you
> investigate something. The interpreting — the expensive part — gets left to
> the person with the least context.
>
> The third part of Headroom does the interpreting. Ranked signals, each naming
> the rule that fired, the events behind it, and what to do.
>
> Orbit Health sits at a health score of 45, down from 79. Clicking the change
> breaks it into what caused it: the declined card payment cost 14 points, each
> support conversation 4. The score itself says less than it looks — the useful
> fact is that it's six points from critical.
>
> None of it is a prediction. Nothing in this lab has been validated against a
> real outcome, so a churn probability would be invented confidence with a
> decimal point on it.
>
> And dismissing a signal asks why. Two of the five reasons blame the rule
> rather than the account, and those get counted by rule. Several people calling
> one rule too sensitive is a report about that threshold, and the page says so
> back.
>
> [link]

**Gate:** one real inbound conversation, from anyone. If zero after all three,
the posting channel is not working for this audience — Stage 5 is the answer,
not more posts.

---

## Stage 4 — The centrepiece

**Goal:** the piece that gets saved and forwarded. This is the hiring-manager
conversion and the one that justifies the whole lab.

### Post 9 — the eval harness, with real results

Requires Stage 0's eval run. Build the post around whichever case the model got
wrong. If every case passed, say so — and say that ten cases passing proves very
little. That honesty is the post.

> The AI in my lab reviews a customer account and tells you what's happening
> with it. Everything I've said about it being trustworthy was, until this week,
> a claim it made about itself.
>
> So I wrote ten cases designed to break it, ran them, and published what
> failed.
>
> [the failing case: what it was given, what it did, what caught it]
>
> Six things get checked that the schema can't express. Whether every record it
> cites actually exists. Whether its confidence matches its verdict in both
> directions — declining at 90% and calling an account critical at 20% are the
> same incoherence pointing opposite ways. Whether it proposed something it has
> no authority to do.
>
> The first one matters most. A model citing an event ID it invented is
> schema-valid, reads as rigour, and is the exact opposite of it.
>
> Ten cases is a small suite and I wrote both the cases and the prompt, so this
> is a floor, not a guarantee. Results, cases and thresholds are all public:
> [link]

### Post 10 — the case study

Once updated. Long-form, LinkedIn-native, links to the lab. This is the artifact
that sits in a DM when someone asks "what have you done?"

**Gate:** the case study is current and the eval page shows a real run.

---

## Stage 5 — Outbound (where this actually converts)

**Goal:** reach the ~30–50 people who can say yes. Per `DECISIONS.md` §8.3,
posting is a reach instrument and this is the targeting one. Everything above
exists to make this message credible when it lands.

1. **Build the list.** 30–50 named B2B SaaS founders or product leads at
   companies small enough that one person decides. Usage-based or hybrid pricing
   is the strongest qualifier — it means they have the exact problem Build 1 is
   about.
2. **Every message references their product, not yours.** The lab is the
   evidence, never the subject. One specific observation about their pricing
   page, onboarding, or billing surface, then the relevant build as the
   demonstration.
3. **Ask for a conversation, not a job.**

**Template — adapt every one, never send this verbatim**

> [Name] — your pricing page lists [specific plan structure]. If you changed the
> included usage on it tomorrow, do you know which of your current customers
> would cross into overage for the first time?
>
> I built a lab for exactly that question. It's a B2B SaaS company I invented —
> synthetic customers, real billing logic — and one part of it re-prices the
> whole book against a packaging change and shows you which accounts move and by
> how much.
>
> [link]
>
> If it's useful, I'd like to hear how you actually handle it today.

**Gate:** 10 sent before judging the response rate.

---

## Stage 6 — Teardowns

`D-08`. The only remaining route to evidence Segun did not author himself, now
that `D-18` is closed. A cold message saying "here is my portfolio" is ignored;
one saying "I spent three hours in your onboarding, here are the two places
you're losing activation, and here's a rebuilt version of one" is close to
unignorable.

This is also where `D-13` lands — the collaboration artifact, written as
*brief → questions I asked → what I cut → what I shipped*.

Deferred until Stage 5 has run. Named here so it does not quietly disappear.

---

## Cadence and stop rules

- **One post at a time.** Space them. Posting three in a day means two of them
  get no reach and are then unusable.
- **No streak.** `D-16`: a broken streak is cheaper than a bad post.
- **Never post a build that fails the Definition of Done**, regardless of
  cadence.
- **Each stage's gate is a real gate.** Moving to Stage 3 while Stage 2 is silent
  means publishing into a void and burning the material.

## What this plan does not solve

- **Nobody is waiting for these posts.** Organic reach from a standing start is
  close to zero, which is exactly why Stage 5 exists and why Stages 1–4 should
  not expand to fill the time.
- **The lab is still entirely self-asserted** (`D-18` closed, Section 4 of
  `DECISIONS.md`). No third party has used, reviewed, or validated any of it.
  Only the teardowns change that.
- **Build 5 is not done.** Nothing above depends on it, but "can he ship the
  whole thing?" stays unanswered until it is.
