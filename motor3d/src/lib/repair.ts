import type { Panel } from '../types/panel'
import { roundToUnitGrid, type Unit } from './units'
import { panelBoxSize } from './geometry'
import { JOINT_TOL, boundsFromCentre, overlapsPerpendicular, type Bounds } from './bounds'

type Vec3 = [number, number, number]

/** Slack allowed when testing whether two panels overlap on the axes across from
 *  the joint (so a face flush to an edge still counts). */
const PERP_TOL = 0.5
/** Relaxation stops when the largest move in a pass drops below this (mm)… */
const SETTLE_MM = 1e-7
/** …or after this many passes (a safety cap; a consistent model settles in a
 *  handful of passes — the diameter of the joint graph). */
const MAX_PASSES = 1000

/** A welded joint: face `si` (−1 = low, +1 = high) of panel `i` on `axis` should
 *  sit exactly on face `sj` of panel `j`. */
interface Joint {
  i: number
  j: number
  axis: 0 | 1 | 2
  si: -1 | 1
  sj: -1 | 1
}

const boundsFace = (b: Bounds, axis: number, sign: number) => (sign === 1 ? b.max[axis] : b.min[axis])

/**
 * Snap every size (length, width, thickness) onto the unit's grid so each part
 * reads and stores as an exact fraction — what you see is what's cut, and
 * identical parts become byte-identical (so they group). The doc works in one
 * unit, so an off-grid metric thickness in an inch doc is genuinely being
 * converted to the nearest 1/16", by design.
 */
function snapSizes(panels: Panel[], unit: Unit, precision: number): Panel[] {
  const grid = (v: number) => roundToUnitGrid(v, unit, precision)
  return panels.map((p) => ({
    ...p,
    length: grid(p.length),
    width: grid(p.width),
    thickness: grid(p.thickness),
  }))
}

/**
 * Find the joints to weld: for each pair + axis where the panels overlap across
 * the joint, weld the closest face-pair if it's already within
 * {@link JOINT_TOL}. Bigger gaps (e.g. a 2-3 mm door reveal) are intentional
 * space and left alone.
 */
function detectJoints(bounds: Bounds[]): Joint[] {
  const joints: Joint[] = []

  for (let i = 0; i < bounds.length; i++) {
    for (let j = i + 1; j < bounds.length; j++) {
      for (let axis = 0; axis < 3; axis++) {
        if (!overlapsPerpendicular(bounds[i], bounds[j], axis, PERP_TOL)) continue
        let best = JOINT_TOL
        let pick: Joint | null = null
        for (const si of [-1, 1] as const) {
          for (const sj of [-1, 1] as const) {
            const d = Math.abs(boundsFace(bounds[i], axis, si) - boundsFace(bounds[j], axis, sj))
            if (d <= best) {
              best = d
              pick = { i, j, axis: axis as 0 | 1 | 2, si, sj }
            }
          }
        }
        if (pick) joints.push(pick)
      }
    }
  }

  return joints
}

/**
 * Anchor each connected cluster of joints at its min-corner panel and return
 * every panel's breadth-first depth from that anchor. Relaxation then only ever
 * moves the deeper endpoint of a joint, so motion flows away from the fixed
 * anchor and the solve converges instead of oscillating.
 */
function anchorDepths(joints: Joint[], bounds: Bounds[]): number[] {
  const adjacency: number[][] = bounds.map(() => [])
  for (const c of joints) {
    adjacency[c.i].push(c.j)
    adjacency[c.j].push(c.i)
  }

  const depth = new Array<number>(bounds.length).fill(-1)

  // Lexicographic min-corner, to pick a stable anchor per cluster.
  const lower = (a: number, b: number) => {
    for (let k = 0; k < 3; k++) {
      const d = bounds[a].min[k] - bounds[b].min[k]
      if (Math.abs(d) > 1e-9) return d < 0
    }
    return a < b
  }

  for (let seed = 0; seed < bounds.length; seed++) {
    if (depth[seed] !== -1) continue

    // Collect the cluster (depth is a provisional "seen" marker here).
    const cluster: number[] = []
    const stack = [seed]
    depth[seed] = 0
    while (stack.length) {
      const u = stack.pop()!
      cluster.push(u)
      for (const v of adjacency[u])
        if (depth[v] === -1) {
          depth[v] = 0
          stack.push(v)
        }
    }

    let anchor = cluster[0]
    for (const u of cluster) if (lower(u, anchor)) anchor = u

    // Recompute the real depths outward from the anchor.
    for (const u of cluster) depth[u] = -1
    depth[anchor] = 0
    const queue = [anchor]
    while (queue.length) {
      const u = queue.shift()!
      for (const v of adjacency[u])
        if (depth[v] === -1) {
          depth[v] = depth[u] + 1
          queue.push(v)
        }
    }
  }

  return depth
}

/**
 * Relax until settled: for each joint, pull the panel *further* from its
 * cluster anchor onto the nearer one. Mutates `pos` in place. Because motion
 * only ever flows away from the fixed anchor, this converges — the anchor's
 * corner stays put while the far end pulls in to close every gap.
 */
function relax(joints: Joint[], pos: Vec3[], half: Vec3[], depth: number[]): void {
  const face = (idx: number, axis: number, sign: number) => pos[idx][axis] + sign * half[idx][axis]
  // Deeper (or, at equal depth, higher-index) endpoint is the one that moves.
  const moves = (a: number, b: number) => depth[a] > depth[b] || (depth[a] === depth[b] && a > b)

  for (let pass = 0; pass < MAX_PASSES; pass++) {
    let worst = 0
    for (const c of joints) {
      const gap = face(c.i, c.axis, c.si) - face(c.j, c.axis, c.sj)
      if (Math.abs(gap) < 1e-12) continue
      if (moves(c.j, c.i)) pos[c.j][c.axis] += gap // move j so its face meets i's
      else pos[c.i][c.axis] -= gap // move i so its face meets j's
      worst = Math.max(worst, Math.abs(gap))
    }
    if (worst < SETTLE_MM) break
  }
}

/**
 * Heal an imperial design that drifted while whole-millimetre / grid rounding
 * was in effect: snap every panel's thickness back onto the exact unit grid
 * (e.g. 19 mm → a true 3/4"), then close the hairline gaps at every joint so a
 * row of parts adds up exactly.
 *
 * Runs as four phases: {@link snapSizes} → {@link detectJoints} →
 * {@link anchorDepths} → {@link relax}.
 */
export function repairPrecision(panels: Panel[], unit: Unit, precision: number): Panel[] {
  const fixed = snapSizes(panels, unit, precision)

  const pos: Vec3[] = fixed.map((p) => [...p.position] as Vec3)
  const half: Vec3[] = fixed.map((p) => panelBoxSize(p).map((s) => s / 2) as Vec3)
  // Snapshot taken before relaxation, which is the only phase that moves panels.
  const bounds = fixed.map((p, i) => boundsFromCentre(pos[i], panelBoxSize(p)))

  const joints = detectJoints(bounds)
  relax(joints, pos, half, anchorDepths(joints, bounds))

  return fixed.map((p, i) => ({ ...p, position: pos[i] }))
}
