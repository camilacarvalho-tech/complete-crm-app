import { useState } from 'react'
import { RecordsPage } from '../components/nexus/RecordsPage'
import { PageHeader, PrimaryButton, SelectInput, TextInput } from '../components/nexus/kit'
import { NexusModal } from '../components/nexus/Modal'
import { useAuth } from '../contexts/AuthContext'
import { useNexusStore } from '../contexts/NexusStore'
import { useToast } from '../components/ui/Toast'
import { originCode } from '../catalog/crmCatalog'
import { garantirConversaFila } from '../lib/garantirConversaFila'
import { agoraEntrada, eventoOrigem } from '../lib/origemLead'
import { digits } from '../lib/nexusCore'

type PreviewRow = { nome: string; telefone: string; cpf: string; origem: string; campanha: string; produto: string; data: string; responsavel: string; erro?: string }

function parseSheet(text: string): PreviewRow[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim())
  if (lines.length < 2) return []
  const sep = lines[0].includes(';') ? ';' : ','
  const headers = lines[0].split(sep).map((h) => h.trim().toLowerCase())
  const idx = (names: string[]) => names.map((n) => headers.findIndex((h) => h.includes(n))).find((i) => i >= 0) ?? -1
  const iNome = idx(['nome', 'name'])
  const iTel = idx(['telefone', 'whatsapp', 'fone', 'celular'])
  const iCpf = idx(['cpf'])
  const iOrig = idx(['origem', 'source'])
  const iCamp = idx(['campanha', 'campaign'])
  const iProd = idx(['produto', 'product'])
  const iData = idx(['data', 'date'])
  const iResp = idx(['responsavel', 'responsável'])
  return lines.slice(1).map((line) => {
    const cols = line.split(sep)
    const get = (i: number) => (i >= 0 ? String(cols[i] || '').trim() : '')
    const row: PreviewRow = {
      nome: get(iNome),
      telefone: digits(get(iTel)),
      cpf: digits(get(iCpf)),
      origem: originCode(get(iOrig) || 'planilha'),
      campanha: get(iCamp),
      produto: get(iProd),
      data: get(iData),
      responsavel: get(iResp),
    }
    if (!row.nome) row.erro = 'Nome obrigatório'
    else if (!row.telefone && !row.cpf) row.erro = 'Informe telefone ou CPF'
    return row
  })
}

