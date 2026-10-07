# Content plan — Builds 1 and 2

Drafts and framing. Everything here is a starting point to edit, not finished copy.

**Before posting:** confirm the deployed site matches commit `b8ae3da`. A deploy that
predates the Build 2 work will show different numbers from the screenshots below, and a
link that contradicts the image is worse than no link.

---

## The advice, first

**Lead with Activation, not Pricing.** Pricing is the deeper build and the better
engineering story, but Activation is the better *first* post, for three reasons:

1. **It needs no setup.** Usage-based billing takes a paragraph to explain before the point
   lands. "You're measuring the checklist, not the outcome" lands in one line.
2. **The argument fits in one screenshot.** Two numbers side by side that contradict each
   other. Nothing else in the project is that compressed.
3. **It indicts something the reader is probably doing.** That is what makes a founder stop.
   The pricing post is interesting; the activation post is uncomfortable, which travels further.

**Three posts, not two.** One per build, plus one pure-engineering post that needs no link
and can go out any time. Space them — a week apart is fine. Posting both builds together
halves each one.

**Do not lead with the tooling.** Per the research in `DECISIONS.md` (`R-02`), AI fluency now
reads as baseline rather than differentiator, and "built with AI" invites *"then anyone could
have done this"*. The AI workflow is a post of its own, later, when it is the subject.

---

## Post 1 — Activation · the two numbers

**Image:** `01-activation-the-two-numbers.png`, or the before/after pair
(`02` → `04`) as a two-up.

**Why this one:** 64% activated sits next to 8 accounts that finished every onboarding step,
and 1 that did all of them and reached nothing. The third number is the post.

### Draft

> Our activation rate is 64%.
>
> 8 of 11 accounts finished every onboarding step we ask for.
>
> One of those 8 did every single step and got nothing out of the product.
>
> That account doesn't show up as a problem anywhere. The checklist says done. The
> onboarding dashboard says success. It's the account most likely to leave quietly —
> because the product has already stopped asking it for anything.
>
> Most activation dashboards measure the checklist, not the outcome. They're not the same
> measurement and the gap between them is where trials die.
>
> So I built the version that keeps them apart. Activation here means one specific thing:
> create a health rule **and** look at what it returns. Configuration plus consumption.
> Following instructions isn't value received.
>
> It's live and you can click it — record the two steps that account is missing and watch
> the cohort move. Nothing is stored as a flag; every number is derived from the event
> stream, including the ones you add.
>
> [link]

**X version:** cut to the first four lines plus the link. The contradiction is the hook; the
explanation can live in a reply.

---

## Post 2 — Pricing · a change is a distribution

**Image:** `05-pricing-loomline-crosses.jpg`

**Why this one:** the table shows three accounts moving and one crossing into overage for the
first time, with the per-customer consequence beside it.

### Draft

> Most pricing changes get modelled as a single number. "Revenue goes up 8%."
>
> That's the least useful way to look at it, because the number nobody models is the one
> that generates the emails.
>
> I tightened one plan's included usage and ran it across an existing book:
>
> → 3 accounts pay more
> → 1 crosses into overage for the first time, +28%
> → 7 don't move at all
>
> A pricing change isn't a revenue number. It's a distribution, and the tail is the part
> that calls you.
>
> The build models the change across the whole book, then drops you into exactly what one
> of those customers sees on their own billing page before the invoice arrives.
>
> [link]

**Optional second image:** `06-customer-billing-page.jpg` — the same maths from the
customer's side. It makes the "two surfaces, one engine" point without a sentence explaining it.

---

## Post 3 — The float bug

**No image needed, no link needed.** This one stands alone, which makes it the safest to
post first if the deploy isn't ready.

### Draft

> Spent an hour on a billing bug that was four characters long.
>
> Converting dollars to cents. The obvious implementation:
>
> `Math.round(dollars * 100)`
>
> `1.005 * 100` is `100.49999999999999` in IEEE 754. So that returns 100 where the right
> answer is 101, and no amount of careful rounding afterwards fixes it — the multiply is
> what introduced the error.
>
> The fix is to never multiply. Shift the decimal point on the number's own string
> representation and do integer arithmetic from there.
>
> My own test caught it, which is the only reason I'm writing this instead of finding out
> from a customer six months in.
>
> If you're doing money in JavaScript: integer cents, behind a type that makes passing a
> float a compile error.

**Why this post is worth the slot:** `R-02` found hiring managers now assess "evaluation
rigor" by name. A short, specific, checkable bug story does more for technical credibility
than any screenshot.

---

## Shots

Saved in `content/shots/`. **These are reference framing, not final assets** — the browser
pane caps them at ~800px wide. Re-take them from the live site on your own machine, where
they'll capture at 2×.

| File | What it shows | Use |
|---|---|---|
| `01-activation-the-two-numbers.png` | The metrics strip, cropped | Post 1 hero |
| `02-activation-full-page.jpg` | Activation page in context | Post 1 "before" |
| `03-slate-labs-before.jpg` | Table + Slate Labs panel, not activated | Detail shot |
| `04-activation-after-recording.jpg` | 73%, 0 not-activated, Slate Labs activated | Post 1 "after" |
| `05-pricing-loomline-crosses.jpg` | Table with Loomline crossing, delta beside it | Post 2 hero |
| `06-customer-billing-page.jpg` | Customer billing view with skeletons | Post 2 secondary |

### To re-shoot properly

1. Light mode, desktop ~1440px wide.
2. **Activation before:** load `/lab/activation` clean. Crop the metrics row.
3. **Activation after:** select Slate Labs, click Record twice. Crop the same region.
   Same crop box for both or the pair won't read.
4. **Pricing:** drag Included usage to 40k, select Loomline. Capture table + delta panel.
5. Avoid capturing the browser chrome; crop to the content card.

### Clips, if you want them

I can't record video. Both are ~10 seconds and better recorded by hand anyway:

- **Activation:** select Slate Labs → click Record twice → the numbers move. No narration.
- **Pricing:** drag the slider → the table re-sorts → one row flips to "Newly in overage".

---

## What not to do

- Don't post a build without a working link. The whole argument in `DECISIONS.md` §3.3 is
  that this work's job is to be *usable evidence* — a screenshot is not evidence; a thing
  someone can click and try to break is.
- Don't claim results. Every figure is synthetic and the pages say so. Any post implying
  real outcomes undoes the honesty layer, which is the most credible thing here.
- Don't number the builds publicly. It re-creates the streak obligation both PRDs rejected,
  and makes a stall legible as abandonment.
- Don't post all three at once.
