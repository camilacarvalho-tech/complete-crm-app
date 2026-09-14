import {
  LayoutDashboard, Users, MessageCircle, FileText, Calendar, Phone,
  Megaphone, Target, TrendingUp, Radar, Bot, BarChart3, FileSignature,
  Landmark, Building2, DollarSign, Wallet, Receipt, Settings, Zap, Package,
  Activity, ClipboardList,
} from 'lucide-react'
import { NichoEmpresa } from '../types/database.types'

export interface MenuItem {
  path: string
  icon: any
  label: string
  labelOriginal?: string
  nichos?: NichoEmpresa[]
  badge?: string
  featured?: boolean
}
export interface MenuSection { title: string; items: MenuItem[] }

export const MENU_ITEMS: MenuItem[] = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard', nichos: [] },
  { path: '/leads', icon: Users, label: 'Leads', nichos: [] },
  { path: '/clientes', icon: Users, label: 'Clientes', nichos: [] },
  { path: '/propostas', icon: FileSignature, label: 'Propostas', nichos: [] },
  { path: '/tarefas', icon: ClipboardList, label: 'Tarefas', nichos: [] },
  { path: '/agenda', icon: Calendar, label: 'Agenda', nichos: [] },
  { path: '/documentos', icon: FileText, label: 'Documentos', nichos: [] },
  { path: '/whatsapp', icon: MessageCircle, label: 'WhatsApp', nichos: [] },
  { path: '/comunicacao-interna', icon: MessageCircle, label: 'Chat Interno', nichos: [] },
  { path: '/campanhas', icon: Megaphone, label: 'Campanhas', featured: true, nichos: [] },
  { path: '/remarketing', icon: Target, label: 'Remarketing', nichos: [] },
  { path: '/marketing-roi', icon: TrendingUp, label: 'Marketing ROI', nichos: [] },
  { path: '/leads-monitor', icon: Radar, label: 'Leads Monitor', featured: true, nichos: [] },
  { path: '/nexus-ai', icon: Bot, label: 'Nexus AI', badge: 'IA', featured: true, nichos: [] },
  { path: '/nexus-ai-financeiro', icon: Bot, label: 'Nexus AI Financeiro', badge: 'IA', nichos: [] },
  { path: '/relatorios', icon: BarChart3, label: 'Relatórios', nichos: [] },
  { path: '/digitacao', icon: FileText, label: 'Digitação', nichos: [] },
  { path: '/bancos-convenios', icon: Landmark, label: 'Bancos / Convênios', nichos: [] },
  { path: '/fila-atendimento', icon: Zap, label: 'Fila de Atendimento', nichos: [] },
  { path: '/discadora', icon: Phone, label: 'Discadora', nichos: [] },
  { path: '/financeiro', icon: DollarSign, label: 'Financeiro', nichos: [] },
  { path: '/fluxo-caixa', icon: Wallet, label: 'Fluxo de Caixa', nichos: [] },
  { path: '/contas-pagar', icon: Receipt, label: 'Contas a Pagar', nichos: [] },
  { path: '/contas-receber', icon: Receipt, label: 'Contas a Receber', nichos: [] },
  { path: '/faturamento', icon: Receipt, label: 'Faturamento', nichos: [] },
  { path: '/notas-fiscais', icon: FileText, label: 'Notas Fiscais', nichos: [] },
  { path: '/dre', icon: BarChart3, label: 'DRE', nichos: [] },
  { path: '/produtos', icon: Package, label: 'Produtos', nichos: [] },
  { path: '/empresas', icon: Building2, label: 'Empresas', nichos: [] },
  { path: '/equipes', icon: Users, label: 'Equipes', nichos: [] },
  { path: '/configuracoes', icon: Settings, label: 'Configurações', nichos: [] },
  { path: '/diagnostico', icon: Activity, label: 'Diagnóstico', nichos: [] },
]

const by = (...paths: string[]) => MENU_ITEMS.filter((i) => paths.includes(i.path))

export const MENU_SECTIONS: MenuSection[] = [
  { title: 'Início', items: by('/') },
  { title: 'CRM', items: by('/leads', '/clientes', '/propostas', '/tarefas', '/agenda', '/documentos', '/whatsapp', '/comunicacao-interna') },
  { title: 'Marketing', items: by('/campanhas', '/remarketing', '/marketing-roi', '/leads-monitor') },
  { title: 'Inteligência', items: by('/nexus-ai', '/nexus-ai-financeiro', '/relatorios') },
  { title: 'Operação', items: by('/digitacao', '/bancos-convenios', '/fila-atendimento', '/discadora') },
  { title: 'ERP', items: by('/financeiro', '/fluxo-caixa', '/contas-pagar', '/contas-receber', '/faturamento', '/notas-fiscais', '/dre', '/produtos') },
  { title: 'Administração', items: by('/empresas', '/equipes', '/configuracoes', '/diagnostico') },
]

export const getMenuByNicho = (_nicho: NichoEmpresa | null): MenuItem[] => MENU_ITEMS
export const getSidebarNav = () => ({ principal: MENU_ITEMS, outrosNichos: [] as MenuItem[] })
export const getMenuSections = (_nicho?: NichoEmpresa | null): MenuSection[] => MENU_SECTIONS
export default MENU_ITEMS
