import { describe, expect, it } from 'vitest'
import { repairPrecision } from './repair'
import { panelBoxSize } from './geometry'
import { roundToUnitGrid } from './units'
import type { Panel } from '../types/panel'

/**
 * Characterization tests for the precision-repair relaxation solver.
 *
 * The refactor splits `repairPrecision` into four phase helpers (grid snap,
 * joint detection, cluster anchoring, relaxation). These tests pin the
 * properties that must survive: sizes land on the grid, the anchor corner stays
 * put, joints close exactly, intentional reveals are left alone, and the whole
 * thing converges and is idempotent.
 */

const IN = 25.4

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

const faceLow = (p: Panel, axis: number) => p.position[axis] - panelBoxSize(p)[axis] / 2
const faceHigh = (p: Panel, axis: number) => p.position[axis] + panelBoxSize(p)[axis] / 2

describe('repairPrecision — size snapping', () => {
  it('snaps every size onto the metric grid', () => {
    const out = repairPrecision([panel({ length: 600.4, width: 399.6, thickness: 18.2 })], 'mm', 16)
    expect(out[0].length).toBe(600)
    expect(out[0].width).toBe(400)
    expect(out[0].thickness).toBe(18)
  })

  it('snaps a drifted imperial thickness back onto a true fraction', () => {
    // 19mm is not a real imperial size; on a 1/16 grid it becomes 3/4" (19.05).
    const out = repairPrecision([panel({ thickness: 19 })], 'inch', 16)
    expect(out[0].thickness).toBeCloseTo(0.75 * IN, 10)
  })

  it('honours the precision denominator', () => {
    const p = panel({ length: 10.3 * IN })
    const coarse = repairPrecision([p], 'inch', 4)
    const fine = repairPrecision([p], 'inch', 64)
    expect(coarse[0].length).toBeCloseTo(roundToUnitGrid(10.3 * IN, 'inch', 4), 10)
    expect(fine[0].length).toBeCloseTo(roundToUnitGrid(10.3 * IN, 'inch', 64), 10)
  })

  it('leaves an already-exact design untouched', () => {
    const p = panel({ length: 600, width: 400, thickness: 18, position: [0, 0, 0] })
    const out = repairPrecision([p], 'mm', 16)
    expect(out[0].length).toBe(600)
    expect(out[0].position).toEqual([0, 0, 0])
  })

  it('preserves identity and non-geometry fields', () => {
    const p = panel({ name: 'Side', grain: 'width', hidden: true, excludeFromCutlist: true })
    const out = repairPrecision([p], 'mm', 16)
    expect(out[0].id).toBe(p.id)
    expect(out[0].name).toBe('Side')
    expect(out[0].grain).toBe('width')
    expect(out[0].hidden).toBe(true)
    expect(out[0].excludeFromCutlist).toBe(true)
  })

  it('does not mutate the input panels', () => {
    const p = panel({ length: 600.4, position: [0.3, 0, 0] })
    const before = { ...p, position: [...p.position] as [number, number, number] }
    repairPrecision([p], 'mm', 16)
    expect(p.length).toBe(before.length)
    expect(p.position).toEqual(before.position)
  })

  it('handles an empty design', () => {
    expect(repairPrecision([], 'mm', 16)).toEqual([])
  })
})

