import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './theme.css'
import App from './App.tsx'
import './ambiente/api'
import { ponte, useRoom } from './ambiente/store'
import { useDesignStore } from './store/designStore'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
// avisa a página principal que o motor está pronto para receber o ambiente
setTimeout(() => ponte().pronto?.(), 0)

// atalhos do Promob (cap. 32): a tecla apertada com o 3D em foco vai para a página principal
window.addEventListener('keydown', (e) => {
  const t = e.target as HTMLElement | null
  if (t?.closest?.('input,select,textarea,[contenteditable="true"]')) return
  const ctrl = e.ctrlKey || e.metaKey, k = e.key.toLowerCase()
  if (useRoom.getState().opts.ferramenta === 'caminhar' && /^(w|a|s|d|arrow)/.test(k)) return
  // Ctrl+Z / Ctrl+Y ficam com as peças do Panelizer quando há peças
  if (ctrl && (k === 'z' || k === 'y') && useDesignStore.getState().panels.length) return
  const usado = ponte().tecla?.({ key: e.key, ctrl, shift: e.shiftKey, alt: e.altKey })
  if (usado || /^f(1|5|6|8|10|11)$/.test(k) || (ctrl && ['a', 'c', 'd', 'v'].includes(k))) e.preventDefault()
})
