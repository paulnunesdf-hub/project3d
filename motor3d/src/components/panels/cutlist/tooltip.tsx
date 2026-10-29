import { useState } from 'react'

export interface Tip {
  x: number
  y: number
  text: string
}

/** Anything carrying pointer coordinates — a React or native mouse event. */
type Positioned = { clientX: number; clientY: number }

/**
 * A single cursor-following tooltip shared by everything inside the cutlist
 * view. One instance drives all of them, so only one tip is ever on screen and
 * the markup lives in one place.
 *
 * `tipProps` covers the common case (fixed text, follows the cursor); `show` /
 * `hide` are for triggers that must do something else on the same events — a
 * cut piece, for instance, also drives the cross-highlight with the grain list.
 */
export function useCursorTooltip() {
  const [tip, setTip] = useState<Tip | null>(null)

  const show = (e: Positioned, text: string) => setTip({ x: e.clientX, y: e.clientY, text })
  const hide = () => setTip(null)

  const tipProps = (text: string) => ({
    onMouseEnter: (e: Positioned) => show(e, text),
    onMouseMove: (e: Positioned) => show(e, text),
    onMouseLeave: hide,
  })

  const node = tip ? (
    <div
      className="pointer-events-none fixed z-[100] translate-x-3 translate-y-3 rounded border border-edge bg-surface px-1.5 py-1 text-xs whitespace-nowrap text-ink shadow-lg shadow-black/40"
      style={{ left: tip.x, top: tip.y }}
    >
      {tip.text}
    </div>
  ) : null

  return { show, hide, tipProps, node }
}
