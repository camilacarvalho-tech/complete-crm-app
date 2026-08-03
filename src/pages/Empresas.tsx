import { useState, useEffect } from 'react'
import { Building2, Plus, X, DollarSign, Users, TrendingUp } from 'lucide-react'
import { collection, query, onSnapshot, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase'
import { useTheme } from '../contexts/ThemeContext'

interface Empresa {
  id: string
  nome: string
  cnpj: string
  proprietario: string
  cep: string
  endereco: string
  numero: string
  complemento?: string
  cidade: string
  estado: string
  whatsapp: string
  plano: string
  funcionarios: number
  comissao: number
  meta: number
  status: string
  criadoEm: any
  logoUrl?: string
  usuarios?: number
  whatsappConectado?: boolean
  metaConectada?: boolean
  ultimoAcesso?: string
  licenca?: string
  bancoDados?: string
}

export default function Empresas() {
  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [modalAberto, setModalAberto] = useState(false)
  const [tabAtiva, setTabAtiva] = useState('empresas')
  const [custoRender, setCustoRender] = useState(0)
  const [custoFirebase, setCustoFirebase] = useState(0)
  const [valorFuncionario, setValorFuncionario] = useState(90)
  const { darkMode } = useTheme()
  
  const [planos, setPlanos] = useState([
    { nome: 'Flow Start', preco: 150, maxFuncionarios: 3, comissao: 28 },
    { nome: 'Flow Pro', preco: 250, maxFuncionarios: 5, comissao: 28 },
    { nome: 'Flow Business', preco: 350, maxFuncionarios: 4, comissao: 28 },
    { nome: 'Flow Prime', preco: 490, maxFuncionarios: 5, comissao: 33 },
    { nome: 'Flow Enterprise', preco: 690, maxFuncionarios: 7, comissao: 33 }
  ])

  const atualizarComissaoPlano = (nomePlano: string, novaComissao: number) => {
    setPlanos(planos.map(p => 
      p.nome === nomePlano ? { ...p, comissao: novaComissao } : p
    ))
  }
  
  const [formData, setFormData] = useState({
    nome: '', cnpj: '', proprietario: '', cep: '', endereco: '', numero: '',
    complemento: '', cidade: '', estado: 'SP', whatsapp: '', plano: 'Flow Start',
    funcionarios: 3, comissao: 28, meta: 2, status: 'Ativa', pix: '',
    logoUrl: '', whatsappConectado: true, metaConectada: false,
    licenca: 'Trial 30 dias', bancoDados: 'Firestore', ultimoAcesso: new Date().toISOString().slice(0, 10),
  })

  const empresaId = localStorage.getItem('empresaId') || 'default'

  useEffect(() => {
    const q = query(collection(db, 'empresas'))
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const empresasData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      })) as Empresa[]
      setEmpresas(empresasData)
    })
    return () => unsubscribe()
  }, [])

  const calcularReceitaMensal = () => {
    return empresas.reduce((total, emp) => {
      const plano = planos.find(p => p.nome === emp.plano)
      const valorPlano = plano?.preco || 0
      const valorFuncs = emp.funcionarios * valorFuncionario
      return total + valorPlano + valorFuncs
    }, 0)
  }

  const calcularComissaoVendedores = () => {
    return empresas.reduce((total, emp) => {
      const comissaoTotal = emp.funcionarios * (valorFuncionario * (emp.comissao / 100))
      return total + comissaoTotal
    }, 0)
  }

  const calcularCustoFixo = () => {
    return custoRender + custoFirebase
  }

  const calcularLucroLiquido = () => {
    const receita = calcularReceitaMensal()
    const comissoes = calcularComissaoVendedores()
    const custos = calcularCustoFixo()
    return receita - comissoes - custos
  }

  const salvarEmpresa = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await addDoc(collection(db, 'empresas'), {
        ...formData,
        criadoEm: serverTimestamp()
      })
      setModalAberto(false)
      setFormData({
        nome: '', cnpj: '', proprietario: '', cep: '', endereco: '', numero: '',
        complemento: '', cidade: '', estado: 'SP', whatsapp: '', plano: 'Flow Start',
        funcionarios: 3, comissao: 28, meta: 2, status: 'Ativa', pix: '',
        logoUrl: '', whatsappConectado: true, metaConectada: false,
        licenca: 'Trial 30 dias', bancoDados: 'Firestore', ultimoAcesso: new Date().toISOString().slice(0, 10),
      })
      alert('✅ Empresa cadastrada com sucesso!')
    } catch (error) {
      console.error('Erro ao salvar:', error)
      alert('❌ Erro ao salvar empresa')
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>
          <Building2 className="w-8 h-8 inline-block mr-3 text-orange-500" />
          Empresas
        </h1>
      </div>

      {/* Banner Empresas Parceiras */}
      <div className="bg-gradient-to-r from-orange-500 via-pink-500 to-blue-500 rounded-xl p-6 mb-6 text-white">
        <h2 className="text-2xl font-bold mb-2">Empresas Parceiras</h2>
        <p className="text-sm opacity-90">
          Gerencie as empresas que usam o seu CRM. Planos Flow + R$ 90 por funcionário. 
          Em breve cada uma terá login próprio.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setTabAtiva('empresas')}
          className={`px-6 py-3 rounded-lg font-bold transition ${
            tabAtiva === 'empresas'
              ? 'bg-orange-500 text-white shadow-lg'
              : darkMode
              ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
          }`}
        >
          Empresas
        </button>
        <button
          onClick={() => setTabAtiva('contratos')}
          className={`px-6 py-3 rounded-lg font-bold transition ${
            tabAtiva === 'contratos'
              ? 'bg-orange-500 text-white shadow-lg'
              : darkMode
              ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
          }`}
        >
          Contrato
        </button>
      </div>

      {tabAtiva === 'empresas' && (
        <>
          {/* Cards Métricas */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className={`rounded-xl shadow-lg p-6 ${
              darkMode ? 'bg-gradient-to-br from-slate-800/80 to-slate-700/80' : 'bg-white'
            }`}>
              <h3 className={`text-sm font-semibold mb-2 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                Total de Empresas
              </h3>
              <p className={`text-4xl font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                {empresas.length}
              </p>
            </div>

            <div className={`rounded-xl shadow-lg p-6 ${
              darkMode ? 'bg-gradient-to-br from-slate-800/80 to-slate-700/80' : 'bg-white'
            }`}>
              <h3 className={`text-sm font-semibold mb-2 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                Empresas Ativas
              </h3>
              <p className={`text-4xl font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                {empresas.filter(e => e.status === 'Ativa').length}
              </p>
            </div>

            <div className={`rounded-xl shadow-lg p-6 ${
              darkMode ? 'bg-gradient-to-br from-green-900/40 to-green-800/40 ring-1 ring-green-500/30' : 'bg-gradient-to-br from-green-50 to-green-100'
            }`}>
              <h3 className={`text-sm font-semibold mb-2 ${darkMode ? 'text-green-300' : 'text-green-700'}`}>
                Receita Mensal (aluguel)
              </h3>
              <p className={`text-4xl font-bold ${darkMode ? 'text-white' : 'text-green-800'}`}>
                R$ {calcularReceitaMensal().toFixed(2)}
              </p>
            </div>
          </div>

          {/* Planos, Comissões e Lucro */}
          <div className={`rounded-xl shadow-lg p-6 mb-6 ${darkMode ? 'bg-slate-800/80' : 'bg-white'}`}>
            <h3 className={`text-xl font-bold mb-6 ${darkMode ? 'text-white' : 'text-slate-800'}`}>
              Planos, Comissões e Lucro
            </h3>

            <div className="grid grid-cols-3 gap-4 mb-6">
              <div>
                <label className={`block text-sm font-semibold mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  Custo Render por mês (R$)
                </label>
                <input type="number" value={custoRender}
                  onChange={(e) => setCustoRender(Number(e.target.value))}
                  className={`w-full px-4 py-2 rounded-lg ${darkMode ? 'bg-slate-700 text-white border border-slate-600' : 'bg-white border border-slate-300'}`} />
              </div>
              <div>
                <label className={`block text-sm font-semibold mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  Custo Firebase por mês (R$)
                </label>
                <input type="number" value={custoFirebase}
                  onChange={(e) => setCustoFirebase(Number(e.target.value))}
                  className={`w-full px-4 py-2 rounded-lg ${darkMode ? 'bg-slate-700 text-white border border-slate-600' : 'bg-white border border-slate-300'}`} />
              </div>
              <div>
                <label className={`block text-sm font-semibold mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  Valor por funcionário (R$)
                </label>
                <input type="number" value={valorFuncionario}
                  onChange={(e) => setValorFuncionario(Number(e.target.value))}
                  className={`w-full px-4 py-2 rounded-lg ${darkMode ? 'bg-slate-700 text-white border border-slate-600' : 'bg-white border border-slate-300'}`} />
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4 mb-6">
              <div className="bg-green-500 rounded-lg p-4 text-white">
                <p className="text-sm font-semibold">Receita Mensal</p>
                <p className="text-2xl font-bold">R$ {calcularReceitaMensal().toFixed(2)}</p>
              </div>
              <div className="bg-orange-500 rounded-lg p-4 text-white">
                <p className="text-sm font-semibold">Comissões Vendedores</p>
                <p className="text-2xl font-bold">R$ {calcularComissaoVendedores().toFixed(2)}</p>
              </div>
              <div className="bg-slate-500 rounded-lg p-4 text-white">
                <p className="text-sm font-semibold">Custos Fixos</p>
                <p className="text-2xl font-bold">R$ {calcularCustoFixo().toFixed(2)}</p>
              </div>
              <div className="bg-blue-600 rounded-lg p-4 text-white">
                <p className="text-sm font-semibold">Seu Lucro Líquido</p>
                <p className="text-2xl font-bold">R$ {calcularLucroLiquido().toFixed(2)}</p>
              </div>
            </div>

            {/* Tabela de Planos */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className={`border-b ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
                    <th className={`text-left p-3 font-bold ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Plano</th>
                    <th className={`text-left p-3 font-bold ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Preço</th>
                    <th className={`text-left p-3 font-bold ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Funcionários</th>
                    <th className={`text-left p-3 font-bold ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Comissão %</th>
                    <th className={`text-left p-3 font-bold ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Comissão R$</th>
                    <th className={`text-left p-3 font-bold ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Margem plano</th>
                    <th className={`text-left p-3 font-bold ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Você ganha (completo)</th>
                  </tr>
                </thead>
                <tbody>
                  {planos.map((plano) => {
                    const comissaoPerc = 28
                    const comissaoValor = plano.maxFuncionarios * (valorFuncionario * (comissaoPerc / 100))
                    const margemPlano = plano.maxFuncionarios * valorFuncionario
                    const ganhoTotal = plano.preco + margemPlano
                    
                    return (
                      <tr key={plano.nome} className={`border-b ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
                        <td className={`p-3 ${darkMode ? 'text-white' : 'text-slate-800'}`}>{plano.nome}</td>
                        <td className={`p-3 ${darkMode ? 'text-white' : 'text-slate-800'}`}>R$ {plano.preco.toFixed(2)}</td>
                        <td className={`p-3 ${darkMode ? 'text-white' : 'text-slate-800'}`}>{plano.maxFuncionarios}</td>
                        <td className={`p-3 ${darkMode ? 'text-white' : 'text-slate-800'}`}>{comissaoPerc} %</td>
                        <td className={`p-3 text-orange-500 font-bold`}>R$ {comissaoValor.toFixed(2)}</td>
                        <td className={`p-3 ${darkMode ? 'text-white' : 'text-slate-800'}`}>R$ {margemPlano.toFixed(2)}</td>
                        <td className={`p-3 text-green-500 font-bold`}>R$ {ganhoTotal.toFixed(2)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Lista de Empresas */}
          <div className={`rounded-xl shadow-lg p-6 ${darkMode ? 'bg-slate-800/80' : 'bg-white'}`}>
            <div className="flex items-center justify-between mb-6">
              <h3 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                Lista de Empresas
              </h3>
              <button
                onClick={() => setModalAberto(true)}
                className="bg-gradient-to-r from-orange-500 to-pink-500 text-white px-6 py-3 rounded-lg font-bold hover:from-orange-600 hover:to-pink-600 transition shadow-lg flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Nova Empresa
              </button>
            </div>

            {empresas.length === 0 ? (
              <div className="text-center py-12">
                <Building2 className={`w-16 h-16 mx-auto mb-4 ${darkMode ? 'text-slate-600' : 'text-slate-300'}`} />
                <p className={darkMode ? 'text-slate-400' : 'text-slate-500'}>Nenhuma empresa cadastrada</p>
              </div>
            ) : (
              <div className="space-y-4">
                {empresas.map((empresa) => (
                  <div
                    key={empresa.id}
                    className={`rounded-lg p-6 ${
                      darkMode ? 'bg-slate-700/50' : 'bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        {empresa.logoUrl ? (
                          <img src={empresa.logoUrl} alt="" className="w-12 h-12 rounded-full object-cover" />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-xl">
                            {(empresa.nome || '?').charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <h4 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                            {empresa.nome}
                          </h4>
                          <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                            {empresa.cidade} - {empresa.estado} · Plano {empresa.plano}
                          </p>
                          <p className={`text-xs mt-1 ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                            Licença: {empresa.licenca || '—'} · BD: {empresa.bancoDados || 'Firestore'} · Último acesso: {empresa.ultimoAcesso || '—'}
                          </p>
                          <div className="flex gap-2 mt-1 text-[10px]">
                            <span className={`px-1.5 py-0.5 rounded ${empresa.whatsappConectado !== false ? 'bg-green-500/20 text-green-500' : 'bg-slate-500/20 text-slate-400'}`}>
                              WhatsApp {empresa.whatsappConectado !== false ? 'OK' : 'off'}
                            </span>
                            <span className={`px-1.5 py-0.5 rounded ${empresa.metaConectada ? 'bg-blue-500/20 text-blue-500' : 'bg-slate-500/20 text-slate-400'}`}>
                              Meta {empresa.metaConectada ? 'OK' : 'off'}
                            </span>
                            <span className={`px-1.5 py-0.5 rounded ${darkMode ? 'bg-slate-600 text-slate-300' : 'bg-slate-200 text-slate-600'}`}>
                              {empresa.funcionarios || 0} usuários
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`inline-block px-3 py-1 rounded-full text-sm font-bold ${
                          empresa.status === 'Ativa'
                            ? 'bg-green-500/20 text-green-500'
                            : 'bg-red-500/20 text-red-500'
                        }`}>
                          {empresa.status}
                        </span>
                        <p className={`text-2xl font-bold mt-2 ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                          R$ {(() => {
                            const plano = planos.find(p => p.nome === empresa.plano)
                            return ((plano?.preco || 0) + (empresa.funcionarios * valorFuncionario)).toFixed(2)
                          })()}/mês
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div>
                        <p className={`text-xs font-semibold mb-1 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                          CNPJ
                        </p>
                        <p className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                          {empresa.cnpj}
                        </p>
                      </div>
                      <div>
                        <p className={`text-xs font-semibold mb-1 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                          Proprietário
                        </p>
                        <p className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                          {empresa.proprietario}
                        </p>
                      </div>
                      <div>
                        <p className={`text-xs font-semibold mb-1 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                          WhatsApp
                        </p>
                        <p className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                          {empresa.whatsapp}
                        </p>
                      </div>
                      <div>
                        <p className={`text-xs font-semibold mb-1 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                          CEP (guia a cidade)
                        </p>
                        <p className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                          {empresa.cep}
                        </p>
                      </div>
                    </div>

                    <div className="mb-4">
                      <p className={`text-xs font-semibold mb-1 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                        Endereço
                      </p>
                      <p className={`text-sm ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                        {empresa.endereco}, {empresa.numero} - {empresa.complemento && `${empresa.complemento} - `}CASA {empresa.cidade} {empresa.estado}
                      </p>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <p className={`text-xs font-semibold mb-1 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                          Plano
                        </p>
                        <p className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                          {empresa.plano}
                        </p>
                      </div>
                      <div>
                        <p className={`text-xs font-semibold mb-1 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                          Funcionários
                        </p>
                        <p className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                          {empresa.funcionarios} (x R$ {valorFuncionario.toFixed(2)})
                        </p>
                      </div>
                      <div>
                        <p className={`text-xs font-semibold mb-1 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                          Total Mensal
                        </p>
                        <p className={`text-sm font-bold text-green-500`}>
                          R$ {(() => {
                            const plano = planos.find(p => p.nome === empresa.plano)
                            return ((plano?.preco || 0) + (empresa.funcionarios * valorFuncionario)).toFixed(2)
                          })()}
                        </p>
                      </div>
                    </div>

                    <div className={`mt-4 pt-4 border-t ${darkMode ? 'border-slate-600' : 'border-slate-200'}`}>
                      <p className={`text-xs font-semibold mb-2 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                        Criar acesso (login) para esta empresa
                      </p>
                      <div className="flex gap-2">
                        <input
                          type="email"
                          placeholder="Email do acesso"
                          className={`flex-1 px-3 py-2 rounded-lg text-sm ${
                            darkMode ? 'bg-slate-700 text-white border border-slate-600' : 'bg-white border border-slate-300'
                          }`}
                        />
                        <input
                          type="password"
                          placeholder="Senha (mín 6)"
                          className={`w-32 px-3 py-2 rounded-lg text-sm ${
                            darkMode ? 'bg-slate-700 text-white border border-slate-600' : 'bg-white border border-slate-300'
                          }`}
                        />
                        <select className={`px-3 py-2 rounded-lg text-sm ${
                          darkMode ? 'bg-slate-700 text-white border border-slate-600' : 'bg-white border border-slate-300'
                        }`}>
                          <option>Proprietário</option>
                          <option>Gerente</option>
                        </select>
                        <button className="bg-gradient-to-r from-orange-500 to-pink-500 text-white px-6 py-2 rounded-lg font-bold hover:from-orange-600 hover:to-pink-600 transition">
                          Criar acesso
                        </button>
                      </div>
                      <p className={`text-xs mt-2 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                        🔒 A pessoa entra no mesmo site (credflowcrm.com.br) com esse e-mail e senha.
                      </p>
                      <button className="text-red-500 text-xs font-semibold mt-2 hover:underline">
                        🗑️ Remover empresa
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {tabAtiva === 'contratos' && (
        <div className={`rounded-xl shadow-lg p-12 text-center ${darkMode ? 'bg-slate-800/80' : 'bg-white'}`}>
          <Building2 className={`w-16 h-16 mx-auto mb-4 ${darkMode ? 'text-slate-600' : 'text-slate-300'}`} />
          <p className={darkMode ? 'text-slate-400' : 'text-slate-500'}>Contratos em desenvolvimento...</p>
        </div>
      )}

      {/* Modal Nova Empresa */}
      {modalAberto && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className={`rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto ${
            darkMode ? 'bg-slate-800' : 'bg-white'
          }`}>
            <div className="sticky top-0 bg-gradient-to-r from-orange-500 to-pink-500 text-white p-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold">Nova Empresa</h2>
              <button onClick={() => setModalAberto(false)} className="text-white hover:bg-white/20 p-1 rounded">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={salvarEmpresa} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className={`block text-sm font-semibold mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                    Nome da empresa
                  </label>
                  <input type="text" required value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    className={`w-full px-4 py-3 rounded-lg ${darkMode ? 'bg-slate-700 text-white border border-slate-600' : 'bg-white border border-slate-300'}`} />
                </div>

                <div>
                  <label className={`block text-sm font-semibold mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                    CNPJ
                  </label>
                  <input type="text" required value={formData.cnpj}
                    onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                    className={`w-full px-4 py-3 rounded-lg ${darkMode ? 'bg-slate-700 text-white border border-slate-600' : 'bg-white border border-slate-300'}`} />
                </div>

                <div>
                  <label className={`block text-sm font-semibold mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                    Proprietário
                  </label>
                  <input type="text" required value={formData.proprietario}
                    onChange={(e) => setFormData({ ...formData, proprietario: e.target.value })}
                    className={`w-full px-4 py-3 rounded-lg ${darkMode ? 'bg-slate-700 text-white border border-slate-600' : 'bg-white border border-slate-300'}`} />
                </div>

                <div>
                  <label className={`block text-sm font-semibold mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                    CEP (guia a cidade)
                  </label>
                  <input type="text" required value={formData.cep}
                    onChange={(e) => setFormData({ ...formData, cep: e.target.value })}
                    className={`w-full px-4 py-3 rounded-lg ${darkMode ? 'bg-slate-700 text-white border border-slate-600' : 'bg-white border border-slate-300'}`} />
                </div>

                <div>
                  <label className={`block text-sm font-semibold mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                    Endereço (rua)
                  </label>
                  <input type="text" required value={formData.endereco}
                    onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                    className={`w-full px-4 py-3 rounded-lg ${darkMode ? 'bg-slate-700 text-white border border-slate-600' : 'bg-white border border-slate-300'}`} />
                </div>

                <div>
                  <label className={`block text-sm font-semibold mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                    Número
                  </label>
                  <input type="text" required value={formData.numero}
                    onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
                    className={`w-full px-4 py-3 rounded-lg ${darkMode ? 'bg-slate-700 text-white border border-slate-600' : 'bg-white border border-slate-300'}`} />
                </div>

                <div>
                  <label className={`block text-sm font-semibold mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                    Complemento
                  </label>
                  <input type="text" value={formData.complemento}
                    onChange={(e) => setFormData({ ...formData, complemento: e.target.value })}
                    className={`w-full px-4 py-3 rounded-lg ${darkMode ? 'bg-slate-700 text-white border border-slate-600' : 'bg-white border border-slate-300'}`} />
                </div>

                <div>
                  <label className={`block text-sm font-semibold mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                    Cidade
                  </label>
                  <input type="text" required value={formData.cidade}
                    onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                    className={`w-full px-4 py-3 rounded-lg ${darkMode ? 'bg-slate-700 text-white border border-slate-600' : 'bg-white border border-slate-300'}`} />
                </div>

                <div>
                  <label className={`block text-sm font-semibold mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                    Estado (UF)
                  </label>
                  <select required value={formData.estado}
                    onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                    className={`w-full px-4 py-3 rounded-lg ${darkMode ? 'bg-slate-700 text-white border border-slate-600' : 'bg-white border border-slate-300'}`}>
                    <option value="SP">SP</option>
                    <option value="RJ">RJ</option>
                    <option value="MG">MG</option>
                    <option value="ES">ES</option>
                  </select>
                </div>

                <div>
                  <label className={`block text-sm font-semibold mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                    WhatsApp
                  </label>
                  <input type="text" required value={formData.whatsapp}
                    onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                    className={`w-full px-4 py-3 rounded-lg ${darkMode ? 'bg-slate-700 text-white border border-slate-600' : 'bg-white border border-slate-300'}`} />
                </div>

                <div>
                  <label className={`block text-sm font-semibold mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                    PIX
                  </label>
                  <input type="text" value={formData.pix}
                    onChange={(e) => setFormData({ ...formData, pix: e.target.value })}
                    className={`w-full px-4 py-3 rounded-lg ${darkMode ? 'bg-slate-700 text-white border border-slate-600' : 'bg-white border border-slate-300'}`} />
                </div>

                <div>
                  <label className={`block text-sm font-semibold mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                    Plano
                  </label>
                  <select required value={formData.plano}
                    onChange={(e) => setFormData({ ...formData, plano: e.target.value })}
                    className={`w-full px-4 py-3 rounded-lg ${darkMode ? 'bg-slate-700 text-white border border-slate-600' : 'bg-white border border-slate-300'}`}>
                    {planos.map(p => (
                      <option key={p.nome} value={p.nome}>{p.nome} - R$ {p.preco.toFixed(2)}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setModalAberto(false)}
                  className={`flex-1 px-6 py-3 rounded-lg font-bold ${darkMode ? 'bg-slate-700 text-white hover:bg-slate-600' : 'bg-slate-200 text-slate-800 hover:bg-slate-300'}`}>
                  Cancelar
                </button>
                <button type="submit"
                  className="flex-1 bg-gradient-to-r from-orange-500 to-pink-500 text-white px-6 py-3 rounded-lg font-bold hover:from-orange-600 hover:to-pink-600">
                  Salvar Empresa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
