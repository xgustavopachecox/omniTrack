'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
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
} from 'lucide-react';
import { GamificationHeader } from './GamificationHeader';
import { LevelUpModal } from './LevelUpModal';

const navItems = [
  { label: 'Dashboard', mobileLabel: 'Início', href: '/', icon: LayoutDashboard },
  { label: 'Nutrição', mobileLabel: 'Nutrição', href: '/nutrition', icon: Utensils },
  { label: 'Treino', mobileLabel: 'Treino', href: '/workout', icon: Dumbbell },
  { label: 'Concursos & TAF', mobileLabel: 'Concursos', href: '/contests', icon: GraduationCap },
  { label: 'Financeiro', mobileLabel: 'Finanças', href: '/financeiro', icon: Wallet },
  { label: 'Físico', mobileLabel: 'Físico', href: '/physical', icon: LineChart },
  { label: 'Segundo Cérebro', mobileLabel: 'Notas', href: '/second-brain', icon: Brain },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

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

      <div className="flex flex-col md:flex-row flex-1">
        {/* Desktop Sidebar */}
        <aside className="hidden md:flex flex-col w-64 bg-slate-900/60 backdrop-blur-xl border-r border-slate-800/80 fixed inset-y-0 left-0 z-30 p-4">
          {/* Brand Header */}
          <div className="flex items-center gap-3 px-3 py-4 mb-6 border-b border-slate-800/80">
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

          {/* Navigation Links */}
          <nav className="flex-1 space-y-1.5 overflow-y-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                pathname === item.href ||
                (item.href !== '/' && pathname.startsWith(`${item.href}/`));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group ${
                    isActive
                      ? 'bg-gradient-to-r from-cyan-500/15 via-cyan-500/10 to-transparent text-cyan-400 border border-cyan-500/30 shadow-sm shadow-cyan-500/5'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <Icon
                    className={`h-5 w-5 transition-transform duration-200 group-hover:scale-110 ${
                      isActive ? 'text-cyan-400' : 'text-slate-400 group-hover:text-slate-200'
                    }`}
                  />
                  <span>{item.label}</span>
                  {isActive && (
                    <span className="ml-auto h-2 w-2 rounded-full bg-cyan-400 shadow-sm shadow-cyan-400/80 animate-pulse" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* System Status Card */}
          <div className="mt-auto p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/50 flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-white text-sm shrink-0">
              <UserCheck className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate">OmniTrack Cloud</p>
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
          <GamificationHeader />

          {/* Main Content Viewport */}
          <main className="flex-1 pb-28 md:pb-8 px-3.5 sm:px-4 py-5 md:px-8 max-w-7xl mx-auto w-full min-w-0">
            {children}
          </main>
        </div>
      </div>

      {/* Mobile Bottom Navigation Bar - High Priority Z-Index & Touch Target Fix */}
      <nav
        aria-label="Navegação Principal Mobile"
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 pointer-events-auto bg-slate-950/95 backdrop-blur-xl border-t border-slate-800/90 px-1 py-1 pb-safe shadow-2xl"
      >
        <div className="flex items-center justify-between h-14 max-w-lg mx-auto overflow-x-auto scrollbar-none">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href ||
              (item.href !== '/' && pathname.startsWith(`${item.href}/`));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={(e) => {
                  e.stopPropagation();
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
