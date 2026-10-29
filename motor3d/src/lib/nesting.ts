import type { Panel } from '../types/panel'
import type { Material } from './materials'
import type { Stock } from './stock'
import { findMaterial } from './materials'

/** One part placed on a sheet. Coordinates are mm from the sheet's top-left
 *  corner (margin already included); `w`/`h` are the footprint on the sheet. */
export interface Placement {
  panelId: string
  name: string
  x: number
  y: number
  w: number
  h: number
  /** True if the part is turned 90° from its as-drawn orientation. */
  rotated: boolean
}

/** One physical sheet with the parts packed onto it. Sheets in a group may be
 *  different sizes (a full sheet, an offcut, …), so each carries its own size. */
export interface SheetLayout {
  index: number // 1-based within its group
  length: number
  width: number
  placements: Placement[]
  /** Sum of placed part areas (mm²) — used vs the sheet area for waste. */
  usedArea: number
}

/** All sheets cut for one material + thickness (possibly from several stock
 *  sizes). */
export interface StockGroup {
  key: string
  materialName: string
  color: string
  thickness: number
  sheets: SheetLayout[]
}

export interface UnplacedPart {
  panelId: string
  name: string
  /** `no-stock`: no sheet of this material + thickness exists at all.
   *  `too-big`: larger than every sheet of this material + thickness.
   *  `no-space`: would fit, but the available sheet quantity ran out. */
  reason: 'no-stock' | 'too-big' | 'no-space'
  /** The material + thickness the part needs — so the UI can offer to add
   *  matching stock in one click. */
  materialId: string
  materialName: string
  thickness: number
}

export interface CutlistResult {
  groups: StockGroup[]
  unplaced: UnplacedPart[]
}

interface Footprint {
  w: number
  h: number
  rotated: boolean
}

/** The footprint orientations a part may take on the sheet. Sheet grain runs
 *  along the sheet length (X). A grained part must keep its grain edge along X,
 *  so it has one orientation; a grain-free part can also turn 90°. */
function footprints(panel: Panel): Footprint[] {
  const { length: l, width: w, grain } = panel
  if (grain === 'length') return [{ w: l, h: w, rotated: false }]
  if (grain === 'width') return [{ w: w, h: l, rotated: true }]
  return [
    { w: l, h: w, rotated: false },
    { w: w, h: l, rotated: true },
  ]
}

/** Whether a part fits an empty usable area in at least one allowed orientation. */
function fitsUsable(panel: Panel, uL: number, uW: number): boolean {
  return footprints(panel).some((f) => f.w <= uL && f.h <= uW)
}

// ---- MaxRects bin packer -------------------------------------------------
//
// Each sheet is a bin whose empty space is tracked as a set of maximal free
// rectangles. A part is placed in the free rect with the tightest fit (best
// short-side leftover), then every free rect it overlaps is split into the
// sub-rectangles that remain, and rectangles fully contained in another are
// pruned. This reclaims the space a shelf packer wastes below short parts.
//
// Kerf (saw width) is handled by reserving `part + kerf` on the right/bottom of
// each placement, and giving the bin an extra `kerf` of usable space, so parts
// keep a blade gap between them while still sitting flush to the margins.

interface FreeRect {
  x: number
  y: number
  w: number
  h: number
}

interface Bin {
  length: number
  width: number
  free: FreeRect[]
  placements: Placement[]
  usedArea: number
}

const area = (l: number, w: number) => l * w

/** `a` fully contains `b`. */
function contains(a: FreeRect, b: FreeRect): boolean {
  return a.x <= b.x && a.y <= b.y && a.x + a.w >= b.x + b.w && a.y + a.h >= b.y + b.h
}

/** The parts of `free` left uncovered after `used` is placed over it (up to 4
 *  rectangles). If they don't overlap, `free` is returned unchanged. */
function splitFree(free: FreeRect, used: FreeRect): FreeRect[] {
  const noOverlap =
    used.x >= free.x + free.w ||
    used.x + used.w <= free.x ||
    used.y >= free.y + free.h ||
    used.y + used.h <= free.y
  if (noOverlap) return [free]

  const pieces: FreeRect[] = []
  if (used.y > free.y) pieces.push({ x: free.x, y: free.y, w: free.w, h: used.y - free.y })
  if (used.y + used.h < free.y + free.h)
    pieces.push({ x: free.x, y: used.y + used.h, w: free.w, h: free.y + free.h - (used.y + used.h) })
  if (used.x > free.x) pieces.push({ x: free.x, y: free.y, w: used.x - free.x, h: free.h })
  if (used.x + used.w < free.x + free.w)
    pieces.push({ x: used.x + used.w, y: free.y, w: free.x + free.w - (used.x + used.w), h: free.h })
  return pieces
}

