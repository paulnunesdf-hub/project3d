import { describe, expect, it } from 'vitest'
import {
  JOINT_TOL,
  boundsFromCentre,
  contactRect,
  overlapsPerpendicular,
  panelBounds,
  type Bounds,
} from './bounds'
import type { Panel } from '../types/panel'

/**
 * Direct coverage for the shared AABB helpers. These were extracted from
 * snapping/repair/overlaps, which each had their own copy, so they are now
 * load-bearing for three modules and are tested on their own rather than only
 * through their callers.
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

const box = (min: [number, number, number], max: [number, number, number]): Bounds => ({ min, max })

describe('JOINT_TOL', () => {
  it('is the shared 1.5mm face-coincidence noise floor', () => {
    expect(JOINT_TOL).toBe(1.5)
  })
})

describe('panelBounds', () => {
  it('is the centre +/- half the box size', () => {
    const b = panelBounds(panel({ normal: 'z', length: 600, width: 400, thickness: 18 }))
    expect(b.min).toEqual([-300, -200, -9])
    expect(b.max).toEqual([300, 200, 9])
  })

  it('respects the panel orientation', () => {
    const b = panelBounds(panel({ normal: 'x', length: 600, width: 400, thickness: 18 }))
    expect(b.min).toEqual([-9, -200, -300])
    expect(b.max).toEqual([9, 200, 300])
  })

  it('accepts an overridden position without mutating the panel', () => {
    const p = panel({ position: [0, 0, 0] })
    const b = panelBounds(p, [100, 0, 0])
    expect(b.min[0]).toBe(-200)
    expect(b.max[0]).toBe(400)
    expect(p.position).toEqual([0, 0, 0])
  })
})

describe('boundsFromCentre', () => {
  it('matches panelBounds for the same centre and size', () => {
    const p = panel({ normal: 'z', length: 600, width: 400, thickness: 18, position: [5, 6, 7] })
    expect(boundsFromCentre([5, 6, 7], [600, 400, 18])).toEqual(panelBounds(p))
  })
})

describe('overlapsPerpendicular', () => {
  const a = box([0, 0, 0], [10, 10, 10])

  it('is true when the boxes overlap on both other axes', () => {
    expect(overlapsPerpendicular(a, box([5, 5, 100], [15, 15, 110]), 2)).toBe(true)
  })

  it('ignores the joint axis entirely', () => {
    // Miles apart on Z, but Z is the joint axis, so only X/Y are considered.
    expect(overlapsPerpendicular(a, box([0, 0, -99999], [10, 10, -99990]), 2)).toBe(true)
  })

  it('is false when they miss on one of the other axes', () => {
    expect(overlapsPerpendicular(a, box([50, 5, 0], [60, 15, 10]), 2)).toBe(false)
  })

  it('counts bare contact as overlap', () => {
    // b starts exactly where a ends on X.
    expect(overlapsPerpendicular(a, box([10, 0, 0], [20, 10, 10]), 2)).toBe(true)
  })

  it('rejects a gap when no tolerance is given', () => {
    expect(overlapsPerpendicular(a, box([10.4, 0, 0], [20, 10, 10]), 2)).toBe(false)
  })

  it('accepts that gap once tolerance covers it', () => {
    expect(overlapsPerpendicular(a, box([10.4, 0, 0], [20, 10, 10]), 2, 0.5)).toBe(true)
    expect(overlapsPerpendicular(a, box([10.6, 0, 0], [20, 10, 10]), 2, 0.5)).toBe(false)
  })

  it('is symmetric', () => {
    const b = box([5, 5, 100], [15, 15, 110])
    expect(overlapsPerpendicular(a, b, 2)).toBe(overlapsPerpendicular(b, a, 2))
  })
})

describe('contactRect', () => {
  it('is the intersection of the two boxes', () => {
    const r = contactRect(box([0, 0, 0], [10, 10, 10]), box([5, 5, 5], [20, 20, 20]))
    expect(r.lo).toEqual([5, 5, 5])
    expect(r.hi).toEqual([10, 10, 10])
  })

  it('is degenerate on an axis where the boxes only touch', () => {
    const r = contactRect(box([0, 0, 0], [10, 10, 10]), box([10, 0, 0], [20, 10, 10]))
    expect(r.hi[0] - r.lo[0]).toBe(0)
    // The other axes still report the real contact patch.
    expect(r.hi[1] - r.lo[1]).toBe(10)
  })

  it('inverts on an axis where the boxes do not reach each other', () => {
    // Callers detect "no overlap" by the span going negative.
    const r = contactRect(box([0, 0, 0], [10, 10, 10]), box([50, 0, 0], [60, 10, 10]))
    expect(r.hi[0] - r.lo[0]).toBeLessThan(0)
  })

  it('is symmetric', () => {
    const a = box([0, 0, 0], [10, 10, 10])
    const b = box([5, 5, 5], [20, 20, 20])
    expect(contactRect(a, b)).toEqual(contactRect(b, a))
  })
})
