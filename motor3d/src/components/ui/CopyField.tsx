import { useEffect, useRef, useState } from 'react'
import { Button } from './Button'
import { CONTROL } from './Field'
import { cx } from './cx'

/**
 * A long value to be copied — a share link, typically.
 *
 * Shown in a read-only field rather than as text: a compressed design link runs
 * to hundreds of characters, and rendering it inline made the dialog taller
 * than the window. The field keeps it to one line, scrolls horizontally, and
 * selects itself on focus so Ctrl+C works even where the clipboard API is
 * blocked (insecure origin, denied permission).
 */
export function CopyField({ value, label = 'Copy' }: { value: string; label?: string }) {
  const input = useRef<HTMLInputElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const [state, setState] = useState<'idle' | 'copied' | 'manual'>('idle')

  useEffect(() => () => clearTimeout(timer.current), [])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setState('copied')
      timer.current = setTimeout(() => setState('idle'), 1500)
    } catch {
      // Clipboard refused us — insecure origin, denied permission, or an
      // unfocused document. Focus *and* select: select() alone leaves nothing
      // highlighted when the field doesn't have focus, which made the button
      // look like it had done nothing at all.
      input.current?.focus()
      input.current?.select()
      setState('manual')
    }
  }

  return (
    <div>
      <div className="flex items-center gap-2">
        <input
          ref={input}
          readOnly
          value={value}
          onFocus={(e) => e.currentTarget.select()}
          className={cx(CONTROL, 'font-mono text-xs')}
          aria-label={label}
        />
        <Button variant="primary" className="shrink-0" onClick={copy}>
          {state === 'copied' ? 'Copied' : label}
        </Button>
      </div>
      {state === 'manual' && (
        <p className="text-micro mt-1.5 mb-0 text-snap-middle" role="status">
          Your browser blocked the clipboard — the link is selected, press Ctrl+C.
        </p>
      )}
    </div>
  )
}
