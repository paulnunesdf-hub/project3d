import { useMemo, useState, type ReactNode } from 'react'
import { BoxGeometry, type BufferGeometry, Color, type MeshStandardMaterial, Vector3 } from 'three'
import { Edges, Html, Line } from '@react-three/drei'
import type { ThreeEvent } from '@react-three/fiber'
import {
  caixaAbertura, fatia, geoForma, M, paredeCorpo, placa, recortar, w3, wComp, wPonto, wOff,
} from './geometria'
import { material } from './materiais'
import { camadaLivre, camadaOn, ponte, useRoom, type Abertura, type Armario3D, type Fill, type Geometria, type Parede, type Sel } from './store'

/* Paredes, piso, teto, aberturas e geometrias do ambiente, desenhados pelo
   three.js dentro do motor do Panelizer (react-three-fiber). */

const COR_SEL = '#2f6db5'
const COR_INSERIR = '#f2d64b'

export function estilo(fill: Fill) {
  return {
    texturas: fill === 'texturas' || fill === 'texturas_linhas' || fill === 'apresentacao',
    linhas: fill === 'texturas_linhas' || fill === 'linhas' || fill === 'hide' || fill === 'hidepb' || fill === 'transp',
    branco: fill === 'hide',
    preto: fill === 'hidepb',
    arame: fill === 'arame',
    caixa: fill === 'caixa',
    transparente: fill === 'transp',
  }
}

const igual = (a: Sel | null | undefined, b: Sel) => !!a && a.t === b.t && a.id === b.id
const mesmo = (a: Sel | null, b: Sel) => igual(a, b) || !!useRoom.getState().opts.multi?.some((m) => igual(m, b))

/** Onde o botão direito foi apertado: se o mouse andou (girando a câmera), não abre o menu. */
const direito = { x: 0, y: 0 }
if (typeof window !== 'undefined') window.addEventListener('pointerdown', (e) => { if (e.button === 2) { direito.x = e.clientX; direito.y = e.clientY } }, true)

/** Clique, duplo clique e botão direito iguais para todo item do ambiente. */
export function useCliques(sel: Sel, camada: string) {
  const opts = useRoom((s) => s.opts)
  const set = useRoom((s) => s.set)
  const livre = camadaLivre(opts, camada)
  return {
    onClick: (e: ThreeEvent<MouseEvent>) => {
      if (e.delta > 4 || !livre || opts.ferramenta !== 'navegar' || opts.cons?.ativo || opts.inserir || (opts.nav && opts.nav !== 'sel')) return
      e.stopPropagation()
      ponte().selecionar?.(sel, { ctrl: e.nativeEvent.ctrlKey || e.nativeEvent.metaKey })
    },
    onDoubleClick: (e: ThreeEvent<MouseEvent>) => {
      if (!livre) return
      e.stopPropagation()
      ponte().acao?.('duplo', sel)
    },
    onContextMenu: (e: ThreeEvent<MouseEvent>) => {
      if (!livre || opts.cons?.ativo) return
      e.stopPropagation()
      e.nativeEvent.preventDefault()
      if (Math.hypot(e.nativeEvent.clientX - direito.x, e.nativeEvent.clientY - direito.y) > 5) return
      ponte().selecionar?.(sel)
      set({ menu: { x: e.nativeEvent.clientX, y: e.nativeEvent.clientY, sel } })
    },
  }
}

/** Uma peça do ambiente já no estilo do modo de preenchimento. */
function Peca({ geo, mat, cor, sel, camada, children, hover, extra }: {
  geo: BufferGeometry; mat: MeshStandardMaterial; cor: string; sel: Sel; camada: string; children?: ReactNode
  hover?: boolean; extra?: Record<string, unknown>
}) {
  const opts = useRoom((s) => s.opts)
  const ev = useCliques(sel, camada)
  const e = estilo(opts.fill)
  const on = mesmo(opts.sel, sel)
  if (e.caixa) {
    geo.computeBoundingBox()
    const b = geo.boundingBox!
    return (
      <lineSegments position={b.getCenter(new Vector3()).toArray()}>
        <edgesGeometry args={[new BoxGeometry(b.max.x - b.min.x, b.max.y - b.min.y, b.max.z - b.min.z)]} />
        <lineBasicMaterial color={on ? COR_SEL : '#33404f'} />
      </lineSegments>
    )
  }
  const linha = on ? COR_SEL : e.preto ? '#ffffff' : e.branco ? new Color(cor).multiplyScalar(0.6).getStyle() : '#3a3f46'
  if (hover) mat.emissive = new Color(COR_INSERIR), (mat.emissiveIntensity = 0.45)
  return (
    <mesh geometry={geo} material={mat} castShadow receiveShadow userData={{ sel, camada }} {...ev} {...extra}>
      {(e.linhas || on) && <Edges threshold={20} color={linha} />}
      {children}
    </mesh>
  )
}

