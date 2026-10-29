import {
  BoxGeometry, BufferGeometry, CylinderGeometry, ExtrudeGeometry, Float32BufferAttribute, Shape, Vector2,
} from 'three'
import { ADDITION, Brush, Evaluator, INTERSECTION, SUBTRACTION } from 'three-bvh-csg'
import type { Abertura, Geometria, Parede, Pt } from './store'

/* Geometria do ambiente em metros, no sistema do 3D: X = x da planta, Y = altura, Z = -y da planta. */

export const M = 0.001
export const w3 = (x: number, y: number, h: number): [number, number, number] => [x * M, h * M, -y * M]

export const wLen = (w: Parede) => Math.hypot(w.x2 - w.x1, w.y2 - w.y1)
export const wOff = (w: Parede): [number, number] =>
  w.orient === 'externa' ? [-w.esp, 0] : w.orient === 'centro' ? [-w.esp / 2, w.esp / 2] : [0, +w.esp]

/** Linha de centro de uma parede (reta ou curva pela flecha), amostrada. Cada
 *  ponto traz a distância ao início e a normal à esquerda (lado B, para onde cresce a espessura). */
export function wCentro(w: Parede): { p: Pt; s: number; n: Pt }[] {
  const L = wLen(w) || 1
  const dx = (w.x2 - w.x1) / L, dy = (w.y2 - w.y1) / L
  const f = +(w.flecha || 0)
  if (Math.abs(f) < 1) return [{ p: [w.x1, w.y1], s: 0, n: [-dy, dx] }, { p: [w.x2, w.y2], s: L, n: [-dy, dx] }]
  // arco pela corda L e flecha f (f > 0 curva para o lado de fora, à esquerda)
  const R = (L * L / 4 + f * f) / (2 * Math.abs(f))
  const mx = (w.x1 + w.x2) / 2, my = (w.y1 + w.y2) / 2
  const sg = Math.sign(f)
  // centro do círculo: do meio da corda, para o lado oposto à barriga
  const cx = mx + dy * (R - Math.abs(f)) * sg, cy = my - dx * (R - Math.abs(f)) * sg
  const a1 = Math.atan2(w.y1 - cy, w.x1 - cx), a2 = Math.atan2(w.y2 - cy, w.x2 - cx)
  let da = a2 - a1
  while (da > Math.PI) da -= 2 * Math.PI
  while (da < -Math.PI) da += 2 * Math.PI
  if (Math.abs(f) > L / 2) da = da > 0 ? da - 2 * Math.PI : da + 2 * Math.PI
  const N = Math.max(8, Math.ceil(Math.abs(da) / 0.08))
  const out: { p: Pt; s: number; n: Pt }[] = []
  for (let i = 0; i <= N; i++) {
    const a = a1 + (da * i) / N
    const p: Pt = [cx + R * Math.cos(a), cy + R * Math.sin(a)]
    // normal à esquerda do sentido de construção (o lado para onde cresce a espessura, como na planta)
    const tx = -Math.sin(a) * Math.sign(da), ty = Math.cos(a) * Math.sign(da)
    out.push({ p, s: Math.abs(da) * R * (i / N), n: [-ty, tx] })
  }
  return out
}

/** Pontos dos dois lados (A e B) da parede no piso. Reta: usa os cantos com
 *  meia-esquadria que vêm da planta; curva: desloca a linha de centro. */
function lados(w: Parede): { A: Pt[]; B: Pt[]; s: number[] } {
  const c = wCentro(w)
  if (c.length === 2 && w.c?.length === 4) return { A: [w.c[0], w.c[1]], B: [w.c[3], w.c[2]], s: [0, wLen(w)] }
  const [o0, o1] = wOff(w)
  const off = (q: { p: Pt; n: Pt }, o: number): Pt => [q.p[0] + q.n[0] * o, q.p[1] + q.n[1] * o]
  return { A: c.map((q) => off(q, o0)), B: c.map((q) => off(q, o1)), s: c.map((q) => q.s) }
}

/** Corpo da parede: prisma com topo inclinado (pé-direito inicial e final) e
 *  coordenadas de textura em metros (u ao longo da parede, v na altura). */
