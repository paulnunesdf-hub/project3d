import type { Placement } from '../../../lib/nesting'

/** How a part's label is drawn, chosen by how much room the part has:
 *  - `edges`  — the width dim along the top edge, the height dim down the left,
 *  - `dims`   — a thin strip: one centred `w × h`, rotated to run along it,
 *  - `letter` — too small for any text; a legend entry spells it out. */
export type LabelMode = 'edges' | 'dims' | 'letter'

export interface PlacementPlan {
  size: string
  wStr: string
  hStr: string
  mode: LabelMode
  /** Whether the part's name fits inside, clear of the edge dims. */
  named: boolean
  /** Legend key, assigned only when printing and the name didn't fit. */
  letter?: string
  innerW: number
  innerH: number
}

export interface SheetPlan {
  plan: PlacementPlan[]
  legend: { letter: string; text: string }[]
}

/** Rough width of label text in px at the label font sizes. */
const PX_PER_CHAR = 5
const TEXT_PADDING = 6

const textWidth = (text: string) => text.length * PX_PER_CHAR + TEXT_PADDING

/** Legend keys: A…Z, then A1…Z1, A2… so they never run out. */
function letterFor(index: number): string {
  const base = String.fromCharCode(65 + (index % 26))
  const group = Math.floor(index / 26)
  return group ? `${base}${group}` : base
}

/**
 * Decide how each part on a sheet gets labelled.
 *
 * Dimensions are shown whenever they fit; the name is added only if there's
 * extra room; parts too small get a letter that a legend under the sheet spells
 * out. Every part WITHOUT a name gets a letter when printing, so you can always
 * identify what you're cutting.
 */
export function planPlacements(
  placements: Placement[],
  scale: number,
  label: (mm: number) => string,
  printing: boolean,
): SheetPlan {
  const legend: SheetPlan['legend'] = []

  const plan = placements.map((p) => {
    const pw = p.w * scale
    const ph = p.h * scale
    const wStr = label(p.w)
    const hStr = label(p.h)
    const size = `${wStr} × ${hStr}`

    // Prefer the edge layout (a dim on each edge). Thin strips that can't hold
    // it fall back to a single centred dim; anything smaller becomes a letter.
    let mode: LabelMode
    if (pw >= textWidth(wStr) + 2 && ph >= textWidth(hStr) + 2) mode = 'edges'
    else if (Math.min(pw, ph) >= 11 && Math.max(pw, ph) >= textWidth(size)) mode = 'dims'
    else mode = 'letter'

    // The inner area is what's left once the top/left edge dims are clear.
    const innerW = pw - 20
    const innerH = ph - 22
    const named = mode === 'edges' && innerW >= 34 && innerH >= 12

    let letter: string | undefined
    if (printing && !named) {
      letter = letterFor(legend.length)
      legend.push({ letter, text: `${p.name} · ${size}` })
    }

    return { size, wStr, hStr, mode, named, letter, innerW, innerH }
  })

  return { plan, legend }
}
