import { useEffect, useMemo, useState } from 'react'
import { Box3, DoubleSide, Group, Mesh, MeshStandardMaterial, Object3D, SRGBColorSpace, TextureLoader, Vector3, type Texture } from 'three'
import { Center, Edges, Text3D } from '@react-three/drei'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js'
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js'
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js'
import fonte from './fonte3d.json'
import { M, w3 } from './geometria'
import { camadaOn, useRoom, type Imagem, type Luz, type Modelo, type Texto3D } from './store'
import { useCliques } from './Ambiente'

RectAreaLightUniformsLib.init()

/* Luzes (manual cap. 16), texto 3D (11.3), imagens (11.6) e arquivos 3D importados (10.3). */

const sel = (t: string, id: string) => ({ t, id })
const on = (s: { t: string; id?: string } | null, t: string, id: string) => !!s && s.t === t && s.id === id

function LuzItem({ l }: { l: Luz }) {
  const opts = useRoom((s) => s.opts)
  const render = useRoom((s) => s.render)
  const ev = useCliques(sel('luz', l.id), 'luzes')
  const p = w3(l.x, l.y, l.z)
  const marcado = on(opts.sel, 'luz', l.id)
  const [alvo] = useState(() => new Object3D())
  const inc = ((l.inc ?? 90) * Math.PI) / 180 // 90° = para baixo
  const rot = ((l.rot ?? 0) * Math.PI) / 180
  useEffect(() => {
    // alvo do spot: 1 m na direção da inclinação
    alvo.position.set(p[0] + Math.cos(rot) * Math.cos(inc), p[1] - Math.sin(inc), p[2] - Math.sin(rot) * Math.cos(inc))
    alvo.updateMatrixWorld()
  }, [alvo, p, inc, rot])
  const marcador = !render?.ativo && (
    <mesh position={p} {...ev} userData={{ sel: sel('luz', l.id), camada: 'luzes' }}>
      {l.tipo === 'linear' ? <boxGeometry args={[(l.comp || 1000) * M, 0.02, (l.larg || 40) * M]} /> : l.tipo === 'spot' ? <coneGeometry args={[0.05, 0.1, 16]} /> : <sphereGeometry args={[0.05, 16, 12]} />}
      <meshBasicMaterial color={marcado ? '#2f6db5' : l.cor} />
      {marcado && <Edges color="#2f6db5" />}
    </mesh>
  )
  const k = Math.max(0, +l.int || 0)
  return (
    <>
      {marcador}
      {l.tipo === 'ponto' && <pointLight position={p} color={l.cor} intensity={k * 6} distance={0} decay={2} castShadow={!!l.sombra} />}
      {l.tipo === 'spot' && (
        <>
          <primitive object={alvo} />
          <spotLight position={p} color={l.cor} intensity={k * 25} angle={(((l.abertura ?? 60) / 2) * Math.PI) / 180} penumbra={0.4} decay={2} target={alvo} castShadow={!!l.sombra} />
        </>
      )}
      {l.tipo === 'linear' && (
        <rectAreaLight position={p} color={l.cor} intensity={k * 12} width={(l.comp || 1000) * M} height={(l.larg || 40) * M} rotation={[-Math.PI / 2, 0, rot]} />
      )}
    </>
  )
}

function TextoItem({ t }: { t: Texto3D }) {
  const opts = useRoom((s) => s.opts)
  const ev = useCliques(sel('texto', t.id), 'textos')
  const txt = (t.txt || 'Texto').split('').filter((c) => c === ' ' || c === '\n' || (fonte as { glyphs: Record<string, unknown> }).glyphs[c]).join('')
  return (
    <group position={w3(t.x, t.y, t.z)} rotation={[0, ((t.rot || 0) * Math.PI) / 180, 0]}>
      <Center bottom>
        <Text3D font={fonte as never} size={(t.tam || 200) * M} height={(t.prof || 30) * M} curveSegments={6} {...ev} userData={{ sel: sel('texto', t.id), camada: 'textos' }} castShadow>
          {txt}
          <meshStandardMaterial color={on(opts.sel, 'texto', t.id) ? '#8fb8e6' : t.cor || '#2c3a48'} roughness={0.5} />
        </Text3D>
      </Center>
    </group>
  )
}

