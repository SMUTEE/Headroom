/**
 * @headroom/domain — business rules as pure functions, with no React anywhere.
 *
 * Every build consumes deterministic functions from here. Keeping the rules
 * out of components is what makes them testable, and the tests are a large
 * part of what the lab is actually demonstrating.
 */

export * from './types';
export * from './money';
export * from './billing';
export * from './activation';
export * from './health';
export * from './signals';
