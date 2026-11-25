'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  LayoutDashboard,
  Utensils,
  Dumbbell,
  LineChart,
  Brain,
  Zap,
  UserCheck,
  GraduationCap,
  Wallet,
  ChevronRight,
  ReceiptText,
  PiggyBank,
  Compass,
  Calculator,
  Trophy,
  Layers,
  BookOpen,
  FileQuestion,
  BookMarked,
  BrainCircuit,
  Timer,
  Scale,
  Camera,
  Sparkles,
  Calendar,
  MessageSquare,
  Lightbulb,
  X,
  Menu,
} from 'lucide-react';
import { GamificationHeader } from './GamificationHeader';
import { LevelUpModal } from './LevelUpModal';

export interface NavSubItem {
  id: string;
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  matchTab?: string | null; // null means default tab when no ?tab= is set
  matchPath?: string; // for real sub-routes like /financeiro/extrato
}

export interface NavItem {
  id: string;
  label: string;
  mobileLabel: string;
  href: string;
  basePath: string;
  icon: React.ComponentType<{ className?: string }>;
  subItems?: NavSubItem[];
}

export const navItems: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    mobileLabel: 'Início',
    href: '/',
    basePath: '/',
    icon: LayoutDashboard,
  },
  {
    id: 'nutrition',
    label: 'Nutrição',
    mobileLabel: 'Nutrição',
    href: '/nutrition',
    basePath: '/nutrition',
    icon: Utensils,
    subItems: [
      {
        id: 'nutrition-diario',
        label: 'Diário & Registro IA',
        href: '/nutrition',
        icon: Sparkles,
        matchTab: null,
      },
      {
        id: 'nutrition-historico',
        label: 'Histórico Semanal',
        href: '/nutrition?tab=historico',
        icon: Calendar,
        matchTab: 'historico',
      },
    ],
  },
  {
    id: 'workout',
    label: 'Treino',
    mobileLabel: 'Treino',
    href: '/workout',
    basePath: '/workout',
    icon: Dumbbell,
    subItems: [
      {
        id: 'workout-sessions',
        label: 'Sessões',
        href: '/workout',
        icon: Layers,
        matchTab: null,
      },
      {
        id: 'workout-prs',
        label: 'Vitrine de PRs',
        href: '/workout?tab=prs',
        icon: Trophy,
        matchTab: 'prs',
      },
    ],
  },
  {
    id: 'contests',
    label: 'Concursos & TAF',
    mobileLabel: 'Concursos',
    href: '/contests',
    basePath: '/contests',
    icon: GraduationCap,
    subItems: [
      {
        id: 'contests-edital',
        label: 'Edital Verticalizado',
        href: '/contests',
        icon: BookOpen,
        matchTab: null,
      },
      {
        id: 'contests-simulados',
        label: 'Motor de Simulados',
        href: '/contests?tab=simulados',
        icon: FileQuestion,
        matchTab: 'simulados',
      },
      {
        id: 'contests-erros',
        label: 'Caderno de Erros',
        href: '/contests?tab=caderno_erros',
        icon: BookMarked,
        matchTab: 'caderno_erros',
      },
      {
        id: 'contests-srs',
        label: 'Revisão Espaçada (SRS)',
        href: '/contests?tab=srs_revisoes',
        icon: BrainCircuit,
        matchTab: 'srs_revisoes',
      },
      {
        id: 'contests-pomodoro',
        label: 'Ciclo Pomodoro',
        href: '/contests?tab=pomodoro',
        icon: Timer,
        matchTab: 'pomodoro',
      },
      {
        id: 'contests-taf',
        label: 'Índices TAF',
        href: '/contests?tab=taf',
        icon: Dumbbell,
        matchTab: 'taf',
      },
      {
        id: 'contests-gemini',
        label: 'Tutor Gemini IA',
        href: '/contests?tab=gemini',
        icon: Brain,
        matchTab: 'gemini',
      },
    ],
  },
  {
    id: 'financeiro',
    label: 'Financeiro',
    mobileLabel: 'Finanças',
    href: '/financeiro',
    basePath: '/financeiro',
    icon: Wallet,
    subItems: [
      {
        id: 'fin-dashboard',
        label: 'Visão Geral',
        href: '/financeiro',
        icon: LayoutDashboard,
        matchPath: '/financeiro',
      },
      {
        id: 'fin-extrato',
        label: 'Extrato',
        href: '/financeiro/extrato',
        icon: ReceiptText,
        matchPath: '/financeiro/extrato',
      },
      {
        id: 'fin-cofrinhos',
        label: 'Cofrinhos & Metas',
        href: '/financeiro/cofrinhos',
        icon: PiggyBank,
        matchPath: '/financeiro/cofrinhos',
      },
      {
        id: 'fin-visao',
        label: 'Visão de Futuro',
        href: '/financeiro/visao-futuro',
        icon: Compass,
        matchPath: '/financeiro/visao-futuro',
      },
      {
        id: 'fin-simulador',
        label: 'Simulador & Investimentos',
        href: '/financeiro/simulador',
        icon: Calculator,
        matchPath: '/financeiro/simulador',
      },
    ],
  },
  {
    id: 'physical',
    label: 'Físico',
    mobileLabel: 'Físico',
    href: '/physical',
    basePath: '/physical',
    icon: LineChart,
    subItems: [
      {
        id: 'physical-ia',
        label: 'Avaliação de Físico (IA)',
        href: '/physical',
        icon: Camera,
        matchTab: null,
      },
      {
        id: 'physical-medidas',
        label: 'Curva de Peso & Medidas',
        href: '/physical?tab=medidas',
        icon: Scale,
        matchTab: 'medidas',
      },
    ],
  },
  {
    id: 'second-brain',
    label: 'Segundo Cérebro',
    mobileLabel: 'Notas',
    href: '/second-brain',
    basePath: '/second-brain',
    icon: Brain,
    subItems: [
      {
        id: 'notes-all',
        label: 'Todas as Notas',
        href: '/second-brain',
        icon: Brain,
        matchTab: null,
      },
      {
        id: 'notes-treino',
        label: 'Notas de Treino',
        href: '/second-brain?tab=treino',
        icon: Dumbbell,
        matchTab: 'treino',
      },
      {
        id: 'notes-estudos',
        label: 'Notas de Estudos',
        href: '/second-brain?tab=estudos',
        icon: BookOpen,
        matchTab: 'estudos',
      },
      {
        id: 'notes-pensamentos',
        label: 'Pensamentos',
        href: '/second-brain?tab=pensamentos',
        icon: MessageSquare,
        matchTab: 'pensamentos',
      },
      {
        id: 'notes-ideias',
        label: 'Ideias & Projetos',
        href: '/second-brain?tab=ideias',
        icon: Lightbulb,
        matchTab: 'ideias',
      },
    ],
  },
];

