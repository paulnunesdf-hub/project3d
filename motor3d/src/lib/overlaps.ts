import type { Panel } from '../types/panel'
import { JOINT_TOL, contactRect, panelBounds } from './bounds'

/** A box (mm) where two panels occupy the same space. */
export interface OverlapBox {
  center: [number, number, number]
  size: [number, number, number]
}

/**
 * Every region where two panels interpenetrate. This is purely informational —
 * an overlap marks where a real joint lives (a butt is the default; a miter or
 * dovetail is up to the builder). The app only tracks panel length, so the
 * highlight is a visual cue, not an error.
 *
 * Interpenetration shallower than {@link JOINT_TOL} is ignored: a butt joint
 * that rounds a hair past flush leaves a sliver that isn't a real overlap.
 */
export function overlapBoxes(panels: Panel[]): OverlapBox[] {
  const bounds = panels.map((p) => panelBounds(p))
  const boxes: OverlapBox[] = []

  for (let i = 0; i < panels.length; i++) {
    for (let j = i + 1; j < panels.length; j++) {
      const { lo, hi } = contactRect(bounds[i], bounds[j])
      if ([0, 1, 2].some((axis) => hi[axis] - lo[axis] < JOINT_TOL)) continue

      boxes.push({
        center: [0, 1, 2].map((a) => (lo[a] + hi[a]) / 2) as [number, number, number],
        size: [0, 1, 2].map((a) => hi[a] - lo[a]) as [number, number, number],
      })
    }
  }

  return boxes
}
