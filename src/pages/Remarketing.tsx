import { useState, useEffect } from 'react'
import { 
  Target, 
  Plus,
  Search,
  Filter,
  Play,
  Pause,
  Edit,
  Trash2,
  Eye,
  TrendingUp,
  Users,
  MessageSquare,
  Mail,
  Phone,
  Clock,
  CheckCircle,
  AlertCircle,
  BarChart3,
  Zap,
  Calendar,
  Send,
  Bot,
  X,
  Download,
  FileDown
} from 'lucide-react'
import { db } from '../firebase'
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore'
import * as XLSX from 'xlsx'

type StatusCampanha = 'Ativa' | 'Pausada' | 'Agendada' | 'Finalizada'
type CanalComunicacao = 'WhatsApp' | 'Email' | 'SMS' | 'Todos'

interface CampanhaRemarketing {
  id: string
  nome: string
  descricao: string
  diaEnvio: 5 | 10 | 15 | 20 | 25
  canais: CanalComunicacao[]
  mensagemWhatsApp: string
  mensagemSMS: string
  assuntoEmail: string
  mensagemEmail: string
  status: StatusCampanha
  clientesSemMovimentacao: number
  mensagensEnviadas: number
  respostas: number
  conversoes: number
  ultimoEnvio: string | null
  proximoEnvio: string
}

