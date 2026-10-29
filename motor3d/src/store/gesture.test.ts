import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useDesignStore, type Gesture } from './designStore'

/**
 * The corner readout's store contract.
 *
 * The gesture lifecycle had no coverage at all, and it is the part the move
 * gizmo and the resize handles both drive — a change here breaks dragging in
 * two places at once. Zustand runs outside React, so these exercise the real
 * store directly.
 */

// `armSelectSuppression` self-clears on the next frame; Node has no rAF.
let frames: (() => void)[] = []
beforeEach(() => {
  frames = []
  vi.stubGlobal('requestAnimationFrame', (fn: () => void) => {
    frames.push(fn)
    return frames.length
  })
  useDesignStore.setState({ gesture: null, suppressSelect: false })
})
const nextFrame = () => frames.splice(0).forEach((fn) => fn())

const spec = (over: Partial<Gesture> = {}): Gesture => ({
  kind: 'move',
  label: 'X',
  delta: 0,
  editable: false,
  apply: vi.fn(),
  commit: vi.fn(),
  cancel: vi.fn(),
  ...over,
})

describe('gesture readout', () => {
  it('starts read-only, so a live drag cannot be typed into', () => {
    useDesignStore.getState().startGesture(spec())
    const { gesture } = useDesignStore.getState()
    expect(gesture).not.toBeNull()
    expect(gesture!.editable).toBe(false)
    expect(gesture!.delta).toBe(0)
  })

  it('streams the delta without disturbing the rest of the gesture', () => {
    const g = spec()
    useDesignStore.getState().startGesture(g)
    useDesignStore.getState().setGestureDelta(12.5)

    const after = useDesignStore.getState().gesture!
    expect(after.delta).toBe(12.5)
    expect(after.label).toBe('X')
    expect(after.commit).toBe(g.commit)
  })

  it('becomes editable on release, keeping the delta reached', () => {
    useDesignStore.getState().startGesture(spec())
    useDesignStore.getState().setGestureDelta(-8)
    useDesignStore.getState().setGestureEditable()

    const after = useDesignStore.getState().gesture!
    expect(after.editable).toBe(true)
    expect(after.delta).toBe(-8)
  })

  it('ignores delta and editable updates when no gesture is running', () => {
    useDesignStore.getState().setGestureDelta(99)
    expect(useDesignStore.getState().gesture).toBeNull()
    useDesignStore.getState().setGestureEditable()
    expect(useDesignStore.getState().gesture).toBeNull()
  })

  it('clears', () => {
    useDesignStore.getState().startGesture(spec())
    useDesignStore.getState().clearGesture()
    expect(useDesignStore.getState().gesture).toBeNull()
  })

  it('is dropped when the tool changes mid-drag', () => {
    useDesignStore.getState().startGesture(spec())
    useDesignStore.getState().setTool('measure')
    expect(useDesignStore.getState().gesture).toBeNull()
  })
})

describe('select suppression', () => {
  it('swallows exactly one scene-select, then lets the next through', () => {
    const store = useDesignStore.getState()
    useDesignStore.setState({ panels: [], selectedIds: [] })

    store.armSelectSuppression()
    expect(useDesignStore.getState().suppressSelect).toBe(true)

    // The click the browser synthesises when the drag ends is swallowed.
    useDesignStore.getState().sceneSelect('a')
    expect(useDesignStore.getState().selectedIds).toEqual([])
    expect(useDesignStore.getState().suppressSelect).toBe(false)

    // A genuine click afterwards still selects.
    useDesignStore.getState().sceneSelect('a')
    expect(useDesignStore.getState().selectedIds).toEqual(['a'])
  })

  it('self-clears on the next frame if no click ever arrives', () => {
    useDesignStore.getState().armSelectSuppression()
    expect(useDesignStore.getState().suppressSelect).toBe(true)

    nextFrame()
    expect(useDesignStore.getState().suppressSelect).toBe(false)

    // So a later click is not eaten by a stale arm.
    useDesignStore.setState({ selectedIds: [] })
    useDesignStore.getState().sceneSelect('b')
    expect(useDesignStore.getState().selectedIds).toEqual(['b'])
  })
})