/** A chosen spot for a part: where it goes, at what footprint, and how much of
 *  the free rectangle it reserves once the saw gap is added. */
interface Fit {
  x: number
  y: number
  /** Reserved footprint — the part plus a kerf on the right/bottom. */
  reservedW: number
  reservedH: number
  w: number
  h: number
  rotated: boolean
}

/**
 * The best spot for a part in this bin, by best-short-side-fit: the free
 * rectangle that leaves the smallest leftover on its shorter side, ties broken
 * by the longer side. Returns null when no orientation fits anywhere.
 */
function findBestFit(bin: Bin, panel: Panel, kerf: number): Fit | null {
  let best: Fit | null = null
  let bestShort = Infinity
  let bestLong = Infinity

  for (const f of footprints(panel)) {
    const reservedW = f.w + kerf
    const reservedH = f.h + kerf
    for (const fr of bin.free) {
      if (reservedW > fr.w || reservedH > fr.h) continue
      const leftoverW = fr.w - reservedW
      const leftoverH = fr.h - reservedH
      const short = Math.min(leftoverW, leftoverH)
      const long = Math.max(leftoverW, leftoverH)
      if (short < bestShort || (short === bestShort && long < bestLong)) {
        bestShort = short
        bestLong = long
        best = { x: fr.x, y: fr.y, reservedW, reservedH, w: f.w, h: f.h, rotated: f.rotated }
      }
    }
  }

  return best
}

/** Record a placement and carve its reserved footprint out of the free space. */
function commitPlacement(bin: Bin, panel: Panel, fit: Fit, margin: number): void {
  const used: FreeRect = { x: fit.x, y: fit.y, w: fit.reservedW, h: fit.reservedH }
  const split = bin.free.flatMap((fr) => splitFree(fr, used))
  bin.free = split.filter((r, i) => !split.some((o, j) => j !== i && contains(o, r)))
  bin.placements.push({
    panelId: panel.id,
    name: panel.name,
    x: margin + fit.x,
    y: margin + fit.y,
    w: fit.w,
    h: fit.h,
    rotated: fit.rotated,
  })
  bin.usedArea += panel.length * panel.width
}

/** Place a part in a bin using best-short-side-fit. Returns true if it fit. */
function placeInBin(bin: Bin, panel: Panel, kerf: number, margin: number): boolean {
  const fit = findBestFit(bin, panel, kerf)
  if (!fit) return false
  commitPlacement(bin, panel, fit, margin)
  return true
}

/** Stock inventory entry: one stock size and how many sheets remain to open. */
interface Slot {
  stock: Stock
  uL: number
  uW: number
  remaining: number // Infinity when the stock quantity is unlimited (null)
}

/** Stock matches a group's thickness within this tolerance (mm). Exact float
 *  equality is too brittle across unit rounding: an "11/16" sheet (17.4625) and
 *  an 18 mm panel look identical to the user and should nest together, so the
 *  tolerance spans that ~0.54 mm gap — but stays under the ~1.05 mm gap to the
 *  next real thickness (3/4" = 19.05 mm) so distinct stock isn't merged. */
const THICKNESS_TOL = 0.8

/**
 * Nest the design's panels onto the available stock. Panels are grouped by
 * material + thickness and packed onto stock of the same material + thickness,
 * honouring kerf (gap between parts) and margin (clear border).
 *
 * All matching stock sizes are used, not just the first: parts fill already-open
 * sheets when they can, and when a new sheet is needed the **smallest** stock
 * that fits is opened (using up offcuts first and trimming waste). Stock
 * quantities are respected — the packer never invents sheets beyond what's
 * available; parts that then can't be placed are reported as unplaced:
 *  - `no-stock`  — no matching sheet exists,
 *  - `too-big`   — larger than every matching sheet,
 *  - `no-space`  — would fit, but the sheet quantity ran out.
 *
 * Per sheet the packer is MaxRects (best-short-side-fit) with first-fit-
 * decreasing input order — a good waste/scrap trade-off without a full solver.
 */
