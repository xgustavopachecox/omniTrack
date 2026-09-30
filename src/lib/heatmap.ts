import { WorkoutSession, MuscleHeatmapItem, MuscleHeatmapResponse, HeatmapIntensityLevel } from './types';

const TARGET_MUSCLES = [
  'Peito',
  'Costas',
  'Quadríceps',
  'Isquiotibiais',
  'Ombros',
  'Tríceps',
  'Bíceps',
  'Abdômen',
  'Panturrilhas',
];

export function computeMuscleHeatmap(sessions: WorkoutSession[], daysWindow: number = 7): MuscleHeatmapResponse {
  const now = new Date();
  const cutoffTime = now.getTime() - daysWindow * 24 * 60 * 60 * 1000;

  // Filter sessions in the last N days
  const recentSessions = sessions.filter((s) => {
    const dStr = s.session_date || s.created_at.split('T')[0];
    const t = new Date(dStr + 'T23:59:59').getTime();
    return t >= cutoffTime;
  });

  const muscleDataMap = new Map<string, { totalSets: number; totalVolumeKg: number; exerciseCount: number }>();

  TARGET_MUSCLES.forEach((m) => {
    muscleDataMap.set(m, { totalSets: 0, totalVolumeKg: 0, exerciseCount: 0 });
  });

  let grandTotalSets = 0;
  let grandTotalVolume = 0;

  recentSessions.forEach((session) => {
    if (!session.exercises) return;

    session.exercises.forEach((ex) => {
      const setsCount = ex.sets ? ex.sets.length : 0;
      const volumeKg = ex.exercise_volume_kg || 0;
      const exName = (ex.exercise_name || '').toLowerCase();
      const mGroup = (ex.muscle_group || '').toLowerCase();

      // Determine target muscle key(s)
      const targetKeys: string[] = [];

      if (mGroup.includes('peito') || exName.includes('supino') || exName.includes('crucifixo') || exName.includes('crossover')) {
        targetKeys.push('Peito');
      } else if (mGroup.includes('costas') || exName.includes('puxada') || exName.includes('remada') || exName.includes('barra fixa') || exName.includes('serrote')) {
        targetKeys.push('Costas');
      } else if (mGroup.includes('ombro') || exName.includes('desenvolvimento') || exName.includes('elevação') || exName.includes('deltoide')) {
        targetKeys.push('Ombros');
      } else if (mGroup.includes('tríceps') || exName.includes('tríceps') || exName.includes('testa') || exName.includes('paralelas')) {
        targetKeys.push('Tríceps');
      } else if (mGroup.includes('bíceps') || exName.includes('bíceps') || exName.includes('rosca')) {
        targetKeys.push('Bíceps');
      } else if (mGroup.includes('abdômen') || mGroup.includes('abdomen') || exName.includes('abdominal') || exName.includes('prancha')) {
        targetKeys.push('Abdômen');
      } else if (exName.includes('panturrilha') || exName.includes('gêmeos')) {
        targetKeys.push('Panturrilhas');
      } else if (exName.includes('stiff') || exName.includes('flexora') || exName.includes('posterior')) {
        targetKeys.push('Isquiotibiais');
      } else if (exName.includes('quad') || exName.includes('agachamento') || exName.includes('extensora') || exName.includes('leg press')) {
        targetKeys.push('Quadríceps');
      } else if (mGroup.includes('perna')) {
        targetKeys.push('Quadríceps', 'Isquiotibiais');
      } else if (mGroup.includes('braço')) {
        targetKeys.push('Bíceps', 'Tríceps');
      } else {
        targetKeys.push('Peito');
      }

      const fraction = targetKeys.length;
      grandTotalSets += setsCount;
      grandTotalVolume += volumeKg;

      targetKeys.forEach((key) => {
        if (muscleDataMap.has(key)) {
          const item = muscleDataMap.get(key)!;
          item.totalSets += Math.ceil(setsCount / fraction);
          item.totalVolumeKg += Math.round(volumeKg / fraction);
          item.exerciseCount += 1;
        }
      });
    });
  });

  const muscleItems: MuscleHeatmapItem[] = TARGET_MUSCLES.map((muscle) => {
    const data = muscleDataMap.get(muscle) || { totalSets: 0, totalVolumeKg: 0, exerciseCount: 0 };
    const sets = data.totalSets;

    let level: HeatmapIntensityLevel = 'low';
    let label = 'Insuficiente (<6 séries)';
    let colorHex = '#06b6d4';
    let bgColorClass = 'bg-cyan-500/15';
    let borderColorClass = 'border-cyan-500/30';
    let textColorClass = 'text-cyan-400';

    if (sets > 20) {
      level = 'very_high';
      label = 'Volume Extremo (>20 séries)';
      colorHex = '#dc2626';
      bgColorClass = 'bg-rose-600/20';
      borderColorClass = 'border-rose-500/40';
      textColorClass = 'text-rose-400';
    } else if (sets >= 13) {
      level = 'high';
      label = 'Hipertrofia (13-20 séries)';
      colorHex = '#f97316';
      bgColorClass = 'bg-orange-500/20';
      borderColorClass = 'border-orange-500/40';
      textColorClass = 'text-orange-400';
    } else if (sets >= 6) {
      level = 'moderate';
      label = 'Manutenção (6-12 séries)';
      colorHex = '#f59e0b';
      bgColorClass = 'bg-amber-500/15';
      borderColorClass = 'border-amber-500/30';
      textColorClass = 'text-amber-400';
    }

    return {
      muscle,
      totalSets: sets,
      totalVolumeKg: data.totalVolumeKg,
      exerciseCount: data.exerciseCount,
      level,
      label,
      colorHex,
      bgColorClass,
      borderColorClass,
      textColorClass,
    };
  });

  return {
    period: 'Últimos 7 dias',
    muscles: muscleItems,
    totalWorkouts: recentSessions.length,
    totalSets: grandTotalSets,
    totalVolumeKg: grandTotalVolume,
  };
}
