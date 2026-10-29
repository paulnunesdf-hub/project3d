import { useRoom, type Opts, type Room } from './store'
import { useDesignStore } from '../store/designStore'
import { parse, serialize } from '../lib/persistence'
import { createPanel } from '../lib/panel'
import type { Panel } from '../types/panel'
import { exportar3D, salvarImagem, tela } from './Motor'

/* O que a página principal (o programa) chama dentro do motor 3D. */
const api = {
  versao: 1,
  setRoom: (room: Room, opts: Partial<Opts> = {}) => useRoom.getState().setRoom(room, opts),
  setOpts: (opts: Partial<Opts>) => useRoom.getState().setOpts(opts),
  cmd: (tipo: string, arg?: unknown) => useRoom.getState().comando(tipo, arg),
  render: (ativo: boolean, cfg: { alvo?: number; escala?: number } = {}) =>
    useRoom.getState().set({ render: ativo ? { ativo: true, amostras: 0, alvo: cfg.alvo || 200, escala: cfg.escala || 1 } : null }),
  renderInfo: () => useRoom.getState().render,
  salvarImagem: (cfg: Record<string, unknown> = {}) => { const t = tela(); if (t) salvarImagem(t.canvas, cfg) },
  imagemDataURL: () => tela()?.canvas.toDataURL('image/png') || '',
  exportar: (fmt: string) => { const t = tela(); return t ? exportar3D(t.scene, fmt) : Promise.resolve() },
  limparMedida: () => useRoom.getState().set({ medida: null }),
  medida: () => useRoom.getState().medida,
  /** Estado da câmera e das opções (usado pelos testes do programa). */
  estado: () => {
    const t = tela(), cam = t?.camera as (import('three').Camera & { isOrthographicCamera?: boolean }) | undefined
    const cc = t?.controls as { distance?: number; polarAngle?: number; azimuthAngle?: number } | undefined
    return { opts: useRoom.getState().opts, orto: !!cam?.isOrthographicCamera, pos: cam ? cam.position.toArray().map((v) => Math.round(v * 1000)) : [],
      dist: cc?.distance ?? 0, polar: cc?.polarAngle ?? 0, azimute: cc?.azimuthAngle ?? 0 }
  },
  /* módulos (painéis do Panelizer) */
  carregarDesign: (d: unknown) => {
    try { useDesignStore.getState().loadDesign(parse(JSON.stringify(d || { panels: [] }))) } catch { useDesignStore.getState().loadDesign(parse('{"panels":[]}')) }
  },
  design: () => { const s = useDesignStore.getState(); return serialize(s) },
  addPanel: (p: Partial<Panel>) => useDesignStore.getState().addPanel(p),
  paineis: () => useDesignStore.getState().panels,
  selecionados: () => useDesignStore.getState().selectedIds,
  /** Arranjo linear (10.12): n cópias do painel selecionado, a cada passo [x, y, z] mm. */
  arranjoLinear: (n: number, passo: [number, number, number]) => {
    const s = useDesignStore.getState()
    const base = s.panels.filter((p) => s.selectedIds.includes(p.id))
    if (!base.length || !(n > 0)) return 0
    const novos: Panel[] = []
    for (let i = 1; i <= n; i++)
      for (const b of base) novos.push(createPanel({ ...b, name: `${b.name} ${i + 1}`, position: [b.position[0] + passo[0] * i, b.position[1] + passo[1] * i, b.position[2] + passo[2] * i] }))
    s.loadDesign({ ...serialize(s), panels: [...s.panels, ...novos] })
    return novos.length
  },
  /** Centralizar X / Y (3.5): centraliza os painéis selecionados no ambiente. */
  centralizarPaineis: (eixo: 'x' | 'y', de: number, ate: number) => {
    const s = useDesignStore.getState()
    const sel = s.panels.filter((p) => s.selectedIds.includes(p.id))
    if (!sel.length) return
    const i = eixo === 'x' ? 0 : 2
    const meio = sel.reduce((a, p) => a + p.position[i], 0) / sel.length
    const alvo = eixo === 'x' ? (de + ate) / 2 : -(de + ate) / 2
    s.commitPanelsMove(sel.map((p) => { const q = [...p.position] as [number, number, number]; q[i] += alvo - meio; return { id: p.id, position: q } }))
  },
  espelharPaineis: (eixoX: number) => {
    const s = useDesignStore.getState()
    s.loadDesign({ ...serialize(s), panels: s.panels.map((p) => ({ ...p, position: [2 * eixoX - p.position[0], p.position[1], p.position[2]] as [number, number, number] })) })
  },
}
export type Motor3D = typeof api
;(window as unknown as { Motor3D: Motor3D }).Motor3D = api
export default api
