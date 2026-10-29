import type { ReactNode } from 'react'
import { useDragResize } from '../../hooks/useDragResize'
import { usePersistentState } from '../../hooks/usePersistentState'

const MIN_WIDTH = 260
const MAX_WIDTH = 560
const DEFAULT_WIDTH = 320
const STORAGE_KEY = 'panelizer.ui.sidebar'

interface SidebarPrefs {
  width: number
  collapsed: boolean
}

const DEFAULTS: SidebarPrefs = { width: DEFAULT_WIDTH, collapsed: false }

/** Merge a stored entry over the defaults, so a preference added later still
 *  loads an older, narrower entry. */
const revivePrefs = (stored: unknown): SidebarPrefs => ({ ...DEFAULTS, ...(stored as object) })

/** The right-hand panel: draggable to resize (handle on its left edge) and
 *  collapsible. Width and collapsed state are remembered as a UI preference,
 *  independent of the saved design. */
export function ResizableSidebar({ children }: { children: ReactNode }) {
  const [{ width, collapsed }, setPrefs] = usePersistentState(STORAGE_KEY, DEFAULTS, revivePrefs)

  const setCollapsed = (c: boolean) => setPrefs((p) => ({ ...p, collapsed: c }))

  // The sidebar is pinned to the window's right edge, so its width is however
  // far the cursor sits from that edge — no reference point to capture.
  const startResize = useDragResize({
    min: MIN_WIDTH,
    max: MAX_WIDTH,
    begin: () => (move) => window.innerWidth - move.clientX,
    onWidth: (w) => setPrefs((p) => ({ ...p, width: w })),
  })

  if (collapsed) {
    return (
      <button
        type="button"
        className="cursor-pointer self-start border-y border-l border-edge bg-surface px-1 py-3 text-ink-dim hover:text-ink"
        onClick={() => setCollapsed(false)}
        aria-label="Show panel"
      >
        ‹
      </button>
    )
  }

  return (
    <>
      <div
        className="w-1 shrink-0 cursor-col-resize bg-transparent transition-colors hover:bg-accent"
        role="separator"
        aria-orientation="vertical"
        onMouseDown={startResize}
      />
      <aside className="flex shrink-0 flex-col overflow-y-auto border-l border-edge bg-surface" style={{ width }}>
        <div className="flex justify-start border-b border-edge px-1 py-0.5">
          <button
            type="button"
            className="cursor-pointer border-0 bg-transparent px-1 text-ink-dim hover:text-ink"
            onClick={() => setCollapsed(true)}
            aria-label="Hide panel"
          >
            ›
          </button>
        </div>
        {children}
      </aside>
    </>
  )
}
