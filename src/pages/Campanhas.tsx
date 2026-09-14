import { useState } from 'react'
import { RecordsPage } from '../components/nexus/RecordsPage'
import { PageHeader, PrimaryButton } from '../components/nexus/kit'
import { NexusModal } from '../components/nexus/Modal'
import { useNexusStore } from '../contexts/NexusStore'
import { useToast } from '../components/ui/Toast'
import { originCode } from '../catalog/crmCatalog'
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
      origem: originCode(get(iOrig) || 'campanha'),
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
  const { clientes } = useNexusStore()
  const [importOpen, setImportOpen] = useState(false)
  const [preview, setPreview] = useState<PreviewRow[]>([])
  const [saving, setSaving] = useState(false)

  async function confirmImport() {
    const ok = preview.filter((r) => !r.erro)
    if (!ok.length) return toast.error('Nenhuma linha válida')
    if (saving) return
    setSaving(true)
    try {
      let created = 0
      let skipped = 0
      for (const row of ok) {
        const dup = clientes.items.find((c) => (row.cpf && digits(String(c.cpf || '')) === row.cpf) || (row.telefone && digits(String(c.whatsapp || c.telefone || '')) === row.telefone))
        if (dup) {
          skipped += 1
          continue
        }
        await clientes.create({
          nome: row.nome,
          telefone: row.telefone,
          whatsapp: row.telefone,
          cpf: row.cpf,
          origem: row.origem,
          source: row.origem,
          campanha: row.campanha,
          modalidade: row.produto,
          produto: row.produto,
          responsavel: row.responsavel,
          pipelineStage: 'novo_lead',
          status: 'NOVO LEAD',
        } as any)
        created += 1
      }
      toast.success(`${created} importados · ${skipped} duplicados ignorados`)
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
          <p className="text-sm mb-2" style={{ color: 'var(--code-muted)' }}>Colunas: nome, telefone, CPF, origem, campanha, produto, data, responsável. Pré-visualize antes de salvar.</p>
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