export default function Campanhas() {
  const toast = useToast()
  const { usuario } = useAuth()
  const { clientes } = useNexusStore()
  const [importOpen, setImportOpen] = useState(false)
  const [preview, setPreview] = useState<PreviewRow[]>([])
  const [saving, setSaving] = useState(false)
  const [imp, setImp] = useState({ origem: 'planilha_csv', campanha: '', segmento: '', produto: '', equipe: '', responsavel: '' })

  async function confirmImport() {
    const ok = preview.filter((r) => !r.erro)
    if (!ok.length) return toast.error('Nenhuma linha válida')
    if (saving) return
    setSaving(true)
    try {
      let created = 0
      let updated = 0
      const empresaId = clientes.empresaId
      if (!empresaId) throw new Error('Empresa não identificada')
      for (const row of ok) {
        const origem = originCode(row.origem || imp.origem || 'planilha')
        const campanhaNome = row.campanha || imp.campanha
        const produto = row.produto || imp.produto
        const segmento = imp.segmento
        const responsavel = row.responsavel || imp.responsavel
        const entrada = agoraEntrada()
        const evento = eventoOrigem({ origem, origemDetalhe: campanhaNome || 'Importação CSV', campanha: campanhaNome, fonte: 'planilha_csv' })
        const dup = clientes.items.find((c) => (row.cpf && digits(String(c.cpf || '')) === row.cpf) || (row.telefone && digits(String(c.whatsapp || c.telefone || '')) === row.telefone))
        let clienteId = dup?.id
        if (dup) {
          const hist = [...((dup.historicoOrigens as unknown[]) || []), evento]
          await clientes.update(dup.id, {
            historicoOrigens: hist,
            campanhaNome: dup.campanhaNome || campanhaNome,
            campanha: dup.campanha || campanhaNome,
            produto: dup.produto || produto,
          } as any)
          updated += 1
        } else {
          clienteId = await clientes.create({
            nome: row.nome,
            telefone: row.telefone,
            telefoneNormalizado: row.telefone,
            whatsapp: row.telefone,
            cpf: row.cpf,
            origem,
            origemLead: origem,
            source: origem,
            origemDetalhe: campanhaNome || 'Importação CSV',
            fonte: 'planilha_csv',
            campanha: campanhaNome,
            campanhaNome,
            modalidade: segmento || produto,
            produto,
            equipe: imp.equipe,
            responsavel,
            pipelineStage: 'novo_lead',
            status: 'NOVO LEAD',
            historicoOrigens: [evento],
            ...entrada,
          } as any)
          created += 1
        }
        if (clienteId) {
          await garantirConversaFila({
            empresaId,
            clienteId,
            titulo: row.nome,
            telefone: row.telefone,
            origemLead: origem,
            campanhaNome,
            segmento,
            produto,
            equipe: imp.equipe,
            responsavel,
            usuarioId: usuario?.id,
            usuarioNome: usuario?.nome,
          })
        }
      }
      toast.success(`${created} criados · ${updated} atualizados (sem duplicar telefone/CPF)`)
      setImportOpen(false)
      setPreview([])
    } catch (e) {
      toast.error('Falha na importação', e instanceof Error ? e.message : '')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Campanhas"
        subtitle="Criar, pausar, finalizar e importar público (CSV/Excel texto). Sem duplicar cadastros existentes."
        actions={<PrimaryButton onClick={() => setImportOpen(true)}>Importar planilha</PrimaryButton>}
      />
      <RecordsPage
        storeKey="campanhas"
        title="Campanhas"
        subtitle="Canais: Facebook, Instagram, Meta Ads, Google, tráfego pago, manuais e internas."
        tabs={['todas', 'rascunho', 'agendada', 'em_execucao', 'pausada', 'finalizada']}
        fields={[
          { key: 'nome', label: 'Nome' },
          { key: 'canal', label: 'Canal', options: ['facebook', 'instagram', 'meta_ads', 'google', 'trafego_pago', 'whatsapp', 'manual', 'interna'] },
          { key: 'status', label: 'Status', options: ['rascunho', 'agendada', 'em_execucao', 'pausada', 'finalizada'] },
          { key: 'publico', label: 'Público' },
          { key: 'origem', label: 'Origem', options: ['trafego_pago', 'facebook', 'instagram', 'google', 'whatsapp', 'campanha', 'manual'] },
          { key: 'produto', label: 'Produto' },
          { key: 'mensagem', label: 'Mensagem' },
          { key: 'template', label: 'Modelo' },
          { key: 'responsavel', label: 'Responsável' },
        ]}
      />
      {importOpen && (
        <NexusModal title="Importar campanha" onClose={() => !saving && setImportOpen(false)} onSave={() => void confirmImport()} saving={saving} saveLabel="Confirmar importação" closeOnBackdrop={false}>
          <p className="text-sm mb-2" style={{ color: 'var(--code-muted)' }}>Defina origem/campanha antes de confirmar. CSV. Linhas com telefone ou CPF já existente atualizam o mesmo cliente.</p>
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
          <input
            type="file"
            accept=".csv,.txt,.xlsx,.xls"
            onChange={async (e) => {
              const file = e.target.files?.[0]
              if (!file) return
              if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
                toast.error('Salve a planilha como CSV para importar nesta versão.')
                return
              }
              const text = await file.text()
              setPreview(parseSheet(text))
            }}
          />
          {preview.length > 0 && (
            <div className="mt-3 max-h-64 overflow-auto text-xs">
              <p>{preview.filter((r) => r.erro).length} erros · {preview.filter((r) => !r.erro).length} válidas</p>
              <table className="w-full">
                <thead><tr><th className="text-left p-1">Nome</th><th className="text-left p-1">Telefone</th><th className="text-left p-1">Situação</th></tr></thead>
                <tbody>
                  {preview.slice(0, 80).map((r, i) => (
                    <tr key={i}><td className="p-1">{r.nome || '—'}</td><td className="p-1">{r.telefone || '—'}</td><td className="p-1">{r.erro || 'OK'}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </NexusModal>
      )}
    </div>
  )
}
