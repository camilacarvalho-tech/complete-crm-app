/**
 * Markdown leve para respostas da Nexus AI (sem dependência externa).
 * Suporta: headings, bold, italic, code blocks, inline code, links, listas.
 */

import { useMemo } from 'react'

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function inlineFormat(text: string): string {
  let t = escapeHtml(text)
  t = t.replace(/`([^`]+)`/g, '<code class="ai-code">$1</code>')
  t = t.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  t = t.replace(/(^|[^*])\*([^*]+)\*(?!\*)/g, '$1<em>$2</em>')
  t = t.replace(
    /\[([^\]]+)\]\((https?:[^)\s]+)\)/g,
    '<a href="$2" target="_blank" rel="noreferrer" class="ai-link">$1</a>'
  )
  return t
}

function markdownToHtml(md: string): string {
  const lines = (md || '').replace(/\r\n/g, '\n').split('\n')
  const out: string[] = []
  let inCode = false
  let codeLang = ''
  let codeBuf: string[] = []
  let inUl = false
  let inOl = false

  const closeLists = () => {
    if (inUl) {
      out.push('</ul>')
      inUl = false
    }
    if (inOl) {
      out.push('</ol>')
      inOl = false
    }
  }

  for (const raw of lines) {
    if (raw.startsWith('```')) {
      if (!inCode) {
        closeLists()
        inCode = true
        codeLang = raw.slice(3).trim()
        codeBuf = []
      } else {
        out.push(
          `<pre class="ai-pre"><code class="language-${escapeHtml(codeLang)}">${escapeHtml(
            codeBuf.join('\n')
          )}</code></pre>`
        )
        inCode = false
        codeLang = ''
        codeBuf = []
      }
      continue
    }
    if (inCode) {
      codeBuf.push(raw)
      continue
    }

    if (/^\s*[-*]\s+/.test(raw)) {
      if (!inUl) {
        closeLists()
        out.push('<ul class="ai-ul">')
        inUl = true
      }
      out.push(`<li>${inlineFormat(raw.replace(/^\s*[-*]\s+/, ''))}</li>`)
      continue
    }
    if (/^\s*\d+\.\s+/.test(raw)) {
      if (!inOl) {
        closeLists()
        out.push('<ol class="ai-ol">')
        inOl = true
      }
      out.push(`<li>${inlineFormat(raw.replace(/^\s*\d+\.\s+/, ''))}</li>`)
      continue
    }

    closeLists()

    if (/^###\s+/.test(raw)) {
      out.push(`<h3 class="ai-h3">${inlineFormat(raw.replace(/^###\s+/, ''))}</h3>`)
    } else if (/^##\s+/.test(raw)) {
      out.push(`<h2 class="ai-h2">${inlineFormat(raw.replace(/^##\s+/, ''))}</h2>`)
    } else if (/^#\s+/.test(raw)) {
      out.push(`<h1 class="ai-h1">${inlineFormat(raw.replace(/^#\s+/, ''))}</h1>`)
    } else if (/^>\s?/.test(raw)) {
      out.push(`<blockquote class="ai-quote">${inlineFormat(raw.replace(/^>\s?/, ''))}</blockquote>`)
    } else if (!raw.trim()) {
      out.push('<div class="ai-spacer"></div>')
    } else {
      out.push(`<p class="ai-p">${inlineFormat(raw)}</p>`)
    }
  }
  closeLists()
  if (inCode) {
    out.push(`<pre class="ai-pre"><code>${escapeHtml(codeBuf.join('\n'))}</code></pre>`)
  }
  return out.join('\n')
}

export function AiMarkdown({ content }: { content: string }) {
  const html = useMemo(() => markdownToHtml(content), [content])
  return (
    <div
      className="ai-md text-sm leading-relaxed"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