function useMat(tipo: string | undefined, cor: string | undefined, grupo: string, sel: Sel, transp?: boolean) {
  const opts = useRoom((s) => s.opts)
  const e = estilo(opts.fill)
  const on = mesmo(opts.sel, sel)
  return useMemo(() => {
    const m = material(tipo, cor, { texturas: e.texturas, branco: e.branco, preto: e.preto, sel: on, transparente: transp || e.transparente }, grupo)
    if (e.arame) m.wireframe = true
    return m
  }, [tipo, cor, grupo, on, transp, e.texturas, e.branco, e.preto, e.transparente, e.arame])
}

/* ---------------- paredes ---------------- */

function ParedeMesh({ w }: { w: Parede }) {
  const room = useRoom((s) => s.room)
  const opts = useRoom((s) => s.opts)
  const autoBaixas = useRoom((s) => s.autoBaixas)
  const [hover, setHover] = useState<number | null>(null)
  const sel: Sel = { t: 'parede', id: w.id }
  const baixa = !!w.rebaixada || (opts.autoRebaixar && autoBaixas.includes(w.id))
  const furos = room.aberturas.filter((a) => a.parede === w.id)
  const perf = room.geometrias.filter((g) => g.perfurar)
  const chave = JSON.stringify([w, furos, perf, baixa])
  const partes = useMemo(() => {
    let g = paredeCorpo(w, baixa ? 100 : undefined)
    const cortes = [...furos.map((a) => caixaAbertura(w, a)), ...perf.map((p) => geoForma(p))]
    try { g = recortar(g, cortes) } catch { /* se o recorte falhar, a parede fica inteira */ }
    const fx = (w.faixas || []).filter((f) => f.ate > 0).sort((a, b) => a.ate - b.ate)
    if (!fx.length || baixa) return [{ geo: g, mat: w.mat, cor: w.cor }]
    const out: { geo: BufferGeometry; mat?: string; cor?: string }[] = []
    let de = 0
    for (const f of fx) {
      try { out.push({ geo: fatia(g, de, f.ate), mat: f.mat, cor: f.cor }) } catch { /* faixa vazia */ }
      de = f.ate
    }
    try { out.push({ geo: fatia(g, de, 100000), mat: w.mat, cor: w.cor }) } catch { /* nada acima */ }
    return out
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chave])
  const insere = !!opts.inserir && ['porta', 'janela', 'vao', 'correr', 'imagem'].includes(opts.inserir)
  const insereArm = !!opts.inserir && /^(arm|item):/.test(opts.inserir)
  const extra = insereArm
    ? {
        onClick: (e: ThreeEvent<MouseEvent>) => {
          if (e.delta > 4) return
          e.stopPropagation()
          ponte().inserir?.(opts.inserir!, { parede: w.id, s: sAoLongo(w, e.point.x / M, -e.point.z / M), x: Math.round(e.point.x / M), y: Math.round(-e.point.z / M) })
        },
      }
    : insere
    ? {
        onPointerMove: (e: ThreeEvent<PointerEvent>) => {
          e.stopPropagation()
          setHover(sAoLongo(w, e.point.x / M, -e.point.z / M))
        },
        onPointerOut: () => setHover(null),
        onClick: (e: ThreeEvent<MouseEvent>) => {
          if (e.delta > 4) return
          e.stopPropagation()
          ponte().inserir?.(opts.inserir!, { parede: w.id, s: sAoLongo(w, e.point.x / M, -e.point.z / M), z: e.point.y / M })
        },
      }
    : baixa && w.rebaixada
      ? { onClick: (e: ThreeEvent<MouseEvent>) => { if (e.delta > 4) return; e.stopPropagation(); ponte().acao?.('levantar', sel) } }
      : undefined
  return (
    <group>
      {partes.map((p, i) => (
        <ParedeParte key={i} geo={p.geo} tipo={p.mat} cor={p.cor} w={w} sel={sel} hover={hover !== null} extra={extra} />
      ))}
      {insere && hover !== null && <PreviaAbertura w={w} s={hover} tipo={opts.inserir!} />}
    </group>
  )
}

