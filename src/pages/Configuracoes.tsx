import { useState, useEffect } from 'react'
import {
  Settings, Building2, Users, MessageCircle, GitBranch, Plug,
  Save, Moon, Sun, Key
} from 'lucide-react'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { sendPasswordResetEmail } from 'firebase/auth'
import { db, auth } from '../firebase'
import { useTheme } from '../contexts/ThemeContext'
import { useAuth } from '../contexts/AuthContext'
import { PIPELINE_ETAPAS } from '../constants/pipeline'

type TabId = 'geral' | 'usuarios' | 'whatsapp' | 'crm' | 'integracoes'

const TABS: { id: TabId; label: string; icon: typeof Settings }[] = [
  { id: 'geral', label: 'Geral', icon: Building2 },
  { id: 'usuarios', label: 'Usuários', icon: Users },
  { id: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
  { id: 'crm', label: 'CRM', icon: GitBranch },
  { id: 'integracoes', label: 'Integrações', icon: Plug },
]

export default function Configuracoes() {
  const { darkMode, setDarkMode } = useTheme()
  const { user, empresa, usuario } = useAuth()
  const empresaId = empresa?.id || localStorage.getItem('empresaId') || 'default'
  const [tab, setTab] = useState<TabId>('geral')
  const [msg, setMsg] = useState('')
  const [saving, setSaving] = useState(false)

  const [geral, setGeral] = useState({
    nomeEmpresa: empresa?.nomeFantasia || '',
    logoUrl: '',
    idioma: 'pt-BR',
    fuso: 'America/Sao_Paulo',
  })
  const [whatsapp, setWhatsapp] = useState({
    metaAppId: '',
    phoneNumberId: '',
    accessToken: '',
    webhookUrl: '',
    verifyToken: '',
    templates: '',
  })
  const [crm, setCrm] = useState({
    modalidades: '',
    tagsPadrao: 'quente,follow-up,vip',
    camposPersonalizados: '',
  })
  const [integracoes, setIntegracoes] = useState({
    metaPixel: '',
    googleAds: '',
    firebaseProjectId: 'recomece-cred-oficial',
    smtpHost: '',
    smtpUser: '',
    smtpPass: '',
    apiKeyExtra: '',
  })
  const [convite, setConvite] = useState({ email: '', perfil: 'funcionario' })
  const [convites, setConvites] = useState<Array<{ email: string; perfil: string }>>([])

  useEffect(() => {
    ;(async () => {
      try {
        const snap = await getDoc(doc(db, 'empresas', empresaId, 'config', 'app'))
        if (snap.exists()) {
          const d = snap.data()
          if (d.geral) setGeral((g) => ({ ...g, ...d.geral }))
          if (d.whatsapp) setWhatsapp((w) => ({ ...w, ...d.whatsapp }))
          if (d.crm) setCrm((c) => ({ ...c, ...d.crm }))
          if (d.integracoes) setIntegracoes((i) => ({ ...i, ...d.integracoes }))
          if (Array.isArray(d.convites)) setConvites(d.convites)
        }
      } catch {
        /* ignore */
      }
      if (empresa?.nomeFantasia) {
        setGeral((g) => ({ ...g, nomeEmpresa: g.nomeEmpresa || empresa.nomeFantasia }))
      }
    })()
  }, [empresaId, empresa?.nomeFantasia])

  const salvar = async () => {
    setSaving(true)
    try {
      await setDoc(
        doc(db, 'empresas', empresaId, 'config', 'app'),
        {
          geral,
          whatsapp: { ...whatsapp, accessToken: whatsapp.accessToken ? '***salvo***' : '' },
          crm,
          integracoes: { ...integracoes, smtpPass: integracoes.smtpPass ? '***salvo***' : '' },
          convites,
          atualizadoEm: serverTimestamp(),
          atualizadoPor: usuario?.nome || user?.email,
        },
        { merge: true }
      )
      // keep token locally if user typed a new one
      if (whatsapp.accessToken && !whatsapp.accessToken.includes('***')) {
        localStorage.setItem(`nexus_wa_token_${empresaId}`, whatsapp.accessToken)
      }
      setMsg('Configurações salvas')
      setTimeout(() => setMsg(''), 2500)
    } catch {
      setMsg('Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  const resetSenha = async () => {
    if (!user?.email) return
    try {
      await sendPasswordResetEmail(auth, user.email)
      setMsg('E-mail de redefinição enviado')
    } catch {
      setMsg('Não foi possível enviar o e-mail')
    }
  }

  const addConvite = () => {
    if (!convite.email.trim()) return
    setConvites((c) => [...c, { ...convite }])
    setConvite({ email: '', perfil: 'funcionario' })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Settings className="w-8 h-8 text-blue-500" /> Configurações
          </h1>
          <p className="text-slate-500 text-sm">Geral · Usuários · WhatsApp · CRM · Integrações</p>
        </div>
        <button
          type="button"
          onClick={salvar}
          disabled={saving}
          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg flex items-center gap-2 text-sm font-semibold disabled:opacity-50"
        >
          <Save className="w-4 h-4" /> {saving ? 'Salvando…' : 'Salvar'}
        </button>
      </div>

      {msg && <p className="text-sm text-teal-600 dark:text-teal-400 font-semibold">{msg}</p>}

      <div className="flex gap-2 flex-wrap border-b border-slate-200 dark:border-slate-700 pb-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-3 py-2 rounded-lg text-sm flex items-center gap-1.5 ${
              tab === t.id
                ? 'bg-blue-500 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
            }`}
          >
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 space-y-4">
        {tab === 'geral' && (
          <>
            <Field label="Empresa" value={geral.nomeEmpresa} onChange={(v) => setGeral({ ...geral, nomeEmpresa: v })} />
            <Field label="Logo (URL)" value={geral.logoUrl} onChange={(v) => setGeral({ ...geral, logoUrl: v })} />
            {geral.logoUrl && <img src={geral.logoUrl} alt="Logo" className="h-16 object-contain" />}
            <div>
              <label className="block text-xs font-semibold mb-1 text-slate-500">Tema</label>
              <button
                type="button"
                onClick={() => setDarkMode(!darkMode)}
                className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center gap-2 text-sm"
              >
                {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                {darkMode ? 'Modo claro' : 'Modo escuro'}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold mb-1 text-slate-500">Idioma</label>
                <select value={geral.idioma} onChange={(e) => setGeral({ ...geral, idioma: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 dark:text-white text-sm">
                  <option value="pt-BR">Português (Brasil)</option>
                  <option value="en-US">English</option>
                  <option value="es-ES">Español</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1 text-slate-500">Fuso horário</label>
                <select value={geral.fuso} onChange={(e) => setGeral({ ...geral, fuso: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 dark:text-white text-sm">
                  <option value="America/Sao_Paulo">America/Sao_Paulo</option>
                  <option value="America/Manaus">America/Manaus</option>
                  <option value="America/Fortaleza">America/Fortaleza</option>
                </select>
              </div>
            </div>
            <button type="button" onClick={resetSenha} className="text-sm text-blue-500 underline flex items-center gap-1">
              <Key className="w-3.5 h-3.5" /> Redefinir senha do usuário logado
            </button>
          </>
        )}

        {tab === 'usuarios' && (
          <>
            <p className="text-sm text-slate-500">
              Perfis: Master (tudo) · Empresário (empresa) · Funcionário (próprios registros).
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input
                placeholder="E-mail"
                value={convite.email}
                onChange={(e) => setConvite({ ...convite, email: e.target.value })}
                className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 dark:text-white text-sm"
              />
              <select
                value={convite.perfil}
                onChange={(e) => setConvite({ ...convite, perfil: e.target.value })}
                className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 dark:text-white text-sm"
              >
                <option value="master">Master</option>
                <option value="empresario">Empresário</option>
                <option value="funcionario">Funcionário</option>
              </select>
              <button type="button" onClick={addConvite} className="px-3 py-2 bg-blue-500 text-white rounded-lg text-sm">
                Adicionar convite
              </button>
            </div>
            <ul className="space-y-2">
              {convites.map((c, i) => (
                <li key={i} className="flex justify-between text-sm p-2 rounded bg-slate-50 dark:bg-slate-900">
                  <span className="dark:text-white">{c.email}</span>
                  <span className="text-slate-500">{c.perfil}</span>
                </li>
              ))}
            </ul>
          </>
        )}

        {tab === 'whatsapp' && (
          <>
            <Field label="Meta App ID" value={whatsapp.metaAppId} onChange={(v) => setWhatsapp({ ...whatsapp, metaAppId: v })} />
            <Field label="Phone Number ID" value={whatsapp.phoneNumberId} onChange={(v) => setWhatsapp({ ...whatsapp, phoneNumberId: v })} />
            <Field label="Access Token" value={whatsapp.accessToken} onChange={(v) => setWhatsapp({ ...whatsapp, accessToken: v })} type="password" />
            <Field label="Webhook URL" value={whatsapp.webhookUrl} onChange={(v) => setWhatsapp({ ...whatsapp, webhookUrl: v })} />
            <Field label="Verify Token" value={whatsapp.verifyToken} onChange={(v) => setWhatsapp({ ...whatsapp, verifyToken: v })} />
            <div>
              <label className="block text-xs font-semibold mb-1 text-slate-500">Templates</label>
              <textarea
                value={whatsapp.templates}
                onChange={(e) => setWhatsapp({ ...whatsapp, templates: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 dark:text-white text-sm"
                placeholder="Nome do template por linha"
              />
            </div>
          </>
        )}

        {tab === 'crm' && (
          <>
            <div>
              <label className="block text-xs font-semibold mb-2 text-slate-500">Pipeline (oficial)</label>
              <div className="flex flex-wrap gap-2">
                {PIPELINE_ETAPAS.map((e) => (
                  <span key={e} className="text-xs px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                    {e}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1 text-slate-500">Modalidades (uma por linha)</label>
              <textarea value={crm.modalidades} onChange={(e) => setCrm({ ...crm, modalidades: e.target.value })} rows={4} className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 dark:text-white text-sm" />
            </div>
            <Field label="Tags padrão (vírgula)" value={crm.tagsPadrao} onChange={(v) => setCrm({ ...crm, tagsPadrao: v })} />
            <div>
              <label className="block text-xs font-semibold mb-1 text-slate-500">Campos personalizados (chave=valor por linha)</label>
              <textarea value={crm.camposPersonalizados} onChange={(e) => setCrm({ ...crm, camposPersonalizados: e.target.value })} rows={3} className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 dark:text-white text-sm" />
            </div>
          </>
        )}

        {tab === 'integracoes' && (
          <>
            <Field label="Meta Pixel / Ads" value={integracoes.metaPixel} onChange={(v) => setIntegracoes({ ...integracoes, metaPixel: v })} />
            <Field label="Google Ads / Analytics" value={integracoes.googleAds} onChange={(v) => setIntegracoes({ ...integracoes, googleAds: v })} />
            <Field label="Firebase Project ID" value={integracoes.firebaseProjectId} onChange={(v) => setIntegracoes({ ...integracoes, firebaseProjectId: v })} />
            <Field label="SMTP Host" value={integracoes.smtpHost} onChange={(v) => setIntegracoes({ ...integracoes, smtpHost: v })} />
            <Field label="SMTP User" value={integracoes.smtpUser} onChange={(v) => setIntegracoes({ ...integracoes, smtpUser: v })} />
            <Field label="SMTP Pass" value={integracoes.smtpPass} onChange={(v) => setIntegracoes({ ...integracoes, smtpPass: v })} type="password" />
            <Field label="API Key extra" value={integracoes.apiKeyExtra} onChange={(v) => setIntegracoes({ ...integracoes, apiKeyExtra: v })} />
          </>
        )}
      </div>
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
}) {
  return (
    <div>
      <label className="block text-xs font-semibold mb-1 text-slate-500">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 dark:text-white text-sm"
      />
    </div>
  )
}
