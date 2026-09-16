import { useEffect, useRef } from 'react'
import { pushEscLayer } from '../lib/overlayStack'

export function useEscLayer(active: boolean, onClose: () => void) {
  const closeRef = useRef(onClose)
  closeRef.current = onClose
  useEffect(() => {
    if (!active) return
    return pushEscLayer(() => closeRef.current())
  }, [active])
}

export function useClickOutside(
  active: boolean,
  ref: { current: HTMLElement | null },
  onClose: () => void
) {
  useEffect(() => {
    if (!active) return
    const onDown = (e: MouseEvent) => {
      const el = ref.current
      if (!el) return
      if (e.target instanceof Node && !el.contains(e.target)) onClose()
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [active, ref, onClose])
}
