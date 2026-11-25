'use client';

import React from 'react';
import { Wallet, Sparkles } from 'lucide-react';

export default function FinanceiroLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-6 animate-fadeIn max-w-7xl mx-auto pb-12">
      {/* Shared Module Header Banner (Sub-navigation moved to Expandable Sidebar) */}
      <div className="glass-panel p-5 md:p-6 border-slate-800 bg-gradient-to-r from-slate-900/95 via-slate-900/70 to-slate-900/95">
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
      </div>

      {/* Sub-route Page Content */}
      <div>{children}</div>
    </div>
  );
}
