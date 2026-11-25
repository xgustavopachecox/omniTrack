'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Wallet,
  LayoutDashboard,
  ReceiptText,
  PiggyBank,
  Compass,
  Calculator,
  Sparkles,
} from 'lucide-react';

const financeTabs = [
  {
    label: 'Visão Geral',
    shortLabel: 'Visão Geral',
    href: '/financeiro',
    icon: LayoutDashboard,
    description: 'Dashboard, KPIs e Gráficos',
  },
  {
    label: 'Extrato',
    shortLabel: 'Extrato',
    href: '/financeiro/extrato',
    icon: ReceiptText,
    description: 'Receitas, Gastos e Filtros',
  },
  {
    label: 'Cofrinhos & Metas',
    shortLabel: 'Cofrinhos',
    href: '/financeiro/cofrinhos',
    icon: PiggyBank,
    description: 'Reservas e Aportes',
  },
  {
    label: 'Visão de Futuro',
    shortLabel: 'Visão de Futuro',
    href: '/financeiro/visao-futuro',
    icon: Compass,
    description: 'Planejamento & Marcos',
  },
  {
    label: 'Simulador & Investimentos',
    shortLabel: 'Simulador',
    href: '/financeiro/simulador',
    icon: Calculator,
    description: 'Juros Compostos, Selic & Guia',
  },
];

export default function FinanceiroLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="space-y-6 animate-fadeIn max-w-7xl mx-auto pb-12">
      {/* Shared Module Header & Sub-Navigation */}
      <div className="glass-panel p-4 md:p-6 border-slate-800 bg-gradient-to-r from-slate-900/95 via-slate-900/70 to-slate-900/95 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Wallet className="h-4 w-4" />
              </span>
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                Inteligência Patrimonial & Fluxo de Caixa
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              Central Financeira OmniTrack
            </h1>
            <p className="text-xs md:text-sm text-slate-400 mt-0.5">
              Controle de receitas e despesas por local, cofrinhos de metas, planejamento estratégico e simulador com taxas oficiais.
            </p>
          </div>

          <div className="hidden lg:flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-slate-950/80 border border-slate-800/90">
            <Sparkles className="h-4 w-4 text-cyan-400 shrink-0" />
            <div className="text-right">
              <span className="text-[11px] font-bold text-white block">
                Persistência Real Supabase
              </span>
              <span className="text-[10px] text-slate-400 block">
                Zero dados mockados • 100% privado (RLS)
              </span>
            </div>
          </div>
        </div>

        {/* Horizontal Scrollable Sub-Tabs Bar */}
        <div className="border-t border-slate-800/80 pt-3.5 -mx-4 px-4 md:mx-0 md:px-0">
          <nav
            aria-label="Sub-navegação do Módulo Financeiro"
            className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none"
          >
            {financeTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive =
                tab.href === '/financeiro'
                  ? pathname === '/financeiro'
                  : pathname === tab.href || pathname.startsWith(`${tab.href}/`);

              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`group flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 shrink-0 border ${
                    isActive
                      ? 'bg-gradient-to-r from-emerald-500/20 via-cyan-500/15 to-transparent text-white border-emerald-500/40 shadow-lg shadow-emerald-500/10'
                      : 'bg-slate-950/50 text-slate-400 border-slate-800/80 hover:text-slate-200 hover:bg-slate-900 hover:border-slate-700'
                  }`}
                >
                  <div
                    className={`p-1.5 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-slate-900 text-slate-400 group-hover:text-slate-200'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="text-left">
                    <span className="block leading-tight">{tab.label}</span>
                    <span className="hidden sm:block text-[10px] font-normal text-slate-400">
                      {tab.description}
                    </span>
                  </div>
                  {isActive && (
                    <span className="ml-1 h-2 w-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/80 animate-pulse" />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Sub-route Page Content */}
      <div>{children}</div>
    </div>
  );
}
