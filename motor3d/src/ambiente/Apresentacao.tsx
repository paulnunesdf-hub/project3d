import { useEffect, useMemo, useRef } from 'react'
import { Color, Vector3, type DirectionalLight } from 'three'
import { useThree } from '@react-three/fiber'
import { Environment, Grid, Lightformer, Sky } from '@react-three/drei'
import { EffectComposer, N8AO, ToneMapping } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import { caixaAmbiente } from './Camera'
import { useRoom } from './store'

/* Luz do ambiente: iluminação padrão, clima (sol pela altitude e azimute),
   céu, sombras, oclusão de ambiente (N8AO) e reflexos pelo mapa de ambiente
   (manual 2.4.3 Apresentação, 15.2 Iluminação Padrão, 17.3 Clima). */

export const CLIMAS: Record<string, { nome: string; sol: number; cor: string; amb: number; turb: number; noite?: boolean }> = {
  ensolarado: { nome: 'Ensolarado', sol: 3.2, cor: '#fff3e0', amb: 0.45, turb: 3 },
  nublado: { nome: 'Nublado', sol: 0.7, cor: '#e9eef5', amb: 0.9, turb: 18 },
  entardecer: { nome: 'Entardecer', sol: 2.2, cor: '#ffb27a', amb: 0.35, turb: 8 },
  noite: { nome: 'Noite', sol: 0.15, cor: '#8fa6d9', amb: 0.12, turb: 1, noite: true },
  interno: { nome: 'Só luzes internas', sol: 0, cor: '#ffffff', amb: 0.25, turb: 2 },
}

export function solDir(alt: number, az: number): Vector3 {
  const a = (alt * Math.PI) / 180, z = (az * Math.PI) / 180
  // azimute a partir do norte (eixo +y da planta = -z do 3D), sentido horário
  return new Vector3(Math.sin(z) * Math.cos(a), Math.sin(a), -Math.cos(z) * Math.cos(a)).normalize()
}

export function Iluminacao() {
  const opts = useRoom((s) => s.opts)
  const room = useRoom((s) => s.room)
  const render = useRoom((s) => s.render)
  const { scene, gl } = useThree()
  const sol = useRef<DirectionalLight>(null)
  const apres = opts.fill === 'apresentacao' || !!render?.ativo
  const cl = CLIMAS[opts.clima.tipo] || CLIMAS.ensolarado
  const k = Math.max(0, +opts.clima.int || 1)
  const caixa = useMemo(() => caixaAmbiente(room), [room])
  const centro = caixa.getCenter(new Vector3())
  const raio = Math.max(3, caixa.getSize(new Vector3()).length() / 2)
  const dir = solDir(opts.clima.alt, opts.clima.az)
  const posSol = centro.clone().addScaledVector(dir, raio * 2)

  useEffect(() => {
    scene.background = new Color(opts.fill === 'hidepb' ? '#000000' : opts.fundo || '#eef2f6')
    gl.shadowMap.enabled = true
  }, [scene, gl, opts.fill, opts.fundo])

  useEffect(() => {
    const l = sol.current
    if (!l) return
    l.target.position.copy(centro)
    l.target.updateMatrixWorld()
    const c = l.shadow.camera
    c.left = c.bottom = -raio
    c.right = c.top = raio
    c.near = 0.1
    c.far = raio * 5
    c.updateProjectionMatrix()
  })

  if (!apres) {
    // modos de trabalho: luz clara e sem sombra, como o 3D do Promob
    const p = opts.iluminacaoPadrao ? opts.luzPadrao : 0.25
    return (
      <>
        <ambientLight intensity={0.55 * p} />
        <hemisphereLight args={['#ffffff', '#b9b2a6', 0.5 * p]} />
        <directionalLight position={[centro.x + raio, centro.y + raio * 2, centro.z + raio * 1.4]} intensity={1.1 * p} />
        <directionalLight position={[centro.x - raio, centro.y + raio, centro.z - raio]} intensity={0.35 * p} />
        <GradeDoPiso />
      </>
    )
  }
  return (
    <>
      {opts.clima.ceu && !cl.noite && <Sky distance={150} sunPosition={dir.toArray()} turbidity={cl.turb} rayleigh={opts.clima.tipo === 'entardecer' ? 3 : 1} />}
      <ambientLight intensity={cl.amb * k * (opts.iluminacaoPadrao ? opts.luzPadrao : 0.3) * 0.5} />
      {cl.sol > 0 && (
        <directionalLight ref={sol} position={posSol.toArray()} intensity={cl.sol * k} color={cl.cor} castShadow={opts.apres.sombras}
          shadow-mapSize={[2048, 2048]} shadow-bias={-0.0004} shadow-normalBias={0.02} />
      )}
      {opts.apres.reflexos && (
        <Environment resolution={128} frames={1} environmentIntensity={cl.noite ? 0.08 : 0.55 * k}>
          <Lightformer form="rect" intensity={2} position={[0, 6, 0]} rotation-x={Math.PI / 2} scale={[12, 12, 1]} color={cl.cor} />
          <Lightformer form="rect" intensity={1} position={[-6, 2, 0]} rotation-y={Math.PI / 2} scale={[12, 4, 1]} />
          <Lightformer form="rect" intensity={1} position={[6, 2, 0]} rotation-y={-Math.PI / 2} scale={[12, 4, 1]} />
          <Lightformer form="ring" intensity={1.5} position={[0, 3, 6]} scale={3} color={cl.cor} />
        </Environment>
      )}
      {opts.apres.ao && !render?.ativo && (
        <EffectComposer multisampling={4} enableNormalPass={false}>
          <N8AO aoRadius={0.6} intensity={2.2} distanceFalloff={0.6} halfRes />
          <ToneMapping mode={ToneMappingMode.AGX} />
        </EffectComposer>
      )}
      <GradeDoPiso />
    </>
  )
}

/** Grid do piso (manual 8.5): intervalo configurável. */
function GradeDoPiso() {
  const g = useRoom((s) => s.opts.grid)
  const p = useRoom((s) => s.room.piso)
  if (!g?.on) return null
  const passo = Math.max(10, g.passo || 500) / 1000
  return (
    <Grid position={[(p.x + p.w / 2) / 1000, 0.003, -(p.y + p.h / 2) / 1000]} args={[p.w / 1000, p.h / 1000]} cellSize={passo} cellColor="#8a96a3"
      sectionSize={passo * 5} sectionColor="#5a6573" fadeDistance={100} infiniteGrid={false} />
  )
}
