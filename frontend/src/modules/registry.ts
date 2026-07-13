import {
  Home,
  LayoutDashboard,
  Package,
  Wrench,
  ShoppingCart,
  CalendarDays,
  Users,
  BarChart3,
  MessageSquare,
  History,
} from 'lucide-react'
import { lazy } from 'react'
import type { AppModule } from '@/types/module'

// Code-splitting: cada módulo é um import() dinâmico, então React/Vite geram um
// "chunk" separado por tela, baixado só quando o usuário abre aquela rota — o
// bundle inicial fica menor. O <Suspense> do MainLayout mostra um loader enquanto
// o chunk carrega. (Login e MainLayout ficam no bundle inicial de propósito.)
const HomeModule = lazy(() => import('./home'))
const DashboardModule = lazy(() => import('./dashboard'))
const ProductsModule = lazy(() => import('./products'))
const ServicesModule = lazy(() => import('./services'))
const SalesModule = lazy(() => import('./sales'))
const CalendarModule = lazy(() => import('./calendar'))
const CustomersModule = lazy(() => import('./customers'))
const ReportsModule = lazy(() => import('./reports'))
const SupportModule = lazy(() => import('./support'))
const ActivityModule = lazy(() => import('./activity'))

export const moduleRegistry: AppModule[] = [
  {
    id: 'home',
    name: 'Início',
    description: 'Portal com suas ferramentas e as últimas notícias',
    icon: Home,
    path: '/',
    component: HomeModule,
    enabled: true,
    order: 0,
    required: true,
  },
  {
    id: 'dashboard',
    name: 'Dashboard',
    description: 'Visão geral e métricas principais do negócio',
    icon: LayoutDashboard,
    path: '/dashboard',
    component: DashboardModule,
    enabled: true,
    order: 1,
  },
  {
    id: 'products',
    name: 'Produtos',
    description: 'Catálogo de produtos (preço, custo, estoque)',
    icon: Package,
    path: '/produtos',
    component: ProductsModule,
    enabled: true,
    order: 2,
  },
  {
    id: 'services',
    name: 'Serviços',
    description: 'Catálogo de serviços (preço e custo de prestar)',
    icon: Wrench,
    path: '/servicos',
    component: ServicesModule,
    enabled: true,
    // 2.25: entre Produtos (2) e Vendas (2.5), sem colidir com ordens salvas (0–7).
    order: 2.25,
  },
  {
    id: 'sales',
    name: 'Vendas',
    description: 'Registro de vendas que alimenta os relatórios de lucro',
    icon: ShoppingCart,
    path: '/vendas',
    component: SalesModule,
    enabled: true,
    // 2.5: aparece logo após "Produtos" sem colidir com as ordens já salvas
    // (0–7) dos tenants; ao reordenar no gerenciador vira um inteiro.
    order: 2.5,
  },
  {
    id: 'calendar',
    name: 'Agendamentos',
    description: 'Calendário de agendamentos e compromissos',
    icon: CalendarDays,
    path: '/agendamentos',
    component: CalendarModule,
    enabled: true,
    order: 3,
  },
  {
    id: 'customers',
    name: 'Clientes',
    description: 'Base de clientes, histórico e segmentação',
    icon: Users,
    path: '/clientes',
    component: CustomersModule,
    enabled: false,
    order: 4,
  },
  {
    id: 'reports',
    name: 'Relatórios',
    description: 'Análises de vendas, receita e desempenho',
    icon: BarChart3,
    path: '/relatorios',
    component: ReportsModule,
    enabled: false,
    order: 5,
  },
  {
    id: 'support',
    name: 'Chamados',
    description: 'Registro e acompanhamento de chamados',
    icon: MessageSquare,
    path: '/suporte',
    component: SupportModule,
    enabled: false,
    order: 6,
  },
  {
    id: 'activity',
    name: 'Atividades',
    description: 'Log de vendas, agendamentos e eventos do negócio',
    icon: History,
    path: '/atividades',
    component: ActivityModule,
    enabled: true,
    order: 7,
  },
]
