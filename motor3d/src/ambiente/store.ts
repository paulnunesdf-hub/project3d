import { create } from 'zustand'

/* Ambiente do Promob: dados que vêm do programa principal (a planta 2D), em mm.
   Na planta X vai para a direita e Y para cima; no 3D o Y é a altura, então
   (x, y da planta, altura) vira (x, altura, -y). */

export type Pt = [number, number]

export interface Faixa { ate: number; mat: string; cor: string }
export interface Parede {
  id: string; x1: number; y1: number; x2: number; y2: number
  esp: number; alt: number; altFim?: number; orient: string; tipo: string
  transp?: boolean; rebaixada?: boolean; flecha?: number
  mat?: string; cor?: string; faixas?: Faixa[]
  /** cantos no piso [A0, A1, B1, B0] calculados pela planta (meia-esquadria) */
  c: Pt[]
}
export interface Abertura {
  id: string; parede: string; tipo: 'porta' | 'janela' | 'vao' | 'correr'
  pos: number; larg: number; alt: number; afast: number; mat?: string; cor?: string; inv?: boolean
}
export interface Teto { id: string; pts: Pt[]; afast: number; esp: number; cor?: string }
export interface Geometria {
  id: string; tipo: 'ret' | 'circ' | 'poli' | 'livre' | 'coluna' | 'rebaixo' | 'regiao'
  x: number; y: number; w: number; d: number; z: number; alt: number; lados?: number; rot?: number
  pts?: Pt[]; perfurar?: boolean; mat?: string; cor?: string; nome?: string
}
export interface Luz {
  id: string; tipo: 'ponto' | 'spot' | 'linear'; x: number; y: number; z: number
  int: number; cor: string; inc?: number; abertura?: number; comp?: number; larg?: number; rot?: number; sombra?: boolean
}
export interface Texto3D { id: string; txt: string; x: number; y: number; z: number; tam: number; prof: number; rot: number; cor: string }
export interface Imagem { id: string; src: string; x: number; y: number; z: number; larg: number; alt: number; rot: number }
export interface Modelo { id: string; nome: string; fmt: string; dados: string; x: number; y: number; z: number; rot: number; esc: number }
/** Peça de armário (Construtor de Armários): caixa no sistema do armário, em mm.
 *  x ao longo da largura, y da parede para a frente, z para cima. */
export interface PecaArm { x: number; y: number; z: number; dx: number; dy: number; dz: number; mat?: string; cor: string; parte: string; nome?: string }
export interface Armario3D { id: string; nome: string; x: number; y: number; z: number; rot: number; L: number; A: number; P: number; pecas: PecaArm[] }
export interface Vista { id: string; nome: string; pos: [number, number, number]; alvo: [number, number, number]; persp: boolean }

export interface Room {
  paredes: Parede[]
  aberturas: Abertura[]
  tetos: Teto[]
  piso: { x: number; y: number; w: number; h: number; esp: number; mat?: string; cor?: string }
  geometrias: Geometria[]
  luzes: Luz[]
  textos: Texto3D[]
  imagens: Imagem[]
  modelos: Modelo[]
  vistas: Vista[]
  armarios: Armario3D[]
}

export type Fill =
  | 'texturas_linhas' | 'texturas' | 'linhas' | 'solido' | 'hide' | 'hidepb' | 'arame' | 'caixa' | 'apresentacao' | 'transp'

export interface Sel { t: string; id?: string }

export interface Opts {
  fill: Fill
  persp: boolean
  verTeto: boolean
  cotas: boolean
  sel: Sel | null
  fundo: string
  camadas: Record<string, { on: boolean; lock?: boolean }>
  autoRebaixar: boolean
  hotpoints: boolean
  grid: { on: boolean; passo: number }
  colisao: boolean
  luzPadrao: number
  iluminacaoPadrao: boolean
  clima: { tipo: string; int: number; alt: number; az: number; ceu: boolean }
  apres: { sombras: boolean; ao: boolean; reflexos: boolean }
  corte: { anterior: number; posterior: number }
  /** construção de paredes pelo 3D: segmento de prévia, em mm na planta */
  cons: { ativo: boolean; pts: Pt[]; prev?: Pt | null } | null
  /** ferramenta de inserção pelo 3D: porta, janela, geometria, luz... */
  inserir: string | null
  ferramenta: 'navegar' | 'medir' | 'caminhar'
  /** ferramenta de movimentação do Promob (2.4.1): M seleção, P pan, R rotação, Z zoom, W zoom janela */
  nav?: 'sel' | 'pan' | 'rot' | 'zoom' | 'janela'
  /** itens selecionados juntos (Ctrl + clique ou grupo) */
  multi?: Sel[]
  modulos?: boolean
  imagem?: { marca?: string; brilho?: number; contraste?: number; saturacao?: number; largura?: number }
}