const texturas = new Map<string, Texture>()
function ImagemItem({ i }: { i: Imagem }) {
  const opts = useRoom((s) => s.opts)
  const ev = useCliques(sel('imagem', i.id), 'imagens')
  const tex = useMemo(() => {
    let t = texturas.get(i.src)
    if (!t) {
      t = new TextureLoader().load(i.src)
      t.colorSpace = SRGBColorSpace
      texturas.set(i.src, t)
    }
    return t
  }, [i.src])
  return (
    <mesh position={w3(i.x, i.y, i.z)} rotation={[0, ((i.rot || 0) * Math.PI) / 180, 0]} {...ev} userData={{ sel: sel('imagem', i.id), camada: 'imagens' }}>
      <planeGeometry args={[i.larg * M, i.alt * M]} />
      <meshStandardMaterial map={tex} side={DoubleSide} roughness={0.7} />
      {on(opts.sel, 'imagem', i.id) && <Edges color="#2f6db5" />}
    </mesh>
  )
}

const modelos = new Map<string, Promise<Object3D>>()
export function carregarModelo(fmt: string, dados: string): Promise<Object3D> {
  const k = fmt + dados.length + dados.slice(-64)
  let p = modelos.get(k)
  if (!p) {
    p = (async () => {
      const bin = Uint8Array.from(atob(dados), (c) => c.charCodeAt(0)).buffer
      if (fmt === 'glb' || fmt === 'gltf') {
        const g = await new GLTFLoader().parseAsync(fmt === 'gltf' ? new TextDecoder().decode(bin) : bin, '')
        return g.scene
      }
      if (fmt === 'obj') return new OBJLoader().parse(new TextDecoder().decode(bin))
      if (fmt === 'stl') {
        const geo = new STLLoader().parse(bin)
        geo.computeVertexNormals()
        return new Mesh(geo, new MeshStandardMaterial({ color: '#b8bcc2', roughness: 0.6 }))
      }
      throw new Error('Formato não suportado: ' + fmt)
    })()
    modelos.set(k, p)
  }
  return p
}

/** Arquivo 3D importado. Unidade: mm (STL/OBJ de CAD costumam vir em mm); a
 *  escala corrige quando vier em metros ou polegadas. */
function ModeloItem({ m }: { m: Modelo }) {
  const opts = useRoom((s) => s.opts)
  const ev = useCliques(sel('modelo', m.id), 'modelos')
  const [obj, setObj] = useState<Object3D | null>(null)
  useEffect(() => {
    let vivo = true
    carregarModelo(m.fmt, m.dados).then((o) => {
      if (!vivo) return
      const c = o.clone(true)
      c.traverse((x) => { if ((x as Mesh).isMesh) { x.castShadow = x.receiveShadow = true; x.userData = { sel: sel('modelo', m.id), camada: 'modelos' } } })
      // apoia no piso pelo ponto mais baixo
      const b = new Box3().setFromObject(c)
      const g = new Group()
      c.position.y -= b.min.y
      g.add(c)
      setObj(g)
    }).catch(() => setObj(null))
    return () => { vivo = false }
  }, [m.fmt, m.dados])
  if (!obj) return null
  const esc = (m.esc || 1) * (m.fmt === 'glb' || m.fmt === 'gltf' ? 1 : M)
  return (
    <group position={w3(m.x, m.y, m.z)} rotation={[0, ((m.rot || 0) * Math.PI) / 180, 0]} scale={[esc, esc, esc]} {...ev}>
      <primitive object={obj} />
      {on(opts.sel, 'modelo', m.id) && <BoxSel obj={obj} />}
    </group>
  )
}

function BoxSel({ obj }: { obj: Object3D }) {
  const b = new Box3().setFromObject(obj)
  const s = b.getSize(new Vector3()), c = b.getCenter(new Vector3())
  return (
    <mesh position={c} scale={s.toArray()} raycast={() => null}>
      <boxGeometry />
      <meshBasicMaterial color="#2f6db5" wireframe />
    </mesh>
  )
}

export function Extras() {
  const room = useRoom((s) => s.room)
  const opts = useRoom((s) => s.opts)
  return (
    <group>
      {camadaOn(opts, 'luzes') && room.luzes.map((l) => <LuzItem key={l.id} l={l} />)}
      {camadaOn(opts, 'textos') && room.textos.map((t) => <TextoItem key={t.id} t={t} />)}
      {camadaOn(opts, 'imagens') && room.imagens.map((i) => <ImagemItem key={i.id} i={i} />)}
      {camadaOn(opts, 'modelos') && room.modelos.map((m) => <ModeloItem key={m.id} m={m} />)}
    </group>
  )
}
