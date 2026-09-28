'use client';

import React, { useState, useEffect, useRef, useTransition } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { User as UserIcon, Settings, LogOut, ChevronDown, Shield, Sparkles, Loader2 } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { signOut } from '@/actions/auth';
import type { User } from '@supabase/supabase-js';

export function UserMenu() {
  const [user, setUser] = useState<User | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createClient();

    // Fetch initial user
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
    });

    // Listen for auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    // Close dropdown when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      authListener.subscription.unsubscribe();
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSignOut = () => {
    startTransition(async () => {
      await signOut();
    });
  };

  // Get user display details
  const name = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'Atleta Omni';
  const email = user?.email || 'atleta@omnitrack.app';
  const avatarUrl = user?.user_metadata?.avatar_url || user?.user_metadata?.picture;

  // Generate initials
  const initials = name
    ? name
        .split(' ')
        .map((n: string) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'AT';

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2.5 p-1.5 pl-2.5 rounded-full md:rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 hover:bg-slate-800/80 transition-all text-left group focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
        aria-expanded={isOpen}
      >
        {/* Avatar */}
        <div className="relative">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={name}
              className="h-8 w-8 rounded-full object-cover border border-cyan-500/40 shadow-sm"
            />
          ) : (
            <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-xs font-bold text-white shadow-sm shadow-cyan-500/20 border border-cyan-500/30">
              {initials}
            </div>
          )}
          <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-slate-950" />
        </div>

        {/* User Info (Desktop) */}
        <div className="hidden sm:flex flex-col min-w-0 pr-1">
          <span className="text-xs font-semibold text-white group-hover:text-cyan-300 transition-colors truncate max-w-[120px]">
            {name}
          </span>
          <span className="text-[10px] text-slate-400 truncate max-w-[120px]">
            {email}
          </span>
        </div>

        <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180 text-cyan-400' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-slate-900/95 backdrop-blur-xl border border-slate-800 shadow-2xl shadow-black/80 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Header Section in Dropdown */}
          <div className="px-4 py-3 border-b border-slate-800/80">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Conectado como
            </p>
            <p className="text-sm font-bold text-white truncate mt-0.5">{name}</p>
            <p className="text-xs text-slate-400 truncate">{email}</p>
          </div>

          {/* Navigation Options */}
          <div className="py-1">
            <Link
              href="/physical"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800/80 transition-colors"
            >
              <UserIcon className="h-4 w-4 text-cyan-400" />
              <span>Meu Perfil & Metas</span>
            </Link>

            <Link
              href="/physical"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800/80 transition-colors"
            >
              <Settings className="h-4 w-4 text-indigo-400" />
              <span>Configurações</span>
            </Link>
          </div>

          {/* Separator */}
          <div className="my-1 border-t border-slate-800/80" />

          {/* Sign Out Action */}
          <div className="px-1 py-0.5">
            <button
              onClick={handleSignOut}
              disabled={isPending}
              className="w-full flex items-center gap-3 px-3 py-2 text-xs font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-xl transition-colors disabled:opacity-50"
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin text-rose-400" />
              ) : (
                <LogOut className="h-4 w-4 text-rose-400" />
              )}
              <span>{isPending ? 'Saindo...' : 'Sair da Conta'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