function ParedeParte({ geo, tipo, cor, w, sel, hover, extra }: { geo: BufferGeometry; tipo?: string; cor?: string; w: Parede; sel: Sel; hover: boolean; extra?: Record<string, unknown> }) {
  const vidro = w.tipo === 'vidro'
  const m = useMat(vidro ? 'vidro' : tipo, cor, 'parede', sel, !!w.transp)
  return <Peca geo={geo} mat={m} cor={cor || '#c9c1b3'} sel={sel} camada="paredes" hover={hover} extra={extra} />
}

/** Distância ao longo da parede do ponto (x, y) da planta. */
export function sAoLongo(w: Parede, x: number, y: number) {
  const L = wComp(w)
  let melhor = 0, d = Infinity
  for (let s = 0; s <= L; s += Math.max(5, L / 200)) {
    const q = wPonto(w, s).p
    const k = Math.hypot(q[0] - x, q[1] - y)
    if (k < d) { d = k; melhor = s }
  }
  return Math.round(melhor)
}

const TAM_PADRAO: Record<string, [number, number, number]> = { porta: [800, 2100, 0], janela: [1200, 1000, 1100], vao: [900, 2100, 0], correr: [1600, 2100, 0], imagem: [800, 600, 1200] }

function PreviaAbertura({ w, s, tipo }: { w: Parede; s: number; tipo: string }) {
  const [larg, alt, afast] = TAM_PADRAO[tipo] || [800, 2100, 0]
  const geo = useMemo(() => caixaAbertura(w, { id: 'p', parede: w.id, tipo: 'porta', pos: s - larg / 2, larg, alt, afast }, 60), [w, s, larg, alt, afast])
  return (
    <mesh geometry={geo} raycast={() => null}>
      <meshBasicMaterial color="#2e9d4b" transparent opacity={0.35} depthWrite={false} />
      <Edges color="#1f7a38" />
    </mesh>
  )
}

/* ---------------- aberturas (porta, janela, vão, porta de correr) ---------------- */

function AberturaMesh({ a, w }: { a: Abertura; w: Parede }) {
  const sel: Sel = { t: 'abertura', id: a.id }
  const opts = useRoom((s) => s.opts)
  const ev = useCliques(sel, 'aberturas')
  const on = mesmo(opts.sel, sel)
  const m = useMat(a.mat || 'madeira', a.cor, 'abertura', sel)
  const vidro = useMat('vidro', undefined, 'abertura', sel)
  const { p, t } = wPonto(w, a.pos + a.larg / 2)
  const [o0, o1] = wOff(w)
  const meio = (o0 + o1) / 2
  const n: [number, number] = [-t[1], t[0]]
  const c = w3(p[0] + n[0] * meio, p[1] + n[1] * meio, a.afast)
  const ang = Math.atan2(t[1], t[0])
  const E = w.esp * M, L = a.larg * M, H = a.alt * M, b = 0.07 // batente de 7 cm
  const box = (x: number, y: number, z: number, sx: number, sy: number, sz: number, mm = m, k = '') => (
    <mesh key={k + x + y + z} position={[x, y, z]} material={mm} castShadow receiveShadow userData={{ sel, camada: 'aberturas' }} {...ev}>
      <boxGeometry args={[sx, sy, sz]} />
      {(estilo(opts.fill).linhas || on) && <Edges threshold={20} color={on ? COR_SEL : '#3a3f46'} />}
    </mesh>
  )
  const pecas: ReactNode[] = []
  if (a.tipo !== 'vao') {
    // batente: duas laterais e a travessa de cima (a janela tem também a de baixo)
    pecas.push(box(-L / 2 + b / 2, H / 2, 0, b, H, E + 0.01, m, 'l'), box(L / 2 - b / 2, H / 2, 0, b, H, E + 0.01, m, 'r'), box(0, H - b / 2, 0, L, b, E + 0.01, m, 't'))
    if (a.tipo === 'janela') pecas.push(box(0, b / 2, 0, L, b, E + 0.03, m, 'b'))
  }
  if (a.tipo === 'porta') {
    pecas.push(box(0, (H - b) / 2, 0, L - 2 * b, H - b - 0.01, 0.035, m, 'f'))
    pecas.push(
      <mesh key="maq" position={[(a.inv ? -1 : 1) * (L / 2 - b - 0.07), 1.05, 0.03]} rotation={[Math.PI / 2, 0, 0]} raycast={() => null}>
        <cylinderGeometry args={[0.012, 0.012, 0.09, 12]} />
        <meshStandardMaterial color="#9aa0a6" metalness={0.9} roughness={0.3} />
      </mesh>,
    )
  }
  if (a.tipo === 'janela') {
    pecas.push(box(-(L - 2 * b) / 4, H / 2, 0, (L - 2 * b) / 2 - 0.01, H - 2 * b, 0.01, vidro, 'v1'), box((L - 2 * b) / 4, H / 2, 0.012, (L - 2 * b) / 2 - 0.01, H - 2 * b, 0.01, vidro, 'v2'))
    pecas.push(box(0, H / 2, 0.006, 0.04, H - 2 * b, 0.04, m, 'mo'))
  }
  if (a.tipo === 'correr') {
    pecas.push(box(-(L - 2 * b) / 4, (H - b) / 2, -0.015, (L - 2 * b) / 2 + 0.03, H - b - 0.01, 0.025, vidro, 'c1'), box((L - 2 * b) / 4, (H - b) / 2, 0.015, (L - 2 * b) / 2 + 0.03, H - b - 0.01, 0.025, vidro, 'c2'))
  }
  return (
    <group position={c} rotation={[0, ang, 0]}>
      {pecas}
      {a.tipo === 'vao' && on && (
        <lineSegments position={[0, H / 2, 0]}>
          <edgesGeometry args={[new BoxGeometry(L, H, E)]} />
          <lineBasicMaterial color={COR_SEL} />
        </lineSegments>
      )}
      {on && opts.cotas && <CotasAbertura a={a} w={w} />}
    </group>
  )
}

