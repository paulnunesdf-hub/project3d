import { useEffect } from 'react'
import { Toolbar } from './components/panels/Toolbar'
import { PropertiesPanel } from './components/panels/PropertiesPanel'
import { MaterialsPanel } from './components/panels/MaterialsPanel'
import { PartsPanel } from './components/panels/PartsPanel'
import { ViewportControls } from './components/viewport/ViewportControls'
import { GestureReadout } from './components/viewport/GestureReadout'
import { WebGLUnavailable } from './components/viewport/WebGLUnavailable'
import { ResizableSidebar } from './components/layout/ResizableSidebar'
import { ConfirmHost } from './components/ui/ConfirmDialog'
import { useDesignStore } from './store/designStore'
import { hasWebGL } from './lib/webgl'
import { Motor } from './ambiente/Motor'
import { useRoom } from './ambiente/store'

/** Whether a keystroke should be left to the focused field rather than treated
 *  as a global shortcut. */
const isTyping = (el: EventTarget | null): boolean =>
  el instanceof HTMLElement &&
  (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)

/* Motor 3D do Plano de Corte CNC: o Panelizer (módulos de chapas) dentro do
   ambiente do Promob (paredes, piso, teto). A barra de módulos e a lateral de
   peças só aparecem quando a página principal pede (opção modulos). */
export default function App() {
  const undo = useDesignStore((s) => s.undo)
  const redo = useDesignStore((s) => s.redo)
  const panels = useDesignStore((s) => s.panels)
  const selected = useDesignStore((s) => s.selectedIds)
  const modulos = useRoom((s) => s.opts.modulos !== false)

  // Ctrl+Z / Ctrl+Y desfazem as peças (módulos); as paredes têm o desfazer da página principal
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || isTyping(e.target)) return
      const key = e.key.toLowerCase()
      if (key === 'z' && !e.shiftKey) {
        e.preventDefault()
        undo()
      } else if (key === 'y' || (key === 'z' && e.shiftKey)) {
        e.preventDefault()
        redo()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [undo, redo])

  return (
    <div className="flex h-full flex-col">
      {modulos && <Toolbar />}
      <main className="flex min-h-0 flex-1">
        <div className="relative min-w-0 flex-1">
          {hasWebGL() ? (
            <>
              <Motor />
              {modulos && <ViewportControls />}
              <GestureReadout />
            </>
          ) : (
            <WebGLUnavailable />
          )}
        </div>
        {modulos && (panels.length > 0 || selected.length > 0) && (
          <ResizableSidebar>
            <PropertiesPanel />
            <MaterialsPanel />
            <PartsPanel />
          </ResizableSidebar>
        )}
      </main>
      <ConfirmHost />
    </div>
  )
}
