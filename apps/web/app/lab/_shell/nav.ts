import type { NavGroup } from '@headroom/ui';

/**
 * The operator console's shape. Sections that are not built yet are present
 * but inert — the product's outline is real information, and dimming what
 * does not exist is more honest than hiding it or linking to nothing.
 */
function operatorNav(current: string): NavGroup[] {
  return [
  {
    items: [
      { label: 'Overview', available: false },
      { label: 'Accounts', available: false },
    ],
  },
  {
    label: 'Revenue',
    items: [
      { label: 'Pricing & packaging', href: '/lab/monetisation', current: current === 'pricing' },
      { label: 'Usage & billing', available: false },
      { label: 'Signals', href: '/lab/signals', current: current === 'signals' },
    ],
  },
  {
    label: 'Operations',
    items: [
      { label: 'Activation', href: '/lab/activation', current: current === 'activation' },
      { label: 'AI operator', href: '/lab/operator', current: current === 'operator' },
      { label: 'Retention', available: false },
      { label: 'Audit log', available: false },
    ],
  },
  ];
}

export const PRICING_NAV = operatorNav('pricing');
export const ACTIVATION_NAV = operatorNav('activation');
export const SIGNALS_NAV = operatorNav('signals');
export const OPERATOR_NAV = operatorNav('operator');

/** The customer-facing portal. A different product, so a different shell. */
export const CUSTOMER_NAV: NavGroup[] = [
  {
    items: [
      { label: 'Home', available: false },
      { label: 'Usage & billing', href: '/lab/monetisation/customer', current: true },
      { label: 'Team', available: false },
      { label: 'Settings', available: false },
    ],
  },
];