export function paredeCorpo(w: Parede, altura?: number): BufferGeometry {
  const { A, B, s } = lados(w)
  const L = s[s.length - 1] || 1
  const h0 = altura ?? (+w.alt || 2600)
  const h1 = altura ?? (+(w.altFim ?? w.alt) || h0)
  const hz = (i: number) => h0 + (h1 - h0) * (s[i] / L)
  const pos: number[] = [], uv: number[] = []
  const tri = (a: number[], b: number[], c: number[], ua: number[], ub: number[], uc: number[]) => {
    pos.push(...a, ...b, ...c)
    uv.push(...ua, ...ub, ...uc)
  }
  const quad = (a: number[], b: number[], c: number[], d: number[], ua: number[], ub: number[], uc: number[], ud: number[]) => {
    tri(a, b, c, ua, ub, uc)
    tri(a, c, d, ua, uc, ud)
  }
  const n = A.length
  for (let i = 0; i < n - 1; i++) {
    const a0 = w3(A[i][0], A[i][1], 0), a1 = w3(A[i + 1][0], A[i + 1][1], 0)
    const b0 = w3(B[i][0], B[i][1], 0), b1 = w3(B[i + 1][0], B[i + 1][1], 0)
    const A0 = w3(A[i][0], A[i][1], hz(i)), A1 = w3(A[i + 1][0], A[i + 1][1], hz(i + 1))
    const B0 = w3(B[i][0], B[i][1], hz(i)), B1 = w3(B[i + 1][0], B[i + 1][1], hz(i + 1))
    const u0 = s[i] * M, u1 = s[i + 1] * M
    // lado A (linha de cota) e lado B (do outro lado da espessura)
    quad(a0, a1, A1, A0, [u0, 0], [u1, 0], [u1, hz(i + 1) * M], [u0, hz(i) * M])
    quad(b1, b0, B0, B1, [u1, 0], [u0, 0], [u0, hz(i) * M], [u1, hz(i + 1) * M])
    // topo e base
    quad(A0, A1, B1, B0, [a0[0], a0[2]], [a1[0], a1[2]], [b1[0], b1[2]], [b0[0], b0[2]])
    quad(b0, b1, a1, a0, [b0[0], b0[2]], [b1[0], b1[2]], [a1[0], a1[2]], [a0[0], a0[2]])
  }
  // pontas
  for (const [i, sgn] of [[0, 1], [n - 1, -1]] as const) {
    const a = w3(A[i][0], A[i][1], 0), b = w3(B[i][0], B[i][1], 0), At = w3(A[i][0], A[i][1], hz(i)), Bt = w3(B[i][0], B[i][1], hz(i))
    const e = Math.hypot(A[i][0] - B[i][0], A[i][1] - B[i][1]) * M
    if (sgn > 0) quad(b, a, At, Bt, [0, 0], [e, 0], [e, hz(i) * M], [0, hz(i) * M])
    else quad(a, b, Bt, At, [0, 0], [e, 0], [e, hz(i) * M], [0, hz(i) * M])
  }
  const g = new BufferGeometry()
  g.setAttribute('position', new Float32BufferAttribute(pos, 3))
  g.setAttribute('uv', new Float32BufferAttribute(uv, 2))
  g.computeVertexNormals()
  return g
}

/** Onde fica um ponto ao longo da parede (distância s em mm): posição no centro e direção. */
export function wPonto(w: Parede, s: number): { p: Pt; t: Pt; n: Pt } {
  const c = wCentro(w)
  for (let i = 0; i < c.length - 1; i++) {
    if (s <= c[i + 1].s || i === c.length - 2) {
      const k = (s - c[i].s) / (c[i + 1].s - c[i].s || 1)
      const p: Pt = [c[i].p[0] + (c[i + 1].p[0] - c[i].p[0]) * k, c[i].p[1] + (c[i + 1].p[1] - c[i].p[1]) * k]
      const L = Math.hypot(c[i + 1].p[0] - c[i].p[0], c[i + 1].p[1] - c[i].p[1]) || 1
      const t: Pt = [(c[i + 1].p[0] - c[i].p[0]) / L, (c[i + 1].p[1] - c[i].p[1]) / L]
      return { p, t, n: [-t[1], t[0]] }
    }
  }
  return { p: [w.x1, w.y1], t: [1, 0], n: [0, 1] }
}
export const wComp = (w: Parede) => { const c = wCentro(w); return c[c.length - 1].s }

/** Caixa (em metros) que ocupa o vão de uma abertura, atravessando a parede. */
export function caixaAbertura(w: Parede, a: Abertura, folga = 40): BoxGeometry {
  const { p, t, n } = wPonto(w, a.pos + a.larg / 2)
  const [o0, o1] = wOff(w)
  const meio = (o0 + o1) / 2
  const g = new BoxGeometry(a.larg * M, a.alt * M, (w.esp + folga) * M)
  g.rotateY(Math.atan2(t[1], t[0]))
  const c = w3(p[0] + n[0] * meio, p[1] + n[1] * meio, a.afast + a.alt / 2)
  g.translate(c[0], c[1], c[2])
  return g
}

