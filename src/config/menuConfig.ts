import {
  LayoutDashboard, MessageCircle, FileText, Target, TrendingUp,
  Radar, Bot, DollarSign, Settings, Zap, Kanban, ShieldCheck,
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
  { path: '/kanban', icon: Kanban, label: 'Kanban', nichos: [] },
  { path: '/digitacao', icon: FileText, label: 'Digitação', nichos: [] },
  { path: '/whatsapp', icon: MessageCircle, label: 'Chat Clientes', nichos: [] },
  { path: '/comunicacao-interna', icon: MessageCircle, label: 'Chat Interno', nichos: [] },
  { path: '/remarketing', icon: Target, label: 'Remarketing', nichos: [] },
  { path: '/marketing-roi', icon: TrendingUp, label: 'MKT ROI', nichos: [] },
  { path: '/automacoes', icon: Zap, label: 'Automação', nichos: [] },
  { path: '/leads-monitor', icon: Radar, label: 'Leads Monitor', featured: true, nichos: [] },
  { path: '/nexus-ai', icon: Bot, label: 'Nexus AI', badge: 'IA', featured: true, nichos: [] },
  { path: '/nexus-ai-financeiro', icon: Bot, label: 'Nexus AI Financeiro', badge: 'IA', nichos: [] },
  { path: '/financeiro', icon: DollarSign, label: 'Financeiro', nichos: [] },
  { path: '/configuracoes', icon: Settings, label: 'Configurações', nichos: [] },
  { path: '/auditoria', icon: ShieldCheck, label: 'Auditoria', nichos: [] },
]

const by = (...paths: string[]) => MENU_ITEMS.filter((i) => paths.includes(i.path))

export const MENU_SECTIONS: MenuSection[] = [
  { title: 'Operação', items: by('/', '/kanban', '/digitacao', '/whatsapp', '/comunicacao-interna') },
  { title: 'Marketing', items: by('/remarketing', '/marketing-roi', '/automacoes', '/leads-monitor') },
  { title: 'Inteligência', items: by('/nexus-ai', '/nexus-ai-financeiro', '/financeiro') },
  { title: 'Administração', items: by('/configuracoes', '/auditoria') },
]

export const getMenuByNicho = (_nicho: NichoEmpresa | null): MenuItem[] => MENU_ITEMS
export const getSidebarNav = () => ({ principal: MENU_ITEMS, outrosNichos: [] as MenuItem[] })
export const getMenuSections = (_nicho?: NichoEmpresa | null): MenuSection[] => MENU_SECTIONS
export default MENU_ITEMS
