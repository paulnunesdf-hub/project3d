import { useRef } from 'react'
import { useDesignStore, type Gesture } from '../../store/designStore'

/** A gesture minus the fields the lifecycle owns (`delta` starts at 0, and
 *  `editable` only turns on when the drag is released). */
export type GestureSpec = Omit<Gesture, 'delta' | 'editable'>

/**
 * The corner readout's lifecycle for one drag, shared by the move gizmo and the
 * resize handles.
 *
 * Both were hand-rolling the same three steps and it is easy to get subtly
 * wrong: the readout must open lazily on the *first* real movement (opening it
 * at pointer-down would flash a 0 on every click), stream the delta while the
 * pointer is down, and on release either stay open to be typed into or vanish.
 *
 * Store access goes through `getState()` rather than a subscription on purpose:
 * every one of these runs from a pointer event, and reading at event time
 * avoids acting on a render-time snapshot that a mid-drag update has moved on
 * from.
 */
export function useGesture() {
  const opened = useRef(false)

  return {
    /** Pointer-down: no readout yet for this drag. */
    begin() {
      opened.current = false
    },

    /** Whether a readout was opened at any point during this drag. */
    isOpen() {
      return opened.current
    },

    /**
     * Push the live delta, opening the readout on the first call. `spec` is a
     * thunk so it is only built once — callers close over drag state frozen at
     * pointer-down, and re-evaluating it each frame would be wasted work.
     */
    track(delta: number, spec: () => GestureSpec) {
      const store = useDesignStore.getState()
      if (!opened.current) {
        store.startGesture({ ...spec(), delta: 0, editable: false })
        opened.current = true
      }
      store.setGestureDelta(delta)
    },

    /**
     * Swallow the click the browser synthesises when a drag ends, so releasing
     * over a panel doesn't re-select it. Needed on every real release, whether
     * or not a readout is left behind.
     */
    suppressNextSelect() {
      useDesignStore.getState().armSelectSuppression()
    },

    /**
     * Released after a real movement: keep the readout on screen so an exact
     * amount can be typed into it.
     */
    keepForTyping() {
      const store = useDesignStore.getState()
      store.armSelectSuppression()
      store.setGestureEditable()
    },

    /** Released with nothing worth typing into — drop the readout. */
    dismiss() {
      useDesignStore.getState().clearGesture()
    },
  }
}
