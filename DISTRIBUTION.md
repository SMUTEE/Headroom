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

**The rule that follows:** every post leads with a *situation*, not a *build*. The
build is how the post ends, never how it opens.

**Two standing bans.**

1. Never "I built this with AI" unless the workflow is genuinely the subject
   (`DECISIONS.md` §8.3). It reframes the work as a prompt.
2. Never imply the data or the outcomes are real. Everything is synthetic and
   labelled (`D-02`). "Three of eleven accounts move" is fine because the lab
   says what it is. "Saved a customer 28%" would be a lie.

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

## Stage 1 — Open with the refusal

**Goal:** one post that makes someone stop. Not an introduction, not a launch.

Lead with Build 4, because it is the differentiator (`D-12`) and because an AI
that declines is the most counter-intuitive thing in the lab. Everything else
reads as competent; this reads as unusual.

**Post 1 — X and LinkedIn, with the clip**

> I asked it to assess a customer account. It said no.
>
> The account was three days old. Two events, no history. It returned "not
> enough evidence" at 20% confidence — no risks, no recommendations, nothing to
> act on.
>
> Getting that took more work than getting an answer. "Insufficient evidence"
> had to be a value the schema could return. If it isn't, the model has to
> phrase its way into uncertainty, and a model phrasing its way into uncertainty
> will usually just guess instead.
>
> Synthetic account, live model. You can try it: [link]

**Why it works:** it opens with a failure that is actually a feature, it is
specific, and it ends with something to click rather than something to admire.

**Gate:** leave it up for a few days. Do not post again into the same silence.

---

## Stage 2 — The four bugs

**Goal:** earn the right to show finished work. These are the most relatable
things in the project and the least like a portfolio.

One per post, spaced. No thread, no "here's what I learned". They work because
they are confessions with a technical payload.

**Post 2 — the float bug** *(strongest; leads the stage)*

> I converted dollars to cents with `Math.round(dollars * 100)`.
>
> For $1.005 that returns 100. The answer is 101.
>
> In floating point `1.005 * 100` is `100.49999999999999`. The error is already
> there before the rounding happens, so nothing downstream recovers it.
>
> A test caught it. I wouldn't have.
>
> If you bill usage, go and check this one.

**Post 3 — the meter that lied**

> An account had used 23% of its allowance. The bar was full, and red.
>
> The label said "used so far". The bar was filling from the projection.
>
> Every test passed, because the arithmetic was correct. The arithmetic was
> never the problem.
>
> This is the class of bug tests don't catch: the number is right and the screen
> still lies.

**Post 4 — the test written to pass**

> The account my entire demo dataset is built around is described, in its own
> event record, as down 23% over a fortnight.
>
> It was down 6%.
>
> The seed test asserted the drop was greater than 3% — a threshold I picked
> because it passed.
>
> I'd written a test to agree with me. It now checks the data against the figure
> the record claims, so the two can't drift apart again.

**Post 5 — the projection nobody could check** *(optional, weakest of the four)*

> The page reported usage over seven days and computed the rate on the 6.5 days
> actually elapsed.
>
> Add it up by hand and you land 8% off the published number, with no way to see
> why.
>
> Took three passes to close. Every fix left one more input derived from a
> figure more precise than the one printed on screen. On a page whose job is
> making a bill checkable, that precision was worth giving up.

**Gate:** at least one of these outperforms Post 1. If none do, the problem is
distribution, not content — go to Stage 5 early.

---

## Stage 3 — The builds, one at a time

**Goal:** convert attention into "he understands my problem". Founder-facing.
Each opens with the question a founder actually asks.

**Post 6 — pricing** *(with the slider clip)*

> "What happens to our existing customers if we drop the included usage to 40k?"
>
> Three of eleven accounts move. Eight don't — they're on different plans.
>
> One of the three is interesting. Loomline had been sitting at 98,252 units
> against a 100,000 allowance. Close enough that nobody had looked at it. They
> cross into billable overage for the first time and their bill goes up 28%.
>
> A single revenue number hides all of that. You find out when the emails
> arrive.
>
> Drag the slider yourself: [link]

**Post 7 — activation** *(with the cohort clip)*

> A customer finished every onboarding step we asked for and got nothing out of
> the product.
>
> Connected a source, invited a teammate, added billing. Never created a rule,
> so never saw a result.
>
> Every completion metric said they were fine. They were the account most likely
> to leave quietly, because the product had stopped asking them for anything.
>
> "Onboarded" and "activated" are different numbers. Most dashboards only show
> the first one.

**Post 8 — signals** *(with the signal-to-cause clip)*

> Most analytics surfaces hand you fifteen charts and suggest you investigate
> something. The interpreting — the expensive part — gets left to the person
> with the least context.
>
> So this one interprets. Each signal names the rule that fired, the events
> behind it, and what to do.
>
> And dismissing a signal asks why. Two of the five reasons blame the rule
> rather than the account, and those get counted. Several people calling one
> rule too sensitive is a report about that threshold, and the page says so
> back.

**Gate:** one real inbound conversation, from anyone. If zero after all three,
the posting channel is not working for this audience — Stage 5 is the answer,
not more posts.

---

## Stage 4 — The centrepiece

**Goal:** the piece that gets saved and forwarded. This is the hiring-manager
conversion and the one that justifies the whole lab.

**Post 9 — the eval harness, with real results**

Requires Stage 0's eval run. The post is built around whichever case the model
got wrong. If every case passed, say that, and say that ten cases passing proves
very little — that honesty is the post.

> I wrote ten cases designed to break my own AI feature, ran them, and published
> what failed.
>
> [the failing case, named, with what it did and what the guard caught]
>
> Six things get checked that the schema can't express: whether every cited
> record actually exists, whether confidence matches the verdict in both
> directions, whether it proposed something it has no authority to do.
>
> That last one matters most. A model citing an event ID it invented is
> schema-valid, reads as rigour, and is the exact opposite of it.
>
> Results, cases and thresholds: [link]

**Post 10 — the case study**, once updated. Long-form, LinkedIn-native, links to
the lab. This is the artifact that sits in a DM when someone asks "what have you
done?"

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
> I built a lab for that question — drag a slider, see the whole book re-price,
> see which accounts move and by how much. Synthetic data, but the billing logic
> is real and tested.
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
