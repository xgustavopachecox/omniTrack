'use client';

import React, { useState } from 'react';
import { MuscleHeatmapResponse, MuscleHeatmapItem } from '@/lib/types';
import { Flame, Activity, Info, ShieldAlert, CheckCircle2, Zap } from 'lucide-react';

interface BodyHeatmapProps {
  data: MuscleHeatmapResponse;
  compact?: boolean;
}

export const BodyHeatmap: React.FC<BodyHeatmapProps> = ({ data, compact = false }) => {
  const [hoveredMuscle, setHoveredMuscle] = useState<MuscleHeatmapItem | null>(null);

  if (!data || !data.muscles) return null;

  return (
    <div className={`glass-card rounded-2xl border border-slate-800 overflow-hidden ${compact ? 'p-4' : 'p-6'} space-y-5 transition animate-fadeIn`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-orange-500/10 text-orange-400">
              <Flame className="h-4 w-4" />
            </span>
            <span className="text-xs font-semibold uppercase tracking-wider text-orange-400">
              Biometria de Sobrecarga
            </span>
          </div>
          <h3 className={`font-extrabold text-white tracking-tight ${compact ? 'text-base' : 'text-lg md:text-xl'}`}>
            Mapa de Calor Muscular (Volume Semanal)
          </h3>
          {!compact && (
            <p className="text-xs text-slate-400 mt-0.5">
              Intensidade computada nos últimos 7 dias com base no número de séries efetivas e volume total em kg.
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <span className="px-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs font-extrabold text-white flex items-center gap-1.5">
            <Activity className="h-3.5 w-3.5 text-cyan-400" />
            {data.totalSets} Séries Totais
          </span>
          {!compact && (
            <span className="px-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs font-extrabold text-amber-400">
              {data.totalVolumeKg.toLocaleString('pt-BR')} kg
            </span>
          )}
        </div>
      </div>

      {/* Tooltip Banner (Interactive Hover display) */}
      {hoveredMuscle && (
        <div className="p-3 rounded-xl bg-slate-950/90 border border-slate-700/80 text-xs text-white flex items-center justify-between gap-3 animate-fadeIn shadow-xl">
          <div className="flex items-center gap-2">
            <span
              className="h-3 w-3 rounded-full animate-ping"
              style={{ backgroundColor: hoveredMuscle.colorHex }}
            />
            <span className="font-extrabold text-sm text-white">{hoveredMuscle.muscle}</span>
            <span className={`px-2 py-0.5 rounded text-[10px] font-black border ${hoveredMuscle.bgColorClass} ${hoveredMuscle.borderColorClass} ${hoveredMuscle.textColorClass}`}>
              {hoveredMuscle.label}
            </span>
          </div>
          <div className="flex items-center gap-3 text-slate-300 font-medium">
            <span><strong>{hoveredMuscle.totalSets}</strong> séries</span>
            <span>•</span>
            <span><strong>{hoveredMuscle.totalVolumeKg.toLocaleString('pt-BR')}</strong> kg</span>
          </div>
        </div>
      )}

      {/* Grid of Muscle Heatmap Cards */}
      <div className={`grid gap-3 ${compact ? 'grid-cols-3' : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-3'}`}>
        {data.muscles.map((item) => {
          return (
            <div
              key={item.muscle}
              onMouseEnter={() => setHoveredMuscle(item)}
              onMouseLeave={() => setHoveredMuscle(null)}
              className={`p-3.5 rounded-xl border transition-all duration-200 cursor-pointer relative group overflow-hidden ${item.bgColorClass} ${item.borderColorClass} hover:scale-[1.02] hover:shadow-lg`}
            >
              {/* Thermal Level Glow Line */}
              <div
                className="absolute top-0 left-0 right-0 h-1 transition"
                style={{ backgroundColor: item.colorHex }}
              />

              <div className="flex items-start justify-between gap-1 mb-2">
                <span className="font-extrabold text-white text-xs md:text-sm tracking-tight">
                  {item.muscle}
                </span>

                <span
                  className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase border"
                  style={{
                    backgroundColor: `${item.colorHex}20`,
                    borderColor: `${item.colorHex}50`,
                    color: item.colorHex,
                  }}
                >
                  {item.totalSets} séries
                </span>
              </div>

              {/* Progress Level Bar */}
              <div className="w-full h-2 bg-slate-950/80 rounded-full overflow-hidden mb-2 border border-slate-800">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(100, Math.max(8, (item.totalSets / 20) * 100))}%`,
                    backgroundColor: item.colorHex,
                  }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] font-semibold pt-0.5">
                <span className="text-slate-400 font-mono text-[10px]">
                  {item.totalVolumeKg > 0 ? `${item.totalVolumeKg.toLocaleString('pt-BR')} kg` : 'Sem registro'}
                </span>
                <span className={`text-[10px] font-bold ${item.textColorClass} truncate max-w-[120px]`}>
                  {item.level === 'low'
                    ? 'Pouco'
                    : item.level === 'moderate'
                    ? 'Moderado'
                    : item.level === 'high'
                    ? 'Hipertrofia'
                    : 'Extremo'}
                </span>
              </div>

              {/* Hover Detailed Tooltip Overlay */}
              <div className="absolute inset-0 bg-slate-950/95 p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-between pointer-events-none">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-white text-xs">{item.muscle}</span>
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${item.bgColorClass} ${item.textColorClass}`}>
                    {item.label}
                  </span>
                </div>
                <div className="text-[11px] space-y-0.5 text-slate-300">
                  <p>Séries Efetivas: <strong className="text-white">{item.totalSets}</strong></p>
                  <p>Volume Acumulado: <strong className="text-amber-400">{item.totalVolumeKg.toLocaleString('pt-BR')} kg</strong></p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Thermal Scale Legend */}
      <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400 font-medium">
        <span className="flex items-center gap-1.5 text-slate-300 font-semibold">
          <Info className="h-3.5 w-3.5 text-cyan-400" />
          Escala de Intensidade:
        </span>

        <div className="flex flex-wrap items-center gap-3">
          <span className="flex items-center gap-1 text-cyan-400">
            <span className="h-2.5 w-2.5 rounded-full bg-cyan-400" />
            &lt; 6 séries (Pouco)
          </span>
          <span className="flex items-center gap-1 text-amber-400">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
            6-12 (Moderado)
          </span>
          <span className="flex items-center gap-1 text-orange-400">
            <span className="h-2.5 w-2.5 rounded-full bg-orange-500" />
            13-20 (Hipertrofia)
          </span>
          <span className="flex items-center gap-1 text-rose-400 font-bold">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-600 animate-pulse" />
            &gt; 20 (Extremo)
          </span>
        </div>
      </div>
    </div>
  );
};