describe('repairPrecision — joint closing', () => {
  it('closes a hairline gap between two butted panels', () => {
    // Two z-normal panels meant to butt on Z, left 0.4mm apart by drift.
    const a = panel({ normal: 'z', thickness: 18, position: [0, 0, 0] })
    const b = panel({ normal: 'z', thickness: 18, position: [0, 0, 18.4] })
    const out = repairPrecision([a, b], 'mm', 16)
    const gap = faceLow(out[1], 2) - faceHigh(out[0], 2)
    expect(Math.abs(gap)).toBeLessThan(1e-6)
  })

  it('keeps the anchor (min-corner) panel fixed and moves the far one', () => {
    const a = panel({ normal: 'z', thickness: 18, position: [0, 0, 0] })
    const b = panel({ normal: 'z', thickness: 18, position: [0, 0, 18.4] })
    const out = repairPrecision([a, b], 'mm', 16)
    // `a` is the lexicographic min corner, so it must not move.
    expect(out[0].position).toEqual([0, 0, 0])
    expect(out[1].position[2]).not.toBe(18.4)
  })

  it('leaves an intentional reveal alone', () => {
    // A 3mm door gap is far beyond the 1.5mm contact tolerance — not a joint.
    const a = panel({ normal: 'z', thickness: 18, position: [0, 0, 0] })
    const b = panel({ normal: 'z', thickness: 18, position: [0, 0, 21] })
    const out = repairPrecision([a, b], 'mm', 16)
    const gap = faceLow(out[1], 2) - faceHigh(out[0], 2)
    expect(gap).toBeCloseTo(3, 6)
  })

  it('does not weld panels that do not overlap across the joint', () => {
    // Same Z relationship, but they sit in completely different places on X.
    const a = panel({ normal: 'z', length: 100, width: 100, position: [0, 0, 0] })
    const b = panel({ normal: 'z', length: 100, width: 100, position: [100_000, 0, 18.4] })
    const out = repairPrecision([a, b], 'mm', 16)
    expect(out[1].position[2]).toBeCloseTo(18.4, 6)
  })

  it('closes a chain of joints so a run of parts adds up exactly', () => {
    // Three stacked panels, each drifted a little from its neighbour.
    const a = panel({ normal: 'z', thickness: 18, position: [0, 0, 0] })
    const b = panel({ normal: 'z', thickness: 18, position: [0, 0, 18.3] })
    const c = panel({ normal: 'z', thickness: 18, position: [0, 0, 36.7] })
    const out = repairPrecision([a, b, c], 'mm', 16)
    expect(Math.abs(faceLow(out[1], 2) - faceHigh(out[0], 2))).toBeLessThan(1e-6)
    expect(Math.abs(faceLow(out[2], 2) - faceHigh(out[1], 2))).toBeLessThan(1e-6)
    // The run is exactly three thicknesses long.
    expect(faceHigh(out[2], 2) - faceLow(out[0], 2)).toBeCloseTo(54, 6)
  })

  it('converges and is idempotent', () => {
    const a = panel({ normal: 'z', thickness: 18, position: [0, 0, 0] })
    const b = panel({ normal: 'z', thickness: 18, position: [0, 0, 18.3] })
    const c = panel({ normal: 'z', thickness: 18, position: [0, 0, 36.7] })
    const once = repairPrecision([a, b, c], 'mm', 16)
    const twice = repairPrecision(once, 'mm', 16)
    for (let i = 0; i < once.length; i++) {
      expect(twice[i].position[0]).toBeCloseTo(once[i].position[0], 9)
      expect(twice[i].position[1]).toBeCloseTo(once[i].position[1], 9)
      expect(twice[i].position[2]).toBeCloseTo(once[i].position[2], 9)
      expect(twice[i].length).toBe(once[i].length)
    }
  })

  it('closes an imperial carcass so the joint reads as an exact fraction', () => {
    // This is the regression the imperial-precision work was about: parts must
    // not end up a 1/16" apart from rounding drift.
    const t = 0.75 * IN
    const a = panel({ normal: 'z', thickness: t, position: [0, 0, 0] })
    const b = panel({ normal: 'z', thickness: t, position: [0, 0, t + 0.3] })
    const out = repairPrecision([a, b], 'inch', 16)
    expect(Math.abs(faceLow(out[1], 2) - faceHigh(out[0], 2))).toBeLessThan(1e-6)
    expect(faceHigh(out[1], 2) - faceLow(out[0], 2)).toBeCloseTo(1.5 * IN, 6)
  })

  it('handles independent clusters separately', () => {
    // Pair 1 near the origin, pair 2 far away — each anchors on its own.
    const a = panel({ normal: 'z', thickness: 18, position: [0, 0, 0] })
    const b = panel({ normal: 'z', thickness: 18, position: [0, 0, 18.4] })
    const c = panel({ normal: 'z', thickness: 18, position: [5000, 0, 0] })
    const d = panel({ normal: 'z', thickness: 18, position: [5000, 0, 18.4] })
    const out = repairPrecision([a, b, c, d], 'mm', 16)
    expect(Math.abs(faceLow(out[1], 2) - faceHigh(out[0], 2))).toBeLessThan(1e-6)
    expect(Math.abs(faceLow(out[3], 2) - faceHigh(out[2], 2))).toBeLessThan(1e-6)
    // Each cluster keeps its own anchor put.
    expect(out[0].position).toEqual([0, 0, 0])
    expect(out[2].position[0]).toBe(5000)
  })
})
