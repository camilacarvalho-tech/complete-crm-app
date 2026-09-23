import { useMemo, useRef, useState } from 'react'
import { RecordsPage } from '../components/nexus/RecordsPage'
import { PRODUCT_CATALOG } from '../catalog/productCatalog'
import { PageHeader, PrimaryButton, SelectInput, TextInput } from '../components/nexus/kit'
import { NexusModal } from '../components/nexus/Modal'
import { useAuth } from '../contexts/AuthContext'
import { useNexusStore } from '../contexts/NexusStore'
import { useToast } from '../components/ui/Toast'
import { labelPt } from '../lib/uiPt'
import { parseImportedWorkbook } from '../modules/leads-monitor/pipeline/xlsxImport'
import {
  applyMapping,
  CSV_FIELD_TO_PERSON_LEAD,
  inferMappingFromTable,
} from '../modules/leads-monitor/pipeline/csvImportMap'
import { CSV_TARGET_FIELDS, type CsvTargetField } from '../modules/leads-monitor/types/processRun'
import {
  campaignImportPreview,
  persistCampaignWorkbook,
  type CampaignImportPreviewRow,
  type CampaignImportSummary,
} from '../modules/leads-monitor/pipeline/persistCampaignWorkbook'

const FILE_ACCEPT =
  '.csv,.xlsx,.xls,.ods,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,application/vnd.oasis.opendocument.spreadsheet'

const REQUIRED_COLUMNS =
  'Informe ao menos Nome (pessoa) ou Empresa / CNPJ. Colunas reconhecidas: Nome, Nome completo, CPF, Telefone, Telefone 1, celular, WhatsApp, Email, Empresa, Razão Social, CNPJ, Cargo, Vínculo, Endereço, Número, Bairro, CEP, Cidade, município, Estado, UF, Produto, Operação.'

type Phase = 'idle' | 'processing' | 'ready' | 'empty' | 'error' | 'done' | 'partial'

