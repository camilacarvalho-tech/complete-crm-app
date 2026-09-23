import { ErrorBoundary } from './components/ErrorBoundary'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider } from './contexts/ThemeContext'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { LeadsProvider } from './contexts/LeadsContext'
import { NexusStoreProvider } from './contexts/NexusStore'
import { ToastProvider } from './components/ui/Toast'
import Login from './pages/Login'
import Onboarding from './pages/Onboarding'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Propostas from './pages/Propostas'
import Agenda from './pages/Agenda'
import Relatorios from './pages/Relatorios'
import Empresas from './pages/Empresas'
import Financeiro from './pages/Financeiro'
import Biblioteca from './pages/Biblioteca'
import Remarketing from './pages/Remarketing'
import MarketingROI from './pages/MarketingROI'
import ChatCenter from './pages/ChatCenter'
import IAProspeccao from './pages/IAProspeccao'
import LeadsMonitor from './pages/LeadsMonitor'
import FontesPesquisa from './pages/FontesPesquisa'
import { LeadsMonitorErrorBoundary } from './modules/leads-monitor/components/LeadsMonitorErrorBoundary'
import NexusAI from './pages/NexusAI'
import Discadora from './pages/Discadora'
import Configuracoes from './pages/Configuracoes'
import ComunicacaoInterna from './pages/ComunicacaoInterna'
import Digitacao from './pages/Digitacao'
import Automacoes from './pages/Automacoes'
import MonitorCODE from './pages/monitor/MonitorCODE'
import NexusAIFinanceiro from './pages/NexusAIFinanceiro'
import Diagnostico from './pages/Diagnostico'
import Produtos from './pages/Produtos'
import Estoque from './pages/Estoque'
import Fornecedores from './pages/Fornecedores'
import Comissoes from './pages/Comissoes'
import Contratos from './pages/Contratos'
import Equipes from './pages/Equipes'
import Kanban from './pages/Kanban'
import Auditoria from './pages/Auditoria'

function AppRoutes() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-900">
        <div className="text-white text-xl">Carregando...</div>
      </div>
    )
  }

  if (!user) {
    return (
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="*" element={<Login />} />
        </Routes>
      </BrowserRouter>
    )
  }

  return (
    <NexusStoreProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Navigate to="/" replace />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="clientes" element={<Navigate to="/whatsapp" replace />} />
            <Route path="leads" element={<Navigate to="/whatsapp" replace />} />
            <Route path="propostas" element={<Propostas />} />
            <Route path="kanban" element={<Kanban />} />
            <Route path="panorama" element={<Navigate to="/propostas" replace />} />
            <Route path="pipeline" element={<Navigate to="/propostas" replace />} />
            <Route path="whatsapp" element={<ChatCenter />} />
            <Route path="chat-clientes" element={<ChatCenter />} />
            <Route path="chat-center" element={<Navigate to="/whatsapp" replace />} />
            <Route path="nexus-atendimento" element={<Navigate to="/whatsapp" replace />} />
            <Route path="chat-interno" element={<Navigate to="/comunicacao-interna" replace />} />
            <Route path="campanhas" element={<Navigate to="/remarketing" replace />} />
            <Route path="ia-prospeccao" element={<IAProspeccao />} />
            <Route
              path="leads-monitor"
              element={
                <LeadsMonitorErrorBoundary>
                  <LeadsMonitor />
                </LeadsMonitorErrorBoundary>
              }
            />
            <Route path="fontes-pesquisa" element={<FontesPesquisa />} />
            <Route path="biblioteca" element={<Biblioteca />} />
            <Route path="nexus-ai" element={<NexusAI />} />
            <Route path="nexus-ai-financeiro" element={<NexusAIFinanceiro />} />
            <Route path="discadora" element={<Discadora />} />
            <Route path="tarefas" element={<Navigate to="/" replace />} />
            <Route path="agenda" element={<Agenda />} />
            <Route path="documentos" element={<Navigate to="/whatsapp" replace />} />
            <Route path="fila-atendimento" element={<Navigate to="/whatsapp?fila=novos" replace />} />
            <Route path="automacoes" element={<Automacoes />} />
            <Route path="relatorios" element={<Relatorios />} />
            <Route path="empresas" element={<Empresas />} />
            <Route path="financeiro" element={<Financeiro />} />
            <Route path="fluxo-caixa" element={<Financeiro />} />
            <Route path="faturamento" element={<Financeiro />} />
            <Route path="notas-fiscais" element={<Financeiro />} />
            <Route path="dre" element={<Financeiro />} />
            <Route path="contas-pagar" element={<Financeiro />} />
            <Route path="contas-receber" element={<Financeiro />} />
            <Route path="produtos" element={<Produtos />} />
            <Route path="estoque" element={<Estoque />} />
            <Route path="fornecedores" element={<Fornecedores />} />
            <Route path="comissoes" element={<Comissoes />} />
            <Route path="contratos" element={<Contratos />} />
            <Route path="equipes" element={<Equipes />} />
            <Route path="diagnostico" element={<Diagnostico />} />
            <Route path="comunicacao-interna" element={<ComunicacaoInterna />} />
            <Route path="anotacoes" element={<Biblioteca />} />
            <Route path="remarketing" element={<Remarketing />} />
            <Route path="marketing-roi" element={<MarketingROI />} />
            <Route path="configuracoes" element={<Configuracoes />} />
            <Route path="auditoria" element={<Auditoria />} />
            <Route path="bancos-convenios" element={<Navigate to="/configuracoes" replace />} />
            <Route path="digitacao" element={<Digitacao />} />
            <Route path="monitor-code" element={<MonitorCODE />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Route>
          <Route path="/erp" element={<Navigate to="/financeiro" replace />} />
        </Routes>
      </BrowserRouter>
    </NexusStoreProvider>
  )
}

function App() {
  return (
    <AuthProvider>
      <LeadsProvider>
        <ThemeProvider>
          <ToastProvider>
            <ErrorBoundary>
              <AppRoutes />
            </ErrorBoundary>
          </ToastProvider>
        </ThemeProvider>
      </LeadsProvider>
    </AuthProvider>
  )
}

export default App