function isModuleActive(pathname: string, item: NavItem): boolean {
  if (item.basePath === '/') {
    return pathname === '/';
  }
  return (
    pathname === item.basePath || pathname.startsWith(`${item.basePath}/`)
  );
}

function isSubItemActive(
  pathname: string,
  currentTab: string | null,
  parent: NavItem,
  sub: NavSubItem
): boolean {
  if (!isModuleActive(pathname, parent)) return false;

  // Sub-route based (e.g., /financeiro/*)
  if (sub.matchPath) {
    if (sub.matchPath === parent.basePath) {
      return pathname === parent.basePath;
    }
    return (
      pathname === sub.matchPath || pathname.startsWith(`${sub.matchPath}/`)
    );
  }

  // Query param ?tab=... based
  if (sub.matchTab === null || sub.matchTab === undefined) {
    return !currentTab || currentTab === 'default' || currentTab === 'edital' || currentTab === 'sessions' || currentTab === 'ia-coach' || currentTab === 'all' || currentTab === 'diario';
  }

  if (sub.matchTab === 'medidas' && currentTab === 'weight-history') {
    return true;
  }

  return currentTab === sub.matchTab;
}

interface SidebarNavTreeProps {
  expandedIds: Record<string, boolean>;
  onToggleExpand: (id: string) => void;
  onExpandGroup: (id: string) => void;
  onNavigate?: () => void;
}