/** Cotas anterior, posterior, inferior e superior da abertura selecionada (manual 3.7). */
function CotasAbertura({ a, w }: { a: Abertura; w: Parede }) {
  const L = wComp(w)
  const h = Math.min(+w.alt, +(w.altFim ?? w.alt))
  const xl = -a.larg / 2 * M, xr = a.larg / 2 * M, z = (w.esp / 2 + 30) * M
  const ant = a.pos, post = L - a.pos - a.larg, inf = a.afast, sup = h - a.afast - a.alt
  const yMeio = a.alt / 2 * M
  const cota = (de: [number, number, number], ate: [number, number, number], v: number, k: string) => (
    <group key={k}>
      <Line points={[de, ate]} color="#c8372d" lineWidth={1.5} />
      <Html position={[(de[0] + ate[0]) / 2, (de[1] + ate[1]) / 2, (de[2] + ate[2]) / 2]} center style={{ pointerEvents: 'none' }}>
        <div className="cota3d">{Math.round(v)}</div>
      </Html>
    </group>
  )
  return (
    <>
      {cota([xl - ant * M, yMeio, z], [xl, yMeio, z], ant, 'a')}
      {cota([xr, yMeio, z], [xr + post * M, yMeio, z], post, 'p')}
      {cota([0, a.alt * M, z], [0, (a.alt + sup) * M, z], sup, 's')}
      {inf > 0 && cota([0, -inf * M + 0, z], [0, 0, z], inf, 'i2')}
    </>
  )
}

/* ---------------- piso, teto e geometrias ---------------- */

function Piso() {
  const room = useRoom((s) => s.room)
  const opts = useRoom((s) => s.opts)
  const p = room.piso
  const sel: Sel = { t: 'piso' }
  const geo = useMemo(() => placa([[p.x, p.y], [p.x + p.w, p.y], [p.x + p.w, p.y + p.h], [p.x, p.y + p.h]], -(p.esp || 5), p.esp || 5), [p.x, p.y, p.w, p.h, p.esp])
  const m = useMat(p.mat, p.cor, 'piso', sel)
  const insere = !!opts.inserir && !['porta', 'janela', 'vao', 'correr'].includes(opts.inserir)
  const extra = insere
    ? {
        onClick: (e: ThreeEvent<MouseEvent>) => {
          if (e.delta > 4) return
          e.stopPropagation()
          ponte().inserir?.(opts.inserir!, { x: Math.round(e.point.x / M), y: Math.round(-e.point.z / M), z: 0 })
        },
      }
    : undefined
  if (!camadaOn(opts, 'piso')) return null
  return <Peca geo={geo} mat={m} cor={p.cor || '#d9cfbf'} sel={sel} camada="piso" extra={extra} />
}

