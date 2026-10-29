import { describe, expect, it } from 'vitest'
import {
  SNAP_THRESHOLD_MM,
  snapGroupDelta,
  snapHintFromTarget,
  snapResizeFace,
  type SnapHitTarget,
} from './snapping'
import type { Panel } from '../types/panel'

/**
 * Characterization tests for the magnetic snapping layer.
 *
 * The refactor plans to extract a shared `bounds.ts` (contact-rectangle and
 * perpendicular-overlap helpers currently written four times) and to pull the
 * snap-hint rectangle builder out of the viewport components. None of that may
 * change a single correction value or hit, so the important invariants are
 * pinned here:
 *  - snapping only fires where the panels actually overlap in-plane,
 *  - flush fits report several coincident targets under ONE correction,
 *  - `middle` is only offered by a neighbour whose thickness runs on that axis.
 */

let seq = 0
const panel = (over: Partial<Panel> = {}): Panel => ({
  id: `p${seq++}`,
  name: 'Part',
  normal: 'z',
  length: 600,
  width: 400,
  thickness: 18,
  position: [0, 0, 0],
  materialId: 'ply',
  grain: 'length',
  ...over,
})

/** Propose a member at an explicit position (raw delta already applied). */
const at = (p: Panel, position: [number, number, number]) => ({ panel: p, position })

describe('snapHintFromTarget', () => {
  const target: SnapHitTarget = {
    plane: 40,
    kind: 'butt',
    lo: [10, 20, 30],
    hi: [50, 60, 70],
  }

  it('pins the guide to the snapped plane on the snap axis', () => {
    const hint = snapHintFromTarget(0, target)
    expect(hint.at[0]).toBe(40)
    // Degenerate on the snap axis — the guide is a flat rectangle.
    expect(hint.size[0]).toBe(0)
  })

  it('centres and sizes the guide on the contact rectangle for the other axes', () => {
    const hint = snapHintFromTarget(0, target)
    expect(hint.at[1]).toBe(40) // (20 + 60) / 2
    expect(hint.at[2]).toBe(50) // (30 + 70) / 2
    expect(hint.size[1]).toBe(40)
    expect(hint.size[2]).toBe(40)
  })

  it('carries the axis and kind through', () => {
    expect(snapHintFromTarget(2, { ...target, kind: 'middle' })).toMatchObject({
      axis: 2,
      kind: 'middle',
    })
  })

  it('labels by default and honours an explicit false', () => {
    expect(snapHintFromTarget(0, target).label).toBe(true)
    expect(snapHintFromTarget(0, target, false).label).toBe(false)
  })

  it('clamps a negative contact span to zero rather than a negative size', () => {
    // Boxes that do not reach each other invert the span; a guide must never
    // be given a negative extent.
    const inverted: SnapHitTarget = { plane: 0, kind: 'butt', lo: [0, 90, 0], hi: [0, 10, 0] }
    expect(snapHintFromTarget(0, inverted).size[1]).toBe(0)
  })
})

describe('snapGroupDelta — gating', () => {
  it('does not snap to a panel it does not overlap in-plane', () => {
    const moving = panel({ normal: 'z', length: 100, width: 100, position: [0, 0, 0] })
    // Neighbour shares an X coordinate but sits far away on Y — no real contact.
    const far = panel({ normal: 'z', length: 100, width: 100, position: [105, 100_000, 0] })
    const r = snapGroupDelta([at(moving, [0, 0, 0])], [far], SNAP_THRESHOLD_MM)
    expect(r.correction).toEqual([0, 0, 0])
    expect(r.snaps).toEqual([null, null, null])
  })

  it('does not snap when nothing is within threshold', () => {
    const moving = panel({ position: [0, 0, 0] })
    const other = panel({ position: [10_000, 0, 0] })
    const r = snapGroupDelta([at(moving, [0, 0, 0])], [other], SNAP_THRESHOLD_MM)
    expect(r.correction).toEqual([0, 0, 0])
  })

  it('returns a zero correction when there are no neighbours at all', () => {
    const moving = panel()
    const r = snapGroupDelta([at(moving, [0, 0, 0])], [], SNAP_THRESHOLD_MM)
    expect(r.correction).toEqual([0, 0, 0])
    expect(r.snaps).toEqual([null, null, null])
  })
})