function SidebarNavTreeInner({
  expandedIds,
  onToggleExpand,
  onExpandGroup,
  onNavigate,
}: SidebarNavTreeProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentTab = searchParams.get('tab');

  return (
    <nav className="flex-1 space-y-1.5 overflow-y-auto pr-0.5">
      {navItems.map((item) => {
        const Icon = item.icon;
        const hasSubItems = Boolean(item.subItems && item.subItems.length > 0);
        const moduleActive = isModuleActive(pathname, item);
        const isExpanded = Boolean(expandedIds[item.id]);

        return (
          <div key={item.id} className="space-y-1">
            {/* Parent Item Row */}
            <div
              className={`flex items-center justify-between rounded-xl text-sm font-medium transition-all duration-200 group ${
                moduleActive
                  ? hasSubItems
                    ? 'bg-slate-800/70 text-cyan-300 border border-cyan-500/25 shadow-sm'
                    : 'bg-gradient-to-r from-cyan-500/15 via-cyan-500/10 to-transparent text-cyan-400 border border-cyan-500/30 shadow-sm shadow-cyan-500/5'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
              }`}
            >
              {/* Clicking Name/Icon navigates to default module page and auto-opens subItems */}
              <Link
                href={item.href}
                onClick={() => {
                  if (hasSubItems) {
                    onExpandGroup(item.id);
                  }
                  if (onNavigate) onNavigate();
                }}
                className="flex-1 flex items-center gap-3 px-3.5 py-2.5 min-w-0"
              >
                <Icon
                  className={`h-5 w-5 shrink-0 transition-transform duration-200 group-hover:scale-110 ${
                    moduleActive
                      ? 'text-cyan-400'
                      : 'text-slate-400 group-hover:text-slate-200'
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </Link>

              {/* Clicking Chevron only toggles the accordion without navigating */}
              {hasSubItems ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onToggleExpand(item.id);
                  }}
                  aria-label={`Expandir ou recolher sub-abas de ${item.label}`}
                  aria-expanded={isExpanded}
                  className="p-2.5 mr-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/50 transition"
                >
                  <ChevronRight
                    className={`h-4 w-4 transition-transform duration-200 ${
                      isExpanded ? 'rotate-90 text-cyan-400' : ''
                    }`}
                  />
                </button>
              ) : (
                moduleActive && (
                  <span className="mr-3.5 h-2 w-2 rounded-full bg-cyan-400 shadow-sm shadow-cyan-400/80 animate-pulse" />
                )
              )}
            </div>

            {/* Expandable Sub-Items List with Vertical Guide Line */}
            {hasSubItems && isExpanded && (
              <div className="ml-4 pl-3 border-l border-slate-800/90 space-y-1 py-1 animate-fadeIn">
                {item.subItems!.map((sub) => {
                  const SubIcon = sub.icon;
                  const subActive = isSubItemActive(
                    pathname,
                    currentTab,
                    item,
                    sub
                  );

                  return (
                    <Link
                      key={sub.id}
                      href={sub.href}
                      onClick={() => {
                        if (onNavigate) onNavigate();
                      }}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs transition-all duration-150 group ${
                        subActive
                          ? 'bg-gradient-to-r from-cyan-500/20 via-emerald-500/10 to-transparent text-cyan-300 font-bold border border-cyan-500/30 shadow-sm'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 font-medium border border-transparent'
                      }`}
                    >
                      <SubIcon
                        className={`h-3.5 w-3.5 shrink-0 transition-colors ${
                          subActive
                            ? 'text-cyan-400'
                            : 'text-slate-500 group-hover:text-slate-300'
                        }`}
                      />
                      <span className="truncate">{sub.label}</span>
                      {subActive && (
                        <span className="ml-auto h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-sm shadow-cyan-400/80" />
                      )}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}

function MobileModuleContextBar({
  onOpenDrawer,
}: {
  onOpenDrawer: () => void;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentTab = searchParams.get('tab');
  const [showDropdown, setShowDropdown] = useState(false);

  const activeParent = navItems.find(
    (item) => item.subItems && item.subItems.length > 0 && isModuleActive(pathname, item)
  );

  if (!activeParent || !activeParent.subItems) return null;

  const activeSub =
    activeParent.subItems.find((sub) =>
      isSubItemActive(pathname, currentTab, activeParent, sub)
    ) || activeParent.subItems[0];

  const ActiveSubIcon = activeSub.icon;

  return (
    <div className="md:hidden mb-4">
      <div className="glass-panel p-2.5 border-slate-800/90 bg-slate-900/90 flex items-center justify-between gap-2 relative">
        <button
          type="button"
          onClick={() => setShowDropdown((prev) => !prev)}
          className="flex-1 flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-slate-950/90 border border-slate-800 text-left"
        >
          <div className="flex items-center gap-2 min-w-0">
            <span className="p-1.5 rounded-lg bg-cyan-500/15 text-cyan-400">
              <ActiveSubIcon className="h-3.5 w-3.5" />
            </span>
            <div className="min-w-0">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block leading-none">
                {activeParent.label}
              </span>
              <span className="text-xs font-extrabold text-white truncate block mt-0.5">
                {activeSub.label}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1 text-[11px] font-bold text-cyan-400 shrink-0">
            <span>Alternar</span>
            <ChevronRight
              className={`h-4 w-4 transition-transform duration-200 ${
                showDropdown ? 'rotate-90' : ''
              }`}
            />
          </div>
        </button>

        <button
          type="button"
          onClick={onOpenDrawer}
          className="p-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white shrink-0"
          title="Abrir menu lateral completo"
        >
          <Menu className="h-4 w-4" />
        </button>

        {showDropdown && (
          <div className="absolute left-0 right-0 top-full mt-1.5 z-40 p-2 rounded-2xl bg-slate-900/98 backdrop-blur-xl border border-slate-700 shadow-2xl space-y-1">
            {activeParent.subItems.map((sub) => {
              const SubIcon = sub.icon;
              const isCurrent = sub.id === activeSub.id;
              return (
                <Link
                  key={sub.id}
                  href={sub.href}
                  onClick={() => setShowDropdown(false)}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs transition ${
                    isCurrent
                      ? 'bg-cyan-500/20 text-cyan-300 font-extrabold border border-cyan-500/30'
                      : 'text-slate-300 hover:bg-slate-800 font-medium'
                  }`}
                >
                  <SubIcon
                    className={`h-4 w-4 ${
                      isCurrent ? 'text-cyan-400' : 'text-slate-400'
                    }`}
                  />
                  <span>{sub.label}</span>
                  {isCurrent && (
                    <span className="ml-auto h-2 w-2 rounded-full bg-cyan-400" />
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState<boolean>(false);

  // Auto-expand the active module whenever pathname changes
  useEffect(() => {
    const activeParent = navItems.find(
      (item) =>
        item.subItems &&
        item.subItems.length > 0 &&
        isModuleActive(pathname, item)
    );
    if (activeParent) {
      setExpandedIds((prev) => ({
        ...prev,
        [activeParent.id]: true,
      }));
    }
    setIsMobileDrawerOpen(false);
  }, [pathname]);

  const handleToggleExpand = (id: string) => {
    setExpandedIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleExpandGroup = (id: string) => {
    setExpandedIds((prev) => ({
      ...prev,
      [id]: true,
    }));
  };

  const isAuthRoute =
    pathname === '/login' ||
    pathname === '/cadastro' ||
    pathname === '/recuperar-senha' ||
    pathname.startsWith('/auth');

  if (isAuthRoute) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-[#090d16] text-gray-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-black overflow-x-hidden">
      {/* Level Up & Badge Unlock Modal Global */}
      <LevelUpModal />

      {/* Mobile Sidebar Drawer (Hamburger Menu with exact same expandable tree) */}
      {isMobileDrawerOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm"
            onClick={() => setIsMobileDrawerOpen(false)}
          />
          <aside className="relative z-10 w-72 max-w-[85vw] bg-slate-900 border-r border-slate-800 h-full flex flex-col p-4 shadow-2xl animate-fadeIn">
            <div className="flex items-center justify-between px-2 py-3 mb-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-cyan-500 via-indigo-500 to-emerald-400 flex items-center justify-center shadow-lg shadow-cyan-500/20">
                  <Zap className="h-4 w-4 text-white stroke-[2.5]" />
                </div>
                <div>
                  <h2 className="font-bold text-base text-white flex items-center gap-1.5">
                    OmniTrack
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 font-semibold border border-cyan-500/20">
                      PRO
                    </span>
                  </h2>
                  <p className="text-[11px] text-slate-400">Navegação Completa</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsMobileDrawerOpen(false)}
                className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <Suspense fallback={<div className="flex-1" />}>
              <SidebarNavTreeInner
                expandedIds={expandedIds}
                onToggleExpand={handleToggleExpand}
                onExpandGroup={handleExpandGroup}
                onNavigate={() => setIsMobileDrawerOpen(false)}
              />
            </Suspense>
          </aside>
        </div>
      )}

      <div className="flex flex-col md:flex-row flex-1">
        {/* Desktop Sidebar */}
        <aside className="hidden md:flex flex-col w-64 bg-slate-900/60 backdrop-blur-xl border-r border-slate-800/80 fixed inset-y-0 left-0 z-30 p-4">
          {/* Brand Header */}
          <div className="flex items-center gap-3 px-3 py-4 mb-5 border-b border-slate-800/80">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-cyan-500 via-indigo-500 to-emerald-400 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Zap className="h-5 w-5 text-white stroke-[2.5]" />
            </div>
            <div>
              <h1 className="font-bold text-lg tracking-tight text-white flex items-center gap-1.5">
                OmniTrack
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 font-semibold border border-cyan-500/20">
                  PRO
                </span>
              </h1>
              <p className="text-xs text-slate-400">Second Brain & Fitness</p>
            </div>
          </div>

          {/* Expandable Navigation Tree */}
          <Suspense fallback={<div className="flex-1" />}>
            <SidebarNavTreeInner
              expandedIds={expandedIds}
              onToggleExpand={handleToggleExpand}
              onExpandGroup={handleExpandGroup}
            />
          </Suspense>

          {/* System Status Card */}
          <div className="mt-4 p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/50 flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-white text-sm shrink-0">
              <UserCheck className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate">
                OmniTrack Cloud
              </p>
              <p className="text-[10px] text-emerald-400 font-medium truncate flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 inline-block"></span>
                Sincronização Ativa
              </p>
            </div>
          </div>
        </aside>

        {/* Main Section */}
        <div className="flex-1 md:ml-64 flex flex-col min-h-screen min-w-0">
          {/* Top Gamification Header */}
          <GamificationHeader
            onOpenMobileMenu={() => setIsMobileDrawerOpen(true)}
          />

          {/* Main Content Viewport */}
          <main className="flex-1 pb-28 md:pb-8 px-3.5 sm:px-4 py-5 md:px-8 max-w-7xl mx-auto w-full min-w-0">
            <Suspense fallback={null}>
              <MobileModuleContextBar
                onOpenDrawer={() => setIsMobileDrawerOpen(true)}
              />
            </Suspense>
            {children}
          </main>
        </div>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <nav
        aria-label="Navegação Principal Mobile"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 pointer-events-auto bg-slate-950/95 backdrop-blur-xl border-t border-slate-800/90 px-1 py-1 pb-safe shadow-2xl"
      >
        <div className="flex items-center justify-between h-14 max-w-lg mx-auto overflow-x-auto scrollbar-none">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = isModuleActive(pathname, item);
            return (
              <Link
                key={item.id}
                href={item.href}
                onClick={(e) => {
                  e.stopPropagation();
                  handleExpandGroup(item.id);
                  if (pathname !== item.href) {
                    router.push(item.href);
                  }
                }}
                className={`pointer-events-auto touch-manipulation select-none flex flex-col items-center justify-center flex-1 min-w-[48px] h-full px-1 py-1 rounded-xl transition-all active:scale-95 ${
                  isActive
                    ? 'text-cyan-400 font-bold bg-cyan-500/10'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="relative pointer-events-none">
                  <Icon
                    className={`h-5 w-5 transition-transform ${
                      isActive ? 'scale-110 text-cyan-400' : ''
                    }`}
                  />
                  {isActive && (
                    <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-cyan-400 animate-ping pointer-events-none" />
                  )}
                </div>
                <span className="pointer-events-none text-[10px] leading-tight mt-1 truncate max-w-[56px]">
                  {item.mobileLabel}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