export default function Campanhas() {
  const toast = useToast()
  const { usuario } = useAuth()
  const { clientes, campanhas } = useNexusStore()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importOpen, setImportOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [phase, setPhase] = useState<Phase>('idle')
  const [fileName, setFileName] = useState('')
  const [headers, setHeaders] = useState<string[]>([])
  const [rawRows, setRawRows] = useState<Record<string, string>[]>([])
  const [mapping, setMapping] = useState<Record<string, CsvTargetField | ''>>({})
  const [preview, setPreview] = useState<CampaignImportPreviewRow[]>([])
  const [counts, setCounts] = useState({
    pessoas: 0,
    empresas: 0,
    whatsapps: 0,
    telefones: 0,
    cpfs: 0,
    invalidos: 0,
    duplicados: 0,
    validos: 0,
  })
  const [summary, setSummary] = useState<CampaignImportSummary | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [progressLabel, setProgressLabel] = useState('')
  const [imp, setImp] = useState({ origem: 'planilha_csv', campanha: '', segmento: '', produto: '', equipe: '', responsavel: '' })

  const mappedRows = useMemo(() => rawRows.map((r) => applyMapping(r, mapping)), [rawRows, mapping])
  const mappingUnconfirmed = !Object.values(mapping).includes('nome') && !Object.values(mapping).includes('empresa')

  function applyStats(nextMapping: Record<string, CsvTargetField | ''>, rows: Record<string, string>[]) {
    const mapped = rows.map((r) => applyMapping(r, nextMapping))
    const stats = campaignImportPreview(mapped)
    setPreview(stats.preview)
    setCounts(stats)
    if (!stats.validos) setPhase('empty')
    else setPhase('ready')
  }

  function resetImport() {
    setPhase('idle')
    setFileName('')
    setHeaders([])
    setRawRows([])
    setMapping({})
    setPreview([])
    setCounts({ pessoas: 0, empresas: 0, whatsapps: 0, telefones: 0, cpfs: 0, invalidos: 0, duplicados: 0, validos: 0 })
    setSummary(null)
    setErrorMsg('')
    setProgressLabel('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function onPickFile(file: File | undefined) {
    if (!file) return
    setFileName(file.name)
    setPhase('processing')
    setSummary(null)
    setErrorMsg('')
    setPreview([])
    try {
      const table = await parseImportedWorkbook(file)
      const nextMapping = inferMappingFromTable(table.headers, table.rows)
      setHeaders(table.headers)
      setRawRows(table.rows)
      setMapping(nextMapping)
      applyStats(nextMapping, table.rows)
    } catch (e) {
      setPhase('error')
      setErrorMsg(e instanceof Error ? e.message : 'Falha ao ler o arquivo')
    }
  }

  async function confirmImport() {
    if (phase !== 'ready' || !counts.validos || saving) return
    const empresaId = clientes.empresaId || usuario?.empresaId
    if (!empresaId) return toast.error('Empresa não identificada')
    setSaving(true)
    setProgressLabel(`Importando ${mappedRows.length} registros...`)
    try {
      const result = await persistCampaignWorkbook({
        empresaId,
        arquivoNome: fileName,
        campanhaNome: imp.campanha,
        produto: imp.produto,
        origem: imp.origem,
        segmento: imp.segmento,
        usuarioId: usuario?.id,
        usuarioNome: usuario?.nome,
        rows: mappedRows,
        rawRows,
        onProgress: (info) => setProgressLabel(info.label),
      })

      setSummary(result)
      setPhase(result.partial ? 'partial' : 'done')
      if (result.partial) toast.error('Importação parcialmente concluída.')
      else toast.success(result.enrichMessage || 'Importação concluída')
    } catch (e) {
      toast.error('Falha na importação', e instanceof Error ? e.message : '')
    } finally {
      setSaving(false)
      setProgressLabel('')
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Campanhas"
        subtitle="Criar, pausar, finalizar e importar público (CSV/Excel). Sem duplicar cadastros existentes."
        actions={
          <PrimaryButton
            onClick={() => {
              resetImport()
              setImportOpen(true)
            }}
          >
            Importar campanha
          </PrimaryButton>
        }
      />
      <div className="grid md:grid-cols-2 gap-2">
        {campanhas.items.map((c) => (
          <article key={c.id} className="nexus-card p-3 text-sm space-y-2">
            <button type="button" className="text-left w-full" onClick={() => toast.info(String(c.nome || 'Campanha'), `Status ${c.status || '—'} · leads ${c.leads ?? '—'} · enviados ${c.enviados ?? '—'} · respostas ${c.respostas ?? '—'} · conversões ${c.conversoes ?? '—'} · erros ${c.erros ?? '—'}`)}>
              <p className="font-semibold">{String(c.nome || 'Campanha')}</p>
              <p className="text-xs" style={{ color: 'var(--code-muted)' }}>
                {labelPt(String(c.status || 'rascunho'))} · leads {String(c.leads ?? '—')} · enviados {String(c.enviados ?? '—')} · respostas {String(c.respostas ?? '—')} · conversões {String(c.conversoes ?? '—')} · erros {String(c.erros ?? '—')}
              </p>
            </button>
            <div className="flex flex-wrap gap-1">
              <button type="button" className="nexus-btn-secondary text-xs px-2 py-1 rounded" onClick={() => void campanhas.update(c.id, { status: 'em_execucao' })}>▶ Play</button>
              <button type="button" className="nexus-btn-secondary text-xs px-2 py-1 rounded" onClick={() => void campanhas.update(c.id, { status: 'pausada' })}>⏸ Pausar</button>
              <button type="button" className="nexus-btn-secondary text-xs px-2 py-1 rounded" onClick={() => toast.info('Edição', 'Use o cadastro abaixo para alterar nome, canal e mensagem.')}>✏ Editar</button>
              <details className="text-xs">
                <summary className="cursor-pointer px-2 py-1">⋮ Mais</summary>
                <button type="button" className="block" onClick={() => void campanhas.create({ ...c, id: undefined, nome: `${c.nome || 'Campanha'} cópia`, status: 'rascunho' } as any)}>Duplicar</button>
              </details>
            </div>
          </article>
        ))}
      </div>
      <RecordsPage
        storeKey="campanhas"
        title="Campanhas"
        subtitle="Nome, status, público, origem, produto e mensagem."
        compact
        scroll
        editable
        tabs={['todas', 'rascunho', 'agendada', 'em_execucao', 'pausada', 'finalizada']}
        fields={[
          { key: 'nome', label: 'Nome' },
          { key: 'status', label: 'Status', options: ['rascunho', 'agendada', 'em_execucao', 'pausada', 'finalizada'] },
          { key: 'publico', label: 'Público' },
          { key: 'origem', label: 'Origem', options: ['trafego_pago', 'facebook', 'instagram', 'google', 'whatsapp', 'campanha', 'manual', 'leads_monitor'] },
          { key: 'produto', label: 'Produto', options: PRODUCT_CATALOG.map((p) => ({ value: p.code, label: p.label })) },
          { key: 'mensagem', label: 'Mensagem' },
          { key: 'responsavel', label: 'Responsável' },
        ]}
      />
      {importOpen && (
        <NexusModal
          title="Importar campanha"
          onClose={() => {
            if (saving) return
            setImportOpen(false)
            resetImport()
          }}
          onSave={() => void confirmImport()}
          saving={saving}
          saveDisabled={phase !== 'ready' || !counts.validos}
          saveLabel={saving ? progressLabel || 'Importando...' : 'Confirmar importação'}
          closeOnBackdrop={false}
        >
          <p className="text-sm mb-2" style={{ color: 'var(--code-muted)' }}>
            CSV, XLSX, XLS ou ODS. Os registros vão para Leads Monitor → Pessoas. Sem disparo Meta, banco ou WhatsApp.
          </p>
          <div className="grid md:grid-cols-2 gap-2 mb-3">
            <SelectInput value={imp.origem} onChange={(e) => setImp({ ...imp, origem: e.target.value })}>
              <option value="planilha_csv">Planilha CSV</option>
              <option value="disparo_massa">Disparo em massa</option>
              <option value="trafego_pago">Tráfego pago</option>
              <option value="landing_page">Landing page</option>
              <option value="formulario">Formulário</option>
              <option value="webhook">Webhook</option>
              <option value="api">API</option>
            </SelectInput>
            <TextInput placeholder="Campanha" value={imp.campanha} onChange={(e) => setImp({ ...imp, campanha: e.target.value })} />
            <TextInput placeholder="Segmento" value={imp.segmento} onChange={(e) => setImp({ ...imp, segmento: e.target.value })} />
            <TextInput placeholder="Produto" value={imp.produto} onChange={(e) => setImp({ ...imp, produto: e.target.value })} />
            <TextInput placeholder="Equipe" value={imp.equipe} onChange={(e) => setImp({ ...imp, equipe: e.target.value })} />
            <TextInput placeholder="Responsável" value={imp.responsavel} onChange={(e) => setImp({ ...imp, responsavel: e.target.value })} />
          </div>

          <div className="relative inline-block mb-3">
            <span
              className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-semibold pointer-events-none"
              style={{ background: 'var(--code-accent)', color: '#fff' }}
            >
              Escolher arquivo
            </span>
            <input
              ref={fileInputRef}
              type="file"
              accept={FILE_ACCEPT}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              onChange={(e) => {
                const file = e.target.files?.[0]
                void onPickFile(file)
                e.target.value = ''
              }}
            />
          </div>

          {phase === 'idle' && (
            <p className="text-sm" style={{ color: 'var(--code-muted)' }}>
              Nenhum arquivo selecionado.
            </p>
          )}
          {phase === 'processing' && (
            <p className="text-sm font-medium" style={{ color: 'var(--code-text)' }}>
              Processando arquivo...
            </p>
          )}
          {fileName && phase !== 'idle' && (
            <p className="text-sm mb-2" style={{ color: 'var(--code-text)' }}>
              Arquivo selecionado: <b>{fileName}</b>
            </p>
          )}
          {phase === 'error' && (
            <p className="text-sm text-red-600">{errorMsg || 'Não foi possível ler o arquivo.'}</p>
          )}
          {(phase === 'ready' || phase === 'empty') && headers.length > 0 && (
            <div className="mb-3 max-h-48 overflow-auto text-xs">
              <p className="font-semibold mb-1" style={{ color: 'var(--code-text)' }}>Mapeamento de colunas</p>
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="text-left p-1">Coluna original</th>
                    <th className="text-left p-1">Campo PERSON_LEAD</th>
                  </tr>
                </thead>
                <tbody>
                  {headers.map((h) => {
                    const field = mapping[h] || ''
                    return (
                      <tr key={h}>
                        <td className="p-1">{h}</td>
                        <td className="p-1">
                          <select
                            value={field}
                            onChange={(e) => {
                              const next = { ...mapping, [h]: e.target.value as CsvTargetField | '' }
                              setMapping(next)
                              applyStats(next, rawRows)
                            }}
                            className="rounded px-1 py-0.5"
                            style={{ background: 'var(--code-surface)', color: 'var(--code-text)' }}
                          >
                            <option value="">Não identificado</option>
                            {CSV_TARGET_FIELDS.map((f) => (
                              <option key={f} value={f}>{CSV_FIELD_TO_PERSON_LEAD[f]} ({f})</option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
          {mappingUnconfirmed && (phase === 'ready' || phase === 'empty') && (
            <p className="text-sm text-amber-500 mb-2">Mapeamento não confirmado.</p>
          )}
          {phase === 'empty' && (
            <div className="text-sm space-y-1" style={{ color: 'var(--code-muted)' }}>
              <p>Nenhuma linha válida encontrada.</p>
              <p>{REQUIRED_COLUMNS}</p>
            </div>
          )}
          {phase === 'ready' && (
            <div className="text-sm space-y-1 mb-3" style={{ color: 'var(--code-text)' }}>
              <p>✓ Arquivo carregado</p>
              <p>✓ {counts.validos} registros encontrados</p>
              <p>✓ {counts.pessoas} pessoas</p>
              <p>✓ {counts.empresas} empresas</p>
              <p>✓ {counts.whatsapps} com WhatsApp</p>
              <p>✓ {counts.telefones} com telefone</p>
              <p>✓ {counts.cpfs} com CPF</p>
            </div>
          )}
          {phase === 'ready' && preview.length > 0 && (
            <div className="mt-2 max-h-64 overflow-auto text-xs">
              <table className="w-full">
                <thead>
                  <tr>
                    {['Nome', 'CPF', 'WhatsApp', 'Telefone', 'Empresa', 'Cidade', 'UF'].map((h) => (
                      <th key={h} className="text-left p-1">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.map((r, i) => (
                    <tr key={i}>
                      <td className="p-1">{r.nome || '—'}</td>
                      <td className="p-1">{r.cpf || '—'}</td>
                      <td className="p-1">{r.whatsapp || '—'}</td>
                      <td className="p-1">{r.telefone || '—'}</td>
                      <td className="p-1">{r.empresa || '—'}</td>
                      <td className="p-1">{r.cidade || '—'}</td>
                      <td className="p-1">{r.uf || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {(phase === 'done' || phase === 'partial') && summary && (
            <div className="text-sm space-y-1" style={{ color: 'var(--code-text)' }}>
              <p className="font-semibold">{summary.partial ? 'Importação parcialmente concluída.' : 'IMPORTAÇÃO CONCLUÍDA'}</p>
              <p>Arquivo: {summary.arquivo}</p>
              <p>Registros lidos: {summary.registros}</p>
              <p>Registros válidos: {summary.validos}</p>
              <p>Pessoas: {summary.pessoas}</p>
              <p>Empresas: {summary.empresas}</p>
              <p>WhatsApp: {summary.whatsapps}</p>
              <p>Telefone: {summary.telefones}</p>
              <p>CPF: {summary.cpfs}</p>
              <p>Duplicados: {summary.duplicados}</p>
              <p>Inválidos: {summary.invalidos}</p>
              <p>Salvos: {summary.salvos}</p>
              <p>Falharam: {summary.falharam}</p>
              <p>Enfileirados para enriquecimento: {summary.enfileirados}</p>
              {summary.enrichMessage && <p className="mt-2">{summary.enrichMessage}</p>}
            </div>
          )}
        </NexusModal>
      )}
    </div>
  )
}
