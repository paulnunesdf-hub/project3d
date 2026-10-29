import { useDesignStore } from '../../store/designStore'

/** A small banner over the viewport telling the user the next step of the
 *  active tool. Hidden for free-drag tools (`move`) that need no guidance. */
export function ToolHint() {
  const tool = useDesignStore((s) => s.tool)
  const pick = useDesignStore((s) => s.toolPick)

  if (tool === 'move') return null

  const text = (() => {
    switch (tool) {
      case 'move-snap':
        return pick ? 'Agora clique no canto de destino' : 'Clique num canto para pegar'
      case 'measure':
        return pick ? 'Clique no outro canto para medir' : 'Clique no primeiro canto'
      case 'resize':
        return 'Arraste uma face para redimensionar · Alt = os dois lados'
    }
  })()

  return (
    <div className="shrink-0 border-b border-edge bg-accent/10 px-3 py-1.5 text-xs text-accent print:hidden">
      {text}
    </div>
  )
}
