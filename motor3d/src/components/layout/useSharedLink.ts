import { useEffect, useRef } from 'react'
import { clearSharedToken, linkToDesign, sharedToken } from '../../lib/share'
import { useConfirm } from '../ui/useConfirm'
import { useDesignStore } from '../../store/designStore'

/**
 * Opens a design that arrived in the URL.
 *
 * Always asks first: whoever follows a shared link may already have work of
 * their own autosaved, and loading over it without warning would destroy it.
 * The design is decoded *before* prompting so a corrupt link says so rather
 * than asking a question and then failing.
 *
 * The token is stripped from the address bar either way, so a reload doesn't
 * keep re-asking.
 */
export function useSharedLink() {
  const loadDesign = useDesignStore((s) => s.loadDesign)
  const confirm = useConfirm()

  // React 18 mounts effects twice in development; without this the prompt
  // appears two deep.
  const handled = useRef(false)

  useEffect(() => {
    const token = sharedToken()
    if (!token || handled.current) return
    handled.current = true

    void (async () => {
      try {
        const design = await linkToDesign(token)
        clearSharedToken()

        const hasWork = useDesignStore.getState().panels.length > 0
        const ok = await confirm({
          title: 'Open shared design?',
          body: hasWork
            ? `This link holds a design with ${design.panels.length} panel${design.panels.length === 1 ? '' : 's'}. Opening it replaces what you have open — export first if you want to keep it.`
            : `This link holds a design with ${design.panels.length} panel${design.panels.length === 1 ? '' : 's'}.`,
          confirmLabel: 'Open',
          destructive: hasWork,
        })

        if (ok) loadDesign(design)
      } catch {
        clearSharedToken()
        await confirm({
          title: 'That shared link is broken',
          body: "The design couldn't be read from it. It may have been truncated when it was copied.",
          confirmLabel: 'OK',
          dismissOnly: true,
        })
      }
    })()
  }, [confirm, loadDesign])
}