describe('snapGroupDelta — butt joints', () => {
  it('pulls a near-miss butt joint closed', () => {
    // Two z-normal panels; mover is 2mm short of butting the neighbour on Z.
    const neighbour = panel({ normal: 'z', thickness: 18, position: [0, 0, 0] })
    const mover = panel({ normal: 'z', thickness: 18, position: [0, 0, 0] })
    // Neighbour spans z -9..9. Mover proposed at z=20 spans 11..29 -> 2mm gap.
    const r = snapGroupDelta([at(mover, [0, 0, 20])], [neighbour], SNAP_THRESHOLD_MM)
    expect(r.correction[2]).toBeCloseTo(-2, 10)
    expect(r.snaps[2]).not.toBeNull()
    expect(r.snaps[2]!.hits.some((h) => h.kind === 'butt')).toBe(true)
  })

  it('reports the snapped plane on the hit', () => {
    const neighbour = panel({ normal: 'z', thickness: 18, position: [0, 0, 0] })
    const mover = panel({ normal: 'z', thickness: 18, position: [0, 0, 0] })
    const r = snapGroupDelta([at(mover, [0, 0, 20])], [neighbour], SNAP_THRESHOLD_MM)
    // Lands the mover's low face onto the neighbour's high face at z = 9.
    expect(r.snaps[2]!.hits.some((h) => Math.abs(h.plane - 9) < 1e-9)).toBe(true)
  })

  it('applies the correction independently per axis', () => {
    const neighbour = panel({ normal: 'z', thickness: 18, position: [0, 0, 0] })
    const mover = panel({ normal: 'z', thickness: 18, position: [0, 0, 0] })
    // Off by 2mm on Z only; X stays put because it is already flush.
    const r = snapGroupDelta([at(mover, [0, 0, 20])], [neighbour], SNAP_THRESHOLD_MM)
    expect(r.correction[2]).toBeCloseTo(-2, 10)
  })
})

describe('snapGroupDelta — flush alignment', () => {
  it('reports several coincident targets under one correction', () => {
    // Identical overlapping panels: min/min, max/max and centre/centre all share
    // the SAME correction, so a flush fit lights them all up at once instead of
    // flickering between them.
    const neighbour = panel({ normal: 'z', length: 600, width: 400, position: [0, 0, 0] })
    const mover = panel({ normal: 'z', length: 600, width: 400, position: [0, 0, 0] })
    const r = snapGroupDelta([at(mover, [3, 0, 0])], [neighbour], SNAP_THRESHOLD_MM)
    expect(r.correction[0]).toBeCloseTo(-3, 10)
    expect(r.snaps[0]!.hits.length).toBeGreaterThan(1)
  })

  it('exposes the winning correction on the axis snap too', () => {
    const neighbour = panel({ position: [0, 0, 0] })
    const mover = panel({ position: [0, 0, 0] })
    const r = snapGroupDelta([at(mover, [3, 0, 0])], [neighbour], SNAP_THRESHOLD_MM)
    expect(r.snaps[0]!.correction).toBeCloseTo(r.correction[0], 12)
  })
})

describe('snapGroupDelta — middle (centre-line) snaps', () => {
  it('offers the centre line of a neighbour whose thickness runs on that axis', () => {
    // Neighbour is z-normal (thin on Z). Approaching its Z centre line offers
    // a `middle` snap — the dado/rabbet reference.
    const neighbour = panel({ normal: 'z', thickness: 18, position: [0, 0, 0] })
    const mover = panel({ normal: 'z', thickness: 18, position: [0, 0, 0] })
    const r = snapGroupDelta([at(mover, [0, 0, 3])], [neighbour], SNAP_THRESHOLD_MM)
    expect(r.snaps[2]).not.toBeNull()
    expect(r.snaps[2]!.hits.some((h) => h.kind === 'middle')).toBe(true)
  })

  it('does NOT offer a centre line on an axis the neighbour merely spans', () => {
    // A z-normal neighbour is wide on X; the middle of its WIDTH is not a
    // meaningful snap target, so no `middle` hit may appear on X.
    const neighbour = panel({ normal: 'z', length: 600, width: 400, position: [0, 0, 0] })
    const mover = panel({ normal: 'z', length: 100, width: 100, position: [0, 0, 0] })
    const r = snapGroupDelta([at(mover, [3, 0, 0])], [neighbour], SNAP_THRESHOLD_MM)
    if (r.snaps[0]) {
      expect(r.snaps[0].hits.every((h) => h.kind !== 'middle')).toBe(true)
    }
  })
})

