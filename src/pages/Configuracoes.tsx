import { useState } from 'react'
import { EmailAuthProvider, reauthenticateWithCredential, sendPasswordResetEmail, updatePassword } from 'firebase/auth'
import { useAuth } from '../contexts/AuthContext'
import { useNexusStore } from '../contexts/NexusStore'
import { useAppearance } from '../contexts/ThemeContext'
import { auth } from '../firebase'
import { USER_ROLES } from '../types/nexus'
import { GhostButton, PageHeader, PrimaryButton, SelectInput, TextInput } from '../components/nexus/kit'
import { useToast } from '../components/ui/Toast'
import { IntegrationsCenter } from './config/IntegrationsCenter'

const TABS = ['Aparência', 'Perfil', 'Usuários', 'Integrações', 'Segurança']

export default function Configuracoes() {
  const { usuario } = useAuth()
  const { usuariosEmpresa } = useNexusStore()
  const appearance = useAppearance()
  const toast = useToast()
  const [tab, setTab] = useState('Aparência')
  const [u, setU] = useState({ nome: '', email: '', telefone: '', cargo: '', perfil: 'VENDEDOR' })
  const [senhaAtual, setSenhaAtual] = useState('')
  const [senhaNova, setSenhaNova] = useState('')
  const [senhaConfirma, setSenhaConfirma] = useState('')
  const theme = appearance.appearance === 'system' ? appearance.resolved : appearance.appearance

  async function addUser() {
    await usuariosEmpresa.create(u as any)
    toast.success('Usuário da empresa cadastrado')
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Configurações" subtitle="Tema, equipe, integrações e segurança. Segredos ficam no backend." />
      <div className="nexus-card p-3 flex flex-wrap gap-2 items-center">
        <span className="text-xs font-semibold">Tema</span>
        <button type="button" className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${theme === 'light' ? 'nexus-cta text-white' : 'nexus-btn-secondary'}`} onClick={() => appearance.setAppearance('light')}>☀ Claro</button>
        <button type="button" className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${theme === 'dark' ? 'nexus-cta text-white' : 'nexus-btn-secondary'}`} onClick={() => appearance.setAppearance('dark')}>🌙 Escuro</button>
      </div>
      <div className="flex flex-wrap gap-1">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${tab === t ? 'nexus-cta text-white' : 'nexus-btn-secondary'}`}>{t}</button>
        ))}
      </div>
      {tab === 'Aparência' && (
        <div className="nexus-card p-4 space-y-4 text-sm">
          <div className="grid md:grid-cols-3 gap-3">
            <label>Densidade
              <SelectInput className="w-full" value={appearance.density} onChange={(e) => appearance.setDensity(e.target.value as 'confortavel' | 'compacta')}>
                <option value="confortavel">Confortável</option>
                <option value="compacta">Compacta</option>
              </SelectInput>
            </label>
          </div>
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
      {tab === 'Integrações' && <IntegrationsCenter />}
      {tab === 'Segurança' && (
        <div className="space-y-4">
          <ul className="text-sm list-disc pl-5 space-y-1">
            <li>Rotas protegidas por autenticação Firebase.</li>
            <li>Dados isolados por empresa.</li>
            <li>Nexus AI Financeiro e integrações sensíveis exigem perfil financeiro ou administrador.</li>
          </ul>
          <div className="nexus-card p-4 space-y-2 text-sm max-w-md">
            <p className="font-semibold">Alterar senha</p>
            <TextInput type="password" placeholder="Senha atual" value={senhaAtual} onChange={(e) => setSenhaAtual(e.target.value)} />
            <TextInput type="password" placeholder="Nova senha" value={senhaNova} onChange={(e) => setSenhaNova(e.target.value)} />
            <TextInput type="password" placeholder="Confirmar nova senha" value={senhaConfirma} onChange={(e) => setSenhaConfirma(e.target.value)} />
            <PrimaryButton onClick={async () => {
              const user = auth.currentUser
              const mail = user?.email || usuario?.email
              if (!user || !mail) return toast.error('Sessão sem e-mail para reautenticar.')
              if (senhaNova.length < 6) return toast.error('A nova senha precisa ter ao menos 6 caracteres.')
              if (senhaNova !== senhaConfirma) return toast.error('A confirmação não confere.')
              try {
                const cred = EmailAuthProvider.credential(mail, senhaAtual)
                await reauthenticateWithCredential(user, cred)
                await updatePassword(user, senhaNova)
                toast.success('Senha atualizada')
                setSenhaAtual(''); setSenhaNova(''); setSenhaConfirma('')
              } catch {
                toast.error('Não foi possível alterar a senha. Confira a senha atual.')
              }
            }}>Salvar nova senha</PrimaryButton>
            <GhostButton onClick={async () => {
              const mail = usuario?.email || auth.currentUser?.email
              if (!mail) return toast.error('E-mail da conta não encontrado.')
              await sendPasswordResetEmail(auth, mail)
              toast.success('Link de recuperação enviado ao e-mail da conta.')
            }}>Enviar e-mail de recuperação</GhostButton>
          </div>
        </div>
      )}
    </div>
  )
}
