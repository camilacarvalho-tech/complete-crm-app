import { SEGMENTOS_MONITOR } from './segmentosMonitor.ts'

const ids = SEGMENTOS_MONITOR.map((s) => s.id as string)
if (ids.includes('mercados') || ids.includes('empresa_b2b')) {
  throw new Error('UI não deve oferecer mercados nem empresa_b2b')
}
if (!ids.includes('clinicas') || !ids.includes('credito')) throw new Error('segmentos principais ausentes')
const labels = SEGMENTOS_MONITOR.map((s) => s.label.toLowerCase())
if (labels.includes('mercados') || labels.includes('empresas')) throw new Error('labels proibidos na UI')
console.log('segmentosMonitor UI: OK')
