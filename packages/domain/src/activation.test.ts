import { describe, expect, it } from 'vitest';
import {
  type ActivationStep,
  deriveActivation,
  summariseCohort,
} from './activation';
import type { AccountEvent } from './types';

const ACCOUNT = 'acc_test';
const CREATED = '2026-09-01T00:00:00Z';
const NOW = new Date('2026-10-01T00:00:00Z');

let seq = 0;
function step(name: ActivationStep, occurredAt: string, accountId = ACCOUNT): AccountEvent {
  seq += 1;
  return {
    id: `ev_${seq}`,
    accountId,
    type: 'activation_step',
    occurredAt,
    summary: name,
    payload: { step: name },
  };
}

function derive(events: AccountEvent[], asOf = NOW, createdAt = CREATED) {
  return deriveActivation({ accountId: ACCOUNT, createdAt, events, asOf });
}

describe('stage derivation', () => {
  it('starts at setup with no events', () => {
    const s = derive([]);
    expect(s.stage).toBe('setup');
    expect(s.activated).toBe(false);
  });

  it('reaches connected once a source is connected', () => {
    expect(derive([step('source_connected', '2026-09-02T00:00:00Z')]).stage).toBe('connected');
  });

  it('reaches configured on a rule, before the list is viewed', () => {
    const s = derive([
      step('source_connected', '2026-09-02T00:00:00Z'),
      step('rule_created', '2026-09-03T00:00:00Z'),
    ]);
    expect(s.stage).toBe('configured');
    expect(s.activated).toBe(false);
  });

  it('activates only when the rule is created AND the list is viewed', () => {
    const s = derive([
      step('rule_created', '2026-09-03T00:00:00Z'),
      step('list_viewed', '2026-09-04T00:00:00Z'),
    ]);
    expect(s.stage).toBe('activated');
    expect(s.activated).toBe(true);
    // Activation lands on the later of the two, not the earlier.
    expect(s.activatedAt).toBe('2026-09-04T00:00:00Z');
  });

  it('does not activate on viewing a list without a rule', () => {
    expect(derive([step('list_viewed', '2026-09-04T00:00:00Z')]).activated).toBe(false);
  });
});

describe('activation is derived, not stored', () => {
  it('is independent of event order', () => {
    const events = [
      step('source_connected', '2026-09-02T00:00:00Z'),
      step('rule_created', '2026-09-05T00:00:00Z'),
      step('list_viewed', '2026-09-06T00:00:00Z'),
    ];
    const forward = derive(events);
    const reversed = derive([...events].reverse());
    const shuffled = derive([events[1]!, events[2]!, events[0]!]);

    expect(reversed.stage).toBe(forward.stage);
    expect(reversed.activatedAt).toBe(forward.activatedAt);
    expect(shuffled.activatedAt).toBe(forward.activatedAt);
  });

  it('is unchanged by a replayed or duplicated event', () => {
    const events = [
      step('rule_created', '2026-09-05T00:00:00Z'),
      step('list_viewed', '2026-09-06T00:00:00Z'),
    ];
    const once = derive(events);
    const twice = derive([...events, ...events]);
    expect(twice.activatedAt).toBe(once.activatedAt);
    expect(twice.completed).toHaveLength(once.completed.length);
  });

  it('keeps the earliest occurrence when a step repeats', () => {
    const s = derive([
      step('team_invited', '2026-09-10T00:00:00Z'),
      step('team_invited', '2026-09-02T00:00:00Z'),
    ]);
    expect(s.completed.find((c) => c.step === 'team_invited')?.completedAt).toBe(
      '2026-09-02T00:00:00Z',
    );
  });

  it('ignores events belonging to another account', () => {
    const s = derive([step('rule_created', '2026-09-05T00:00:00Z', 'acc_other')]);
    expect(s.stage).toBe('setup');
  });

  it('ignores an unknown step rather than throwing', () => {
    const rogue: AccountEvent = {
      id: 'ev_rogue',
      accountId: ACCOUNT,
      type: 'activation_step',
      occurredAt: '2026-09-02T00:00:00Z',
      summary: 'nonsense',
      payload: { step: 'teleported' },
    };
    expect(() => derive([rogue])).not.toThrow();
    expect(derive([rogue]).stage).toBe('setup');
  });
});

describe('onboarded but not activated', () => {
  it('is the state a naive dashboard calls finished', () => {
    const s = derive([
      step('source_connected', '2026-09-02T00:00:00Z'),
      step('team_invited', '2026-09-03T00:00:00Z'),
      step('billing_added', '2026-09-04T00:00:00Z'),
    ]);

    expect(s.checklistComplete).toBe(true);
    expect(s.activated).toBe(false);
    expect(s.onboardedButNotActivated).toBe(true);
    // The recommendation has to name it rather than report progress.
    expect(s.recommendation).toMatch(/still has not reached value/i);
    expect(s.nextStep).toBe('rule_created');
  });

  it('is false once the account activates', () => {
    const s = derive([
      step('source_connected', '2026-09-02T00:00:00Z'),
      step('team_invited', '2026-09-03T00:00:00Z'),
      step('billing_added', '2026-09-04T00:00:00Z'),
      step('rule_created', '2026-09-05T00:00:00Z'),
      step('list_viewed', '2026-09-05T06:00:00Z'),
    ]);
    expect(s.onboardedButNotActivated).toBe(false);
  });

  it('is false when the checklist is incomplete, however far along', () => {
    const s = derive([step('source_connected', '2026-09-02T00:00:00Z')]);
    expect(s.onboardedButNotActivated).toBe(false);
    expect(s.checklistRemaining).toEqual(['team_invited', 'billing_added']);
  });
});

