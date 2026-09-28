'use client';

import React, { useEffect, useState } from 'react';
import { Flame, Shield, Trophy, Zap, Award } from 'lucide-react';
import { Profile } from '@/lib/types';
import { OmniStore } from '@/lib/store';
import { getXpForNextLevel, getRankTitle, GAMIFICATION_EVENT_NAME } from '@/lib/gamification';
import { UserMenu } from './UserMenu';

export function GamificationHeader() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [pulseXp, setPulseXp] = useState(false);

  const loadProfile = async () => {
    const data = await OmniStore.getProfile();
    setProfile(data);
  };

  useEffect(() => {
    loadProfile();

    const handleGamificationEvent = () => {
      loadProfile();
      setPulseXp(true);
      setTimeout(() => setPulseXp(false), 1200);
    };

    if (typeof window !== 'undefined') {
      window.addEventListener(GAMIFICATION_EVENT_NAME, handleGamificationEvent);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener(GAMIFICATION_EVENT_NAME, handleGamificationEvent);
      }
    };
  }, []);

  if (!profile) {
    return (
      <header className="w-full bg-slate-900/80 backdrop-blur-md border-b border-slate-800/80 py-3 px-4 md:px-8 flex items-center justify-between">
        <div className="h-8 w-48 bg-slate-800 animate-pulse rounded-lg" />
      </header>
    );
  }

  const currentLevel = profile.current_level || 1;
  const currentXp = profile.current_xp || 0;
  const xpNeeded = getXpForNextLevel(currentLevel);
  const xpPercentage = Math.min(100, Math.round((currentXp / xpNeeded) * 100));
  const rankTitle = profile.rank_title || getRankTitle(currentLevel);
  const streak = profile.streak_days || 0;

  return (
    <header className="sticky top-0 z-20 w-full bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/80 px-4 md:px-8 py-2.5 transition-all">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* User Info & Rank Badge */}
        <div className="flex items-center gap-3">
          <div className="relative group">
            <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-cyan-500 via-indigo-600 to-purple-600 p-[2px] shadow-lg shadow-cyan-500/20">
              <div className="h-full w-full rounded-full bg-slate-900 flex items-center justify-center font-bold text-cyan-400 text-sm">
                LVL {currentLevel}
              </div>
            </div>
            <span className="absolute -bottom-1 -right-1 h-4 w-4 bg-emerald-500 rounded-full border-2 border-slate-950 flex items-center justify-center">
              <Zap className="h-2.5 w-2.5 text-slate-950 stroke-[3]" />
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white tracking-tight flex items-center gap-1.5">
                Atleta High-Perf
              </h2>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-amber-500/10 text-amber-300 border border-amber-500/30">
                <Award className="h-3 w-3 text-amber-400" />
                {rankTitle}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 flex items-center gap-1">
              <span>Nível {currentLevel}</span>
              <span className="text-slate-600">•</span>
              <span className="text-cyan-400 font-medium">{currentXp} XP</span>
            </p>
          </div>
        </div>

        {/* Gamification Stats: XP Bar & Streak */}
        <div className="flex items-center gap-4 flex-1 max-w-md justify-end">
          {/* XP Progress Bar */}
          <div className="flex-1 min-w-[140px] max-w-[240px]">
            <div className="flex justify-between items-center text-[10px] font-semibold text-slate-400 mb-1">
              <span className="flex items-center gap-1 text-cyan-400">
                <Trophy className="h-3 w-3 text-cyan-400" />
                Progresso XP
              </span>
              <span className={`${pulseXp ? 'text-cyan-300 scale-110 font-bold transition-all' : ''}`}>
                {currentXp} / {xpNeeded} XP
              </span>
            </div>
            <div className="h-2.5 w-full bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700/60 relative">
              <div
                className={`h-full rounded-full bg-gradient-to-r from-cyan-500 via-indigo-500 to-purple-500 transition-all duration-700 shadow-sm shadow-cyan-500/50 ${
                  pulseXp ? 'brightness-125 animate-pulse' : ''
                }`}
                style={{ width: `${xpPercentage}%` }}
              />
            </div>
          </div>

          {/* Daily Streak Badge */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gradient-to-r from-orange-950/40 to-amber-950/40 border border-orange-500/30 shadow-sm shadow-orange-500/10">
            <div className="relative">
              <Flame className="h-5 w-5 text-orange-400 animate-bounce" />
              <span className="absolute inset-0 text-orange-500 blur-sm animate-pulse opacity-70">
                <Flame className="h-5 w-5" />
              </span>
            </div>
            <div>
              <div className="text-xs font-black tracking-wider text-orange-300 flex items-center gap-1">
                {streak} <span className="text-[10px] font-medium text-orange-400/80">DIAS</span>
              </div>
              <div className="text-[9px] font-semibold text-orange-400/70 tracking-wide uppercase">
                Fogo Diário 🔥
              </div>
            </div>
          </div>

          {/* User Profile Dropdown Menu */}
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
