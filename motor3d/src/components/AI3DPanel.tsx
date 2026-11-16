import { useRef, useState } from 'react'
import { useRoom, type Modelo } from '../ambiente/store'

type Props = { onClose: () => void }
type Stage = 'idle' | 'sending' | 'done' | 'error'

const API = 'http://127.0.0.1:47832/generate'

function toBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  const step = 0x8000
  for (let i = 0; i < bytes.length; i += step) {
    binary += String.fromCharCode(...bytes.subarray(i, i + step))
  }
  return btoa(binary)
}

function inserirModelo(dados: string, nome: string) {
  const state = useRoom.getState()
  const id = crypto.randomUUID()
  const modelo: Modelo = {
    id, nome, fmt: 'glb', dados, x: 0, y: 0, z: 0, rot: 0, esc: 1,
  }
  state.setRoom({ ...state.room, modelos: [...state.room.modelos, modelo] }, {})
  state.setOpts({ sel: { t: 'modelo', id } })
}

export function AI3DPanel({ onClose }: Props) {
  const imageInput = useRef<HTMLInputElement>(null)
  const modelInput = useRef<HTMLInputElement>(null)
  const [image, setImage] = useState<File | null>(null)
  const [preview, setPreview] = useState('')
  const [category, setCategory] = useState('personagem')
  const [quality, setQuality] = useState('alta')
  const [topology, setTopology] = useState('jogo')
  const [stage, setStage] = useState<Stage>('idle')
  const [message, setMessage] = useState('Envie uma imagem para começar.')
  const [progress, setProgress] = useState(0)

  const chooseImage = (file?: File) => {
    if (!file || !file.type.startsWith('image/')) return
    setImage(file)
    setPreview(URL.createObjectURL(file))
    setStage('idle')
    setMessage('Imagem pronta. Ajuste as opções e gere o modelo.')
  }

  const generate = async () => {
    if (!image || stage === 'sending') return
    setStage('sending')
    setProgress(8)
    setMessage('Enviando imagem para o motor de geração local...')
    const data = new FormData()
    data.append('image', image)
    data.append('category', category)
    data.append('quality', quality)
    data.append('topology', topology)
    try {
      const response = await fetch(API, { method: 'POST', body: data })
      if (!response.ok) throw new Error((await response.text()) || 'O motor de IA não conseguiu gerar o modelo.')
      setProgress(82)
      const type = response.headers.get('content-type') || ''
      let base64 = ''
      if (type.includes('application/json')) {
        const result = await response.json() as { glb_base64?: string; name?: string }
        if (!result.glb_base64) throw new Error('A resposta do motor não contém um arquivo GLB.')
        base64 = result.glb_base64
        inserirModelo(base64, result.name || image.name.replace(/\.[^.]+$/, ''))
      } else {
        const blob = await response.blob()
        if (!blob.size) throw new Error('O motor retornou um arquivo vazio.')
        base64 = toBase64(await blob.arrayBuffer())
        inserirModelo(base64, image.name.replace(/\.[^.]+$/, ''))
      }
      setProgress(100)
      setStage('done')
      setMessage('Modelo inserido na cena 3D. Você já pode selecioná-lo e posicioná-lo.')
    } catch (error) {
      setStage('error')
      setMessage(error instanceof Error && error.message.includes('fetch')
        ? 'Motor de IA local não encontrado. Inicie o serviço de geração e tente novamente.'
        : error instanceof Error ? error.message : 'Falha ao gerar o modelo.')
    }
  }

  const importModel = async (file?: File) => {
    if (!file || !/\.(glb|gltf)$/i.test(file.name)) {
      setMessage('Escolha um arquivo GLB ou GLTF.')
      return
    }
    try {
      const base64 = toBase64(await file.arrayBuffer())
      inserirModelo(base64, file.name.replace(/\.(glb|gltf)$/i, ''))
      setStage('done')
      setMessage('Modelo importado e inserido na cena 3D.')
    } catch {
      setStage('error')
      setMessage('Não foi possível importar esse modelo.')
    }
  }

  return (
    <section className="absolute inset-0 z-40 flex min-h-0 flex-col bg-bg text-ink">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-edge bg-surface px-5">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-violet-600 text-lg text-white">✦</span>
          <div>
            <h2 className="text-sm font-semibold">Oficina 3D com IA</h2>
            <p className="text-xs text-ink-dim">Imagem para modelo tridimensional</p>
          </div>
        </div>
        <button className="rounded-md px-3 py-2 text-ink-dim hover:bg-surface-2" onClick={onClose} aria-label="Fechar">✕</button>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-auto p-4 lg:grid-cols-[minmax(280px,390px)_1fr]">
        <div className="flex min-h-0 flex-col gap-4">
          <div className="rounded-xl border border-edge bg-surface p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold">1. Imagem de referência</h3>
              <span className="text-xs text-ink-dim">PNG, JPG, WEBP</span>
            </div>
            <button
              className="group flex min-h-56 w-full flex-col items-center justify-center overflow-hidden rounded-lg border-2 border-dashed border-edge-strong bg-bg transition hover:border-violet-500"
              onClick={() => imageInput.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); chooseImage(e.dataTransfer.files[0]) }}
            >
              {preview ? <img src={preview} alt="Imagem de referência" className="max-h-64 w-full object-contain" /> : (
                <>
                  <span className="mb-3 text-4xl text-ink-faint">▧</span>
                  <span className="text-sm font-medium">Arraste uma imagem ou clique para escolher</span>
                  <span className="mt-1 text-xs text-ink-dim">Uma imagem nítida, com o objeto inteiro, funciona melhor</span>
                </>
              )}
            </button>
            <input ref={imageInput} hidden type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => chooseImage(e.target.files?.[0])} />
            {image && <div className="mt-2 flex items-center justify-between text-xs text-ink-dim"><span className="max-w-[75%] truncate">{image.name}</span><button onClick={() => { setImage(null); setPreview('') }} className="text-danger">Remover</button></div>}
          </div>

          <div className="rounded-xl border border-edge bg-surface p-4">
            <h3 className="mb-3 text-sm font-semibold">2. Configuração</h3>
            <label className="mb-1 block text-xs text-ink-dim">Tipo de modelo</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="mb-3 w-full rounded-md border border-edge bg-bg px-3 py-2">
              <option value="personagem">Personagem / Criatura</option>
              <option value="objeto">Objeto / Acessório</option>
              <option value="movel">Móvel / Produto</option>
              <option value="ambiente">Peça de ambiente</option>
            </select>
            <label className="mb-1 block text-xs text-ink-dim">Qualidade</label>
            <select value={quality} onChange={(e) => setQuality(e.target.value)} className="mb-3 w-full rounded-md border border-edge bg-bg px-3 py-2">
              <option value="rapida">Rápida (prévia)</option>
              <option value="alta">Alta (detalhes e textura)</option>
            </select>
            <label className="mb-1 block text-xs text-ink-dim">Topologia</label>
            <select value={topology} onChange={(e) => setTopology(e.target.value)} className="w-full rounded-md border border-edge bg-bg px-3 py-2">
              <option value="original">Manter original</option>
              <option value="jogo">Otimizada para jogo</option>
              <option value="detalhe">Preservar detalhes</option>
            </select>
          </div>

          <button disabled={!image || stage === 'sending'} onClick={generate} className="flex items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-3 font-semibold text-white shadow-sm transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-45">
            ✦ {stage === 'sending' ? 'Gerando modelo...' : 'Gerar modelo 3D'}
          </button>
          <div className="rounded-lg border border-edge bg-surface p-3">
            <div className="mb-2 flex items-center justify-between text-xs"><span className="font-medium">Status da geração</span><span className="text-ink-dim">{stage === 'sending' ? progress + '%' : stage === 'done' ? 'Concluído' : stage === 'error' ? 'Atenção' : 'Aguardando'}</span></div>
            <div className="h-2 overflow-hidden rounded-full bg-surface-3"><div className={`h-full rounded-full transition-all ${stage === 'error' ? 'bg-danger' : 'bg-violet-500'}`} style={{ width: `${progress}%` }} /></div>
            <p className="mt-2 text-xs text-ink-dim">{message}</p>
          </div>
        </div>

        <div className="flex min-h-[420px] flex-col rounded-xl border border-edge bg-surface p-4">
          <div className="flex items-center justify-between border-b border-edge pb-3">
            <div><h3 className="text-sm font-semibold">3. Modelo na cena</h3><p className="text-xs text-ink-dim">O resultado entra diretamente no ambiente 3D do Project3D</p></div>
            <span className="rounded-md bg-surface-2 px-2 py-1 text-xs text-ink-dim">GLB / GLTF</span>
          </div>
          <div className="grid flex-1 place-items-center">
            <div className="max-w-sm text-center">
              <div className="mx-auto mb-4 grid h-28 w-28 place-items-center rounded-2xl border border-edge bg-bg text-5xl text-ink-faint">⬡</div>
              <p className="text-sm font-medium">A visualização 3D aparece aqui</p>
              <p className="mt-2 text-xs leading-5 text-ink-dim">Depois da geração, o modelo é inserido na cena atual. Você poderá girar a câmera, selecionar, mover e exportar junto com o projeto.</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-edge pt-3">
            <div className="text-xs text-ink-dim">Já tem um modelo pronto?</div>
            <button onClick={() => modelInput.current?.click()} className="rounded-md border border-edge-strong px-3 py-2 text-xs font-medium hover:bg-surface-2">Importar GLB / GLTF</button>
            <input ref={modelInput} hidden type="file" accept=".glb,.gltf,model/gltf-binary,model/gltf+json" onChange={(e) => importModel(e.target.files?.[0])} />
          </div>
        </div>
      </div>
      <footer className="flex shrink-0 items-center justify-between border-t border-edge bg-surface px-5 py-2 text-[11px] text-ink-dim">
        <span>Project3D · Oficina IA</span>
        <span>Geração local: 127.0.0.1:47832</span>
      </footer>
    </section>
  )
}