function TetoMesh({ id }: { id: string }) {
  const t = useRoom((s) => s.room.tetos.find((x) => x.id === id))!
  const sel: Sel = { t: 'teto', id }
  const geo = useMemo(() => placa(t.pts, +t.afast || 2600, +t.esp || 150), [t.pts, t.afast, t.esp])
  const m = useMat('gesso', t.cor, 'teto', sel)
  return <Peca geo={geo} mat={m} cor={t.cor || '#f4f4f2'} sel={sel} camada="teto" />
}

function GeoMesh({ g }: { g: Geometria }) {
  const sel: Sel = { t: 'geo', id: g.id }
  const opts = useRoom((s) => s.opts)
  const geo = useMemo(() => geoForma(g), [g])
  const grupo = g.tipo === 'coluna' ? 'parede' : g.tipo === 'rebaixo' ? 'teto' : g.tipo === 'regiao' ? 'piso' : 'geo'
  const m = useMat(g.mat || (g.tipo === 'coluna' ? 'pintura' : g.tipo === 'rebaixo' ? 'gesso' : undefined), g.cor, grupo, sel, g.perfurar)
  if (g.perfurar && !mesmo(opts.sel, sel)) return null // perfurante só aparece quando selecionado
  return <Peca geo={geo} mat={m} cor={g.cor || '#d9b380'} sel={sel} camada={g.tipo === 'coluna' ? 'paredes' : 'geometrias'} />
}

/** Plano invisível do piso, para construir paredes e inserir itens clicando no 3D. */
function PlanoConstrucao() {
  const opts = useRoom((s) => s.opts)
  if (!opts.cons?.ativo) return null
  const ev = (e: ThreeEvent<PointerEvent | MouseEvent>, f: 'clique' | 'move') => {
    const x = Math.round(e.point.x / M), y = Math.round(-e.point.z / M)
    if (f === 'move') ponte().movePiso?.(x, y)
    else { e.stopPropagation(); if ((e as ThreeEvent<MouseEvent>).delta > 4) return; ponte().cliquePiso?.(x, y, (e.nativeEvent as MouseEvent).button) }
  }
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]} onPointerMove={(e) => ev(e, 'move')} onClick={(e) => ev(e, 'clique')}
      onContextMenu={(e) => { e.stopPropagation(); e.nativeEvent.preventDefault(); ponte().cliquePiso?.(0, 0, 2) }}>
      <planeGeometry args={[400, 400]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
  )
}

function PreviaConstrucao() {
  const c = useRoom((s) => s.opts.cons)
  if (!c?.ativo || !c.pts.length) return null
  const pts = [...c.pts, ...(c.prev ? [c.prev] : [])].map((p) => w3(p[0], p[1], 5))
  return (
    <>
      {pts.length > 1 && <Line points={pts} color="#c8372d" lineWidth={2.5} dashed={false} />}
      {c.pts.map((p, i) => (
        <mesh key={i} position={w3(p[0], p[1], 5)} raycast={() => null}>
          <sphereGeometry args={[0.04, 12, 8]} />
          <meshBasicMaterial color="#c8372d" />
        </mesh>
      ))}
    </>
  )
}

/** Comprimento de cada parede escrito em cima dela (cotas ligadas). */
function CotasParedes() {
  const room = useRoom((s) => s.room)
  const opts = useRoom((s) => s.opts)
  if (!opts.cotas || !camadaOn(opts, 'cotas')) return null
  return (
    <>
      {room.paredes.map((w) => {
        const L = wComp(w)
        const { p } = wPonto(w, L / 2)
        const h = w.rebaixada ? 120 : Math.max(+w.alt, +(w.altFim ?? w.alt)) + 60
        const int = w.c?.length === 4 ? Math.hypot(w.c[1][0] - w.c[0][0], w.c[1][1] - w.c[0][1]) : L
        return (
          <Html key={w.id} position={w3(p[0], p[1], h)} center style={{ pointerEvents: 'none' }} zIndexRange={[10, 0]}>
            <div className="cota3d">{Math.round(int)}</div>
          </Html>
        )
      })}
    </>
  )
}

/** Hotpoints: vértices das paredes, para medir e conferir encontros (manual 4.13.1). */
function Hotpoints() {
  const room = useRoom((s) => s.room)
  const on = useRoom((s) => s.opts.hotpoints || s.opts.ferramenta === 'medir')
  if (!on) return null
  return (
    <>
      {hotpoints(room).map((p, i) => (
        <mesh key={i} position={p} raycast={() => null}>
          <sphereGeometry args={[0.018, 10, 8]} />
          <meshBasicMaterial color="#c8372d" depthTest={false} />
        </mesh>
      ))}
    </>
  )
}

