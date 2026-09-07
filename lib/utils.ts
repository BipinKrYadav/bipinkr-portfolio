/**
 * Minimal class-name joiner.
 *
 * Deliberately not `clsx` + `tailwind-merge`: this site has a narrow,
 * disciplined style surface and does not need runtime class conflict
 * resolution. One tiny function keeps the JS payload smaller.
 */
export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}