describe('snapGroupDelta — groups', () => {
  it('lets any member of the group pull the whole formation', () => {
    // Two panels move rigidly; only the SECOND is near a neighbour, but the
    // correction must apply to the group's shared delta.
    const neighbour = panel({ normal: 'z', thickness: 18, position: [0, 0, 0] })
    const a = panel({ normal: 'z', thickness: 18 })
    const b = panel({ normal: 'z', thickness: 18 })
    const r = snapGroupDelta(
      [at(a, [0, 0, 500]), at(b, [0, 0, 20])],
      [neighbour],
      SNAP_THRESHOLD_MM,
    )
    // b is 2mm from butting the neighbour -> the whole group corrects by -2.
    expect(r.correction[2]).toBeCloseTo(-2, 10)
  })

  it('picks the nearest correction when several members are candidates', () => {
    const neighbour = panel({ normal: 'z', thickness: 18, position: [0, 0, 0] })
    const a = panel({ normal: 'z', thickness: 18 })
    const b = panel({ normal: 'z', thickness: 18 })
    // a is 5mm off, b is 1mm off -> b wins.
    const r = snapGroupDelta(
      [at(a, [0, 0, 23]), at(b, [0, 0, 19])],
      [neighbour],
      SNAP_THRESHOLD_MM,
    )
    expect(r.correction[2]).toBeCloseTo(-1, 10)
  })
})

describe('snapResizeFace', () => {
  it('passes the raw delta through when nothing is in range', () => {
    const p = panel({ normal: 'z', length: 600, position: [0, 0, 0] })
    const far = panel({ normal: 'z', position: [100_000, 0, 0] })
    const r = snapResizeFace(p, 0, 1, 37, [far], SNAP_THRESHOLD_MM)
    expect(r.delta).toBe(37)
    expect(r.snap).toBeNull()
  })

  it('passes through with no neighbours at all', () => {
    const p = panel()
    const r = snapResizeFace(p, 0, 1, 12, [], SNAP_THRESHOLD_MM)
    expect(r.delta).toBe(12)
    expect(r.snap).toBeNull()
  })

  it('lands the moving face exactly on a neighbour face', () => {
    // Mover spans x -300..300. Neighbour's low face sits at x = 320.
    const p = panel({ normal: 'z', length: 600, width: 400, position: [0, 0, 0] })
    const neighbour = panel({ normal: 'z', length: 100, width: 400, position: [370, 0, 0] })
    // neighbour spans x 320..420. Raw drag of 18 takes our face to 318 -> snaps to 320.
    const r = snapResizeFace(p, 0, 1, 18, [neighbour], SNAP_THRESHOLD_MM)
    expect(r.delta).toBeCloseTo(20, 10)
    expect(r.snap).not.toBeNull()
    expect(r.snap!.plane).toBeCloseTo(320, 10)
    expect(r.snap!.kind).toBe('butt')
  })

  it('only snaps to neighbours the face actually spans in-plane', () => {
    const p = panel({ normal: 'z', length: 600, width: 400, position: [0, 0, 0] })
    // Same X geometry as above but pushed far away on Y — must not snap.
    const offPlane = panel({ normal: 'z', length: 100, width: 400, position: [370, 100_000, 0] })
    const r = snapResizeFace(p, 0, 1, 18, [offPlane], SNAP_THRESHOLD_MM)
    expect(r.delta).toBe(18)
    expect(r.snap).toBeNull()
  })

  it('competes a neighbour centre line against its faces as a peer', () => {
    // p is y-normal so its width runs on Z: it spans z -200..200, face at 200.
    const p = panel({ normal: 'y', length: 600, width: 400, thickness: 18, position: [0, 0, 0] })
    // A z-normal (thin-on-Z) neighbour centred at 205 offers three targets:
    // faces at 196 and 214, plus its centre line at 205. All are peers, and the
    // nearest to our face wins — here the 196 face.
    const near = panel({ normal: 'z', length: 600, width: 400, thickness: 18, position: [0, 0, 205] })
    const r = snapResizeFace(p, 2, 1, 0, [near], SNAP_THRESHOLD_MM)
    expect(r.snap).not.toBeNull()
    expect(r.snap!.plane).toBeCloseTo(196, 10)
    expect(r.snap!.kind).toBe('butt')
  })

  it('picks the centre line when it is the nearest target', () => {
    // Same pair, but our face now sits at 204 — closest to the 205 centre line.
    const p = panel({ normal: 'y', length: 600, width: 408, thickness: 18, position: [0, 0, 0] })
    const near = panel({ normal: 'z', length: 600, width: 400, thickness: 18, position: [0, 0, 205] })
    const r = snapResizeFace(p, 2, 1, 0, [near], SNAP_THRESHOLD_MM)
    expect(r.snap!.plane).toBeCloseTo(205, 10)
    expect(r.snap!.kind).toBe('middle')
  })

  it('respects the threshold', () => {
    const p = panel({ normal: 'z', length: 600, width: 400, position: [0, 0, 0] })
    const neighbour = panel({ normal: 'z', length: 100, width: 400, position: [400, 0, 0] })
    // neighbour low face at 350; our face at 300 with no drag -> 50mm away.
    const r = snapResizeFace(p, 0, 1, 0, [neighbour], SNAP_THRESHOLD_MM)
    expect(r.snap).toBeNull()
    expect(r.delta).toBe(0)
  })
})