export const OPTS_PADRAO: Opts = {
  fill: 'texturas_linhas', persp: true, verTeto: true, cotas: true, sel: null, fundo: '#eef2f6',
  camadas: {}, autoRebaixar: false, hotpoints: false, grid: { on: false, passo: 500 }, colisao: true,
  luzPadrao: 1, iluminacaoPadrao: true, clima: { tipo: 'ensolarado', int: 1, alt: 45, az: 135, ceu: true },
  apres: { sombras: true, ao: true, reflexos: true }, corte: { anterior: 10, posterior: 200000 },
  cons: null, inserir: null, ferramenta: 'navegar',
}

export const ROOM_VAZIA: Room = {
  paredes: [], aberturas: [], tetos: [], piso: { x: -500, y: -500, w: 5000, h: 5000, esp: 5 },
  geometrias: [], luzes: [], textos: [], imagens: [], modelos: [], vistas: [], armarios: [],
}

/** Comandos de câmera e de render vindos do programa principal. Cada um tem um
 *  número novo para o componente da câmera saber que precisa agir. */
export interface Cmd { n: number; tipo: string; arg?: unknown }

interface RoomState {
  room: Room
  opts: Opts
  cmd: Cmd | null
  /** paredes rebaixadas automaticamente nesta posição da câmera */
  autoBaixas: string[]
  medida: { a: [number, number, number]; b?: [number, number, number] } | null
  render: { ativo: boolean; amostras: number; alvo: number; escala: number } | null
  menu: { x: number; y: number; sel: Sel } | null
  setRoom: (room: Room, opts: Partial<Opts>) => void
  setOpts: (o: Partial<Opts>) => void
  comando: (tipo: string, arg?: unknown) => void
  set: (p: Partial<RoomState>) => void
}

let n = 0
export const useRoom = create<RoomState>((set) => ({
  room: ROOM_VAZIA,
  opts: OPTS_PADRAO,
  cmd: null,
  autoBaixas: [],
  medida: null,
  render: null,
  menu: null,
  setRoom: (room, opts) => set((s) => ({ room: { ...ROOM_VAZIA, ...room }, opts: { ...s.opts, ...opts } })),
  setOpts: (o) => set((s) => ({ opts: { ...s.opts, ...o } })),
  comando: (tipo, arg) => set({ cmd: { n: ++n, tipo, arg } }),
  set: (p) => set(p),
}))

/** Ponte com o programa principal (a página que contém este quadro). */
export interface Ponte {
  design?: unknown
  salvarDesign?: (d: unknown) => void
  selecionar?: (s: Sel | null, extra?: { ctrl?: boolean }) => void
  /** tecla apertada dentro do 3D: a página principal trata os atalhos do Promob (cap. 32) */
  tecla?: (t: { key: string; ctrl: boolean; shift: boolean; alt: boolean }) => boolean | void
  cliquePiso?: (x: number, y: number, botao: number) => void
  movePiso?: (x: number, y: number) => void
  inserir?: (tipo: string, info: Record<string, unknown>) => void
  acao?: (nome: string, sel: Sel | null, arg?: unknown) => void
  baixar?: (nome: string, dados: Blob) => void
  vistaMudou?: (v: { pos: number[]; alvo: number[]; persp: boolean }) => void
  enviarPecas?: (pecas: unknown[]) => void
  aviso?: (txt: string) => void
  pronto?: () => void
}
export function ponte(): Ponte {
  try {
    return ((window.parent as unknown as { __motor3d?: Ponte }).__motor3d) || {}
  } catch {
    return {}
  }
}

export const camadaOn = (o: Opts, k: string) => o.camadas[k]?.on !== false
export const camadaLivre = (o: Opts, k: string) => o.camadas[k]?.on !== false && !o.camadas[k]?.lock
