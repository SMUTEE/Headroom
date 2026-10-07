import type { NavGroup } from '@headroom/ui';

/**
 * The operator console's shape. Sections that are not built yet are present
 * but inert — the product's outline is real information, and dimming what
 * does not exist is more honest than hiding it or linking to nothing.
 */
export const OPERATOR_NAV: NavGroup[] = [
  {
    items: [
      { label: 'Overview', available: false },
      { label: 'Accounts', available: false },
    ],
  },
  {
    label: 'Revenue',
    items: [
      { label: 'Pricing & packaging', href: '/lab/monetisation', current: true },
      { label: 'Usage & billing', available: false },
      { label: 'Signals', available: false },
    ],
  },
  {
    label: 'Operations',
    items: [
      { label: 'Activation', available: false },
      { label: 'Retention', available: false },
      { label: 'Audit log', available: false },
    ],
  },
];

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
