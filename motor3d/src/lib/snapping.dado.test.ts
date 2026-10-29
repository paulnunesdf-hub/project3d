import { describe, expect, it } from 'vitest'
import { SNAP_THRESHOLD_MM, snapGroupDelta, snapResizeFace } from './snapping'
import type { Panel } from '../types/panel'

/**
 * The dado case: landing a moving panel's FACE on a neighbour's centre line.
 *
 * A cabinet side is 18mm thick; its centre line is the reference you rough a
 * dado onto. Resize already supports this. Move historically did not — it only
 * offered centre-to-centre — so a shelf could never be dragged onto a side's
 * mid-thickness.
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

/** An upright cabinet side: thin on X, centred at x = 0 (centre line x = 0). */
const side = () => panel({ normal: 'x', length: 580, width: 720, thickness: 18, position: [0, 0, 0] })

/** A shelf: thin on Y, 600 long on X. */
const shelf = () => panel({ normal: 'y', length: 600, width: 580, thickness: 18 })

describe('dado reference — move', () => {
  it('lands the moving panel FACE on the neighbour centre line', () => {
    const s = shelf()
    // Proposed at x = 304 -> spans x 4..604, so its low face sits 4mm past the
    // side's centre line (x = 0). That is well inside the snap threshold.
    const r = snapGroupDelta([{ panel: s, position: [304, 0, 0] }], [side()], SNAP_THRESHOLD_MM)

    // Correcting by -4 puts the shelf's low face exactly on x = 0.
    expect(r.correction[0]).toBeCloseTo(-4, 10)
    expect(r.snaps[0]).not.toBeNull()
    expect(r.snaps[0]!.hits.some((h) => h.kind === 'middle' && Math.abs(h.plane) < 1e-9)).toBe(true)
  })

  it('still prefers a true butt when the face is nearer the outer face', () => {
    const s = shelf()
    // Low face proposed at x = -11: 2mm from the side's OUTER face (-9), 11mm
    // from its centre line. The butt must win.
    const r = snapGroupDelta([{ panel: s, position: [289, 0, 0] }], [side()], SNAP_THRESHOLD_MM)
    expect(r.correction[0]).toBeCloseTo(2, 10)
    expect(r.snaps[0]!.hits.some((h) => h.kind === 'butt')).toBe(true)
  })

  it('works when approaching from outside the neighbour', () => {
    // A short shelf sitting clear of the side's 18mm span: it spans x 5..105,
    // so its low face is 5mm past the centre line at x = 0 while the two boxes
    // do not overlap on X. A dado is normally approached from outside like
    // this, so the centre line must still be offered.
    const narrow = panel({ normal: 'y', length: 100, width: 580, thickness: 18 })
    const r = snapGroupDelta([{ panel: narrow, position: [55, 0, 0] }], [side()], SNAP_THRESHOLD_MM)
    expect(r.snaps[0]).not.toBeNull()
    expect(r.snaps[0]!.hits.some((h) => h.kind === 'middle')).toBe(true)
  })

  it('does not offer a centre line on an axis the neighbour merely spans', () => {
    // Guard against over-firing: a side is NOT thin on Y, so the middle of its
    // height must never be a target.
    const s = panel({ normal: 'y', length: 100, width: 100, thickness: 18 })
    const r = snapGroupDelta([{ panel: s, position: [0, 3, 0] }], [side()], SNAP_THRESHOLD_MM)
    if (r.snaps[1]) {
      expect(r.snaps[1].hits.every((h) => h.kind !== 'middle')).toBe(true)
    }
  })
})

describe('dado reference — resize (already supported, pinned)', () => {
  it('lands the resized face on the neighbour centre line', () => {
    // Shelf spans x -300..300; its high face is 300. A side centred at x = 304
    // has its centre line at 304 and faces at 295 / 313.
    const s = shelf()
    const neighbour = panel({ normal: 'x', length: 580, width: 720, thickness: 18, position: [304, 0, 0] })
    const r = snapResizeFace(s, 0, 1, 4, [neighbour], SNAP_THRESHOLD_MM)
    expect(r.snap).not.toBeNull()
    expect(r.snap!.plane).toBeCloseTo(304, 10)
    expect(r.snap!.kind).toBe('middle')
  })
})
