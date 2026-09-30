import { WorkoutSession } from './types';

export function calculateMacroPercentages(p_g: number, c_g: number, f_g: number) {
  const pKcal = (Number(p_g) || 0) * 4;
  const cKcal = (Number(c_g) || 0) * 4;
  const fKcal = (Number(f_g) || 0) * 9;
  const totalKcal = pKcal + cKcal + fKcal;

  if (totalKcal <= 0) {
    return {
      pKcal: 0,
      cKcal: 0,
      fKcal: 0,
      totalKcal: 0,
      pPct: 0,
      cPct: 0,
      fPct: 0,
      formattedBadge: 'P: 0g (0%) | C: 0g (0%) | G: 0g (0%)',
    };
  }

  const pPct = Math.round((pKcal / totalKcal) * 100);
  const cPct = Math.round((cKcal / totalKcal) * 100);
  const fPct = Math.round((fKcal / totalKcal) * 100);

  const formattedBadge = `P: ${Math.round(p_g)}g (${pPct}%) | C: ${Math.round(c_g)}g (${cPct}%) | G: ${Math.round(f_g)}g (${fPct}%)`;

  return {
    pKcal,
    cKcal,
    fKcal,
    totalKcal,
    pPct,
    cPct,
    fPct,
    formattedBadge,
  };
}

// ISO Week Helper
function getISOWeekKey(dateStr: string) {
  const d = new Date(dateStr + 'T12:00:00');
  if (isNaN(d.getTime())) return null;
  const day = d.getDay();
  const diffToMonday = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diffToMonday));

  const jan1 = new Date(monday.getFullYear(), 0, 1);
  const days = Math.floor((monday.getTime() - jan1.getTime()) / (24 * 60 * 60 * 1000));
  const weekNum = Math.ceil((days + jan1.getDay() + 1) / 7);

  return `${monday.getFullYear()}-W${weekNum}`;
}

export function calculateWeeklyStreak(sessions: WorkoutSession[], targetWorkoutsPerWeek: number = 4) {
  if (!sessions || sessions.length === 0) {
    return {
      currentStreak: 0,
      currentWeekWorkouts: 0,
      targetWorkoutsPerWeek,
      isCurrentWeekGoalMet: false,
    };
  }

  const todayStr = new Date().toISOString().split('T')[0];
  const currentWeekKey = getISOWeekKey(todayStr);

  const weekWorkoutsMap = new Map<string, number>();

  sessions.forEach((s) => {
    const dStr = s.session_date || s.created_at.split('T')[0];
    const wKey = getISOWeekKey(dStr);
    if (wKey) {
      weekWorkoutsMap.set(wKey, (weekWorkoutsMap.get(wKey) || 0) + 1);
    }
  });

  const currentWeekWorkouts = weekWorkoutsMap.get(currentWeekKey || '') || 0;
  const isCurrentWeekGoalMet = currentWeekWorkouts >= targetWorkoutsPerWeek;

  let streak = 0;
  let checkDate = new Date();

  // If current week goal is already met, count it
  if (isCurrentWeekGoalMet) {
    streak++;
  }

  // Go back week by week starting from previous week
  checkDate.setDate(checkDate.getDate() - 7);

  for (let i = 0; i < 52; i++) {
    const wKey = getISOWeekKey(checkDate.toISOString().split('T')[0]);
    if (!wKey) break;

    const count = weekWorkoutsMap.get(wKey) || 0;
    if (count >= targetWorkoutsPerWeek) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 7);
    } else {
      break;
    }
  }

  return {
    currentStreak: streak,
    currentWeekWorkouts,
    targetWorkoutsPerWeek,
    isCurrentWeekGoalMet,
  };
}