/** Volume de uma geometria (retangular, circular, poligonal, livre, coluna, rebaixo, região). */
export function geoForma(g: Geometria): BufferGeometry {
  let geo: BufferGeometry
  const alt = Math.max(1, g.tipo === 'regiao' ? 2 : +g.alt || 1)
  if (g.tipo === 'circ') geo = new CylinderGeometry(g.w / 2 * M, g.w / 2 * M, alt * M, 48)
  else if (g.tipo === 'poli') geo = new CylinderGeometry(g.w / 2 * M, g.w / 2 * M, alt * M, Math.max(3, g.lados || 6))
  else if ((g.tipo === 'livre' || g.tipo === 'regiao') && g.pts && g.pts.length > 2) {
    const sh = new Shape(g.pts.map((q) => new Vector2((q[0] - g.x) * M, (q[1] - g.y) * M)))
    geo = new ExtrudeGeometry(sh, { depth: alt * M, bevelEnabled: false })
    geo.rotateX(-Math.PI / 2) // extrusão para cima; y da planta vira -z
    geo.translate(g.x * M, g.z * M, -g.y * M)
    return comUV(geo)
  } else {
    geo = new BoxGeometry(g.w * M, alt * M, g.d * M)
  }
  // x, y = canto da geometria na planta (as redondas usam x, y como centro)
  const redonda = g.tipo === 'circ' || g.tipo === 'poli'
  const cx = redonda ? g.x : g.x + g.w / 2, cy = redonda ? g.y : g.y + g.d / 2
  geo.rotateY(((g.rot || 0) * Math.PI) / 180)
  geo.translate(cx * M, (g.z + alt / 2) * M, -cy * M)
  return comUV(geo)
}

/** Ajusta as coordenadas de textura para metros (projeção pela maior face). */
function comUV(g: BufferGeometry): BufferGeometry {
  const ng = g.index ? g.toNonIndexed() : g
  ng.computeVertexNormals()
  const p = ng.getAttribute('position'), n = ng.getAttribute('normal')
  const uv: number[] = []
  for (let i = 0; i < p.count; i++) {
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i))
    if (ay >= ax && ay >= az) uv.push(p.getX(i), p.getZ(i))
    else if (ax >= az) uv.push(p.getZ(i), p.getY(i))
    else uv.push(p.getX(i), p.getY(i))
  }
  ng.setAttribute('uv', new Float32BufferAttribute(uv, 2))
  return ng
}

const ev = new Evaluator()
ev.attributes = ['position', 'uv', 'normal']
ev.useGroups = false

/** Tira as aberturas e as geometrias perfurantes do corpo da parede (CSG). */
export function recortar(corpo: BufferGeometry, furos: BufferGeometry[]): BufferGeometry {
  if (!furos.length) return corpo
  let a = new Brush(corpo)
  a.updateMatrixWorld()
  let uniao: Brush | null = null
  for (const f of furos) {
    const b = new Brush(comUV(f.clone()))
    b.updateMatrixWorld()
    uniao = uniao ? ev.evaluate(uniao, b, ADDITION) : b
  }
  if (uniao) a = ev.evaluate(a, uniao, SUBTRACTION)
  return a.geometry
}

/** Fatia horizontal da parede (para as faixas de acabamento). */
export function fatia(geo: BufferGeometry, de: number, ate: number): BufferGeometry {
  const box = new BoxGeometry(100, Math.max(0.001, (ate - de) * M), 100)
  box.translate(0, ((de + ate) / 2) * M, 0)
  const a = new Brush(geo)
  const b = new Brush(comUV(box))
  a.updateMatrixWorld()
  b.updateMatrixWorld()
  return ev.evaluate(a, b, INTERSECTION).geometry
}

/** Teto/piso: polígono extrudado na espessura, na altura dada. */
export function placa(pts: Pt[], z: number, esp: number): BufferGeometry {
  const sh = new Shape(pts.map((q) => new Vector2(q[0] * M, q[1] * M)))
  const g = new ExtrudeGeometry(sh, { depth: esp * M, bevelEnabled: false })
  g.rotateX(-Math.PI / 2)
  g.translate(0, z * M, 0)
  return comUV(g)
}
