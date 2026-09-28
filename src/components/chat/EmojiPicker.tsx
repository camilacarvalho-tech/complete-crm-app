import { useMemo, useState } from 'react'
import { EMOJI_GROUPS, filterEmojis } from './emojiData'

export function EmojiPicker({ onPick, onClose }: { onPick: (emoji: string) => void; onClose: () => void }) {
  const [group, setGroup] = useState('smileys')
  const [query, setQuery] = useState('')
  const items = useMemo(() => filterEmojis(query, query ? '' : group), [group, query])
  return (
    <div className="mb-2 rounded-lg p-2" style={{ border: '1px solid var(--code-border)', background: 'var(--code-surface)' }}>
      <div className="flex items-center gap-2 mb-2">
        <input className="nexus-input flex-1 text-xs" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Pesquisar categoria" />
        <button type="button" className="text-xs font-semibold" onClick={onClose}>Fechar</button>
      </div>
      <div className="flex gap-1 overflow-x-auto mb-2">
        {EMOJI_GROUPS.map((item) => (
          <button key={item.id} type="button" className="text-[10px] px-2 py-1 rounded-full shrink-0" style={{ background: group === item.id ? 'var(--code-orange)' : 'var(--code-surface-muted)', color: group === item.id ? '#fff' : 'inherit' }} onClick={() => { setGroup(item.id); setQuery('') }}>
            {item.emojis[0]} {item.label}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-8 gap-1 max-h-40 overflow-y-auto">
        {items.map((emoji) => (
          <button key={emoji} type="button" className="text-lg" onClick={() => onPick(emoji)}>{emoji}</button>
        ))}
      </div>
    </div>
  )
}
