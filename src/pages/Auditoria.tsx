import { useMemo, useState } from 'react'
import { useNexusStore } from '../contexts/NexusStore'
import { FilterDateRange } from '../components/nexus/Filters'
import { NexusModal } from '../components/nexus/Modal'
import { GhostButton, PageHeader, SelectInput, TextInput } from '../components/nexus/kit'
import { createdOf, toDate } from '../lib/nexusCore'
import { AUDIT_MODULES, moduloAuditoria } from '../lib/audit'
import { labelPt, textoMisto } from '../lib/uiPt'
import { formatCpfDisplay } from '../modules/digitacao/digitacaoDesk'

function pareceId(value: string) {
  return /^[A-Za-z0-9]{16,}$/.test(value)
}

function bloco(valor: unknown) {
  if (valor == null || valor === '') return '—'
  try {
    return JSON.stringify(valor, null, 2)
  } catch {
    return String(valor)
  }
}

export default function Auditoria() {
  const { auditoria, clientes } = useNexusStore()
  const [funcionario, setFuncionario] = useState('')
  const [cliente, setCliente] = useState('')
  const [modulo, setModulo] = useState('')
  const [submodulo, setSubmodulo] = useState('')
  const [acao, setAcao] = useState('')
  const [origem, setOrigem] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [aberto, setAberto] = useState<Record<string, unknown> | null>(null)
  const [listaAberta, setListaAberta] = useState(false)

  const rows = useMemo(() => {
    return auditoria.items.filter((a) => {
      const nomeFun = String(a.funcionarioNome || a.usuarioNome || '').toLowerCase()
      const depois = a.dadosDepois && typeof a.dadosDepois === 'object' ? a.dadosDepois as Record<string, unknown> : (a.depois && typeof a.depois === 'object' ? a.depois as Record<string, unknown> : {})
      const nomeCli = String(a.clienteNome || depois.clienteNome || depois.nome || '').toLowerCase()
      const cpf = String(a.cpfCliente || depois.cpf || '')
      const alvo = `${nomeCli} ${cpf} ${a.entidadeId || ''}`
      const when = toDate(createdOf(a) || a.quando)
      if (/lead\s+homolog/i.test(nomeCli)) return false
      if (funcionario && !nomeFun.includes(funcionario.toLowerCase())) return false
      if (cliente && !alvo.includes(cliente.toLowerCase())) return false
      if (modulo && moduloAuditoria(String(a.modulo || '')) !== modulo) return false
      if (submodulo && !String(a.submodulo || '').toLowerCase().includes(submodulo.toLowerCase())) return false
      if (acao && !`${a.acao || ''} ${a.descricao || ''}`.toLowerCase().includes(acao.toLowerCase())) return false
      if (origem && String(a.origem || '').toLowerCase() !== origem.toLowerCase()) return false
      if (from && when && when < new Date(`${from}T00:00:00`)) return false
      if (to && when && when > new Date(`${to}T23:59:59`)) return false
      return true
    })
  }, [auditoria.items, funcionario, cliente, modulo, submodulo, acao, origem, from, to])

  const submodulos = [...new Set(auditoria.items.map((a) => String(a.submodulo || '')).filter(Boolean))]

  return (
    <div className="space-y-3">
      <PageHeader title="Auditoria" subtitle="Histórico central de tudo o que um funcionário ou o robô faz na plataforma." />
      <div className="flex flex-wrap gap-2 items-end">
        <TextInput placeholder="Funcionário" value={funcionario} onChange={(e) => setFuncionario(e.target.value)} />
        <TextInput placeholder="Cliente ou CPF" value={cliente} onChange={(e) => setCliente(e.target.value)} />
        <TextInput placeholder="Ação" value={acao} onChange={(e) => setAcao(e.target.value)} />
        <SelectInput value={modulo} onChange={(e) => setModulo(e.target.value)}>
          <option value="">Módulo</option>
          {AUDIT_MODULES.map((m) => <option key={m} value={m}>{m}</option>)}
        </SelectInput>
        <SelectInput value={submodulo} onChange={(e) => setSubmodulo(e.target.value)}>
          <option value="">Submódulo</option>
          {submodulos.map((m) => <option key={m} value={m}>{m}</option>)}
        </SelectInput>
        <SelectInput value={origem} onChange={(e) => setOrigem(e.target.value)}>
          <option value="">Origem</option>
          <option value="FUNCIONÁRIO">Funcionário</option>
          <option value="ROBÔ">Robô</option>
          <option value="SISTEMA">Sistema</option>
        </SelectInput>
        <FilterDateRange from={from} to={to} onFrom={setFrom} onTo={setTo} />
      </div>
      <div className="flex items-center justify-between gap-2 text-xs">
        <span style={{ color: 'var(--code-muted)' }}>{rows.length} eventos</span>
        <GhostButton type="button" onClick={() => setListaAberta((v) => !v)}>{listaAberta ? 'Recolher' : `Auditoria fechada (${rows.length})`}</GhostButton>
      </div>
      {listaAberta && (
      <div className="nexus-card overflow-auto" style={{ maxHeight: 520 }}>
        <table className="w-full text-sm min-w-[860px]">
          <thead>
            <tr>
              <th className="p-2 text-left">Data</th>
              <th className="p-2 text-left">Funcionário</th>
              <th className="p-2 text-left">Cliente / CPF</th>
              <th className="p-2 text-left">Ação</th>
              <th className="p-2 text-left">Módulo</th>
              <th className="p-2 text-left">Submódulo</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td className="p-3" colSpan={6}>Nenhum evento para estes filtros. As próximas ações da plataforma aparecem aqui.</td></tr>
            )}
            {rows.map((a) => {
              const when = toDate(a.quando || createdOf(a))
              const depois = a.dadosDepois && typeof a.dadosDepois === 'object' ? a.dadosDepois as Record<string, unknown> : {}
              const id = String(a.clienteId || depois.clienteId || a.entidadeId || '')
              const cli = clientes.items.find((c) => c.id === id)
              const nome = textoMisto(String(a.clienteNome || depois.clienteNome || depois.nome || cli?.nome || ''))
              const cpf = String(a.cpfCliente || depois.cpf || cli?.cpf || '')
              const alvo = nome ? `${nome}${cpf ? ` · ${formatCpfDisplay(cpf)}` : ''}` : '—'
              return (
                <tr key={a.id} className="border-t cursor-pointer" style={{ borderColor: 'var(--code-border)' }} onClick={() => setAberto(a as Record<string, unknown>)}>
                  <td className="p-2 whitespace-nowrap">{when ? when.toLocaleString('pt-BR') : '—'}</td>
                  <td className="p-2">{textoMisto(String(a.funcionarioNome || a.usuarioNome || '')) || '—'}</td>
                  <td className="p-2">{pareceId(alvo) ? '—' : alvo}</td>
                  <td className="p-2">{String(a.descricao || labelPt(String(a.acao || '')))}</td>
                  <td className="p-2">{moduloAuditoria(String(a.modulo || ''))}</td>
                  <td className="p-2">{String(a.submodulo || '—')}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      )}
      {aberto && (
        <NexusModal title="Evento" cancelLabel="Fechar" onClose={() => setAberto(null)}>
          <div className="text-sm space-y-1">
            <p><strong>Data:</strong> {toDate(aberto.quando || createdOf(aberto as never))?.toLocaleString('pt-BR') || '—'}</p>
            <p><strong>Funcionário:</strong> {textoMisto(String(aberto.funcionarioNome || aberto.usuarioNome || '')) || '—'}</p>
            <p><strong>Empresa:</strong> {String(aberto.empresaNome || aberto.empresaId || '—')}</p>
            <p><strong>Módulo:</strong> {moduloAuditoria(String(aberto.modulo || ''))}</p>
            <p><strong>Submódulo:</strong> {String(aberto.submodulo || '—')}</p>
            <p><strong>Ação:</strong> {String(aberto.descricao || labelPt(String(aberto.acao || '')))}</p>
            <p><strong>Cliente:</strong> {textoMisto(String(aberto.clienteNome || '')) || '—'}</p>
            <p><strong>CPF:</strong> {aberto.cpfCliente ? formatCpfDisplay(String(aberto.cpfCliente)) : '—'}</p>
            <p><strong>Entidade:</strong> {String(aberto.entidadeTipo || aberto.entidade || '—')}</p>
            <p><strong>Origem:</strong> {String(aberto.origem || '—')}</p>
            <p className="pt-2 font-semibold">Dados anteriores</p>
            <pre className="text-[11px] whitespace-pre-wrap">{bloco(aberto.dadosAntes || aberto.antes)}</pre>
            <p className="pt-2 font-semibold">Dados posteriores</p>
            <pre className="text-[11px] whitespace-pre-wrap">{bloco(aberto.dadosDepois || aberto.depois)}</pre>
          </div>
        </NexusModal>
      )}
    </div>
  )
}
