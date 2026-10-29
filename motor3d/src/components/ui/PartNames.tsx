import { useRef, useState } from 'react'
import { useTooltip } from './useTooltip'

/**
 * A part group's name(s), kept to one line.
 *
 * A group is usually all one name ("Side"), but differently-named panels can
 * share a size — rather than letting "Side, Side copy, Side copy 2…" push the
 * dimensions off the row, only the first name is shown and the rest collapse
 * into a `+n` chip.
 *
 * Hovering reveals the full text whenever something is actually hidden: either
 * names behind the chip, or a first name too long for its column. When it all
 * fits there is nothing to reveal, so no tooltip appears.
 *
 * Shared by the parts list and the cutlist's grain editor so the two tables
 * behave identically.
 */
export function PartNames({ names, className }: { names: string[]; className?: string }) {
  const distinct = [...new Set(names)]
  const [first, ...rest] = distinct
  const tip = useTooltip(distinct.join(', '))

  const labelRef = useRef<HTMLSpanElement>(null)
  const [clipped, setClipped] = useState(false)

  // Measured on enter rather than on resize: it is only needed at the moment
  // the pointer arrives, and both state updates batch into the same render.
  const onMouseEnter = (e: React.MouseEvent) => {
    const el = labelRef.current
    setClipped(!!el && el.scrollWidth > el.clientWidth)
    tip.trigger.onMouseEnter(e)
  }

  return (
    <span
      className={className ?? 'flex min-w-0 items-center gap-1'}
      {...tip.trigger}
      onMouseEnter={onMouseEnter}
    >
      <span ref={labelRef} className="truncate">
        {first}
      </span>
      {rest.length > 0 && (
        <span className="text-micro shrink-0 rounded-full bg-surface-3 px-1.5 py-px text-ink-dim">
          +{rest.length}
        </span>
      )}
      {(clipped || rest.length > 0) && tip.node}
    </span>
  )
}
