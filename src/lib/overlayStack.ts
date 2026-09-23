/**
 * Pilha global de overlays (dropdown/modal/drawer).
 * ESC fecha só o topo. Nunca cancela robô, busca ou filtros.
 */
type Layer = { id: number; close: () => void }

let layers: Layer[] = []
let seq = 1
let listening = false

function isNativeSelectTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false
  const el = target.closest('select, option')
  return Boolean(el)
}

function onKeyDown(e: KeyboardEvent) {
  if (e.key !== 'Escape') return
  if (!layers.length) {
    const closers = document.querySelectorAll<HTMLElement>('[data-nexus-esc]')
    const last = closers[closers.length - 1]
    if (!last) return
    e.preventDefault()
    e.stopPropagation()
    last.click()
    return
  }
  if (isNativeSelectTarget(e.target) || document.activeElement?.tagName === 'SELECT') return
  e.preventDefault()
  e.stopPropagation()
  const top = layers[layers.length - 1]
  top.close()
}

function ensureListener() {
  if (listening || typeof window === 'undefined') return
  listening = true
  window.addEventListener('keydown', onKeyDown, true)
}

ensureListener()

export function pushEscLayer(close: () => void): () => void {
  const id = seq++
  const layer: Layer = { id, close }
  layers.push(layer)
  ensureListener()
  return () => {
    layers = layers.filter((l) => l.id !== id)
  }
}