describe('habit', () => {
  const activate = [
    step('rule_created', '2026-09-05T00:00:00Z'),
    step('list_viewed', '2026-09-05T10:00:00Z'),
  ];

  it('needs three distinct days of returning', () => {
    const s = derive([
      ...activate,
      step('list_viewed', '2026-09-07T10:00:00Z'),
      step('list_viewed', '2026-09-09T10:00:00Z'),
    ]);
    expect(s.stage).toBe('habitual');
  });

  it('does not count several visits on one day as a habit', () => {
    const s = derive([
      ...activate,
      step('list_viewed', '2026-09-05T14:00:00Z'),
      step('list_viewed', '2026-09-05T18:00:00Z'),
    ]);
    expect(s.stage).toBe('activated');
  });

  it('ignores returns outside the window', () => {
    const s = derive([
      ...activate,
      step('list_viewed', '2026-10-20T10:00:00Z'),
      step('list_viewed', '2026-10-21T10:00:00Z'),
    ]);
    expect(s.stage).toBe('activated');
  });
});

describe('stalling', () => {
  it('flags a pre-activation stage sitting past the threshold', () => {
    const s = derive([step('source_connected', '2026-09-02T00:00:00Z')]);
    expect(s.daysInStage).toBe(29);
    expect(s.stalled).toBe(true);
  });

  it('does not flag an account that has just moved', () => {
    const s = derive([step('source_connected', '2026-09-28T00:00:00Z')]);
    expect(s.stalled).toBe(false);
  });

  it('never flags an activated account, however quiet', () => {
    // Going quiet after activation is a health problem, not an activation one.
    const s = derive([
      step('rule_created', '2026-09-01T00:00:00Z'),
      step('list_viewed', '2026-09-01T06:00:00Z'),
    ]);
    expect(s.daysInStage).toBeGreaterThan(7);
    expect(s.stalled).toBe(false);
  });

  it('measures from stage entry, not from account creation', () => {
    const s = derive([step('source_connected', '2026-09-25T00:00:00Z')], NOW, '2026-01-01T00:00:00Z');
    expect(s.daysInStage).toBe(6);
  });

  it('honours a custom threshold', () => {
    const events = [step('source_connected', '2026-09-25T00:00:00Z')];
    const strict = deriveActivation({
      accountId: ACCOUNT, createdAt: CREATED, events, asOf: NOW, stallAfterDays: 3,
    });
    expect(strict.stalled).toBe(true);
  });
});

describe('cohort summary', () => {
  const states = [
    derive([]),
    derive([step('source_connected', '2026-09-02T00:00:00Z')]),
    derive([
      step('source_connected', '2026-09-02T00:00:00Z'),
      step('team_invited', '2026-09-02T00:00:00Z'),
      step('billing_added', '2026-09-02T00:00:00Z'),
    ]),
    derive([
      step('rule_created', '2026-09-05T00:00:00Z'),
      step('list_viewed', '2026-09-05T06:00:00Z'),
    ]),
  ];

  it('counts each stage once and totals correctly', () => {
    const c = summariseCohort(states);
    expect(c.total).toBe(4);
    expect(Object.values(c.byStage).reduce((a, b) => a + b, 0)).toBe(4);
  });

  it('reports the rate a team would quote', () => {
    expect(summariseCohort(states).activationRate).toBe(0.25);
  });

  it('reports the number that contradicts it', () => {
    // One account finished onboarding and reached nothing.
    expect(summariseCohort(states).onboardedButNotActivated).toBe(1);
  });

  it('handles an empty cohort without dividing by zero', () => {
    const c = summariseCohort([]);
    expect(c.total).toBe(0);
    expect(c.activationRate).toBe(0);
  });
});

describe('the activation event itself counts toward the habit', () => {
  it('credits a visit recorded as the activation event, not only later ones', () => {
    // Regression: the first list view is emitted with type `activation` for
    // display, and the habit check only counted `activation_step`, so three
    // distinct visits were credited as two.
    const events: AccountEvent[] = [
      step('rule_created', '2026-09-05T00:00:00Z'),
      { ...step('list_viewed', '2026-09-05T10:00:00Z'), type: 'activation' },
      step('list_viewed', '2026-09-07T10:00:00Z'),
      step('list_viewed', '2026-09-09T10:00:00Z'),
    ];
    expect(derive(events).stage).toBe('habitual');
  });
});
