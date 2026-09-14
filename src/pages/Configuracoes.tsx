import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useNexusStore } from '../contexts/NexusStore'
import { useAppearance } from '../contexts/ThemeContext'
import { PIPELINE_STAGES, USER_ROLES } from '../types/nexus'
import { CONVENIOS_PADRAO } from '../catalog/crmCatalog'
import { PageHeader, PrimaryButton, SelectInput, TextInput } from '../components/nexus/kit'
import { useToast } from '../components/ui/Toast'

const TABS = ['Aparência', 'Perfil', 'Usuários', 'Origens e etapas', 'Convênios', 'Tags', 'WhatsApp', 'Meta', 'VoIP', 'Bancos', 'IA', 'White Label', 'Auditoria', 'Segurança']

export default function Configuracoes() {
  const { usuario } = useAuth()
  const { usuariosEmpresa, auditoria, convenios, etiquetas } = useNexusStore()
  const appearance = useAppearance()
  const toast = useToast()
  const [tab, setTab] = useState('Aparência')
  const [u, setU] = useState({ nome: '', email: '', telefone: '', cargo: '', perfil: 'VENDEDOR' })
  const [conv, setConv] = useState({ codigo: '', nome: '' })
  const [tag, setTag] = useState({ nome: '', cor: '#06b6d4' })

  async function addUser() {
    await usuariosEmpresa.create(u as any)
    toast.success('Usuário da empresa cadastrado')
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Configurações" subtitle="Painel administrativo. Tokens de WhatsApp/Meta não devem ser colados em código." />
      <div className="flex flex-wrap gap-1">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${tab === t ? 'nexus-cta text-white' : 'nexus-btn-secondary'}`}>{t}</button>
        ))}
      </div>
      {tab === 'Aparência' && (
        <div className="nexus-card p-4 space-y-4 text-sm">
          <p className="font-bold uppercase text-xs" style={{ color: 'var(--code-muted)' }}>Personalização</p>
          <div className="grid md:grid-cols-3 gap-3">
            <label>Tema
              <SelectInput className="w-full" value="dark" disabled>
                <option value="dark">Escuro</option>
              </SelectInput>
            </label>
            <label>Cor principal
              <input type="color" className="w-full h-10" value={appearance.primary} onChange={(e) => appearance.setPrimary(e.target.value)} />
            </label>
            <label>Cor secundária
              <input type="color" className="w-full h-10" value={appearance.secondary} onChange={(e) => appearance.setSecondary(e.target.value)} />
            </label>
            <label>Densidade
              <SelectInput className="w-full" value={appearance.density} onChange={(e) => appearance.setDensity(e.target.value as 'confortavel' | 'compacta')}>
                <option value="confortavel">Confortável</option>
                <option value="compacta">Compacta</option>
              </SelectInput>
            </label>
            <label className="flex items-center gap-2 mt-6">
              <input type="checkbox" checked={appearance.sidebarCollapsed} onChange={(e) => appearance.setSidebarCollapsed(e.target.checked)} />
              Sidebar recolhida
            </label>
          </div>
          <p className="text-xs" style={{ color: 'var(--code-muted)' }}>Paleta padrão CODE. Preferência salva neste navegador; white-label por empresa usa os mesmos tokens.</p>
        </div>
      )}
      {tab === 'Perfil' && (
        <div className="nexus-card p-4 text-sm space-y-1">
          <p><strong>{usuario?.nome}</strong></p>
          <p>{usuario?.email}</p>
          <p>Perfil: {usuario?.perfil}</p>
          <p>Empresa: {usuario?.empresaId}</p>
        </div>
      )}
      {tab === 'Usuários' && (
        <div className="space-y-3">
          <div className="grid md:grid-cols-5 gap-2">
            <TextInput placeholder="Nome" value={u.nome} onChange={(e) => setU({ ...u, nome: e.target.value })} />
            <TextInput placeholder="E-mail" value={u.email} onChange={(e) => setU({ ...u, email: e.target.value })} />
            <TextInput placeholder="Telefone" value={u.telefone} onChange={(e) => setU({ ...u, telefone: e.target.value })} />
            <TextInput placeholder="Cargo" value={u.cargo} onChange={(e) => setU({ ...u, cargo: e.target.value })} />
            <SelectInput value={u.perfil} onChange={(e) => setU({ ...u, perfil: e.target.value })}>
              {USER_ROLES.map((r) => <option key={r}>{r}</option>)}
            </SelectInput>
          </div>
          <PrimaryButton onClick={addUser}>Adicionar à equipe</PrimaryButton>
          <ul className="text-sm">{usuariosEmpresa.items.map((p) => <li key={p.id}>{String(p.nome)} · {String(p.perfil)}</li>)}</ul>
        </div>
      )}
      {(tab === 'WhatsApp' || tab === 'Meta' || tab === 'VoIP' || tab === 'Bancos' || tab === 'IA') && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm">
          Credenciais dessas integrações devem ficar em variáveis de ambiente / backend. Este painel só registra se o canal está ativo.
          Campos: App ID, Phone Number ID, WABA ID — sem Access Token no frontend.
        </div>
      )}
      {tab === 'Origens e etapas' && (
        <div className="nexus-card p-4 text-sm space-y-2">
          <p className="font-semibold">Etapas do atendimento (editáveis no pipeline e no cadastro)</p>
          <ul>{PIPELINE_STAGES.map((s) => <li key={s.id}>{s.label}</li>)}</ul>
        </div>
      )}
      {tab === 'Convênios' && (
        <div className="space-y-3">
          <div className="flex gap-2">
            <TextInput placeholder="Código" value={conv.codigo} onChange={(e) => setConv({ ...conv, codigo: e.target.value })} />
            <TextInput placeholder="Nome em maiúsculo" value={conv.nome} onChange={(e) => setConv({ ...conv, nome: e.target.value.toUpperCase() })} />
            <PrimaryButton onClick={async () => { await convenios.create({ codigo: conv.codigo, nome: conv.nome.toUpperCase(), ativo: true } as any); toast.success('Convênio cadastrado') }}>Cadastrar</PrimaryButton>
            <PrimaryButton onClick={async () => {
              for (const c of CONVENIOS_PADRAO) {
                if (!convenios.items.some((x) => x.codigo === c.code)) await convenios.create({ codigo: c.code, nome: c.label, ativo: true } as any)
              }
              toast.success('Convênios padrão importados')
            }}>Importar padrão</PrimaryButton>
          </div>
          <ul className="text-sm">{convenios.items.map((c) => <li key={c.id}>{String(c.nome)}</li>)}</ul>
        </div>
      )}
      {tab === 'Tags' && (
        <div className="space-y-3">
          <div className="flex gap-2">
            <TextInput placeholder="Nome da tag" value={tag.nome} onChange={(e) => setTag({ ...tag, nome: e.target.value.toUpperCase() })} />
            <input type="color" value={tag.cor} onChange={(e) => setTag({ ...tag, cor: e.target.value })} />
            <PrimaryButton onClick={async () => { await etiquetas.create({ nome: tag.nome.toUpperCase(), cor: tag.cor } as any); toast.success('Tag criada') }}>Criar tag</PrimaryButton>
          </div>
          <ul className="text-sm">{etiquetas.items.map((t) => <li key={t.id} style={{ color: String(t.cor) }}>{String(t.nome)}</li>)}</ul>
        </div>
      )}
      {tab === 'White Label' && (
        <div className="nexus-card p-4 text-sm">Logo, cores, domínio e módulos habilitados por tenant. A tecnologia permanece Nexus/CODE.</div>
      )}
      {tab === 'Auditoria' && (
        <ul className="text-sm nexus-card p-4 max-h-96 overflow-y-auto">
          {auditoria.items.map((a) => (
            <li key={a.id} className="border-b py-2">{String(a.usuarioNome)} · {String(a.modulo)} · {String(a.acao)} · {String(a.entidadeId || '')}</li>
          ))}
        </ul>
      )}
      {tab === 'Segurança' && (
        <ul className="text-sm list-disc pl-5 space-y-1">
          <li>Rotas protegidas por autenticação Firebase.</li>
          <li>Dados isolados em empresas/{'{tenant}'}/coleção.</li>
          <li>RBAC no menu e nas mutações (perfil CONSULTA).</li>
          <li>Uploads do chat viram metadados no cadastro; Storage continua no serviço existente.</li>
        </ul>
      )}
    </div>
  )
}
