/** Clamp `n` into [lo, hi]. */
export const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n))

interface DragResizeOptions {
  min: number
  max: number
  /**
   * Called once on pointer-down; returns the function that turns each
   * subsequent pointer position into the pane's would-be width (px).
   *
   * Two-stage because panes are anchored differently and some need to capture a
   * reference edge *before* anything moves: the sidebar measures inward from the
   * window's right edge (no setup), while the cutlist controls measure outward
   * from their own left edge, which must be read at pointer-down or it would
   * drift as the pane resizes under the cursor.
   */
  begin: (down: React.MouseEvent) => (move: MouseEvent) => number
  onWidth: (width: number) => void
}

/**
 * Drag-to-resize plumbing for a side pane: window-level move/up listeners,
 * text-selection suppression for the duration of the drag, clamping, and
 * teardown. Returns the `onMouseDown` handler for the drag handle.
 */
export function useDragResize({ min, max, begin, onWidth }: DragResizeOptions) {
  return (down: React.MouseEvent) => {
    down.preventDefault()
    const measure = begin(down)

    const onMove = (move: MouseEvent) => onWidth(clamp(measure(move), min, max))
    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      document.body.style.userSelect = ''
    }

    document.body.style.userSelect = 'none'
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }
}
