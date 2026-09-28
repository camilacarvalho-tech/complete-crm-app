/** Empacota pacotes Opus em OGG para a Cloud API aceitar o áudio do navegador. */

const CRC = new Uint32Array(256)
for (let i = 0; i < 256; i++) {
  let r = i << 24
  for (let j = 0; j < 8; j++) {
    r = (r & 0x80000000) ? ((r << 1) ^ 0x04c11db7) : (r << 1)
    r >>>= 0
  }
  CRC[i] = r
}

export function crcOgg(bytes: Uint8Array): number {
  let crc = 0
  for (let i = 0; i < bytes.length; i++) {
    crc = ((crc << 8) ^ CRC[((crc >>> 24) ^ bytes[i]) & 0xff]) >>> 0
  }
  return crc >>> 0
}

function pagina(packets: Uint8Array[], headerType: number, granule: number, serial: number, seq: number): Uint8Array {
  const lace: number[] = []
  let bodyLen = 0
  for (const packet of packets) {
    let left = packet.length
    if (left === 0) lace.push(0)
    while (left >= 255) {
      lace.push(255)
      left -= 255
    }
    if (packet.length > 0) lace.push(left)
    bodyLen += packet.length
  }
  const page = new Uint8Array(27 + lace.length + bodyLen)
  const view = new DataView(page.buffer)
  page.set([0x4f, 0x67, 0x67, 0x53], 0)
  page[5] = headerType
  view.setUint32(6, granule >>> 0, true)
  view.setUint32(10, Math.floor(granule / 4294967296), true)
  view.setUint32(14, serial >>> 0, true)
  view.setUint32(18, seq >>> 0, true)
  page[26] = lace.length
  page.set(lace, 27)
  let offset = 27 + lace.length
  for (const packet of packets) {
    page.set(packet, offset)
    offset += packet.length
  }
  view.setUint32(22, crcOgg(page), true)
  return page
}

function opusHead(): Uint8Array {
  const head = new Uint8Array(19)
  const view = new DataView(head.buffer)
  head.set(new TextEncoder().encode('OpusHead'))
  head[8] = 1
  head[9] = 1
  view.setUint16(10, 312, true)
  view.setUint32(12, 48000, true)
  return head
}

function opusTags(): Uint8Array {
  const vendor = new TextEncoder().encode('nexus')
  const tags = new Uint8Array(8 + 4 + vendor.length + 4)
  const view = new DataView(tags.buffer)
  tags.set(new TextEncoder().encode('OpusTags'))
  view.setUint32(8, vendor.length, true)
  tags.set(vendor, 12)
  return tags
}

export function muxOpusParaOgg(packets: Uint8Array[], samplesPerPacket = 960): Uint8Array {
  const serial = 0x4e455855
  const pages: Uint8Array[] = [
    pagina([opusHead()], 0x02, 0, serial, 0),
    pagina([opusTags()], 0x00, 0, serial, 1),
  ]
  let seq = 2
  let granule = 0
  let batch: Uint8Array[] = []
  let lace = 0
  const flush = (eos: boolean) => {
    if (!batch.length) return
    pages.push(pagina(batch, eos ? 0x04 : 0, granule, serial, seq))
    seq += 1
    batch = []
    lace = 0
  }
  for (const packet of packets) {
    const segments = Math.max(1, Math.ceil(packet.length / 255))
    if (batch.length && lace + segments > 255) flush(false)
    batch.push(packet)
    lace += segments
    granule += samplesPerPacket
  }
  flush(true)
  const total = pages.reduce((n, page) => n + page.length, 0)
  const out = new Uint8Array(total)
  let offset = 0
  for (const page of pages) {
    out.set(page, offset)
    offset += page.length
  }
  return out
}

type EncoderCtor = {
  isConfigSupported(config: { codec: string; sampleRate: number; numberOfChannels: number; bitrate: number }): Promise<{ supported?: boolean }>
  new (init: {
    output: (chunk: { byteLength: number; copyTo: (dest: Uint8Array) => void }) => void
    error: (err: Error) => void
  }): {
    configure(config: { codec: string; sampleRate: number; numberOfChannels: number; bitrate: number }): void
    encode(data: unknown): void
    flush(): Promise<void>
    close(): void
  }
}

/** Converte a gravação do navegador (WebM) em OGG Opus. Sem conversor, devolve null. */
export async function gravacaoParaOgg(file: Blob): Promise<Blob | null> {
  const Encoder = (globalThis as { AudioEncoder?: EncoderCtor }).AudioEncoder
  if (!Encoder || file.type.includes('ogg')) return file.type.includes('ogg') ? file : null
  const supported = await Encoder.isConfigSupported({
    codec: 'opus',
    sampleRate: 48000,
    numberOfChannels: 1,
    bitrate: 24000,
  }).catch(() => ({ supported: false }))
  if (!supported.supported || typeof AudioContext === 'undefined') return null
  const ctx = new AudioContext({ sampleRate: 48000 })
  try {
    const decoded = await ctx.decodeAudioData(await file.arrayBuffer())
    const channel = decoded.getChannelData(0)
    let samples = channel
    if (decoded.sampleRate !== 48000) {
      const next = Math.max(1, Math.round((channel.length * 48000) / decoded.sampleRate))
      const resized = new Float32Array(next)
      for (let i = 0; i < next; i++) {
        const pos = (i * decoded.sampleRate) / 48000
        const i0 = Math.floor(pos)
        const i1 = Math.min(channel.length - 1, i0 + 1)
        const frac = pos - i0
        resized[i] = channel[i0] * (1 - frac) + channel[i1] * frac
      }
      samples = resized
    }
    const packets: Uint8Array[] = []
    let falha = ''
    const encoder = new Encoder({
      output: (chunk) => {
        const buf = new Uint8Array(chunk.byteLength)
        chunk.copyTo(buf)
        packets.push(buf)
      },
      error: (err) => { falha = err.message },
    })
    encoder.configure({ codec: 'opus', sampleRate: 48000, numberOfChannels: 1, bitrate: 24000 })
    const frame = 960
    let timestamp = 0
    for (let i = 0; i < samples.length; i += frame) {
      const data = new Float32Array(frame)
      data.set(samples.subarray(i, Math.min(samples.length, i + frame)))
      const audio = new AudioData({
        format: 'f32-planar',
        sampleRate: 48000,
        numberOfFrames: frame,
        numberOfChannels: 1,
        timestamp,
        data,
      })
      encoder.encode(audio)
      audio.close()
      timestamp += 20000
    }
    await encoder.flush()
    encoder.close()
    if (falha || !packets.length) return null
    return new Blob([muxOpusParaOgg(packets)], { type: 'audio/ogg' })
  } catch {
    return null
  } finally {
    await ctx.close().catch(() => undefined)
  }
}