export function generateCutlist(
  panels: Panel[],
  materials: Material[],
  stocks: Stock[],
  kerf: number,
  margin: number,
): CutlistResult {
  const groups: StockGroup[] = []
  const unplaced: UnplacedPart[] = []

  for (const group of groupByStock(panels)) {
    const material = findMaterial(materials, group.materialId)
    const matching = stocks.filter(
      (s) => s.materialId === group.materialId && Math.abs(s.thickness - group.thickness) < THICKNESS_TOL,
    )

    const report = (panel: Panel, reason: UnplacedPart['reason']) =>
      unplaced.push({
        panelId: panel.id,
        name: panel.name,
        reason,
        materialId: group.materialId,
        materialName: material.name,
        thickness: group.thickness,
      })

    if (matching.length === 0) {
      for (const panel of group.panels) report(panel, 'no-stock')
      continue
    }

    const packed = packGroup(group.panels, buildInventory(matching, margin), kerf, margin)
    for (const { panel, reason } of packed.unplaced) report(panel, reason)

    groups.push({
      key: group.key,
      materialName: material.name,
      color: material.color,
      thickness: group.thickness,
      sheets: packed.bins.map((b, i) => ({
        index: i + 1,
        length: b.length,
        width: b.width,
        placements: b.placements,
        usedArea: b.usedArea,
      })),
    })
  }

  return { groups, unplaced }
}

/** One material + thickness worth of parts — the identity of a stock item. */
interface PanelGroup {
  key: string
  materialId: string
  thickness: number
  panels: Panel[]
}

/** Group panels by material + thickness, the way a shop keys its sheet goods:
 *  "Plywood 18 mm" is a different stock than "Melamine 18 mm" or "Plywood 12 mm". */
function groupByStock(panels: Panel[]): PanelGroup[] {
  const byKey = new Map<string, PanelGroup>()

  for (const panel of panels) {
    const key = `${panel.materialId}@${panel.thickness}`
    const group = byKey.get(key)
    if (group) group.panels.push(panel)
    else byKey.set(key, { key, materialId: panel.materialId, thickness: panel.thickness, panels: [panel] })
  }

  return [...byKey.values()]
}

/** The stock available to a group, smallest sheet first — so offcuts and small
 *  sheets are opened before full ones, and a new sheet is always the smallest
 *  that fits. */
function buildInventory(matching: Stock[], margin: number): Slot[] {
  return matching
    .map((stock) => ({
      stock,
      uL: stock.length - 2 * margin,
      uW: stock.width - 2 * margin,
      remaining: stock.quantity == null ? Infinity : stock.quantity,
    }))
    .sort((a, b) => area(a.stock.length, a.stock.width) - area(b.stock.length, b.stock.width))
}

interface PackResult {
  bins: Bin[]
  unplaced: { panel: Panel; reason: UnplacedPart['reason'] }[]
}

/**
 * Pack one group's panels onto its inventory, first-fit-decreasing: biggest
 * parts first, filling already-open sheets (smallest first) before opening a
 * new sheet of the smallest stock that fits. Consumes `inventory` quantities as
 * sheets are opened, so the packer never invents stock that isn't available.
 */
function packGroup(panels: Panel[], inventory: Slot[], kerf: number, margin: number): PackResult {
  const bins: Bin[] = []
  const unplaced: PackResult['unplaced'] = []
  const fitsAnyStock = (panel: Panel) => inventory.some((s) => fitsUsable(panel, s.uL, s.uW))

  // First-fit-decreasing: tackle the biggest parts first.
  const sorted = [...panels].sort((a, b) => Math.max(b.length, b.width) - Math.max(a.length, a.width))

  for (const panel of sorted) {
    if (!fitsAnyStock(panel)) {
      unplaced.push({ panel, reason: 'too-big' })
      continue
    }

    // Try existing open sheets, smallest first (fill offcuts before big ones).
    // `some` short-circuits on the first sheet that takes it.
    const openSmallestFirst = [...bins].sort((a, b) => area(a.length, a.width) - area(b.length, b.width))
    if (openSmallestFirst.some((bin) => placeInBin(bin, panel, kerf, margin))) continue

    // Open a new sheet: the smallest available stock that fits this part.
    const slot = inventory.find((s) => s.remaining > 0 && fitsUsable(panel, s.uL, s.uW))
    if (!slot) {
      unplaced.push({ panel, reason: 'no-space' }) // fits a stock size, but the quantity ran out
      continue
    }

    slot.remaining -= 1
    const bin: Bin = {
      length: slot.stock.length,
      width: slot.stock.width,
      // Bin gets one extra kerf so a part reserved as (size + kerf) still sits
      // flush to the far margin.
      free: [{ x: 0, y: 0, w: slot.uL + kerf, h: slot.uW + kerf }],
      placements: [],
      usedArea: 0,
    }
    placeInBin(bin, panel, kerf, margin)
    bins.push(bin)
  }

  return { bins, unplaced }
}
