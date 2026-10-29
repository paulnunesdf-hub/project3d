import type { Panel } from '../types/panel'
import { panelBoxSize } from './geometry'

type Vec3 = [number, number, number]

/** Axis-aligned bounding box of a panel, in millimetres. */
export interface Bounds {
  min: Vec3
  max: Vec3
}

/**
 * The resolution below which two faces are treated as the same plane (mm).
 *
 * Panels are positioned as floats, so a joint that is "meant to touch" rarely
 * lands on an exact shared coordinate — rounding leaves a sub-millimetre
 * sliver. This is the shared noise floor for that: closer than this and two
 * faces are the same joint, further apart and the gap is deliberate (a 2-3 mm
 * door reveal, say). Used to decide which faces to weld ({@link repairPrecision}),
 * which snap targets count as already-contacting, and which interpenetrations
 * are deep enough to be worth highlighting.
 */
export const JOINT_TOL = 1.5

export function panelBounds(panel: Panel, position = panel.position): Bounds {
  const size = panelBoxSize(panel)
  return {
    min: [0, 1, 2].map((i) => position[i] - size[i] / 2) as Vec3,
    max: [0, 1, 2].map((i) => position[i] + size[i] / 2) as Vec3,
  }
}

/** Bounds straight from a centre + size, for a proposed (not yet applied) move. */
export function boundsFromCentre(centre: Vec3, size: Vec3): Bounds {
  return {
    min: [0, 1, 2].map((i) => centre[i] - size[i] / 2) as Vec3,
    max: [0, 1, 2].map((i) => centre[i] + size[i] / 2) as Vec3,
  }
}

/**
 * Whether two boxes overlap on both axes *other* than `axis`.
 *
 * This is the gate for "could these two faces genuinely meet here?" — without
 * it, a panel passing a distant block in a different plane would snap to it in
 * empty space. Contact (a shared boundary) counts as overlap; `tol` adds slack
 * so a face flush to an edge still counts.
 */
export function overlapsPerpendicular(a: Bounds, b: Bounds, axis: number, tol = 0): boolean {
  for (let k = 0; k < 3; k++) {
    if (k === axis) continue
    if (a.max[k] < b.min[k] - tol || a.min[k] > b.max[k] + tol) return false
  }
  return true
}

/**
 * The axis-aligned region where two boxes overlap. On an axis where they only
 * touch (or don't reach each other) the span is degenerate or inverted, so
 * callers either ignore that axis — the snap guides draw the contact patch from
 * the other two — or test the span themselves.
 */
export function contactRect(a: Bounds, b: Bounds): { lo: Vec3; hi: Vec3 } {
  return {
    lo: [0, 1, 2].map((i) => Math.max(a.min[i], b.min[i])) as Vec3,
    hi: [0, 1, 2].map((i) => Math.min(a.max[i], b.max[i])) as Vec3,
  }
}
