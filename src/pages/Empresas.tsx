import { useEffect, useState } from 'react'
import { addDoc, collection, onSnapshot, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../contexts/AuthContext'
import { EmptyState, GhostButton, PageHeader, PrimaryButton, TextInput } from '../components/nexus/kit'
import { useToast } from '../components/ui/Toast'

interface Empresa { id: string; nome?: string; cnpj?: string; status?: string; plano?: string; valorMensal?: string; vencimento?: string }

export default function Empresas() {
  const { usuario } = useAuth()
  const toast = useToast()
  const allowed = ['MASTER', 'SUPER_ADMIN', 'ADMIN'].includes((usuario?.perfil || '').toUpperCase())
  const [items, setItems] = useState<Empresa[]>([])
  const [form, setForm] = useState({ nome: '', cnpj: '', telefone: '', email: '', plano: '', valorMensal: '', vencimento: '' })

  useEffect(() => {
    if (!allowed) return
    return onSnapshot(collection(db, 'empresas'), (snap) => {
      setItems(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Empresa, 'id'>) })))
    })
  }, [allowed])

  if (!allowed) {
    return <EmptyState title="Acesso restrito" description="Somente administrador autorizado visualiza empresas contratantes do Nexus." />
  }

  async function criar() {
    if (!form.nome.trim()) return toast.error('Informe o nome')
    await addDoc(collection(db, 'empresas'), { ...form, tenant_id: crypto.randomUUID?.() || Date.now().toString(), status: 'ativa', criadoEm: serverTimestamp() })
    toast.success('Empresa cadastrada')
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Empresas" subtitle="Tenants SaaS. Cada empresa isola clientes em empresas/{id}/..." />
      <div className="grid md:grid-cols-3 gap-2">
        {Object.entries(form).map(([k, v]) => (
          <TextInput key={k} placeholder={k} value={v} onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))} />
        ))}
        <PrimaryButton onClick={criar}>Cadastrar empresa</PrimaryButton>
      </div>
      <div className="nexus-card overflow-auto">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-slate-500 border-b"><th className="p-3">Nome</th><th className="p-3">CNPJ</th><th className="p-3">Plano</th><th className="p-3">Vencimento</th><th className="p-3">Status</th></tr></thead>
          <tbody>
            {items.map((e) => (
              <tr key={e.id} className="border-b"><td className="p-3">{e.nome && !/homologacao/i.test(e.nome) ? e.nome : (e.nome || 'CODE Tecnologia')}</td><td className="p-3">{e.cnpj}</td><td className="p-3">{e.plano}</td><td className="p-3">{e.vencimento}</td><td className="p-3">{e.status}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
      <GhostButton disabled>Upload de contrato (Storage por tenant)</GhostButton>
    </div>
  )
}
