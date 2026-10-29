/**
 * Join class names, dropping anything falsy.
 *
 * Deliberately tiny — the variants in this app are simple enough that `clsx`
 * or `cva` would be more dependency than they're worth.
 */
export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ')
}
