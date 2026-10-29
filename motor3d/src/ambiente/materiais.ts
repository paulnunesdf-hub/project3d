import { CanvasTexture, Color, MeshStandardMaterial, RepeatWrapping, SRGBColorSpace, DoubleSide, type Texture } from 'three'

/* Acabamentos do ambiente (piso, paredes, aberturas). As texturas são desenhadas
   na hora num canvas, para o programa funcionar sem internet. Cada textura cobre
   1 m × 1 m e repete, porque as coordenadas de textura das peças estão em metros. */

export const ACABAMENTOS: Record<string, { nome: string; cor: string; grupo: string[]; rug: number; met?: number }> = {
  pintura: { nome: 'Pintura', cor: '#ece8df', grupo: ['parede', 'piso', 'teto', 'geo'], rug: 0.9 },
  tijolo: { nome: 'Tijolo aparente', cor: '#b5654a', grupo: ['parede', 'geo'], rug: 0.95 },
  azulejo: { nome: 'Azulejo 20×20', cor: '#f4f6f7', grupo: ['parede', 'geo'], rug: 0.25 },
  concreto: { nome: 'Concreto', cor: '#a8a49c', grupo: ['parede', 'piso', 'teto', 'geo'], rug: 0.9 },
  pedra: { nome: 'Pedra', cor: '#9c958a', grupo: ['parede', 'geo'], rug: 0.8 },
  gesso: { nome: 'Gesso', cor: '#f7f7f4', grupo: ['parede', 'teto', 'geo'], rug: 0.95 },
  madeira: { nome: 'Madeira', cor: '#b98a5a', grupo: ['piso', 'parede', 'abertura', 'geo'], rug: 0.6 },
  porcelanato: { nome: 'Porcelanato 60×60', cor: '#dcd8d0', grupo: ['piso', 'parede', 'geo'], rug: 0.2 },
  ceramica: { nome: 'Cerâmica 45×45', cor: '#cbb9a0', grupo: ['piso', 'parede', 'geo'], rug: 0.45 },
  cimento: { nome: 'Cimento queimado', cor: '#8f8d88', grupo: ['piso', 'parede', 'geo'], rug: 0.6 },
  carpete: { nome: 'Carpete', cor: '#7d8696', grupo: ['piso'], rug: 1 },
  aluminio: { nome: 'Alumínio', cor: '#c8ccd0', grupo: ['abertura', 'geo'], rug: 0.35, met: 0.8 },
  branco: { nome: 'Laca branca', cor: '#f5f5f2', grupo: ['abertura', 'geo'], rug: 0.4 },
  vidro: { nome: 'Vidro', cor: '#a9d3ea', grupo: ['abertura', 'parede', 'geo'], rug: 0.05 },
  mdf: { nome: 'MDF', cor: '#d9b380', grupo: ['geo'], rug: 0.6 },
}

export const PADRAO = { piso: 'porcelanato', parede: 'pintura', teto: 'gesso', abertura: 'madeira', geo: 'mdf' }

const cache = new Map<string, Texture>()

function ruido(g: CanvasRenderingContext2D, w: number, h: number, a: number) {
  const img = g.getImageData(0, 0, w, h)
  for (let i = 0; i < img.data.length; i += 4) {
    const r = (Math.random() - 0.5) * a
    img.data[i] += r
    img.data[i + 1] += r
    img.data[i + 2] += r
  }
  g.putImageData(img, 0, 0)
}

