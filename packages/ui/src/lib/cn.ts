type ClassValue = string | number | null | undefined | false | ClassValue[];

/**
 * Join class names, dropping falsy values.
 *
 * Deliberately not `tailwind-merge`. Components in this system own their own
 * classes and expose variants rather than accepting arbitrary overrides, so
 * there are no conflicting utilities to resolve. If a component ever needs
 * last-wins conflict resolution, that is a signal its API is too open.
 */
export function cn(...values: ClassValue[]): string {
  const out: string[] = [];
  for (const value of values) {
    if (!value) continue;
    if (Array.isArray(value)) {
      const nested = cn(...value);
      if (nested) out.push(nested);
    } else {
      out.push(String(value));
    }
  }
  return out.join(' ');
}
