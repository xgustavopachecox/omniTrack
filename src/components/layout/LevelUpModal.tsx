'use client';

import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { Trophy, Award, Zap, Sparkles, X, ChevronRight } from 'lucide-react';
import { GamificationReward } from '@/lib/types';
import { GAMIFICATION_EVENT_NAME } from '@/lib/gamification';

export function LevelUpModal() {
  const [activeReward, setActiveReward] = useState<GamificationReward | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const playCelebrationSound = () => {
    try {
      if (typeof window === 'undefined') return;
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      // Play soft rising chime
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.15, ctx.currentTime + idx * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.1 + 0.4);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.1);
        osc.stop(ctx.currentTime + idx * 0.1 + 0.4);
      });
    } catch {
      // Audio fallback
    }
  };

  const fireConfetti = () => {
    try {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#06b6d4', '#6366f1', '#a855f7', '#f59e0b', '#10b981'],
      });

      setTimeout(() => {
        confetti({
          particleCount: 60,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
        });
        confetti({
          particleCount: 60,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
        });
      }, 250);
    } catch {
      // Fallback
    }
  };

  useEffect(() => {
    const handleEvent = (e: CustomEvent<GamificationReward>) => {
      const reward = e.detail;
      if (reward && (reward.leveledUp || (reward.unlockedBadges && reward.unlockedBadges.length > 0))) {
        setActiveReward(reward);
        setIsOpen(true);
        playCelebrationSound();
        fireConfetti();
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener(GAMIFICATION_EVENT_NAME as any, handleEvent as any);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener(GAMIFICATION_EVENT_NAME as any, handleEvent as any);
      }
    };
  }, []);

  if (!isOpen || !activeReward) return null;

  const isLevelUp = activeReward.leveledUp;
  const badge = activeReward.unlockedBadges?.[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl bg-slate-900 border border-cyan-500/40 p-6 shadow-2xl shadow-cyan-500/20 text-center">
        {/* Glow Effects */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-cyan-500/30 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-purple-500/30 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={() => setIsOpen(false)}
          className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Main Icon Header */}
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-tr from-cyan-500 via-indigo-600 to-purple-600 shadow-xl shadow-cyan-500/30 ring-4 ring-slate-800 animate-bounce">
          {isLevelUp ? (
            <Trophy className="h-10 w-10 text-white stroke-[2.5]" />
          ) : (
            <Award className="h-10 w-10 text-white stroke-[2.5]" />
          )}
        </div>

        {/* Subtitle Badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 text-xs font-bold uppercase tracking-wider mb-2">
          <Sparkles className="h-3.5 w-3.5 text-cyan-400 animate-spin" />
          {isLevelUp ? 'NOVO NÍVEL ALCANÇADO!' : 'CONQUISTA DESBLOQUEADA!'}
        </div>

        {/* Title */}
        <h3 className="text-2xl font-black tracking-tight text-white mb-2">
          {isLevelUp ? `NÍVEL ${activeReward.newLevel}!` : (typeof badge === 'string' ? badge : badge?.title || 'Sensacional!')}
        </h3>

        {/* Reason / Subtext */}
        <p className="text-xs text-slate-300 mb-6 leading-relaxed">
          {isLevelUp
            ? `Você conquistou bastante XP com "${activeReward.reason}" e subiu de patente!`
            : (typeof badge === 'string' ? `Sua consistência em "${activeReward.reason}" rendeu frutos!` : badge?.description || `Sua consistência em "${activeReward.reason}" rendeu frutos!`)}
        </p>

        {/* Rank Title Box */}
        {isLevelUp && activeReward.newTitle && (
          <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-cyan-950/60 via-indigo-950/60 to-slate-900 border border-cyan-500/30 flex items-center justify-between">
            <div className="text-left">
              <span className="text-[10px] uppercase font-bold text-slate-400">Novo Título do Personagem</span>
              <div className="text-sm font-black text-amber-300 flex items-center gap-1.5 mt-0.5">
                <Zap className="h-4 w-4 text-amber-400 fill-amber-400" />
                {activeReward.newTitle}
              </div>
            </div>
            <div className="flex items-center gap-1 text-cyan-400 text-xs font-bold">
              <span>LVL {activeReward.oldLevel}</span>
              <ChevronRight className="h-4 w-4" />
              <span className="text-amber-300">LVL {activeReward.newLevel}</span>
            </div>
          </div>
        )}

        {/* Action Button */}
        <button
          onClick={() => setIsOpen(false)}
          className="w-full py-3.5 px-6 rounded-xl font-bold text-sm bg-gradient-to-r from-cyan-500 via-indigo-600 to-purple-600 text-white shadow-lg shadow-cyan-500/25 hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2"
        >
          <span>Continuar a Jornada</span>
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