export default function Remarketing() {
  const [searchTerm, setSearchTerm] = useState('')
  const [filtroStatus, setFiltroStatus] = useState<StatusCampanha | 'Todos'>('Todos')
  const [mostrarModalNova, setMostrarModalNova] = useState(false)
  const [mostrarModalEditar, setMostrarModalEditar] = useState(false)
  const [campanhaSelecionada, setCampanhaSelecionada] = useState<CampanhaRemarketing | null>(null)
  const [loading, setLoading] = useState(false)
  
  // Estados do formulário
  const [nome, setNome] = useState('')
  const [descricao, setDescricao] = useState('')
  const [diaEnvio, setDiaEnvio] = useState<5 | 10 | 15 | 20 | 25>(5)
  const [canaisSelecionados, setCanaisSelecionados] = useState<CanalComunicacao[]>(['WhatsApp'])
  const [mensagemWhatsApp, setMensagemWhatsApp] = useState('Olá {nome}! Notamos que você não realizou movimentações este mês. Temos ofertas especiais esperando por você! 🎉')
  const [mensagemSMS, setMensagemSMS] = useState('Oi {nome}! Sentimos sua falta. Aproveite nossas condições especiais!')
  const [assuntoEmail, setAssuntoEmail] = useState('Sentimos sua falta! Confira nossas ofertas')
  const [mensagemEmail, setMensagemEmail] = useState('Olá {nome},\n\nNotamos que você não realizou movimentações conosco este mês.\n\nPreparamos condições especiais para você voltar!')

  const [campanhas, setCampanhas] = useState<CampanhaRemarketing[]>([])

  // Carregar campanhas do Firestore
  useEffect(() => {
    carregarCampanhas()
  }, [])

  const carregarCampanhas = async () => {
    try {
      setLoading(true)
      const querySnapshot = await getDocs(collection(db, 'campanhas_remarketing'))
      const campanhasData: CampanhaRemarketing[] = []
      querySnapshot.forEach((doc) => {
        campanhasData.push({ id: doc.id, ...doc.data() } as CampanhaRemarketing)
      })
      setCampanhas(campanhasData)
    } catch (error) {
      console.error('Erro ao carregar campanhas:', error)
      // Fallback com dados simulados se Firestore falhar
      carregarDadosSimulados()
    } finally {
      setLoading(false)
    }
  }

  const carregarDadosSimulados = () => {
    setCampanhas([
      {
        id: '1',
        nome: 'Remarketing Dia 05',
        descricao: 'Primeira tentativa de recuperação automática',
        diaEnvio: 5,
        canais: ['WhatsApp', 'SMS'],
        mensagemWhatsApp: 'Olá {nome}! 🎯 Sentimos sua falta! Temos ofertas especiais para você voltar.',
        mensagemSMS: 'Oi {nome}! Aproveite nossas condições exclusivas!',
        assuntoEmail: '',
        mensagemEmail: '',
        status: 'Ativa',
        clientesSemMovimentacao: 45,
        mensagensEnviadas: 450,
        respostas: 67,
        conversoes: 12,
        ultimoEnvio: '05/06/2026',
        proximoEnvio: '05/07/2026'
      },
      {
        id: '2',
        nome: 'Remarketing Dia 10',
        descricao: 'Segunda tentativa com desconto especial',
        diaEnvio: 10,
        canais: ['WhatsApp', 'Email'],
        mensagemWhatsApp: 'Oi {nome}! 💰 Oferecemos 15% de desconto especial para você!',
        mensagemSMS: '',
        assuntoEmail: '15% OFF Especial para Você!',
        mensagemEmail: 'Olá {nome}, preparamos 15% de desconto exclusivo!',
        status: 'Ativa',
        clientesSemMovimentacao: 38,
        mensagensEnviadas: 380,
        respostas: 52,
        conversoes: 9,
        ultimoEnvio: '10/06/2026',
        proximoEnvio: '10/07/2026'
      },
      {
        id: '3',
        nome: 'Remarketing Dia 15',
        descricao: 'Terceira tentativa com oferta premium',
        diaEnvio: 15,
        canais: ['WhatsApp', 'SMS', 'Email'],
        mensagemWhatsApp: 'Oi {nome}! 🌟 Última chance! 20% OFF + condições especiais!',
        mensagemSMS: 'Oi {nome}! Aproveite 20% OFF exclusivo!',
        assuntoEmail: '🔥 Última Chance - 20% OFF!',
        mensagemEmail: 'Olá {nome}, esta é sua última chance de aproveitar 20% de desconto!',
        status: 'Ativa',
        clientesSemMovimentacao: 32,
        mensagensEnviadas: 320,
        respostas: 48,
        conversoes: 11,
        ultimoEnvio: '15/06/2026',
        proximoEnvio: '15/07/2026'
      },
      {
        id: '4',
        nome: 'Remarketing Dia 20',
        descricao: 'Recuperação intensiva com bônus',
        diaEnvio: 20,
        canais: ['WhatsApp', 'Email'],
        mensagemWhatsApp: 'Olá {nome}! 🎁 Surpresa especial: Desconto + Bônus para você!',
        mensagemSMS: '',
        assuntoEmail: '🎁 Bônus Especial Exclusivo',
        mensagemEmail: 'Olá {nome}, preparamos um bônus exclusivo + desconto especial!',
        status: 'Ativa',
        clientesSemMovimentacao: 28,
        mensagensEnviadas: 280,
        respostas: 39,
        conversoes: 8,
        ultimoEnvio: '20/06/2026',
        proximoEnvio: '20/07/2026'
      },
      {
        id: '5',
        nome: 'Remarketing Dia 25',
        descricao: 'Última tentativa do mês com super oferta',
        diaEnvio: 25,
        canais: ['WhatsApp', 'SMS', 'Email'],
        mensagemWhatsApp: 'Oi {nome}! 💥 SUPER OFERTA de fim de mês só pra você!',
        mensagemSMS: 'Oi {nome}! Super oferta especial fim de mês!',
        assuntoEmail: '💥 Super Oferta de Fim de Mês!',
        mensagemEmail: 'Olá {nome}, não perca nossa super oferta exclusiva de fim de mês!',
        status: 'Ativa',
        clientesSemMovimentacao: 25,
        mensagensEnviadas: 250,
        respostas: 35,
        conversoes: 7,
        ultimoEnvio: '25/06/2026',
        proximoEnvio: '25/07/2026'
      }
    ])
  }

  const salvarNovaCampanha = async () => {
    if (!nome.trim()) {
      alert('❌ Preencha o nome da campanha')
      return
    }

    try {
      setLoading(true)
      const novaCampanha = {
        nome,
        descricao,
        diaEnvio,
        canais: canaisSelecionados,
        mensagemWhatsApp,
        mensagemSMS,
        assuntoEmail,
        mensagemEmail,
        status: 'Agendada' as StatusCampanha,
        clientesSemMovimentacao: 0,
        mensagensEnviadas: 0,
        respostas: 0,
        conversoes: 0,
        ultimoEnvio: null,
        proximoEnvio: `${diaEnvio < 10 ? '0' + diaEnvio : diaEnvio}/07/2026`,
        criadoEm: serverTimestamp()
      }

      await addDoc(collection(db, 'campanhas_remarketing'), novaCampanha)
      await carregarCampanhas()
      setMostrarModalNova(false)
      resetForm()
      alert('✅ Campanha criada com sucesso!')
    } catch (error) {
      console.error('Erro ao salvar campanha:', error)
      alert('❌ Erro ao salvar campanha. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const exportarExcel = () => {
    try {
      const dadosExport = campanhas.map(c => ({
        'Nome': c.nome,
        'Descrição': c.descricao,
        'Dia de Envio': c.diaEnvio,
        'Canais': c.canais.join(', '),
        'Status': c.status,
        'Clientes Sem Movimentação': c.clientesSemMovimentacao,
        'Mensagens Enviadas': c.mensagensEnviadas,
        'Respostas': c.respostas,
        'Conversões': c.conversoes,
        'Taxa de Conversão': c.mensagensEnviadas > 0 ? ((c.conversoes / c.mensagensEnviadas) * 100).toFixed(1) + '%' : '0%',
        'Último Envio': c.ultimoEnvio || 'Nunca',
        'Próximo Envio': c.proximoEnvio
      }))

      const ws = XLSX.utils.json_to_sheet(dadosExport)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Campanhas Remarketing')
      
      // Auto-ajustar largura das colunas
      const maxWidth = dadosExport.reduce((w, r) => Math.max(w, Object.keys(r).reduce((max, key) => Math.max(max, String(r[key as keyof typeof r]).length), 0)), 0)
      ws['!cols'] = Object.keys(dadosExport[0] || {}).map(() => ({ wch: maxWidth }))
      
      XLSX.writeFile(wb, `Campanhas_Remarketing_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.xlsx`)
      alert('✅ Relatório exportado com sucesso!')
    } catch (error) {
      console.error('Erro ao exportar:', error)
      alert('❌ Erro ao exportar relatório')
    }
  }

  const resetForm = () => {
    setNome('')
    setDescricao('')
    setDiaEnvio(5)
    setCanaisSelecionados(['WhatsApp'])
    setMensagemWhatsApp('Olá {nome}! Notamos que você não realizou movimentações este mês. Temos ofertas especiais esperando por você! 🎉')
    setMensagemSMS('Oi {nome}! Sentimos sua falta. Aproveite nossas condições especiais!')
    setAssuntoEmail('Sentimos sua falta! Confira nossas ofertas')
    setMensagemEmail('Olá {nome},\n\nNotamos que você não realizou movimentações conosco este mês.\n\nPreparamos condições especiais para você voltar!')
  }

  const toggleCanal = (canal: CanalComunicacao) => {
    if (canaisSelecionados.includes(canal)) {
      setCanaisSelecionados(canaisSelecionados.filter(c => c !== canal))
    } else {
      setCanaisSelecionados([...canaisSelecionados, canal])
    }
  }

  const pausarCampanha = async (id: string) => {
    try {
      await updateDoc(doc(db, 'campanhas_remarketing', id), { status: 'Pausada' })
      setCampanhas(campanhas.map(c => 
        c.id === id ? { ...c, status: 'Pausada' as StatusCampanha } : c
      ))
    } catch (error) {
      console.error('Erro ao pausar campanha:', error)
      setCampanhas(campanhas.map(c => 
        c.id === id ? { ...c, status: 'Pausada' as StatusCampanha } : c
      ))
    }
  }

  const ativarCampanha = async (id: string) => {
    try {
      await updateDoc(doc(db, 'campanhas_remarketing', id), { status: 'Ativa' })
      setCampanhas(campanhas.map(c => 
        c.id === id ? { ...c, status: 'Ativa' as StatusCampanha } : c
      ))
    } catch (error) {
      console.error('Erro ao ativar campanha:', error)
      setCampanhas(campanhas.map(c => 
        c.id === id ? { ...c, status: 'Ativa' as StatusCampanha } : c
      ))
    }
  }

  const excluirCampanha = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta campanha?')) {
      try {
        await deleteDoc(doc(db, 'campanhas_remarketing', id))
        setCampanhas(campanhas.filter(c => c.id !== id))
        alert('✅ Campanha excluída com sucesso!')
      } catch (error) {
        console.error('Erro ao excluir campanha:', error)
        setCampanhas(campanhas.filter(c => c.id !== id))
      }
    }
  }

  const campanhasFiltradas = campanhas.filter(c => {
    const matchNome = c.nome.toLowerCase().includes(searchTerm.toLowerCase())
    const matchStatus = filtroStatus === 'Todos' || c.status === filtroStatus
    return matchNome && matchStatus
  })

  const totalClientes = campanhas.reduce((sum, c) => sum + c.clientesSemMovimentacao, 0)
  const totalEnviadas = campanhas.reduce((sum, c) => sum + c.mensagensEnviadas, 0)
  const totalConversoes = campanhas.reduce((sum, c) => sum + c.conversoes, 0)
  const taxaConversao = totalEnviadas > 0 ? ((totalConversoes / totalEnviadas) * 100).toFixed(1) : '0'

  return (
    <div className="p-6 space-y-6 bg-slate-900 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Target className="w-8 h-8 text-green-400" />
            Remarketing Automático
          </h1>
          <p className="text-slate-400 mt-1">Campanhas automáticas nos dias 05, 10, 15, 20 e 25 de cada mês</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={exportarExcel}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg flex items-center gap-2 transition-colors shadow-lg"
          >
            <FileDown className="w-5 h-5" />
            Exportar Excel
          </button>
          <button 
            onClick={() => setMostrarModalNova(true)}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg flex items-center gap-2 transition-colors shadow-lg"
          >
            <Plus className="w-5 h-5" />
            Nova Campanha
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-purple-900 to-purple-800 rounded-xl p-6 shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-200 text-sm font-medium">Campanhas Ativas</p>
              <p className="text-3xl font-bold text-white mt-1">{campanhas.filter(c => c.status === 'Ativa').length}</p>
            </div>
            <div className="bg-purple-500/20 p-3 rounded-lg">
              <Target className="w-6 h-6 text-purple-300" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-900 to-blue-800 rounded-xl p-6 shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-200 text-sm font-medium">Clientes Sem Movimentação</p>
              <p className="text-3xl font-bold text-white mt-1">{totalClientes}</p>
            </div>
            <div className="bg-blue-500/20 p-3 rounded-lg">
              <Users className="w-6 h-6 text-blue-300" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-900 to-green-800 rounded-xl p-6 shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-200 text-sm font-medium">Mensagens Enviadas</p>
              <p className="text-3xl font-bold text-white mt-1">{totalEnviadas}</p>
            </div>
            <div className="bg-green-500/20 p-3 rounded-lg">
              <Send className="w-6 h-6 text-green-300" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-900 to-orange-800 rounded-xl p-6 shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-200 text-sm font-medium">Taxa de Conversão</p>
              <p className="text-3xl font-bold text-white mt-1">{taxaConversao}%</p>
            </div>
            <div className="bg-orange-500/20 p-3 rounded-lg">
              <TrendingUp className="w-6 h-6 text-orange-300" />
            </div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar campanha..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-700 text-white pl-10 pr-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <select
            value={filtroStatus}
            onChange={(e) => setFiltroStatus(e.target.value as any)}
            className="bg-slate-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="Todos">Todos os Status</option>
            <option value="Ativa">Ativas</option>
            <option value="Pausada">Pausadas</option>
            <option value="Agendada">Agendadas</option>
            <option value="Finalizada">Finalizadas</option>
          </select>
        </div>
      </div>

      {/* Lista de Campanhas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {campanhasFiltradas.map((campanha) => (
          <div key={campanha.id} className="bg-slate-800 border border-slate-700 rounded-xl p-6 hover:border-green-500 transition-all">
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-xl font-bold text-white">{campanha.nome}</h3>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    campanha.status === 'Ativa' ? 'bg-green-500/20 text-green-400' :
                    campanha.status === 'Pausada' ? 'bg-yellow-500/20 text-yellow-400' :
                    campanha.status === 'Agendada' ? 'bg-blue-500/20 text-blue-400' :
                    'bg-gray-500/20 text-gray-400'
                  }`}>
                    {campanha.status}
                  </span>
                </div>
                <p className="text-slate-400 text-sm">{campanha.descricao}</p>
              </div>
            </div>

            {/* Detalhes */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-slate-700/50 rounded-lg p-3">
                <p className="text-slate-400 text-xs mb-1">Dia de Envio</p>
                <p className="text-white font-bold flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-green-400" />
                  Dia {campanha.diaEnvio}
                </p>
              </div>
              <div className="bg-slate-700/50 rounded-lg p-3">
                <p className="text-slate-400 text-xs mb-1">Próximo Envio</p>
                <p className="text-white font-bold">{campanha.proximoEnvio}</p>
              </div>
            </div>

            {/* Canais */}
            <div className="mb-4">
              <p className="text-slate-400 text-xs mb-2">Canais:</p>
              <div className="flex gap-2">
                {campanha.canais.map((canal) => (
                  <span key={canal} className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-lg text-xs font-medium flex items-center gap-1">
                    {canal === 'WhatsApp' && <MessageSquare className="w-3 h-3" />}
                    {canal === 'Email' && <Mail className="w-3 h-3" />}
                    {canal === 'SMS' && <Phone className="w-3 h-3" />}
                    {canal}
                  </span>
                ))}
              </div>
            </div>

            {/* Métricas */}
            <div className="grid grid-cols-4 gap-2 mb-4 pt-4 border-t border-slate-700">
              <div className="text-center">
                <p className="text-2xl font-bold text-white">{campanha.clientesSemMovimentacao}</p>
                <p className="text-slate-400 text-xs">Clientes</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-400">{campanha.mensagensEnviadas}</p>
                <p className="text-slate-400 text-xs">Enviadas</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-400">{campanha.respostas}</p>
                <p className="text-slate-400 text-xs">Respostas</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-orange-400">{campanha.conversoes}</p>
                <p className="text-slate-400 text-xs">Conversões</p>
              </div>
            </div>

            {/* Ações */}
            <div className="flex gap-2">
              {campanha.status === 'Ativa' ? (
                <button
                  onClick={() => pausarCampanha(campanha.id)}
                  className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors"
                >
                  <Pause className="w-4 h-4" />
                  Pausar
                </button>
              ) : (
                <button
                  onClick={() => ativarCampanha(campanha.id)}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors"
                >
                  <Play className="w-4 h-4" />
                  Ativar
                </button>
              )}
              <button className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors">
                <Eye className="w-4 h-4" />
              </button>
              <button className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors">
                <Edit className="w-4 h-4" />
              </button>
              <button 
                onClick={() => excluirCampanha(campanha.id)}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {campanhasFiltradas.length === 0 && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-12 text-center">
          <Target className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">Nenhuma campanha encontrada</h3>
          <p className="text-slate-400 mb-4">Crie sua primeira campanha de remarketing automático</p>
          <button 
            onClick={() => setMostrarModalNova(true)}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg inline-flex items-center gap-2 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Nova Campanha
          </button>
        </div>
      )}

      {/* Modal Nova Campanha */}
      {mostrarModalNova && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header Modal */}
            <div className="sticky top-0 bg-slate-800 border-b border-slate-700 p-6 flex items-center justify-between z-10">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <Target className="w-6 h-6 text-green-400" />
                Nova Campanha de Remarketing
              </h2>
              <button onClick={() => setMostrarModalNova(false)} className="text-slate-400 hover:text-white transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Conteúdo Modal */}
            <div className="p-6 space-y-6">
              {/* Informações Básicas */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white border-b border-slate-700 pb-2">Informações Básicas</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Nome da Campanha *</label>
                    <input
                      type="text"
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      placeholder="Ex: Remarketing Dia 05"
                      className="w-full bg-slate-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Dia de Envio *</label>
                    <select
                      value={diaEnvio}
                      onChange={(e) => setDiaEnvio(Number(e.target.value) as 5 | 10 | 15 | 20 | 25)}
                      className="w-full bg-slate-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                      <option value={5}>Dia 05</option>
                      <option value={10}>Dia 10</option>
                      <option value={15}>Dia 15</option>
                      <option value={20}>Dia 20</option>
                      <option value={25}>Dia 25</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Descrição</label>
                  <textarea
                    value={descricao}
                    onChange={(e) => setDescricao(e.target.value)}
                    placeholder="Descreva o objetivo desta campanha..."
                    rows={3}
                    className="w-full bg-slate-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                  />
                </div>
              </div>

              {/* Canais de Comunicação */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white border-b border-slate-700 pb-2">Canais de Comunicação</h3>
                
                <div className="flex flex-wrap gap-3">
                  {(['WhatsApp', 'Email', 'SMS'] as CanalComunicacao[]).map((canal) => (
                    <button
                      key={canal}
                      onClick={() => toggleCanal(canal)}
                      className={`px-6 py-3 rounded-lg font-medium transition-all flex items-center gap-2 ${
                        canaisSelecionados.includes(canal)
                          ? 'bg-green-600 text-white'
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      }`}
                    >
                      {canal === 'WhatsApp' && <MessageSquare className="w-5 h-5" />}
                      {canal === 'Email' && <Mail className="w-5 h-5" />}
                      {canal === 'SMS' && <Phone className="w-5 h-5" />}
                      {canal}
                    </button>
                  ))}
                </div>
              </div>

              {/* Mensagens */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white border-b border-slate-700 pb-2">Mensagens</h3>
                
                {canaisSelecionados.includes('WhatsApp') && (
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                      <MessageSquare className="w-4 h-4" />
                      Mensagem WhatsApp
                    </label>
                    <textarea
                      value={mensagemWhatsApp}
                      onChange={(e) => setMensagemWhatsApp(e.target.value)}
                      placeholder="Use {nome} para personalizar com o nome do cliente"
                      rows={4}
                      className="w-full bg-slate-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                    />
                    <p className="text-xs text-slate-400 mt-1">💡 Use {"{nome}"} para personalizar a mensagem</p>
                  </div>
                )}

                {canaisSelecionados.includes('SMS') && (
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      Mensagem SMS
                    </label>
                    <textarea
                      value={mensagemSMS}
                      onChange={(e) => setMensagemSMS(e.target.value)}
                      placeholder="Máximo 160 caracteres"
                      rows={3}
                      maxLength={160}
                      className="w-full bg-slate-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                    />
                    <p className="text-xs text-slate-400 mt-1">{mensagemSMS.length}/160 caracteres</p>
                  </div>
                )}

                {canaisSelecionados.includes('Email') && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        Assunto do Email
                      </label>
                      <input
                        type="text"
                        value={assuntoEmail}
                        onChange={(e) => setAssuntoEmail(e.target.value)}
                        placeholder="Ex: Sentimos sua falta!"
                        className="w-full bg-slate-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Mensagem do Email</label>
                      <textarea
                        value={mensagemEmail}
                        onChange={(e) => setMensagemEmail(e.target.value)}
                        placeholder="Corpo completo do email..."
                        rows={6}
                        className="w-full bg-slate-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Footer Modal */}
            <div className="sticky bottom-0 bg-slate-800 border-t border-slate-700 p-6 flex justify-end gap-3">
              <button
                onClick={() => setMostrarModalNova(false)}
                className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={salvarNovaCampanha}
                disabled={loading}
                className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Salvando...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    Criar Campanha
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
