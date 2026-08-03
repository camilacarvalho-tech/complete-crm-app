import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider } from './contexts/ThemeContext'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { LeadsProvider } from './contexts/LeadsContext'
import { ToastProvider } from './components/ui/Toast'
import Login from './pages/Login'
import Onboarding from './pages/Onboarding'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Clientes from './pages/Clientes'
import Pipeline from './pages/Pipeline'
import Tarefas from './pages/Tarefas'
import Relatorios from './pages/Relatorios'
import Empresas from './pages/Empresas'
import Financeiro from './pages/Financeiro'
import Anotacoes from './pages/Anotacoes'
import Remarketing from './pages/Remarketing'
import MarketingROI from './pages/MarketingROI'
import ChatCenter from './pages/ChatCenter'
import Campanhas from './pages/Campanhas'
import IAProspeccao from './pages/IAProspeccao'
import LeadsMonitor from './pages/LeadsMonitor'
import FontesPesquisa from './pages/FontesPesquisa'
import { LeadsMonitorErrorBoundary } from './modules/leads-monitor/components/LeadsMonitorErrorBoundary'
import NexusAI from './pages/NexusAI'
import Discadora from './pages/Discadora'
import Configuracoes from './pages/Configuracoes'
import Propostas from './pages/Propostas'
import ComunicacaoInterna from './pages/ComunicacaoInterna'
import Digitacao from './pages/Digitacao'
import Documentos from './pages/Documentos'
import Automacoes from './pages/Automacoes'
import EmDesenvolvimento from './pages/EmDesenvolvimento'
// ERP
import ERPLayout from './components/ERPLayout'
import DashboardERP from './pages/erp/DashboardERP'
import FluxoCaixaERP from './pages/erp/FluxoCaixaERP'
import EmDesenvolvimentoERP from './pages/erp/EmDesenvolvimentoERP'
import RecebimentosERP from './pages/erp/RecebimentosERP'
import ContasPagarERP from './pages/erp/ContasPagarERP'
import DREЕРP from './pages/erp/DREЕРP'
import ComprasERP from './pages/erp/ComprasERP'
import VendasERP from './pages/erp/VendasERP'
import ContratosERP from './pages/erp/ContratosERP'
import RHERP from './pages/erp/RHERP'
import FornecedoresERP from './pages/erp/FornecedoresERP'
import FaturamentoERP from './pages/erp/FaturamentoERP'
import DocumentosERP from './pages/erp/DocumentosERP'
import LogsERP from './pages/erp/LogsERP'
import RelatoriosERP from './pages/erp/RelatoriosERP'
import EstoqueERP from './pages/erp/EstoqueERP'

const MODULOS_EM_DESENVOLVIMENTO = [
  'bancos-convenios', 'convenios', 'profissionais', 'prontuario',
  'exames', 'estoque', 'odontograma', 'tratamentos', 'radiografias', 'sessoes',
  'prontuario-psicologico', 'recibos', 'avaliacao-antropometrica', 'plano-alimentar',
  'receitas', 'planos-mensalidades', 'avaliacoes-fisicas', 'treinos', 'personal-trainers',
]

function AppRoutes() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-900">
        <div className="text-white text-xl">Carregando...</div>
      </div>
    )
  }

  return (
    <BrowserRouter>
      <Routes>
        {!user ? (
          <>
            <Route path="/login" element={<Login />} />
            <Route path="*" element={<Login />} />
          </>
        ) : (
          <>
            <Route path="/login" element={<Navigate to="/" replace />} />
            <Route path="/onboarding" element={<Onboarding />} />

            <Route path="/" element={<Layout />}>
              <Route index element={<Dashboard />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="clientes" element={<Clientes />} />
              <Route path="pipeline" element={<Pipeline />} />
              <Route path="chat-center" element={<ChatCenter />} />
              <Route path="campanhas" element={<Campanhas />} />
              <Route path="ia-prospeccao" element={<IAProspeccao />} />
              <Route
                path="leads-monitor"
                element={
                  <LeadsMonitorErrorBoundary>
                    <LeadsMonitor />
                  </LeadsMonitorErrorBoundary>
                }
              />
              <Route
                path="fontes-pesquisa"
                element={
                  <LeadsMonitorErrorBoundary>
                    <FontesPesquisa />
                  </LeadsMonitorErrorBoundary>
                }
              />
              <Route path="nexus-ai" element={<NexusAI />} />
              <Route path="discadora" element={<Discadora />} />
              <Route path="tarefas" element={<Tarefas />} />
              <Route path="agenda" element={<Tarefas />} />
              <Route path="documentos" element={<Documentos />} />
              <Route path="automacoes" element={<Automacoes />} />
              <Route path="relatorios" element={<Relatorios />} />
              <Route path="empresas" element={<Empresas />} />
              <Route path="financeiro" element={<Financeiro />} />
              <Route path="comunicacao-interna" element={<ComunicacaoInterna />} />
              <Route path="anotacoes" element={<Anotacoes />} />
              <Route path="remarketing" element={<Remarketing />} />
              <Route path="nexus-atendimento" element={<ChatCenter />} />
              <Route path="marketing-roi" element={<MarketingROI />} />
              <Route path="configuracoes" element={<Configuracoes />} />
              <Route path="propostas" element={<Propostas />} />
              <Route path="digitacao" element={<Digitacao />} />
              {MODULOS_EM_DESENVOLVIMENTO.map((path) => (
                <Route key={path} path={path} element={<EmDesenvolvimento />} />
              ))}
              <Route path="*" element={<Navigate to="/" />} />
            </Route>

            <Route path="/erp" element={<ERPLayout />}>
              <Route index element={<DashboardERP />} />
              <Route path="financeiro-completo" element={<FluxoCaixaERP />} />
              <Route path="recebimentos" element={<RecebimentosERP />} />
              <Route path="contas-pagar" element={<ContasPagarERP />} />
              <Route path="dre" element={<DREЕРP />} />
              <Route path="faturamento" element={<FaturamentoERP />} />
              <Route path="fornecedores" element={<FornecedoresERP />} />
              <Route path="estoque" element={<EstoqueERP />} />
              <Route path="compras" element={<ComprasERP />} />
              <Route path="vendas" element={<VendasERP />} />
              <Route path="contratos" element={<ContratosERP />} />
              <Route path="rh" element={<RHERP />} />
              <Route path="documentos" element={<DocumentosERP />} />
              <Route path="patrimonio" element={<RelatoriosERP />} />
              <Route path="auditoria" element={<LogsERP />} />
              <Route path="configuracoes" element={<Configuracoes />} />
            </Route>
          </>
        )}
      </Routes>
    </BrowserRouter>
  )
}

function App() {
  return (
    <AuthProvider>
      <LeadsProvider>
        <ThemeProvider>
          <ToastProvider>
            <AppRoutes />
          </ToastProvider>
        </ThemeProvider>
      </LeadsProvider>
    </AuthProvider>
  )
}

export default App
