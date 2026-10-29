import { useEffect, useRef } from 'react'
import { Box3, Raycaster, Vector2, Vector3, type Object3D, type OrthographicCamera as OrtoCam } from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { CameraControls, OrthographicCamera, PerspectiveCamera, PointerLockControls } from '@react-three/drei'
import type CameraControlsImpl from 'camera-controls'
import { M, w3, wComp, wPonto } from './geometria'
import { ponte, useRoom, type Room, type Vista } from './store'
import { useDesignStore } from '../store/designStore'

/* Movimentação, vistas (manual 2.4), vista rápida (3.9), auto rebaixar (3.10.1),
   vista dinâmica, caminhar, girar e vídeo (cap. 14). A câmera é a do pacote
   camera-controls (via drei), com transições suaves. */

type V3 = [number, number, number]

/** Caixa do ambiente em metros (paredes, piso e itens). */
export function caixaAmbiente(room: Room): Box3 {
  const b = new Box3()
  const add = (p: V3) => b.expandByPoint(new Vector3(...p))
  for (const w of room.paredes) {
    const h = Math.max(+w.alt || 0, +(w.altFim ?? w.alt) || 0)
    for (const q of w.c?.length ? w.c : [[w.x1, w.y1], [w.x2, w.y2]]) { add(w3(q[0], q[1], 0)); add(w3(q[0], q[1], h)) }
  }
  if (b.isEmpty()) {
    const p = room.piso
    add(w3(p.x, p.y, 0)); add(w3(p.x + p.w, p.y + p.h, 2600))
  }
  for (const pn of useDesignStore.getState().panels) add(pn.position.map((v) => v * M) as V3)
  return b
}

// direção da câmera (de onde olha) para cada vista: [x, y, z] no 3D
export const VISTAS: Record<string, [string, V3]> = {
  isoDir: ['Isométrica direita', [1, 0.8, 1]],
  isoEsq: ['Isométrica esquerda', [-1, 0.8, 1]],
  isoDirPost: ['Isométrica direita posterior', [1, 0.8, -1]],
  isoEsqPost: ['Isométrica esquerda posterior', [-1, 0.8, -1]],
  sup: ['Superior', [0, 1, 0.0001]],
  inf: ['Inferior', [0, -1, 0.0001]],
  fre: ['Frontal', [0, 0.02, 1]],
  pos: ['Posterior', [0, 0.02, -1]],
  esq: ['Esquerda', [-1, 0.02, 0]],
  dir: ['Direita', [1, 0.02, 0]],
}

interface Estado { pos: V3; alvo: V3 }

