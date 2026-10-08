/**
 * Saved assessments for demo mode.
 *
 * The public demo has no API key, and a lab that only works for its author is
 * not a demo. These are real outputs of the same schema, served when no key is
 * configured and labelled in the interface as saved rather than live. A canned
 * response presented as a live one would be the exact dishonesty this build
 * is arguing against.
 *
 * They are written to exercise the guards, not to flatter them: one declines
 * on thin evidence, and the eval set contains the failures.
 */

import type { AccountAssessment } from '@headroom/domain';

export const SAVED_ASSESSMENTS: Record<string, AccountAssessment> = {
  acc_orbit_health: {
    summary:
      'Orbit Health is a Growth customer whose usage has fallen roughly a quarter in two weeks while a card payment from four days ago remains unrecovered. Two support conversations in the last three weeks describe an unresolved data sync, which is the most plausible common cause.',
    health: 'at_risk',
    confidence: 0.78,
    evidence: [
      {
        statement: 'A card payment was declined four days ago and has not been retried.',
        eventId: 'ev_orbit_6',
      },
      {
        statement:
          'Support on 9 days ago: the team has paused rollout until the sync is reliable.',
        eventId: 'ev_orbit_5',
      },
      {
        statement: 'Support 19 days ago reported the data sync failing to finish.',
        eventId: 'ev_orbit_3',
      },
      {
        statement: 'Usage is down about 24% against the previous fortnight.',
        eventId: null,
      },
      {
        statement:
          'The payment provider supplied no decline reason, so the cause of the failure is unknown.',
        eventId: 'ev_orbit_6',
      },
    ],
    risks: [
      { label: 'Rollout paused on an unresolved technical blocker', severity: 'high' },
      { label: 'Payment unrecovered with no stated reason', severity: 'high' },
      { label: 'Usage decline may continue into renewal', severity: 'medium' },
    ],
    recommendedActions: [
      {
        label: 'Get an engineer onto the sync issue',
        rationale:
          'Two support conversations three weeks apart describe the same unresolved problem, and usage started falling after the first.',
        urgency: 'now',
      },
      {
        label: 'Ask finance to look up the decline',
        rationale:
          'No reason was supplied with the failure, so whether this is a card problem or a deliberate hold is unknown.',
        urgency: 'now',
      },
      {
        label: 'Prepare a renewal position before the next cycle',
        rationale:
          'If the sync is unresolved at renewal, the usage figures will be the customer’s argument.',
        urgency: 'soon',
      },
    ],
    draftNote:
      'Orbit Health has paused their rollout over a data sync problem first raised three weeks ago, and usage has fallen about a quarter since. A payment also failed four days ago with no reason given, which may or may not be related. Suggest we get engineering on the sync before we chase the invoice — the invoice is probably a symptom.',
  },

  acc_slate_labs: {
    summary:
      'Slate Labs completed every onboarding step within three days of signing up and has not created a health rule in the eleven days since. The account has had no product value from the setup it finished.',
    health: 'at_risk',
    confidence: 0.71,
    evidence: [
      { statement: 'Connected a data source eleven days ago.', eventId: 'ev_act_acc_slate_labs_source_connected' },
      { statement: 'Added billing details nine days ago, completing onboarding.', eventId: 'ev_act_acc_slate_labs_billing_added' },
      {
        statement:
          'No account health rule has been created, so the activation event has not occurred.',
        eventId: null,
      },
      { statement: 'The account is still on trial.', eventId: null },
    ],
    risks: [
      { label: 'Finished setup without reaching value', severity: 'high' },
      { label: 'Trial may lapse without a decision being made', severity: 'medium' },
    ],
    recommendedActions: [
      {
        label: 'Walk them through creating their first health rule',
        rationale:
          'They completed every step the product asked for and stopped at the one it did not prompt. That is a product gap, not disinterest.',
        urgency: 'now',
      },
      {
        label: 'Ask what they expected the product to do for them',
        rationale:
          'Setup finished in three days and nothing followed, which suggests the intended use was never established.',
        urgency: 'soon',
      },
    ],
    draftNote:
      'Slate Labs did everything we asked during onboarding and then stopped. They have never made a health rule, so they have never seen the thing the product is for. Worth a call rather than an email — the gap is that nobody told them what to do next.',
  },

  acc_verge: {
    // The decline. Three days old, almost no history, and the honest output is
    // to say so rather than infer a story from a signup.
    summary:
      'Verge Robotics signed up three days ago and has connected nothing. There is not enough history to assess the account.',
    health: 'insufficient_evidence',
    confidence: 0.2,
    evidence: [
      { statement: 'The account was created three days ago.', eventId: null },
      {
        statement: 'No activation steps have been recorded and usage is negligible.',
        eventId: null,
      },
    ],
    risks: [],
    recommendedActions: [],
    draftNote:
      'Too early to say anything useful about Verge Robotics. Worth looking again once they have connected a source.',
  },

  acc_fieldstack: {
    summary:
      'Fieldstack has run consistently above its Growth allowance for three months and is currently at roughly 187% of it. The account is healthy; the plan is the wrong size for it.',
    health: 'healthy',
    confidence: 0.74,
    evidence: [
      {
        statement: 'Third consecutive month above the included allowance as of 21 days ago.',
        eventId: 'ev_field_1',
      },
      { statement: 'Current period usage is about 187% of the Growth allowance.', eventId: null },
      { statement: 'No payment failures or support escalations are recorded.', eventId: null },
    ],
    risks: [
      { label: 'Overage charges may become a renewal argument', severity: 'medium' },
    ],
    recommendedActions: [
      {
        label: 'Model what Scale would cost them against the last three months',
        rationale:
          'Sustained overage at this level usually means a larger plan is cheaper for the customer and more predictable for us.',
        urgency: 'soon',
      },
      {
        label: 'Raise the plan fit before they notice the overage themselves',
        rationale:
          'Finding out at renewal that they have been overpaying for three months is worse than being told now.',
        urgency: 'soon',
      },
    ],
  },
};

export function savedAssessmentFor(accountId: string): AccountAssessment | undefined {
  return SAVED_ASSESSMENTS[accountId];
}
