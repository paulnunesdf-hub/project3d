import { useEffect, useMemo, useState } from 'react'
import { flushSync } from 'react-dom'
import { generateCutlist } from '../../../lib/nesting'
import { buildParts, type PartRow } from '../../../lib/parts'
import { useDesignStore } from '../../../store/designStore'

/** One heading in the grain editor: grain is edited per material + thickness,
 *  since that's how stock is keyed. */
export interface GrainGroup {
  material: string
  thickness: number
  color: string
  rows: PartRow[]
}

/** Parts that couldn't be placed only because their material + thickness has no
 *  stock yet — grouped so the UI can offer a one-click "add the right sheet". */
export interface MissingStock {
  materialId: string
  materialName: string
  thickness: number
  count: number
}

/**
 * Everything the cutlist view derives from the design: the nested result, the
 * parts roll-up, the grain groupings, and the three flavours of unplaced part.
 * Pure projection of the store — no UI state lives here.
 */
export function useCutlistModel() {
  const panels = useDesignStore((s) => s.panels)
  const materials = useDesignStore((s) => s.materials)
  const stocks = useDesignStore((s) => s.stocks)
  const unit = useDesignStore((s) => s.unit)
  const precision = useDesignStore((s) => s.precision)
  const kerf = useDesignStore((s) => s.kerf)
  const margin = useDesignStore((s) => s.margin)

  // Parts flagged "already cut" are dropped before nesting, but still listed in
  // the grain editor (dimmed) so they can be re-enabled.
  const result = useMemo(
    () => generateCutlist(panels.filter((p) => !p.excludeFromCutlist), materials, stocks, kerf, margin),
    [panels, materials, stocks, kerf, margin],
  )

  const parts = useMemo(
    () => buildParts(panels, materials, unit, precision),
    [panels, materials, unit, precision],
  )

  const grainGroups = useMemo(() => {
    const byKey = new Map<string, GrainGroup>()
    for (const row of parts) {
      const key = `${row.material}@${row.thickness}`
      const group = byKey.get(key)
      if (group) group.rows.push(row)
      else byKey.set(key, { material: row.material, thickness: row.thickness, color: row.color, rows: [row] })
    }
    return [...byKey.values()]
  }, [parts])

  const missing = useMemo(() => {
    const byKey = new Map<string, MissingStock>()
    for (const u of result.unplaced) {
      if (u.reason !== 'no-stock') continue
      const key = `${u.materialId}@${u.thickness}`
      const entry = byKey.get(key)
      if (entry) entry.count += 1
      else
        byKey.set(key, {
          materialId: u.materialId,
          materialName: u.materialName,
          thickness: u.thickness,
          count: 1,
        })
    }
    return [...byKey.values()]
  }, [result])

  // Why a given panel didn't make it onto a sheet — surfaced as a cue in the
  // grain list so a part with no stock / too big is easy to spot.
  const reasonById = useMemo(
    () => new Map(result.unplaced.map((u) => [u.panelId, u.reason])),
    [result],
  )

  const unplacedNote = (ids: string[]): string | null => {
    const id = ids.find((x) => reasonById.has(x))
    if (!id) return null
    const reason = reasonById.get(id)
    if (reason === 'too-big') return 'Too big for the sheet'
    if (reason === 'no-space') return 'Not enough stock to fit it'
    return 'No matching stock'
  }

  return {
    result,
    parts,
    grainGroups,
    missing,
    unplacedNote,
    tooBig: result.unplaced.filter((u) => u.reason === 'too-big'),
    noSpace: result.unplaced.filter((u) => u.reason === 'no-space'),
  }
}

/**
 * True while the browser is producing a printout, so the diagrams can render
 * every label and size, bigger and monochrome.
 *
 * `flushSync` matters: the print-mode DOM has to be in place *before* the
 * browser snapshots the page, and a normal state update would land too late.
 */
export function usePrintMode(): boolean {
  const [printing, setPrinting] = useState(false)

  useEffect(() => {
    const before = () => flushSync(() => setPrinting(true))
    const after = () => setPrinting(false)
    window.addEventListener('beforeprint', before)
    window.addEventListener('afterprint', after)
    return () => {
      window.removeEventListener('beforeprint', before)
      window.removeEventListener('afterprint', after)
    }
  }, [])

  return printing
}

/** Close on Escape while `open`. */
export function useEscapeToClose(open: boolean, close: () => void) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, close])
}
