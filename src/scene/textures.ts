import * as THREE from 'three'

// Texturas procedurais (canvas): nada é baixado, tudo funciona offline.

export function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function hashString(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

const cache = new Map<string, THREE.CanvasTexture>()

function canvasTexture(
  key: string,
  width: number,
  height: number,
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
  repeat = false,
): THREE.CanvasTexture {
  const hit = cache.get(key)
  if (hit) return hit
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  draw(canvas.getContext('2d')!, width, height)
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 8
  if (repeat) tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  cache.set(key, tex)
  return tex
}

const FONT = '"Segoe UI", system-ui, -apple-system, sans-serif'

/** Granito polido cinza com pontos pretos/brancos; 2×2 placas de 0,8 m por repetição (1,6 m). */
export function graniteTexture(): THREE.CanvasTexture {
  return canvasTexture(
    'granite',
    1024,
    1024,
    (ctx, w, h) => {
      ctx.fillStyle = '#b9bcbe'
      ctx.fillRect(0, 0, w, h)
      const r = rng(7)
      const palette: [string, number][] = [
        ['#2c2d2f', 0.34],
        ['#f3f2ef', 0.26],
        ['#8b8e91', 0.2],
        ['#d9d7d2', 0.12],
        ['#5e6164', 0.08],
      ]
      for (let i = 0; i < 70000; i++) {
        let pick = r()
        let color = palette[0][0]
        for (const [c, weight] of palette) {
          if ((pick -= weight) <= 0) {
            color = c
            break
          }
        }
        ctx.fillStyle = color
        const size = 0.6 + r() * r() * 3.2
        ctx.globalAlpha = 0.55 + r() * 0.45
        ctx.fillRect(r() * w, r() * h, size, size * (0.6 + r() * 0.8))
      }
      ctx.globalAlpha = 0.28
      ctx.strokeStyle = '#6f7275'
      ctx.lineWidth = 2
      for (const p of [1, w / 2, w - 1]) {
        ctx.beginPath()
        ctx.moveTo(p, 0)
        ctx.lineTo(p, h)
        ctx.moveTo(0, p)
        ctx.lineTo(w, p)
        ctx.stroke()
      }
      ctx.globalAlpha = 1
    },
    true,
  )
}

const ART = ['#5b2a86', '#d9a520', '#2b6f7a', '#1d2b4f', '#8a6bbf', '#c9b04f', '#3e8f8a']

/** Pilar pintado (tinta manchada roxo/mostarda/petróleo) com faixas brancas curvas. */
export function artColumnTexture(seed: number): THREE.CanvasTexture {
  return canvasTexture(`art-${seed % 6}`, 256, 1024, (ctx, w, h) => {
    const r = rng(1000 + (seed % 6))
    ctx.fillStyle = '#1f2d52'
    ctx.fillRect(0, 0, w, h)
    ctx.filter = 'blur(10px)'
    for (let i = 0; i < 70; i++) {
      ctx.globalAlpha = 0.35 + r() * 0.5
      ctx.fillStyle = ART[Math.floor(r() * ART.length)]
      ctx.beginPath()
      ctx.ellipse(r() * w, r() * h, 20 + r() * 90, 30 + r() * 140, r() * Math.PI, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.filter = 'none'
    for (let i = 0; i < 2500; i++) {
      ctx.globalAlpha = 0.25 + r() * 0.4
      ctx.fillStyle = ART[Math.floor(r() * ART.length)]
      ctx.fillRect(r() * w, r() * h, 2 + r() * 3, 2 + r() * 3)
    }
    ctx.globalAlpha = 0.95
    ctx.strokeStyle = '#ffffff'
    ctx.lineCap = 'round'
    ctx.lineWidth = 20
    for (const y of [h * (0.18 + r() * 0.1), h * (0.55 + r() * 0.12)]) {
      ctx.beginPath()
      ctx.moveTo(w * 0.32, y)
      ctx.bezierCurveTo(w * 0.85, y + 60, w * 0.85, y + 150, w * 0.4, y + 210)
      ctx.stroke()
    }
    ctx.globalAlpha = 1
  })
}

/** Pilar branco com faixa vermelha e quadrado amarelo com a letra da zona. */
export function zoneColumnTexture(label: string): THREE.CanvasTexture {
  return canvasTexture(`zone-${label}`, 256, 1024, (ctx, w, h) => {
    ctx.fillStyle = '#f2f2ef'
    ctx.fillRect(0, 0, w, h)
    ctx.fillStyle = '#f2c230'
    ctx.fillRect(0, h * 0.13, w, h * 0.02)
    ctx.fillRect(0, h * 0.27, w, h * 0.02)
    ctx.fillStyle = '#c62828'
    ctx.fillRect(0, h * 0.15, w, h * 0.12)
    ctx.fillStyle = '#f2c230'
    ctx.fillRect(w * 0.3, h * 0.16, w * 0.4, h * 0.1)
    ctx.fillStyle = '#1a1a1a'
    ctx.font = `bold ${Math.round(h * 0.085)}px ${FONT}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(label, w / 2, h * 0.212)
  })
}

const KANBAN_COLUMNS = ['BACKLOG', 'A FAZER', 'FAZENDO', 'REVISÃO', 'FEITO']
const POSTITS = ['#fde047', '#f9a8d4', '#86efac', '#93c5fd', '#fdba74']

/** Quadro negro com colunas de kanban riscadas a giz e post-its. */
export function kanbanTexture(seed: number): THREE.CanvasTexture {
  return canvasTexture(`kanban-${seed % 3}`, 1024, 600, (ctx, w, h) => {
    const r = rng(300 + (seed % 3))
    ctx.fillStyle = '#17191a'
    ctx.fillRect(0, 0, w, h)
    ctx.strokeStyle = 'rgba(240,240,235,0.85)'
    ctx.lineWidth = 3
    const colW = w / KANBAN_COLUMNS.length
    ctx.beginPath()
    ctx.moveTo(10, 70)
    ctx.lineTo(w - 10, 70)
    for (let i = 1; i < KANBAN_COLUMNS.length; i++) {
      ctx.moveTo(i * colW, 15)
      ctx.lineTo(i * colW, h - 15)
    }
    ctx.stroke()
    ctx.fillStyle = 'rgba(240,240,235,0.9)'
    ctx.font = `600 30px ${FONT}`
    ctx.textAlign = 'center'
    KANBAN_COLUMNS.forEach((name, i) => ctx.fillText(name, i * colW + colW / 2, 52))
    for (let i = 0; i < KANBAN_COLUMNS.length; i++) {
      const cards = 1 + Math.floor(r() * 5)
      for (let c = 0; c < cards; c++) {
        ctx.fillStyle = POSTITS[Math.floor(r() * POSTITS.length)]
        const x = i * colW + 18 + (c % 2) * (colW / 2 - 6) + r() * 6
        const y = 95 + Math.floor(c / 2) * 95 + r() * 10
        ctx.fillRect(x, y, colW / 2 - 30, 70)
      }
    }
  })
}

/** Quadro branco com moldura de alumínio e rabiscos de caneta. */
export function whiteboardTexture(seed: number): THREE.CanvasTexture {
  return canvasTexture(`whiteboard-${seed % 3}`, 1024, 512, (ctx, w, h) => {
    const r = rng(500 + (seed % 3))
    const grad = ctx.createLinearGradient(0, 0, w, h)
    grad.addColorStop(0, '#fbfcfc')
    grad.addColorStop(1, '#e9eeee')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, w, h)
    ctx.strokeStyle = '#b8bec3'
    ctx.lineWidth = 14
    ctx.strokeRect(7, 7, w - 14, h - 14)
    ctx.lineWidth = 3
    for (let line = 0; line < 9; line++) {
      ctx.strokeStyle = r() > 0.3 ? 'rgba(40,60,120,0.55)' : 'rgba(30,30,30,0.5)'
      const y = 70 + line * 38
      let x = 80 + r() * 40
      ctx.beginPath()
      ctx.moveTo(x, y)
      const end = x + 150 + r() * 380
      while (x < end) {
        x += 8 + r() * 10
        ctx.lineTo(x, y + (r() - 0.5) * 10)
      }
      ctx.stroke()
    }
  })
}

/** Divisória branca com frisos horizontais. */
export function dividerTexture(): THREE.CanvasTexture {
  return canvasTexture('divider', 64, 128, (ctx, w, h) => {
    ctx.fillStyle = '#f3f3f0'
    ctx.fillRect(0, 0, w, h)
    ctx.fillStyle = '#c9cbcc'
    for (const y of [0.3, 0.55, 0.8]) ctx.fillRect(0, h * y, w, 3)
  })
}

/** Frente do gaveteiro com puxador vertical. */
export function pedestalTexture(): THREE.CanvasTexture {
  return canvasTexture('pedestal', 128, 192, (ctx, w, h) => {
    ctx.fillStyle = '#efefec'
    ctx.fillRect(0, 0, w, h)
    ctx.fillStyle = '#d7d8d6'
    ctx.fillRect(0, h * 0.33, w, 2)
    ctx.fillStyle = '#9ea2a5'
    ctx.fillRect(w * 0.78, h * 0.08, 6, h * 0.18)
    ctx.fillRect(w * 0.78, h * 0.42, 6, h * 0.3)
  })
}

/** Mural geométrico (triângulos coloridos). */
export function muralTexture(seed: number): THREE.CanvasTexture {
  return canvasTexture(`mural-${seed % 2}`, 1024, 600, (ctx, w, h) => {
    const r = rng(800 + (seed % 2))
    ctx.fillStyle = '#f4f1ea'
    ctx.fillRect(0, 0, w, h)
    const colors = ['#d9373b', '#1f8f8f', '#f2b632', '#1d2b4f', '#e86f9a', '#2f9e44']
    for (let i = 0; i < 90; i++) {
      ctx.fillStyle = colors[Math.floor(r() * colors.length)]
      ctx.globalAlpha = 0.85
      const x = r() * w
      const y = r() * h
      const s = 30 + r() * 110
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.lineTo(x + s * (r() - 0.2), y + s * (r() - 0.5))
      ctx.lineTo(x + s * (r() - 0.6), y + s * r())
      ctx.closePath()
      ctx.fill()
    }
    ctx.globalAlpha = 1
  })
}

/** Painel institucional: cor sólida, uma faixa curva e "linhas de texto" abstratas. */
export function panelTexture(color: string): THREE.CanvasTexture {
  return canvasTexture(`panel-${color}`, 256, 512, (ctx, w, h) => {
    const grad = ctx.createLinearGradient(0, 0, 0, h)
    grad.addColorStop(0, color)
    grad.addColorStop(1, shade(color, -0.25))
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, w, h)
    ctx.strokeStyle = 'rgba(255,255,255,0.8)'
    ctx.lineWidth = 6
    ctx.beginPath()
    ctx.moveTo(w * 0.15, h * 0.62)
    ctx.quadraticCurveTo(w * 0.7, h * 0.45, w * 0.9, h * 0.15)
    ctx.stroke()
    ctx.fillStyle = 'rgba(255,255,255,0.85)'
    for (let i = 0; i < 4; i++) ctx.fillRect(w * 0.15, h * (0.72 + i * 0.05), w * (0.7 - i * 0.12), 9)
  })
}

export function exitSignTexture(): THREE.CanvasTexture {
  return canvasTexture('exit-sign', 256, 96, (ctx, w, h) => {
    ctx.fillStyle = '#c62828'
    ctx.fillRect(0, 0, w, h)
    ctx.fillStyle = '#ffffff'
    ctx.font = `bold 58px ${FONT}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('SAÍDA', w / 2, h / 2 + 3)
  })
}

/** Grelha redonda de insuflamento de ar no piso. */
export function ventTexture(): THREE.CanvasTexture {
  return canvasTexture('vent', 128, 128, (ctx, w, h) => {
    ctx.fillStyle = '#26282a'
    ctx.fillRect(0, 0, w, h)
    ctx.strokeStyle = '#4b4f53'
    ctx.lineWidth = 3
    for (let rad = 12; rad < 64; rad += 9) {
      ctx.beginPath()
      ctx.arc(w / 2, h / 2, rad, 0, Math.PI * 2)
      ctx.stroke()
    }
    ctx.fillStyle = '#3a3d40'
    ctx.beginPath()
    ctx.arc(w / 2, h / 2, 10, 0, Math.PI * 2)
    ctx.fill()
  })
}

/** Forro com placas 0,625 m e luminárias de 4 lâmpadas (usado só na calibração). */
export function ceilingTexture(): THREE.CanvasTexture {
  return canvasTexture(
    'ceiling',
    1024,
    1024,
    (ctx, w, h) => {
      ctx.fillStyle = '#eceeee'
      ctx.fillRect(0, 0, w, h)
      ctx.strokeStyle = '#c9cdcf'
      ctx.lineWidth = 2
      const cell = w / 8
      for (let i = 0; i <= 8; i++) {
        ctx.beginPath()
        ctx.moveTo(i * cell, 0)
        ctx.lineTo(i * cell, h)
        ctx.moveTo(0, i * cell)
        ctx.lineTo(w, i * cell)
        ctx.stroke()
      }
      for (const [cx, cy] of [
        [1, 1],
        [5, 5],
      ]) {
        ctx.fillStyle = '#d5d9db'
        ctx.fillRect(cx * cell, cy * cell, cell * 2, cell)
        ctx.fillStyle = '#ffffff'
        for (let k = 0; k < 4; k++) ctx.fillRect(cx * cell + 12 + k * ((cell * 2 - 24) / 4), cy * cell + 14, (cell * 2 - 24) / 4 - 10, cell - 28)
      }
    },
    true,
  )
}

/** Etiqueta (sprite) com texto, ex.: ID da bancada. */
export function labelTexture(text: string, bg = 'rgba(15,23,42,0.82)', fg = '#ffffff'): THREE.CanvasTexture {
  return canvasTexture(`label-${text}-${bg}-${fg}`, 256, 128, (ctx, w, h) => {
    ctx.fillStyle = bg
    ctx.beginPath()
    ctx.roundRect(8, 16, w - 16, h - 32, 36)
    ctx.fill()
    ctx.fillStyle = fg
    ctx.font = `700 60px ${FONT}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(text, w / 2, h / 2 + 3)
  })
}

function shade(hex: string, amount: number): string {
  const c = new THREE.Color(hex)
  c.offsetHSL(0, 0, amount * 0.5)
  return `#${c.getHexString()}`
}
