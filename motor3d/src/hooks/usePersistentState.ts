import { useEffect, useState } from 'react'

/**
 * State mirrored into localStorage, for UI preferences that live outside the
 * saved design (pane widths, collapsed state).
 *
 * Storage is best-effort throughout: unavailable or malformed storage falls
 * back to `fallback` on read and is ignored on write, so a full or blocked
 * localStorage can never break the UI.
 *
 * `revive` validates what came back — return `null` to reject it and use
 * `fallback` instead. That is where a stored width is range-checked, or a
 * partial object is merged over its defaults so a preference added later still
 * loads an older entry.
 */
export function usePersistentState<T>(
  key: string,
  fallback: T,
  revive: (stored: unknown) => T | null = (stored) => stored as T,
) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key)
      if (raw !== null) {
        const revived = revive(JSON.parse(raw))
        if (revived !== null) return revived
      }
    } catch {
      // Unavailable or malformed — fall through to the default.
    }
    return fallback
  })

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch {
      // Storage full or unavailable — preferences are best-effort.
    }
  }, [key, value])

  return [value, setValue] as const
}