function desenha(tipo: string, cor: string): HTMLCanvasElement {
  const S = 512 // 1 m = 512 px
  const c = document.createElement('canvas')
  c.width = c.height = S
  const g = c.getContext('2d')!
  const base = new Color(cor)
  const tom = (k: number) => '#' + base.clone().multiplyScalar(k).getHexString()
  g.fillStyle = cor
  g.fillRect(0, 0, S, S)
  const grade = (passo: number, junta: string, lw: number) => {
    g.strokeStyle = junta
    g.lineWidth = lw
    for (let p = 0; p <= S; p += passo) {
      g.beginPath(); g.moveTo(p, 0); g.lineTo(p, S); g.stroke()
      g.beginPath(); g.moveTo(0, p); g.lineTo(S, p); g.stroke()
    }
  }
  switch (tipo) {
    case 'tijolo': {
      const bh = S / 16, bw = S / 4.5
      for (let r = 0; r < 16; r++)
        for (let k = -1; k < 6; k++) {
          g.fillStyle = tom(0.85 + Math.random() * 0.3)
          g.fillRect(k * bw + (r % 2 ? bw / 2 : 0) + 2, r * bh + 2, bw - 4, bh - 4)
        }
      ruido(g, S, S, 18)
      break
    }
    case 'azulejo': grade(S / 5, tom(0.82), 3); break
    case 'porcelanato':
      ruido(g, S, S, 10)
      grade(S * 0.6, tom(0.75), 2)
      break
    case 'ceramica':
      ruido(g, S, S, 22)
      grade(S * 0.45, tom(0.7), 3)
      break
    case 'madeira': {
      for (let y = 0; y < S; y += 2) {
        g.fillStyle = tom(0.82 + 0.18 * Math.sin(y * 0.09 + Math.sin(y * 0.013) * 4))
        g.fillRect(0, y, S, 2)
      }
      ruido(g, S, S, 14)
      g.strokeStyle = tom(0.6)
      g.lineWidth = 2
      for (let y = 0; y <= S; y += S / 5) { g.beginPath(); g.moveTo(0, y); g.lineTo(S, y); g.stroke() }
      for (let r = 0; r < 5; r++) {
        const x = ((r * 211) % S)
        g.beginPath(); g.moveTo(x, r * S / 5); g.lineTo(x, (r + 1) * S / 5); g.stroke()
      }
      break
    }
    case 'pedra': {
      for (let i = 0; i < 40; i++) {
        g.fillStyle = tom(0.75 + Math.random() * 0.4)
        g.beginPath()
        g.ellipse(Math.random() * S, Math.random() * S, 30 + Math.random() * 60, 20 + Math.random() * 40, Math.random() * 3, 0, 7)
        g.fill()
      }
      ruido(g, S, S, 25)
      break
    }
    case 'concreto': case 'cimento': ruido(g, S, S, tipo === 'concreto' ? 30 : 16); break
    case 'carpete': ruido(g, S, S, 40); break
    default: ruido(g, S, S, 5)
  }
  return c
}

export function textura(tipo: string, cor: string): Texture {
  const k = tipo + cor
  let t = cache.get(k)
  if (!t) {
    t = new CanvasTexture(desenha(tipo, cor))
    t.wrapS = t.wrapT = RepeatWrapping
    t.colorSpace = SRGBColorSpace
    t.anisotropy = 4
    cache.set(k, t)
  }
  return t
}

export interface EstiloMat { texturas: boolean; transparente?: boolean; branco?: boolean; preto?: boolean; sel?: boolean; invisivel?: boolean }

/** Material padrão (PBR) de um acabamento, já do jeito do modo de preenchimento. */
export function material(tipo: string | undefined, cor: string | undefined, e: EstiloMat, grupo = 'geo'): MeshStandardMaterial {
  const key = tipo && ACABAMENTOS[tipo] ? tipo : PADRAO[grupo as keyof typeof PADRAO] || 'pintura'
  const a = ACABAMENTOS[key]
  const c = cor || a.cor
  const m = new MeshStandardMaterial({
    color: e.sel ? '#8fb8e6' : e.preto ? '#000000' : e.branco ? '#ffffff' : e.texturas ? '#ffffff' : c,
    roughness: a.rug,
    metalness: a.met ?? 0,
    side: DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
  })
  if (e.texturas && !e.branco && !e.preto && !e.sel) m.map = textura(key, c)
  if (key === 'vidro' || e.transparente) {
    m.transparent = true
    m.opacity = key === 'vidro' ? 0.35 : 0.4
    m.depthWrite = false
  }
  if (e.invisivel) m.visible = false
  return m
}
