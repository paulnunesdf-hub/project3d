import { useEffect, useRef, type ReactNode } from 'react'
import { Mesh, Vector3, type Object3D } from 'three'
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { Html, Line } from '@react-three/drei'
import { WebGLPathTracer, GradientEquirectTexture } from 'three-gpu-pathtracer'
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js'
import { OBJExporter } from 'three/examples/jsm/exporters/OBJExporter.js'
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js'
import { hotpoints } from './Ambiente'
import { M } from './geometria'
import { ponte, useRoom } from './store'

/* Calcular distância (4.13), render foto-realista (cap. 15, 17, 18: path tracing
   progressivo do three-gpu-pathtracer), salvar imagem com marca d'água e filtros,
   e exportar o ambiente em 3D (10.5). */

/** Raiz que recebe os cliques da ferramenta Medir (snap nos hotpoints). */
export function Medidor({ children }: { children: ReactNode }) {
  const ferramenta = useRoom((s) => s.opts.ferramenta)
  const set = useRoom((s) => s.set)
  const onClick = (e: ThreeEvent<MouseEvent>) => {
    if (ferramenta !== 'medir' || e.delta > 4) return
    e.stopPropagation()
    let p = e.point.clone()
    // atrai para o hotpoint mais perto (até 6 cm)
    let melhor = 0.06
    for (const h of hotpoints(useRoom.getState().room)) {
      const d = p.distanceTo(new Vector3(...h))
      if (d < melhor) { melhor = d; p = new Vector3(...h) }
    }
    const m = useRoom.getState().medida
    const pt = p.toArray() as [number, number, number]
    set({ medida: !m || m.b ? { a: pt } : { a: m.a, b: pt } })
  }
  return <group onClick={onClick}>{children}</group>
}

export function Medida() {
  const m = useRoom((s) => s.medida)
  const ferramenta = useRoom((s) => s.opts.ferramenta)
  if (!m || ferramenta !== 'medir') return null
  const a = new Vector3(...m.a)
  return (
    <>
      <mesh position={m.a} raycast={() => null}><sphereGeometry args={[0.025, 12, 8]} /><meshBasicMaterial color="#c8372d" depthTest={false} /></mesh>
      {m.b && (
        <>
          <mesh position={m.b} raycast={() => null}><sphereGeometry args={[0.025, 12, 8]} /><meshBasicMaterial color="#c8372d" depthTest={false} /></mesh>
          <Line points={[m.a, m.b]} color="#c8372d" lineWidth={2.5} depthTest={false} />
          <Html position={a.clone().lerp(new Vector3(...m.b), 0.5).toArray()} center style={{ pointerEvents: 'none' }}>
            <div className="cota3d grande">
              {Math.round(a.distanceTo(new Vector3(...m.b)) / M)} mm
              <small>
                ΔX {Math.round(Math.abs(m.b[0] - m.a[0]) / M)} · ΔY {Math.round(Math.abs(m.b[2] - m.a[2]) / M)} · ΔZ {Math.round(Math.abs(m.b[1] - m.a[1]) / M)}
              </small>
            </div>
          </Html>
        </>
      )}
    </>
  )
}