export function hotpoints(room: ReturnType<typeof useRoom.getState>['room']): [number, number, number][] {
  const out: [number, number, number][] = []
  for (const w of room.paredes) {
    const h0 = +w.alt, h1 = +(w.altFim ?? w.alt)
    const c = w.c?.length === 4 ? w.c : [[w.x1, w.y1], [w.x2, w.y2]]
    c.forEach((q, i) => {
      const h = i === 0 || i === 3 ? h0 : h1
      out.push(w3(q[0], q[1], 0), w3(q[0], q[1], w.rebaixada ? 100 : h))
    })
  }
  for (const a of room.aberturas) {
    const w = room.paredes.find((x) => x.id === a.parede)
    if (!w) continue
    for (const s of [a.pos, a.pos + a.larg]) {
      const q = wPonto(w, s).p
      out.push(w3(q[0], q[1], a.afast), w3(q[0], q[1], a.afast + a.alt))
    }
  }
  return out
}

export function Ambiente() {
  const room = useRoom((s) => s.room)
  const opts = useRoom((s) => s.opts)
  const paredes = new Map(room.paredes.map((w) => [w.id, w]))
  return (
    <group>
      <Piso />
      {camadaOn(opts, 'paredes') && room.paredes.map((w) => <ParedeMesh key={w.id} w={w} />)}
      {camadaOn(opts, 'aberturas') && room.aberturas.map((a) => paredes.get(a.parede) && <AberturaMesh key={a.id} a={a} w={paredes.get(a.parede)!} />)}
      {opts.verTeto && camadaOn(opts, 'teto') && room.tetos.filter((t) => t.pts?.length > 2).map((t) => <TetoMesh key={t.id} id={t.id} />)}
      {camadaOn(opts, 'geometrias') && room.geometrias.map((g) => <GeoMesh key={g.id} g={g} />)}
      {camadaOn(opts, 'armarios') && (room.armarios || []).map((a) => <ArmarioMesh key={a.id} a={a} />)}
      <CotasParedes />
      <Hotpoints />
      <PlanoConstrucao />
      <PreviaConstrucao />
    </group>
  )
}

/* ---------------- armários (Construtor de Armários, manual 6.2) ---------------- */

function PecaArmario({ p, sel, on }: { p: Armario3D['pecas'][number]; sel: Sel; on: boolean }) {
  const opts = useRoom((s) => s.opts)
  const ev = useCliques(sel, 'armarios')
  const e = estilo(opts.fill)
  const m = useMat(p.mat || 'mdf', p.cor, 'geo', sel)
  const pos: [number, number, number] = [(p.x + p.dx / 2) * M, (p.z + p.dz / 2) * M, (p.y + p.dy / 2) * M]
  if (e.caixa) return null
  return (
    <mesh position={pos} material={m} castShadow receiveShadow userData={{ sel, camada: 'armarios', peca: p.nome }} {...ev}>
      <boxGeometry args={[Math.max(0.001, p.dx * M), Math.max(0.001, p.dz * M), Math.max(0.001, p.dy * M)]} />
      {(e.linhas || on) && <Edges threshold={20} color={on ? COR_SEL : '#3a3f46'} />}
    </mesh>
  )
}

function ArmarioMesh({ a }: { a: Armario3D }) {
  const sel: Sel = { t: 'armario', id: a.id }
  const opts = useRoom((s) => s.opts)
  const on = mesmo(opts.sel, sel)
  const e = estilo(opts.fill)
  const rot = (a.rot * Math.PI) / 180
  return (
    <group position={w3(a.x, a.y, a.z)} rotation={[0, rot, 0]}>
      {a.pecas.map((p, i) => <PecaArmario key={i} p={p} sel={sel} on={on} />)}
      {(e.caixa || on) && (
        <lineSegments position={[(a.L / 2) * M, (a.A / 2) * M, (a.P / 2) * M]} raycast={() => null}>
          <edgesGeometry args={[new BoxGeometry(a.L * M, a.A * M, a.P * M)]} />
          <lineBasicMaterial color={on ? COR_SEL : '#33404f'} />
        </lineSegments>
      )}
      {on && opts.cotas && (
        <Html position={[(a.L / 2) * M, (a.A + 60) * M, (a.P / 2) * M]} center style={{ pointerEvents: 'none' }}>
          <div className="cota3d">{Math.round(a.L)} × {Math.round(a.A)} × {Math.round(a.P)}</div>
        </Html>
      )}
    </group>
  )
}
