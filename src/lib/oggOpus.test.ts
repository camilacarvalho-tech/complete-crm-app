import assert from 'node:assert/strict'
import test from 'node:test'
import { crcOgg, muxOpusParaOgg } from './oggOpus.ts'

test('áudio Opus vira OGG com cabeçalho e checksum', () => {
  const ogg = muxOpusParaOgg([new Uint8Array([0x01, 0x02, 0x03, 0x04])])
  assert.equal(String.fromCharCode(...ogg.slice(0, 4)), 'OggS')
  const head = new TextDecoder().decode(ogg)
  assert.equal(head.includes('OpusHead'), true)
  assert.equal(head.includes('OpusTags'), true)
  const page = new Uint8Array(ogg.slice(0, 47))
  const view = new DataView(page.buffer)
  const checksum = view.getUint32(22, true)
  view.setUint32(22, 0, true)
  assert.equal(crcOgg(page), checksum)
})