/** Render foto-realista: cada quadro soma uma amostra até chegar na qualidade pedida. */
export function Render() {
  const render = useRoom((s) => s.render)
  const set = useRoom((s) => s.set)
  const { gl, scene, camera, setFrameloop, invalidate } = useThree()
  const pt = useRef<WebGLPathTracer | null>(null)
  const fundoAntes = useRef<unknown>(null)

  useEffect(() => {
    if (!render?.ativo) return
    let vivo = true
    const escondidos: Object3D[] = []
    const t = new WebGLPathTracer(gl)
    t.renderScale = render.escala || 1
    t.tiles.set(2, 2)
    t.minSamples = 1
    t.fadeDuration = 0
    pt.current = t
    // céu em degradê para iluminar quando não houver ambiente
    const ceu = new GradientEquirectTexture()
    ceu.topColor.set('#cfe0f5')
    ceu.bottomColor.set('#ffffff')
    ceu.update()
    fundoAntes.current = scene.environment
    if (!scene.environment) scene.environment = ceu
    // espera as linhas e marcadores sumirem antes de montar a cena
    requestAnimationFrame(() => {
      if (!vivo) return
      try {
        // o path tracer só entende malhas com material de cor: linhas, cotas e marcadores saem do render
        scene.traverse((o) => {
          const m = (o as unknown as { material?: { color?: unknown } | { color?: unknown }[] }).material
          const ruim = (o as unknown as { isLine?: boolean; isPoints?: boolean; isSprite?: boolean }).isLine || (o as unknown as { isPoints?: boolean }).isPoints || (o as unknown as { isSprite?: boolean }).isSprite || (m && (Array.isArray(m) ? m.some((x) => !x?.color) : !m.color))
          if (ruim && o.visible) { o.visible = false; escondidos.push(o) }
        })
        t.setScene(scene, camera)
        setFrameloop('always')
      } catch (e) {
        ponte().aviso?.('O render não abriu neste computador: ' + (e as Error).message)
        set({ render: null })
      }
    })
    return () => {
      escondidos.forEach((o) => { o.visible = true })
      vivo = false
      t.dispose()
      pt.current = null
      if (scene.environment === ceu) scene.environment = fundoAntes.current as never
      setFrameloop('demand')
      invalidate()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [render?.ativo])

  useFrame(() => {
    const t = pt.current, r = useRoom.getState().render
    if (!t || !r?.ativo || !t.scene) return
    if (t.samples < r.alvo) {
      t.renderSample()
      if (Math.floor(t.samples) !== r.amostras) set({ render: { ...r, amostras: Math.floor(t.samples) } })
    } else if (gl.getContext()) {
      t.renderSample() // mantém a imagem pronta na tela
    }
  }, 1)
  return null
}

/** Imagem da tela com filtros e marca d'água (Render Up 17.4 e 17.7). */
export function salvarImagem(canvas: HTMLCanvasElement, cfg: { marca?: string; brilho?: number; contraste?: number; saturacao?: number; largura?: number }) {
  const w = cfg.largura || canvas.width
  const h = Math.round((canvas.height / canvas.width) * w)
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const g = c.getContext('2d')!
  g.filter = `brightness(${cfg.brilho ?? 100}%) contrast(${cfg.contraste ?? 100}%) saturate(${cfg.saturacao ?? 100}%)`
  g.drawImage(canvas, 0, 0, w, h)
  g.filter = 'none'
  if (cfg.marca) {
    g.font = `${Math.round(h / 28)}px system-ui, sans-serif`
    g.fillStyle = 'rgba(255,255,255,.75)'
    g.strokeStyle = 'rgba(0,0,0,.35)'
    g.textAlign = 'right'
    g.strokeText(cfg.marca, w - h / 40, h - h / 40)
    g.fillText(cfg.marca, w - h / 40, h - h / 40)
  }
  c.toBlob((b) => b && ponte().baixar?.('render-ambiente.png', b), 'image/png')
}

/** Exporta o ambiente (paredes, piso, teto, itens e peças) em GLB, OBJ ou STL. */
export async function exportar3D(scene: Object3D, fmt: string) {
  const raiz = scene.getObjectByName('exportavel') || scene
  const copia = raiz.clone(true)
  // só malhas de verdade: linhas, cotas, marcadores e prévias ficam de fora
  const tirar: Object3D[] = []
  copia.traverse((o) => {
    const x = o as Object3D & { isLine?: boolean; isPoints?: boolean }
    if (x.isLine || x.isPoints || o.userData?.naoExportar || ((o as Mesh).isMesh && !o.visible)) tirar.push(o)
  })
  for (const o of tirar) o.parent?.remove(o)
  if (fmt === 'glb') {
    const r = await new GLTFExporter().parseAsync(copia, { binary: true })
    ponte().baixar?.('ambiente.glb', new Blob([r as ArrayBuffer], { type: 'model/gltf-binary' }))
  } else if (fmt === 'obj') {
    ponte().baixar?.('ambiente.obj', new Blob([new OBJExporter().parse(copia)], { type: 'text/plain' }))
  } else {
    const r = new STLExporter().parse(copia, { binary: true }) as unknown as DataView
    ponte().baixar?.('ambiente.stl', new Blob([r.buffer as ArrayBuffer], { type: 'model/stl' }))
  }
}

/** Menu do botão direito sobre um item do ambiente (opções do Promob). */
export function MenuContexto() {
  const menu = useRoom((s) => s.menu)
  const room = useRoom((s) => s.room)
  const set = useRoom((s) => s.set)
  useEffect(() => {
    if (!menu) return
    const fecha = () => set({ menu: null })
    const t = setTimeout(() => window.addEventListener('pointerdown', fecha, { once: true }), 0)
    return () => { clearTimeout(t); window.removeEventListener('pointerdown', fecha) }
  }, [menu, set])
  if (!menu) return null
  const s = menu.sel
  const w = s.t === 'parede' ? room.paredes.find((x) => x.id === s.id) : null
  const itens: [string, string][] =
    s.t === 'parede'
      ? [
          [w?.rebaixada ? 'levantar' : 'rebaixar', w?.rebaixada ? 'Levantar parede' : 'Rebaixar'],
          ['transparente', w?.transp ? 'Tirar transparência' : 'Transparente'],
          ['vistaRapida', 'Vista rápida'],
          ['construtor', 'Construir armário nesta parede'],
          ['segmentar', 'Segmentar'],
          ['adicionarVertice', 'Adicionar vértice no meio'],
          ['faixas', 'Editar faixas…'],
          ['editarParedes', 'Editar paredes (planta 2D)'],
          ['aproximar', 'Aproximar'],
          ['excluirSegmento', 'Excluir: segmento'],
          ['manterSelecionado', 'Excluir: manter selecionado'],
          ['excluirTudo', 'Excluir: tudo'],
        ]
      : s.t === 'piso'
        ? [['construtor', 'Construir armário'], ['ajustarPiso', 'Ajustar limites do piso'], ['grid', 'Editar grid do piso…'], ['regiao', 'Nova região no piso'], ['material', 'Material…']]
        : s.t === 'armario'
          ? [['construtor', 'Construtor de Armários… (A)'], ['enviarArmario', 'Enviar peças ao projeto'], ['inverter', 'Inverter (I)'], ['substituir', 'Substituir estrutura… (S)'], ['aproximar', 'Aproximar (F5)'], ['duplicar', 'Duplicar (Ctrl+D)'], ['ocultar', 'Ocultar (O)'], ['excluir', 'Excluir']]
        : s.t === 'abertura'
          ? [['centralizar', 'Centralizar na parede'], ['inverter', 'Inverter lado (I)'], ['substituir', 'Substituir tipo (S)'], ['aproximar', 'Aproximar'], ['excluir', 'Excluir']]
          : [['centralizarX', 'Centralizar X'], ['centralizarY', 'Centralizar Y'], ['aproximar', 'Aproximar'], ['duplicar', 'Duplicar'], ['excluir', 'Excluir']]
  return (
    <div className="menu3d" style={{ left: menu.x, top: menu.y }} onPointerDown={(e) => e.stopPropagation()}>
      {itens.map(([k, l]) => (
        <button key={k} onClick={() => { set({ menu: null }); ponte().acao?.(k, s) }}>{l}</button>
      ))}
    </div>
  )
}
