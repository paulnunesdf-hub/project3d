import { describe, expect, it } from 'vitest'
import { MM_TO_M, axisField, panelBoxSize } from './geometry'
import { resizeAlongAxis } from './resize'
import { panelCorners, distance } from './corners'
import { overlapBoxes } from './overlaps'
import type { Panel } from '../types/panel'
import { defaultGrain } from '../types/panel'

/**
 * Characterization tests for the small pure geometry helpers. These are the
 * modules the refactor plans to consolidate into a shared `bounds.ts`, so the
 * axis/field mapping and box math must stay bit-identical.
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

describe('MM_TO_M', () => {
  it('is the mm -> metre scale the whole viewport renders through', () => {
    expect(MM_TO_M).toBe(0.001)
  })
})

describe('panelBoxSize', () => {
  it('runs thickness along the normal for each orientation', () => {
    expect(panelBoxSize(panel({ normal: 'x' }))).toEqual([18, 400, 600])
    expect(panelBoxSize(panel({ normal: 'y' }))).toEqual([600, 18, 400])
    expect(panelBoxSize(panel({ normal: 'z' }))).toEqual([600, 400, 18])
  })
})

describe('axisField', () => {
  it('is the inverse of panelBoxSize', () => {
    expect(axisField('x', 0)).toBe('thickness')
    expect(axisField('x', 1)).toBe('width')
    expect(axisField('x', 2)).toBe('length')

    expect(axisField('y', 0)).toBe('length')
    expect(axisField('y', 1)).toBe('thickness')
    expect(axisField('y', 2)).toBe('width')

    expect(axisField('z', 0)).toBe('length')
    expect(axisField('z', 1)).toBe('width')
    expect(axisField('z', 2)).toBe('thickness')
  })
})

describe('defaultGrain', () => {
  it('runs along the longer edge, ties going to length', () => {
    expect(defaultGrain(600, 400)).toBe('length')
    expect(defaultGrain(400, 600)).toBe('width')
    expect(defaultGrain(500, 500)).toBe('length')
  })
})

describe('resizeAlongAxis', () => {
  it('refuses the thickness axis', () => {
    // normal z -> axis 2 is thickness
    expect(resizeAlongAxis(panel({ normal: 'z' }), 2, 1, 50)).toBeNull()
    expect(resizeAlongAxis(panel({ normal: 'x' }), 0, 1, 50)).toBeNull()
  })

  it('holds the opposite face and moves the centre by half the delta', () => {
    const p = panel({ normal: 'z', length: 600, position: [0, 0, 0] })
    const r = resizeAlongAxis(p, 0, 1, 100)
    expect(r).not.toBeNull()
    expect(r!.field).toBe('length')
    expect(r!.value).toBe(700)
    expect(r!.position).toEqual([50, 0, 0])
  })

  it('behaves the same dragging the low face', () => {
    const p = panel({ normal: 'z', length: 600, position: [0, 0, 0] })
    // Dragging the -X face further out (delta negative) also grows it.
    const r = resizeAlongAxis(p, 0, -1, -100)
    expect(r!.value).toBe(700)
    expect(r!.position).toEqual([-50, 0, 0])
  })

  it('mirrors onto both faces and keeps the centre when symmetric', () => {
    const p = panel({ normal: 'z', length: 600, position: [0, 0, 0] })
    const r = resizeAlongAxis(p, 0, 1, 100, true)
    expect(r!.value).toBe(800)
    expect(r!.position).toEqual([0, 0, 0])
  })

  it('clamps to a 1mm minimum rather than going negative', () => {
    const p = panel({ normal: 'z', length: 600 })
    const r = resizeAlongAxis(p, 0, 1, -10_000)
    expect(r!.value).toBe(1)
  })

  it('maps the axis onto the right field for a rotated panel', () => {
    // normal y: axis 0 -> length, axis 2 -> width
    expect(resizeAlongAxis(panel({ normal: 'y' }), 0, 1, 10)!.field).toBe('length')
    expect(resizeAlongAxis(panel({ normal: 'y' }), 2, 1, 10)!.field).toBe('width')
  })
})

describe('panelCorners', () => {
  it('returns the 8 box corners', () => {
    const p = panel({ normal: 'z', length: 600, width: 400, thickness: 18, position: [0, 0, 0] })
    const corners = panelCorners(p)
    expect(corners).toHaveLength(8)
    expect(corners).toContainEqual([-300, -200, -9])
    expect(corners).toContainEqual([300, 200, 9])
  })

  it('offsets with the panel position', () => {
    const p = panel({ position: [100, 50, 25] })
    const corners = panelCorners(p)
    expect(corners).toContainEqual([100 - 300, 50 - 200, 25 - 9])
  })
})

describe('distance', () => {
  it('is euclidean', () => {
    expect(distance([0, 0, 0], [3, 4, 0])).toBe(5)
    expect(distance([1, 1, 1], [1, 1, 1])).toBe(0)
  })
})

describe('overlapBoxes', () => {
  it('finds nothing for panels that do not touch', () => {
    const a = panel({ position: [0, 0, 0] })
    const b = panel({ position: [5000, 0, 0] })
    expect(overlapBoxes([a, b])).toEqual([])
  })

  it('ignores a flush butt joint (no interpenetration)', () => {
    // Two z-normal panels stacked exactly face to face: contact, not overlap.
    const a = panel({ normal: 'z', thickness: 18, position: [0, 0, 0] })
    const b = panel({ normal: 'z', thickness: 18, position: [0, 0, 18] })
    expect(overlapBoxes([a, b])).toEqual([])
  })

  it('ignores a sub-1.5mm sliver', () => {
    const a = panel({ normal: 'z', thickness: 18, position: [0, 0, 0] })
    const b = panel({ normal: 'z', thickness: 18, position: [0, 0, 17] })
    expect(overlapBoxes([a, b])).toEqual([])
  })

  it('reports a real interpenetration with its centre and size', () => {
    const a = panel({ normal: 'z', length: 600, width: 400, thickness: 18, position: [0, 0, 0] })
    const b = panel({ normal: 'z', length: 600, width: 400, thickness: 18, position: [0, 0, 10] })
    const boxes = overlapBoxes([a, b])
    expect(boxes).toHaveLength(1)
    // Overlap on Z spans 1..9 -> centre 5, depth 8.
    expect(boxes[0].center[2]).toBeCloseTo(5, 10)
    expect(boxes[0].size[2]).toBeCloseTo(8, 10)
    expect(boxes[0].size[0]).toBeCloseTo(600, 10)
  })

  it('reports one box per overlapping pair', () => {
    const a = panel({ position: [0, 0, 0] })
    const b = panel({ position: [0, 0, 5] })
    const c = panel({ position: [0, 0, 10] })
    // a-b, b-c overlap; a-c are 10 apart on an 18-thick panel so they also overlap.
    expect(overlapBoxes([a, b, c])).toHaveLength(3)
  })
})
