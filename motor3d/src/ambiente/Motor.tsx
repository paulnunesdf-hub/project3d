import { useEffect, useRef, useState } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { GizmoHelper, GizmoViewport } from '@react-three/drei'
import { useDesignStore } from '../store/designStore'
import { Scene } from '../components/viewport/Scene'
import { MarqueePicker } from '../components/viewport/MarqueePicker'
import { Ambiente } from './Ambiente'
import { Extras } from './Extras'
import { Camera } from './Camera'
import { Iluminacao } from './Apresentacao'
import { Medidor, Medida, MenuContexto, Render, exportar3D, salvarImagem } from './Ferramentas'
import { ponte, useRoom } from './store'

/* O motor 3D: o Viewport do Panelizer (react-three-fiber) com o ambiente do
   Promob por baixo. Os módulos (painéis do Panelizer) continuam com as
   ferramentas dele: mover com encaixe, redimensionar, medir, esconder. */

let pegaTela: (() => { canvas: HTMLCanvasElement; scene: import('three').Scene; camera: import('three').Camera; controls: unknown }) | null = null
export const tela = () => pegaTela?.()

function Ganchos() {
  const { gl, scene, invalidate, get } = useThree()
  const room = useRoom((s) => s.room)
  const opts = useRoom((s) => s.opts)
  useEffect(() => {
    pegaTela = () => ({ canvas: gl.domElement, scene, camera: get().camera, controls: get().controls })
  }, [gl, scene, get])
  useEffect(() => { invalidate() }, [room, opts, invalidate])
  return null
}

/** Zoom Window (tecla W): arrasta um retângulo sobre o 3D e a câmera aproxima nele. */
function ZoomJanela() {
  const nav = useRoom((s) => s.opts.nav)
  const comando = useRoom((s) => s.comando)
  const [r, setR] = useState<null | { x0: number; y0: number; x1: number; y1: number }>(null)
  const caixa = useRef<HTMLDivElement>(null)
  if (nav !== 'janela') return null
  const pt = (e: React.PointerEvent) => { const b = caixa.current!.getBoundingClientRect(); return [(e.clientX - b.left) / b.width, (e.clientY - b.top) / b.height] }
  return (
    <div ref={caixa} style={{ position: 'absolute', inset: 0, cursor: 'crosshair', zIndex: 5 }}
      onPointerDown={(e) => { const [x, y] = pt(e); (e.target as HTMLElement).setPointerCapture(e.pointerId); setR({ x0: x, y0: y, x1: x, y1: y }) }}
      onPointerMove={(e) => { if (!r) return; const [x, y] = pt(e); setR({ ...r, x1: x, y1: y }) }}
      onPointerUp={() => { if (r) comando('zoomJanela', r); setR(null); ponte().acao?.('navFim', null) }}>
      {r && <div style={{ position: 'absolute', left: `${Math.min(r.x0, r.x1) * 100}%`, top: `${Math.min(r.y0, r.y1) * 100}%`, width: `${Math.abs(r.x1 - r.x0) * 100}%`, height: `${Math.abs(r.y1 - r.y0) * 100}%`, border: '1.5px solid #c8372d', background: 'rgba(200,55,45,.08)' }} />}
    </div>
  )
}

export function Motor() {
  const select = useDesignStore((s) => s.select)
  const render = useRoom((s) => s.render)
  const opts = useRoom((s) => s.opts)
  const medida = useRoom((s) => s.medida)
  const set = useRoom((s) => s.set)
  return (
    <div className="absolute inset-0">
      <Canvas
        frameloop="demand"
        shadows
        dpr={[1, 2]}
        gl={{ preserveDrawingBuffer: true, antialias: true }}
        onPointerMissed={(e) => {
          if (e.type !== 'click') return
          select(null)
          if (opts.ferramenta === 'navegar' && !opts.cons?.ativo && !opts.inserir && (!opts.nav || opts.nav === 'sel')) ponte().selecionar?.(null)
        }}
      >
        <Ganchos />
        <Camera />
        <Iluminacao />
        <Medidor>
          <group name="exportavel">
            <Ambiente />
            <Extras />
            <Scene />
          </group>
        </Medidor>
        <Medida />
        <MarqueePicker />
        <Render />
        {!render?.ativo && (
          <GizmoHelper alignment="bottom-right" margin={[64, 64]}>
            <GizmoViewport labelColor="white" axisHeadScale={1} labels={['X', 'Z', 'Y']} />
          </GizmoHelper>
        )}
      </Canvas>
      <MenuContexto />
      <ZoomJanela />
      {render?.ativo && (
        <div className="hud3d">
          Renderizando: {render.amostras} de {render.alvo} amostras
          {render.amostras >= render.alvo ? ' (pronto)' : ''}
          <button onClick={() => { const t = tela(); if (t) salvarImagem(t.canvas, useRoom.getState().opts.imagem || {}) }}>Salvar imagem</button>
          <button onClick={() => { set({ render: null }); ponte().acao?.('renderFim', null) }}>Fechar render</button>
        </div>
      )}
      {opts.ferramenta === 'medir' && (
        <div className="hud3d">
          {medida?.b ? 'Clique de novo para outra medida.' : medida ? 'Clique no segundo ponto.' : 'Calcular distância: clique no primeiro ponto (atrai para os vértices).'}
        </div>
      )}
      {opts.ferramenta === 'caminhar' && <div className="hud3d">Caminhar: clique no 3D para olhar com o mouse, W A S D ou setas para andar, Esc solta o mouse.</div>}
      {opts.cons?.ativo && <div className="hud3d">Construir paredes: clique no piso para cada vértice. Botão direito termina.</div>}
      {opts.inserir && <div className="hud3d">{/^(arm|item):/.test(opts.inserir) ? 'Inserir módulo: clique na parede (ele encosta nela) ou no piso.' : `Inserir ${opts.inserir}: ` + (['porta', 'janela', 'vao', 'correr', 'imagem'].includes(opts.inserir) ? 'passe o mouse numa parede (ela fica amarela) e clique.' : 'clique no piso onde o item fica.')}</div>}
      {opts.nav === 'janela' && <div className="hud3d">Zoom Window: arraste um retângulo sobre a região que quer aproximar.</div>}
    </div>
  )
}

export { exportar3D, salvarImagem }