export function Camera() {
  const ref = useRef<CameraControlsImpl>(null)
  const opts = useRoom((s) => s.opts)
  const cmd = useRoom((s) => s.cmd)
  const set = useRoom((s) => s.set)
  const orbitEnabled = useDesignStore((s) => s.orbitEnabled)
  const dragMode = useDesignStore((s) => s.dragMode)
  const { camera, gl, invalidate, setFrameloop } = useThree()
  const hist = useRef<{ lista: Estado[]; i: number; pular: boolean }>({ lista: [], i: -1, pular: false })
  const anim = useRef<null | { tipo: string; t: number; dados: Record<string, unknown> }>(null)
  const gravador = useRef<MediaRecorder | null>(null)
  const ultimo = useRef<Estado | null>(null)
  const teclas = useRef(new Set<string>())
  const andando = opts.ferramenta === 'caminhar'

  const estado = (): Estado => {
    const c = ref.current!
    const p = c.getPosition(new Vector3()), t = c.getTarget(new Vector3())
    return { pos: p.toArray() as V3, alvo: t.toArray() as V3 }
  }
  const ir = (e: Estado, suave = true) => ref.current?.setLookAt(...e.pos, ...e.alvo, suave)

  const enquadrar = (dir?: V3, suave = true) => {
    const c = ref.current
    if (!c) return
    const b = caixaAmbiente(useRoom.getState().room)
    const centro = b.getCenter(new Vector3())
    const raio = b.getSize(new Vector3()).length() / 2 || 3
    const d = new Vector3(...(dir || (estado().pos.map((v, i) => v - estado().alvo[i]) as V3))).normalize()
    const dist = raio / Math.sin(((40 / 2) * Math.PI) / 180) * 0.8
    c.setLookAt(centro.x + d.x * dist, centro.y + d.y * dist, centro.z + d.z * dist, centro.x, centro.y, centro.z, suave)
    if (!opts.persp) c.fitToBox(b, suave, { paddingTop: 0.2, paddingBottom: 0.2, paddingLeft: 0.2, paddingRight: 0.2 })
  }

  const vistaRapida = (id: string) => {
    const w = useRoom.getState().room.paredes.find((x) => x.id === id)
    if (!w) return
    const L = wComp(w)
    const { p, t } = wPonto(w, L / 2)
    const dentro: [number, number] = [t[1], -t[0]] // à direita do sentido de construção
    const alt = Math.max(+w.alt || 2600, +(w.altFim ?? 0))
    const dist = Math.max(L, alt) * 1.15
    const alvo = w3(p[0], p[1], alt / 2)
    const pos = w3(p[0] + dentro[0] * dist, p[1] + dentro[1] * dist, alt / 2)
    ref.current?.setLookAt(...pos, ...alvo, true)
  }

  const aproximar = () => {
    const s = useRoom.getState().opts.sel
    if (!s) return enquadrar()
    const b = new Box3()
    cena.traverse((o: Object3D) => {
      const u = o.userData?.sel
      if (u && u.t === s.t && u.id === s.id) b.expandByObject(o)
    })
    if (!b.isEmpty()) ref.current?.fitToBox(b, true, { paddingTop: 0.4, paddingBottom: 0.4, paddingLeft: 0.4, paddingRight: 0.4 })
  }
  const cena = useThree((s) => s.scene)

  useEffect(() => { (window as unknown as { __cc?: unknown }).__cc = ref.current })

  // comandos vindos do programa
  useEffect(() => {
    if (!cmd || !ref.current) return
    const a = cmd.arg as Record<string, unknown> | string | undefined
    switch (cmd.tipo) {
      case 'vista': enquadrar(VISTAS[a as string]?.[1]); break
      case 'enquadrar': enquadrar(); break
      case 'vistaRapida': vistaRapida(a as string); break
      case 'aproximar': aproximar(); break
      case 'voltar': case 'avancar': {
        const h = hist.current
        const i = h.i + (cmd.tipo === 'voltar' ? -1 : 1)
        if (i >= 0 && i < h.lista.length) { h.i = i; h.pular = true; ir(h.lista[i]) }
        break
      }
      case 'irVista': { const v = a as unknown as Vista; ir({ pos: v.pos, alvo: v.alvo }); break }
      case 'pedirVista': ponte().acao?.('vistaAtual', null, { ...estado(), persp: useRoom.getState().opts.persp }); break
      case 'girar': case 'percorrer': {
        anim.current = { tipo: cmd.tipo, t: 0, dados: (a as Record<string, unknown>) || {} }
        if (cmd.tipo === 'percorrer') { const vs = (a as { vistas: Vista[] }).vistas; if (vs?.length) ir({ pos: vs[0].pos, alvo: vs[0].alvo }, false) }
        if ((a as { gravar?: boolean })?.gravar) gravar()
        setFrameloop('always')
        break
      }
      case 'parar': parar(); break
      case 'zoomJanela': zoomJanela(a as unknown as { x0: number; y0: number; x1: number; y1: number }); break
      case 'zoom': { const c = ref.current; const k = +(a as unknown as number) || 1.25; if (opts.persp) c.dolly((c.distance * (k - 1)) / k, true); else c.zoom(((camera as OrtoCam).zoom * (k - 1)), true); break }
      case 'telaCheia': gl.domElement.parentElement?.parentElement?.requestFullscreen?.(); break
    }
    invalidate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cmd])

  // Zoom Window (2.4.1): aproxima a região marcada com o mouse
  const zoomJanela = (r: { x0: number; y0: number; x1: number; y1: number }) => {
    const c = ref.current
    if (!c) return
    const f = Math.max(Math.abs(r.x1 - r.x0), Math.abs(r.y1 - r.y0))
    if (!(f > 0.01)) return
    const cx = (r.x0 + r.x1) / 2, cy = (r.y0 + r.y1) / 2
    const rc = new Raycaster()
    rc.setFromCamera(new Vector2(cx * 2 - 1, -(cy * 2 - 1)), camera)
    const raiz = cena.getObjectByName('exportavel') || cena
    const hit = rc.intersectObject(raiz, true).find((h) => (h.object as { isMesh?: boolean }).isMesh && h.object.visible)
    const alvo = new Vector3(), pos = new Vector3()
    c.getTarget(alvo)
    c.getPosition(pos)
    const P = hit ? hit.point : rc.ray.at(pos.distanceTo(alvo), new Vector3())
    const dir = pos.clone().sub(alvo).normalize()
    if (opts.persp) {
      const d = Math.max(0.3, pos.distanceTo(P) * f)
      c.setLookAt(P.x + dir.x * d, P.y + dir.y * d, P.z + dir.z * d, P.x, P.y, P.z, true)
    } else {
      const d = pos.distanceTo(alvo)
      c.setLookAt(P.x + dir.x * d, P.y + dir.y * d, P.z + dir.z * d, P.x, P.y, P.z, true)
      c.zoomTo((camera as OrtoCam).zoom / f, true)
    }
  }

  // ferramentas de movimentação do Promob: M seleção, P pan, R rotação, Z zoom
  useEffect(() => {
    const c = ref.current
    if (!c) return
    const NONE = 0, ROTATE = 1, TRUCK = 2, DOLLY = 16, ZOOM = 32
    const roda = opts.persp ? DOLLY : ZOOM
    const nav = opts.nav || 'sel'
    const esq = nav === 'pan' ? TRUCK : nav === 'rot' ? ROTATE : nav === 'zoom' ? roda : NONE
    c.mouseButtons.left = esq
    c.mouseButtons.middle = TRUCK
    c.mouseButtons.right = ROTATE
    c.mouseButtons.wheel = roda
  })

  const gravar = () => {
    try {
      const fluxo = gl.domElement.captureStream(30)
      const tipo = ['video/webm;codecs=vp9', 'video/webm'].find((t) => MediaRecorder.isTypeSupported(t)) || ''
      const r = new MediaRecorder(fluxo, tipo ? { mimeType: tipo, videoBitsPerSecond: 8e6 } : undefined)
      const partes: Blob[] = []
      r.ondataavailable = (e) => e.data.size && partes.push(e.data)
      r.onstop = () => ponte().baixar?.('animacao-ambiente.webm', new Blob(partes, { type: 'video/webm' }))
      r.start()
      gravador.current = r
    } catch {
      ponte().aviso?.('Este computador não deixou gravar o vídeo.')
    }
  }
  const parar = () => {
    anim.current = null
    gravador.current?.stop()
    gravador.current = null
    setFrameloop(andando ? 'always' : 'demand')
    ponte().acao?.('animacaoFim', null)
  }

  // histórico das últimas 20 vistas (Voltar Vista / Avançar Vista)
  useEffect(() => {
    const c = ref.current
    if (!c) return
    const descanso = () => {
      const h = hist.current
      const e = estado()
      ultimo.current = e
      ponte().vistaMudou?.({ pos: e.pos, alvo: e.alvo, persp: useRoom.getState().opts.persp })
      if (h.pular) { h.pular = false; return }
      h.lista = [...h.lista.slice(0, h.i + 1), e].slice(-20)
      h.i = h.lista.length - 1
    }
    c.addEventListener('rest', descanso)
    return () => c.removeEventListener('rest', descanso)
  })

  // ao trocar perspectiva/ortogonal, a câmera nova começa onde a outra estava
  useEffect(() => {
    const e = ultimo.current
    requestAnimationFrame(() => {
      if (e) ir(e, false)
      else enquadrar(VISTAS.isoDir[1], false)
      invalidate()
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opts.persp])

  // caminhar: teclado (W A S D / setas), olhos a 1,60 m
  useEffect(() => {
    if (!andando) return
    const b = caixaAmbiente(useRoom.getState().room).getCenter(new Vector3())
    camera.position.set(b.x, 1.6, b.z)
    setFrameloop('always')
    const dn = (e: KeyboardEvent) => teclas.current.add(e.key.toLowerCase())
    const up = (e: KeyboardEvent) => teclas.current.delete(e.key.toLowerCase())
    window.addEventListener('keydown', dn)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', dn)
      window.removeEventListener('keyup', up)
      setFrameloop('demand')
      requestAnimationFrame(() => { enquadrar(); invalidate() })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [andando])

  useFrame((_, dt) => {
    const c = ref.current
    if (andando) {
      const k = teclas.current, v = 1.4 * dt
      const f = new Vector3(); camera.getWorldDirection(f); f.y = 0; f.normalize()
      const r = new Vector3(-f.z, 0, f.x)
      if (k.has('w') || k.has('arrowup')) camera.position.addScaledVector(f, v)
      if (k.has('s') || k.has('arrowdown')) camera.position.addScaledVector(f, -v)
      if (k.has('d') || k.has('arrowright')) camera.position.addScaledVector(r, v)
      if (k.has('a') || k.has('arrowleft')) camera.position.addScaledVector(r, -v)
      camera.position.y = 1.6
    }
    const an = anim.current
    if (an && c) {
      an.t += dt
      const d = an.dados as { modo?: string; graus?: number; vel?: number; vistas?: Vista[]; passo?: number; fps?: number }
      if (an.tipo === 'girar') {
        const vel = ((d.vel || 20) * Math.PI) / 180 // graus por segundo
        if (d.modo === 'alvo') {
          // o observador fica parado e o alvo gira em volta dele
          const e = estado()
          const p = new Vector3(...e.pos), t = new Vector3(...e.alvo).sub(p)
          t.applyAxisAngle(new Vector3(0, 1, 0), vel * dt)
          c.setTarget(p.x + t.x, p.y + t.y, p.z + t.z, false)
        } else c.rotate(vel * dt, 0, false)
        if (d.graus && an.t * (d.vel || 20) >= d.graus) parar()
      } else if (an.tipo === 'percorrer' && d.vistas && d.vistas.length > 1) {
        // caminhar pelas vistas salvas: passo (mm por quadro) e quadros por segundo
        const passo = (d.passo || 50) * M * (d.fps || 30) // m por segundo
        let resto = an.t * passo
        let i = 0
        const seg = (k: number) => new Vector3(...d.vistas![k + 1].pos).distanceTo(new Vector3(...d.vistas![k].pos)) || 0.001
        while (i < d.vistas.length - 1 && resto > seg(i)) { resto -= seg(i); i++ }
        if (i >= d.vistas.length - 1) { parar(); return }
        const k = resto / seg(i), a = d.vistas[i], b = d.vistas[i + 1]
        const lerp = (x: V3, y: V3) => x.map((v, j) => v + (y[j] - v) * k) as V3
        c.setLookAt(...lerp(a.pos, b.pos), ...lerp(a.alvo, b.alvo), false)
      }
    }
    // auto rebaixar: abaixa as paredes que ficam entre a câmera e o ambiente
    const o = useRoom.getState().opts
    if (o.autoRebaixar) {
      const cx = camera.position.x / M, cy = -camera.position.z / M
      const baixas: string[] = []
      for (const w of useRoom.getState().room.paredes) {
        const L = Math.hypot(w.x2 - w.x1, w.y2 - w.y1) || 1
        const nx = (w.y2 - w.y1) / L, ny = -(w.x2 - w.x1) / L // para dentro
        if ((cx - w.x1) * nx + (cy - w.y1) * ny < 0) baixas.push(w.id)
      }
      const at = useRoom.getState().autoBaixas
      if (baixas.join() !== at.join()) set({ autoBaixas: baixas })
    }
  })

  const near = Math.max(0.001, (opts.corte?.anterior ?? 10) * M), far = Math.max(1, (opts.corte?.posterior ?? 200000) * M)
  return (
    <>
      {opts.persp ? (
        <PerspectiveCamera makeDefault fov={40} near={near} far={far} position={[6, 5, 7]} />
      ) : (
        <OrthographicCamera makeDefault near={-far} far={far} zoom={80} position={[6, 5, 7]} />
      )}
      {andando ? (
        <PointerLockControls makeDefault />
      ) : (
        <CameraControls ref={ref} makeDefault enabled={orbitEnabled && dragMode === 'orbit'} minDistance={0.2} maxDistance={400} dollyToCursor />
      )}
    </>
  )
}
