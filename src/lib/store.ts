import {
  Profile,
  NutritionLog,
  WorkoutSession,
  WorkoutSessionExercise,
  UserPR,
  BodyMetric,
  WaterLog,
  SecondBrainNote,
  Contest,
  ContestSubject,
  StudySession,
  ContestTafRequirement,
  TafBenchmark,
  PhysiqueAssessment,
  GeminiParseEditalResponse,
  MockExam,
  MockExamQuestion,
  ErrorNotebookItem,
  ScheduledReview,
} from './types';
import { supabase, isSupabaseConfigured } from './supabase/client';

const DEMO_USER_ID = 'demo-user-omnitrack';

const defaultProfile: Profile = {
  id: DEMO_USER_ID,
  daily_calorie_target: 2500,
  daily_protein_target: 160,
  daily_carbs_target: 280,
  daily_fats_target: 70,
  daily_water_target: 3000,
  current_level: 1,
  current_xp: 0,
  rank_title: 'Aspirante / Recruta',
  streak_days: 0,
  created_at: new Date().toISOString(),
};

const defaultNutritionLogs: NutritionLog[] = [];
const defaultSessions: WorkoutSession[] = [];
const defaultPRs: UserPR[] = [];
const defaultBodyMetrics: BodyMetric[] = [];
const defaultWaterLogs: WaterLog[] = [];
const defaultNotes: SecondBrainNote[] = [];
const defaultContests: Contest[] = [];
const defaultContestSubjects: ContestSubject[] = [];
const defaultStudySessions: StudySession[] = [];
const defaultContestTafRequirements: ContestTafRequirement[] = [];
const defaultTafBenchmarks: TafBenchmark[] = [];
const defaultPhysiqueAssessments: PhysiqueAssessment[] = [];

export class OmniStore {
  private static get<T>(key: string, defaultValue: T): T {
    if (typeof window === 'undefined') return defaultValue;
    try {
      const item = localStorage.getItem(`omnitrack_${key}`);
      return item ? JSON.parse(item) : defaultValue;
    } catch {
      return defaultValue;
    }
  }

  private static set<T>(key: string, value: T): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(`omnitrack_${key}`, JSON.stringify(value));
    } catch (err) {
      console.error('Error saving to LocalStorage', err);
    }
  }

  // Profile
  static async getProfile(): Promise<Profile> {
    if (isSupabaseConfigured && supabase) {
      const { data } = await supabase.from('profiles').select('*').single();
      if (data) return data as Profile;
    }
    return this.get('profile', defaultProfile);
  }

  static async updateProfile(profile: Partial<Profile>): Promise<Profile> {
    const current = await this.getProfile();
    const updated = { ...current, ...profile };
    if (isSupabaseConfigured && supabase) {
      await supabase.from('profiles').upsert(updated);
    }
    this.set('profile', updated);
    return updated;
  }

  static async addXp(amount: number, reason?: string): Promise<Profile> {
    const current = await this.getProfile();
    const newXp = (current.current_xp || 0) + amount;
    const xpPerLevel = 500;
    const newLevel = Math.floor(newXp / xpPerLevel) + 1;
    let rank = current.rank_title || 'Aspirante / Recruta';

    if (newLevel >= 10) rank = 'Mestre da Disciplina';
    else if (newLevel >= 7) rank = 'Comandante de Elite';
    else if (newLevel >= 4) rank = 'Guerreiro Avançado';
    else if (newLevel >= 2) rank = 'Combatente Disciplinado';

    return this.updateProfile({
      current_xp: newXp,
      current_level: newLevel,
      rank_title: rank,
    });
  }

  // Nutrition
  static async getNutritionLogs(): Promise<NutritionLog[]> {
    if (isSupabaseConfigured && supabase) {
      const { data } = await supabase.from('nutrition_logs').select('*').order('logged_at', { ascending: false });
      if (data && data.length > 0) return data as NutritionLog[];
    }
    return this.get('nutrition_logs', defaultNutritionLogs);
  }

  static async addNutritionLog(log: Omit<NutritionLog, 'id' | 'user_id' | 'logged_at'>): Promise<NutritionLog> {
    const nowIso = new Date().toISOString();
    const newLog: NutritionLog = {
      ...log,
      id: `n_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      user_id: DEMO_USER_ID,
      meal_type: log.meal_type || 'Refeição',
      log_date: log.log_date || nowIso.split('T')[0],
      logged_at: nowIso,
    };

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('nutrition_logs').insert(newLog).select().single();
      if (data && !error) return data as NutritionLog;
    }

    const current = await this.getNutritionLogs();
    const updated = [newLog, ...current];
    this.set('nutrition_logs', updated);
    return newLog;
  }

  static async updateNutritionLog(id: string, logData: Partial<NutritionLog>): Promise<NutritionLog> {
    const current = await this.getNutritionLogs();
    const existing = current.find((l) => l.id === id);
    if (!existing) throw new Error('Nutrition log not found');

    const updated: NutritionLog = { ...existing, ...logData };

    if (isSupabaseConfigured && supabase) {
      await supabase.from('nutrition_logs').update(updated).eq('id', id);
    }

    const updatedList = current.map((l) => (l.id === id ? updated : l));
    this.set('nutrition_logs', updatedList);
    return updated;
  }

  static async deleteNutritionLog(id: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      await supabase.from('nutrition_logs').delete().eq('id', id);
    }
    const current = await this.getNutritionLogs();
    const updated = current.filter((l) => l.id !== id);
    this.set('nutrition_logs', updated);
  }

  // Workout Sessions & PRs
  static async getWorkoutSessions(): Promise<WorkoutSession[]> {
    if (isSupabaseConfigured && supabase) {
      const { data: sessionsData } = await supabase
        .from('workout_sessions')
        .select('*, exercises:workout_session_exercises(*)')
        .order('created_at', { ascending: false });
      if (sessionsData && sessionsData.length > 0) return sessionsData as WorkoutSession[];
    }
    return this.get('workout_sessions', defaultSessions);
  }

  static async getUserPRs(): Promise<UserPR[]> {
    if (isSupabaseConfigured && supabase) {
      const { data } = await supabase.from('user_prs').select('*').order('weight_kg', { ascending: false });
      if (data && data.length > 0) return data as UserPR[];
    }
    return this.get('user_prs', defaultPRs);
  }

  static async addWorkoutSession(sessionInput: {
    title: string;
    session_date?: string;
    total_session_volume_kg: number;
    coach_feedback?: string;
    raw_input?: string;
    exercises: Omit<WorkoutSessionExercise, 'id' | 'session_id'>[];
  }): Promise<WorkoutSession> {
    const now = new Date().toISOString();
    const sDate = sessionInput.session_date || now.split('T')[0];
    const sessionId = `ws_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;

    const exercisesFormatted: WorkoutSessionExercise[] = sessionInput.exercises.map((ex, idx) => ({
      ...ex,
      id: `wse_${Date.now()}_${idx}_${Math.random().toString(36).substr(2, 4)}`,
      session_id: sessionId,
      created_at: now,
    }));

    const newSession: WorkoutSession = {
      id: sessionId,
      user_id: DEMO_USER_ID,
      title: sessionInput.title,
      session_date: sDate,
      total_session_volume_kg: sessionInput.total_session_volume_kg,
      coach_feedback: sessionInput.coach_feedback,
      raw_input: sessionInput.raw_input,
      created_at: now,
      exercises: exercisesFormatted,
    };

    if (isSupabaseConfigured && supabase) {
      const { error: sessErr } = await supabase.from('workout_sessions').insert({
        id: newSession.id,
        user_id: newSession.user_id,
        title: newSession.title,
        session_date: newSession.session_date,
        total_session_volume_kg: newSession.total_session_volume_kg,
        coach_feedback: newSession.coach_feedback,
        raw_input: newSession.raw_input,
        created_at: newSession.created_at,
      });

      if (!sessErr) {
        const exercisesToInsert = exercisesFormatted.map((ex) => ({
          id: ex.id,
          session_id: ex.session_id,
          exercise_name: ex.exercise_name,
          muscle_group: ex.muscle_group,
          sets: ex.sets,
          best_weight_kg: ex.best_weight_kg,
          exercise_volume_kg: ex.exercise_volume_kg,
          observation: ex.observation,
          created_at: ex.created_at,
        }));
        await supabase.from('workout_session_exercises').insert(exercisesToInsert);
      }
    }

    const currentSessions = await this.getWorkoutSessions();
    const updatedSessions = [newSession, ...currentSessions];
    this.set('workout_sessions', updatedSessions);

    await this.updatePRsFromSession(newSession);

    return newSession;
  }

  static async updateWorkoutSession(
    sessionId: string,
    sessionInput: {
      title: string;
      session_date: string;
      total_session_volume_kg: number;
      coach_feedback?: string;
      exercises: Omit<WorkoutSessionExercise, 'id' | 'session_id'>[];
    }
  ): Promise<WorkoutSession> {
    const now = new Date().toISOString();
    const exercisesFormatted: WorkoutSessionExercise[] = sessionInput.exercises.map((ex, idx) => ({
      ...ex,
      id: `wse_${Date.now()}_${idx}_${Math.random().toString(36).substr(2, 4)}`,
      session_id: sessionId,
      created_at: now,
    }));

    const currentSessions = await this.getWorkoutSessions();
    const oldSession = currentSessions.find((s) => s.id === sessionId);

    const updatedSession: WorkoutSession = {
      id: sessionId,
      user_id: DEMO_USER_ID,
      title: sessionInput.title,
      session_date: sessionInput.session_date,
      total_session_volume_kg: sessionInput.total_session_volume_kg,
      coach_feedback: sessionInput.coach_feedback || oldSession?.coach_feedback,
      raw_input: oldSession?.raw_input,
      created_at: oldSession?.created_at || now,
      exercises: exercisesFormatted,
    };

    if (isSupabaseConfigured && supabase) {
      await supabase
        .from('workout_sessions')
        .update({
          title: updatedSession.title,
          session_date: updatedSession.session_date,
          total_session_volume_kg: updatedSession.total_session_volume_kg,
          coach_feedback: updatedSession.coach_feedback,
        })
        .eq('id', sessionId);

      await supabase.from('workout_session_exercises').delete().eq('session_id', sessionId);

      const exercisesToInsert = exercisesFormatted.map((ex) => ({
        id: ex.id,
        session_id: sessionId,
        exercise_name: ex.exercise_name,
        muscle_group: ex.muscle_group,
        sets: ex.sets,
        best_weight_kg: ex.best_weight_kg,
        exercise_volume_kg: ex.exercise_volume_kg,
        observation: ex.observation,
        created_at: ex.created_at,
      }));
      await supabase.from('workout_session_exercises').insert(exercisesToInsert);
    }

    const updatedList = currentSessions.map((s) => (s.id === sessionId ? updatedSession : s));
    this.set('workout_sessions', updatedList);

    await this.updatePRsFromSession(updatedSession);
    return updatedSession;
  }

  static async deleteWorkoutSession(id: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      await supabase.from('workout_sessions').delete().eq('id', id);
    }
    const currentSessions = await this.getWorkoutSessions();
    const updated = currentSessions.filter((s) => s.id !== id);
    this.set('workout_sessions', updated);
  }

  // PR CRUD
  static async addPR(prInput: {
    exercise_name: string;
    muscle_group: string;
    weight_kg: number;
    reps: number;
    achieved_at: string;
  }): Promise<UserPR> {
    const newPR: UserPR = {
      id: `pr_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      user_id: DEMO_USER_ID,
      exercise_name: prInput.exercise_name,
      muscle_group: prInput.muscle_group,
      weight_kg: prInput.weight_kg,
      reps: prInput.reps,
      achieved_at: prInput.achieved_at,
      created_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured && supabase) {
      await supabase.from('user_prs').upsert(newPR, { onConflict: 'user_id, exercise_name' });
    }

    const currentPRs = await this.getUserPRs();
    const existingIndex = currentPRs.findIndex(
      (p) => p.exercise_name.toLowerCase() === prInput.exercise_name.toLowerCase()
    );

    let updatedPRs: UserPR[];
    if (existingIndex >= 0) {
      updatedPRs = [...currentPRs];
      updatedPRs[existingIndex] = newPR;
    } else {
      updatedPRs = [newPR, ...currentPRs];
    }
    this.set('user_prs', updatedPRs);
    return newPR;
  }

  static async updatePR(id: string, prData: Partial<UserPR>): Promise<UserPR> {
    const currentPRs = await this.getUserPRs();
    const existing = currentPRs.find((p) => p.id === id);
    if (!existing) throw new Error('PR not found');

    const updated: UserPR = { ...existing, ...prData };

    if (isSupabaseConfigured && supabase) {
      await supabase.from('user_prs').upsert(updated);
    }

    const updatedList = currentPRs.map((p) => (p.id === id ? updated : p));
    this.set('user_prs', updatedList);
    return updated;
  }

  static async deletePR(id: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      await supabase.from('user_prs').delete().eq('id', id);
    }
    const currentPRs = await this.getUserPRs();
    const updated = currentPRs.filter((p) => p.id !== id);
    this.set('user_prs', updated);
  }

  private static async updatePRsFromSession(session: WorkoutSession): Promise<void> {
    const currentPRs = await this.getUserPRs();
    const updatedPRs = [...currentPRs];

    if (!session.exercises) return;

    for (const ex of session.exercises) {
      const bestWeight = ex.best_weight_kg;
      const bestSet = ex.sets.find((s) => s.total_weight_kg === bestWeight) || ex.sets[ex.sets.length - 1];
      const repsAchieved = bestSet ? bestSet.reps : 1;

      const existingPrIndex = updatedPRs.findIndex(
        (p) => p.exercise_name.toLowerCase() === ex.exercise_name.toLowerCase()
      );

      if (existingPrIndex >= 0) {
        const existingPR = updatedPRs[existingPrIndex];
        if (bestWeight > existingPR.weight_kg) {
          const newPRRecord: UserPR = {
            id: existingPR.id,
            user_id: DEMO_USER_ID,
            exercise_name: ex.exercise_name,
            muscle_group: ex.muscle_group,
            weight_kg: bestWeight,
            reps: repsAchieved,
            achieved_at: session.session_date,
            workout_session_id: session.id,
            created_at: new Date().toISOString(),
          };

          updatedPRs[existingPrIndex] = newPRRecord;

          if (isSupabaseConfigured && supabase) {
            await supabase.from('user_prs').upsert(newPRRecord, { onConflict: 'user_id, exercise_name' });
          }
        }
      } else {
        const newPRRecord: UserPR = {
          id: `pr_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          user_id: DEMO_USER_ID,
          exercise_name: ex.exercise_name,
          muscle_group: ex.muscle_group,
          weight_kg: bestWeight,
          reps: repsAchieved,
          achieved_at: session.session_date,
          workout_session_id: session.id,
          created_at: new Date().toISOString(),
        };

        updatedPRs.push(newPRRecord);

        if (isSupabaseConfigured && supabase) {
          await supabase.from('user_prs').upsert(newPRRecord, { onConflict: 'user_id, exercise_name' });
        }
      }
    }

    this.set('user_prs', updatedPRs);
  }

  // Body Metrics
  static async getBodyMetrics(): Promise<BodyMetric[]> {
    if (isSupabaseConfigured && supabase) {
      const { data } = await supabase.from('body_metrics').select('*').order('logged_at', { ascending: true });
      if (data && data.length > 0) return data as BodyMetric[];
    }
    return this.get('body_metrics', defaultBodyMetrics);
  }

  static async addBodyMetric(metric: Omit<BodyMetric, 'id' | 'user_id' | 'logged_at'>): Promise<BodyMetric> {
    const newMetric: BodyMetric = {
      ...metric,
      id: `b_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      user_id: DEMO_USER_ID,
      logged_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('body_metrics').insert(newMetric).select().single();
      if (data && !error) return data as BodyMetric;
    }

    const current = await this.getBodyMetrics();
    const updated = [...current, newMetric];
    this.set('body_metrics', updated);
    return newMetric;
  }

  static async deleteBodyMetric(id: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      await supabase.from('body_metrics').delete().eq('id', id);
    }
    const current = await this.getBodyMetrics();
    const updated = current.filter((b) => b.id !== id);
    this.set('body_metrics', updated);
  }

  // Water Logs
  static async getWaterLogs(): Promise<WaterLog[]> {
    if (isSupabaseConfigured && supabase) {
      const { data } = await supabase.from('water_logs').select('*').order('logged_at', { ascending: false });
      if (data && data.length > 0) return data as WaterLog[];
    }
    return this.get('water_logs', defaultWaterLogs);
  }

  static async addWaterLog(amount_ml: number, targetDate?: string): Promise<WaterLog> {
    const todayStr = new Date().toISOString().split('T')[0];
    const logged_at = targetDate && targetDate !== todayStr
      ? `${targetDate}T12:00:00.000Z`
      : new Date().toISOString();

    const newLog: WaterLog = {
      id: `wt_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      user_id: DEMO_USER_ID,
      amount_ml,
      logged_at,
    };

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('water_logs').insert(newLog).select().single();
      if (data && !error) return data as WaterLog;
    }

    const current = await this.getWaterLogs();
    const updated = [newLog, ...current];
    this.set('water_logs', updated);
    return newLog;
  }

  static async subtractWaterLog(amount_ml: number, targetDate?: string): Promise<boolean> {
    const dateStr = targetDate || new Date().toISOString().split('T')[0];
    const current = await this.getWaterLogs();

    // Filter logs for targetDate, sorted by logged_at descending (newest first)
    const dateLogs = current
      .filter((w) => w.logged_at.split('T')[0] === dateStr)
      .sort((a, b) => new Date(b.logged_at).getTime() - new Date(a.logged_at).getTime());

    const currentTotal = dateLogs.reduce((acc, curr) => acc + curr.amount_ml, 0);
    if (currentTotal <= 0) {
      return false; // Total is already 0 ml, cannot subtract
    }

    let remainingToSubtract = Math.min(amount_ml, currentTotal);
    const logsToDelete: string[] = [];
    const logsToUpdate: { id: string; amount_ml: number }[] = [];

    for (const log of dateLogs) {
      if (remainingToSubtract <= 0) break;

      if (log.amount_ml <= remainingToSubtract) {
        remainingToSubtract -= log.amount_ml;
        logsToDelete.push(log.id);
      } else {
        const newAmount = log.amount_ml - remainingToSubtract;
        remainingToSubtract = 0;
        logsToUpdate.push({ id: log.id, amount_ml: newAmount });
      }
    }

    if (isSupabaseConfigured && supabase) {
      if (logsToDelete.length > 0) {
        await supabase.from('water_logs').delete().in('id', logsToDelete);
      }
      for (const updateItem of logsToUpdate) {
        await supabase
          .from('water_logs')
          .update({ amount_ml: updateItem.amount_ml })
          .eq('id', updateItem.id);
      }
    }

    const updated = current
      .filter((w) => !logsToDelete.includes(w.id))
      .map((w) => {
        const u = logsToUpdate.find((item) => item.id === w.id);
        return u ? { ...w, amount_ml: u.amount_ml } : w;
      });

    this.set('water_logs', updated);
    return true;
  }

  static async resetTodayWater(): Promise<void> {
    const todayStr = new Date().toISOString().split('T')[0];
    const current = await this.getWaterLogs();
    const updated = current.filter((w) => w.logged_at.split('T')[0] !== todayStr);
    this.set('water_logs', updated);
  }

  // Second Brain Notes
  static async getNotes(): Promise<SecondBrainNote[]> {
    if (isSupabaseConfigured && supabase) {
      const { data } = await supabase.from('second_brain_notes').select('*').order('created_at', { ascending: false });
      if (data && data.length > 0) return data as SecondBrainNote[];
    }
    return this.get('second_brain_notes', defaultNotes);
  }

  static async addNote(note: Omit<SecondBrainNote, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<SecondBrainNote> {
    const now = new Date().toISOString();
    const newNote: SecondBrainNote = {
      ...note,
      id: `note_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      user_id: DEMO_USER_ID,
      created_at: now,
      updated_at: now,
    };

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('second_brain_notes').insert(newNote).select().single();
      if (data && !error) return data as SecondBrainNote;
    }

    const current = await this.getNotes();
    const updated = [newNote, ...current];
    this.set('second_brain_notes', updated);
    return newNote;
  }

  static async deleteNote(id: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      await supabase.from('second_brain_notes').delete().eq('id', id);
    }
    const current = await this.getNotes();
    const updated = current.filter((n) => n.id !== id);
    this.set('second_brain_notes', updated);
  }

  // Contests & TAF Methods (Multi-Concurso)
  static async getContests(): Promise<Contest[]> {
    if (isSupabaseConfigured && supabase) {
      const { data } = await supabase.from('contests').select('*').order('created_at', { ascending: false });
      if (data && data.length > 0) return data as Contest[];
    }
    return this.get('contests', defaultContests);
  }

  static async addContest(contestInput: Partial<Contest> & { title: string }): Promise<Contest> {
    const nowIso = new Date().toISOString();
    const newContest: Contest = {
      id: contestInput.id || `c_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      user_id: DEMO_USER_ID,
      title: contestInput.title,
      institution: contestInput.institution || 'Banca Examinadora',
      target_date: contestInput.target_date || new Date(Date.now() + 90 * 86400 * 1000).toISOString().split('T')[0],
      is_active: contestInput.is_active ?? true,
      color_tag: contestInput.color_tag || '#3b82f6',
      created_at: nowIso,
    };

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('contests').insert(newContest).select().single();
      if (data && !error) return data as Contest;
    }

    const current = await this.getContests();
    // If set to active, deactivate others in local array
    const updated = newContest.is_active
      ? [newContest, ...current.map((c) => ({ ...c, is_active: false }))]
      : [newContest, ...current];

    this.set('contests', updated);
    return newContest;
  }

  static async setActiveContest(id: string): Promise<Contest[]> {
    const current = await this.getContests();
    const updated = current.map((c) => ({
      ...c,
      is_active: c.id === id,
    }));

    if (isSupabaseConfigured && supabase) {
      await supabase.from('contests').update({ is_active: false }).neq('id', id);
      await supabase.from('contests').update({ is_active: true }).eq('id', id);
    }

    this.set('contests', updated);
    return updated;
  }

  static async deleteContest(id: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      await supabase.from('contests').delete().eq('id', id);
    }
    const current = await this.getContests();
    const updated = current.filter((c) => c.id !== id);
    if (updated.length > 0 && !updated.some((c) => c.is_active)) {
      updated[0].is_active = true;
    }
    this.set('contests', updated);
  }

  static async getContestSubjects(contestId?: string): Promise<ContestSubject[]> {
    if (isSupabaseConfigured && supabase) {
      let query = supabase.from('contest_subjects').select('*').order('created_at', { ascending: true });
      if (contestId) query = query.eq('contest_id', contestId);
      const { data } = await query;
      if (data && data.length > 0) return data as ContestSubject[];
    }

    const all = this.get('contest_subjects', defaultContestSubjects);
    if (contestId) {
      return all.filter((s) => s.contest_id === contestId);
    }
    return all;
  }

  static async addContestSubject(
    input:
      | { contest_id?: string; subject_name: string; topic_name: string; contest_name?: string }
      | string,
    topicsArg?: string[]
  ): Promise<ContestSubject> {
    let contestId = typeof input === 'string' ? 'c1' : input.contest_id || 'c1';
    let subjectName = typeof input === 'string' ? 'Geral' : input.subject_name || 'Geral';
    let topicName = typeof input === 'string' ? input : input.topic_name || 'Tópico de Estudo';

    const nowIso = new Date().toISOString();
    const newSubject: ContestSubject = {
      id: `cs_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      user_id: DEMO_USER_ID,
      contest_id: contestId,
      subject_name: subjectName,
      topic_name: topicName,
      is_completed: false,
      reviews_count: 0,
      created_at: nowIso,
    };

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('contest_subjects').insert(newSubject).select().single();
      if (data && !error) return data as ContestSubject;
    }

    const current = await this.getContestSubjects();
    const updated = [...current, newSubject];
    this.set('contest_subjects', updated);
    return newSubject;
  }

  static async updateContestSubject(id: string, updates: Partial<ContestSubject>): Promise<ContestSubject> {
    const current = await this.getContestSubjects();
    const existing = current.find((s) => s.id === id);
    if (!existing) throw new Error('Contest subject not found');

    const updated: ContestSubject = { ...existing, ...updates };
    if (isSupabaseConfigured && supabase) {
      await supabase.from('contest_subjects').update(updates).eq('id', id);
    }

    const updatedList = current.map((s) => (s.id === id ? updated : s));
    this.set('contest_subjects', updatedList);
    return updated;
  }

  static async toggleContestSubject(id: string): Promise<void> {
    const current = await this.getContestSubjects();
    const target = current.find((s) => s.id === id);
    if (!target) return;

    const newCompleted = !target.is_completed;
    const newReviews = newCompleted ? (target.reviews_count || 0) + 1 : target.reviews_count || 0;

    if (isSupabaseConfigured && supabase) {
      await supabase
        .from('contest_subjects')
        .update({ is_completed: newCompleted, reviews_count: newReviews })
        .eq('id', id);
    }

    const updated = current.map((s) => (s.id === id ? { ...s, is_completed: newCompleted, reviews_count: newReviews } : s));
    this.set('contest_subjects', updated);
  }

  static async deleteContestSubject(id: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      await supabase.from('contest_subjects').delete().eq('id', id);
    }
    const current = await this.getContestSubjects();
    const updated = current.filter((s) => s.id !== id);
    this.set('contest_subjects', updated);
  }

  static async getStudySessions(contestId?: string): Promise<StudySession[]> {
    if (isSupabaseConfigured && supabase) {
      let query = supabase.from('study_sessions').select('*').order('created_at', { ascending: false });
      if (contestId) query = query.eq('contest_id', contestId);
      const { data } = await query;
      if (data && data.length > 0) return data as StudySession[];
    }

    const all = this.get('study_sessions', defaultStudySessions);
    if (contestId) {
      return all.filter((s) => s.contest_id === contestId);
    }
    return all;
  }

  static async addStudySession(sessionInput: any): Promise<StudySession> {
    const nowIso = new Date().toISOString();
    const duration = Number(sessionInput.minutes_studied || sessionInput.duration_minutes || 30);
    const subj = sessionInput.subject_name || sessionInput.subject || 'Geral';
    const contestId = sessionInput.contest_id || 'c1';

    const newSession: StudySession = {
      id: `ss_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      user_id: DEMO_USER_ID,
      contest_id: contestId,
      subject_id: sessionInput.subject_id || undefined,
      subject_name: subj,
      minutes_studied: duration,
      questions_solved: Number(sessionInput.questions_solved || 0),
      questions_correct: Number(sessionInput.questions_correct || 0),
      notes: sessionInput.notes || '',
      logged_at: sessionInput.logged_at || nowIso.split('T')[0],
      created_at: nowIso,
    };

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('study_sessions').insert(newSession).select().single();
      if (data && !error) return data as StudySession;
    }

    const current = await this.getStudySessions();
    const updated = [newSession, ...current];
    this.set('study_sessions', updated);
    return newSession;
  }

  static async getContestTafRequirements(contestId?: string): Promise<ContestTafRequirement[]> {
    if (isSupabaseConfigured && supabase) {
      let query = supabase.from('contest_taf_requirements').select('*').order('created_at', { ascending: true });
      if (contestId) query = query.eq('contest_id', contestId);
      const { data } = await query;
      if (data && data.length > 0) return data as ContestTafRequirement[];
    }

    const all = this.get('contest_taf_requirements', defaultContestTafRequirements);
    if (contestId) {
      return all.filter((r) => r.contest_id === contestId);
    }
    return all;
  }

  static async addContestTafRequirement(reqInput: any): Promise<ContestTafRequirement> {
    const nowIso = new Date().toISOString();
    const contestId = reqInput.contest_id || 'c1';
    const targetVal = Number(reqInput.target_value || reqInput.targetVal || 0);
    const bestVal = Number(reqInput.current_best || reqInput.currentBest || 0);
    const isPassed = bestVal >= targetVal && targetVal > 0;

    const newReq: ContestTafRequirement = {
      id: `tafr_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      user_id: DEMO_USER_ID,
      contest_id: contestId,
      modality: reqInput.modality,
      target_value: targetVal,
      unit: reqInput.unit || 'reps',
      current_best: bestVal,
      is_passed: isPassed,
      created_at: nowIso,
    };

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('contest_taf_requirements').insert(newReq).select().single();
      if (data && !error) return data as ContestTafRequirement;
    }

    const current = await this.getContestTafRequirements();
    const updated = [...current, newReq];
    this.set('contest_taf_requirements', updated);
    return newReq;
  }

  static async updateContestTafRequirement(id: string, reqData: Partial<ContestTafRequirement>): Promise<ContestTafRequirement> {
    const current = await this.getContestTafRequirements();
    const existing = current.find((r) => r.id === id);
    if (!existing) throw new Error('TAF Requirement not found');

    const updated: ContestTafRequirement = { ...existing, ...reqData };
    if (updated.target_value > 0) {
      updated.is_passed = updated.current_best >= updated.target_value;
    }

    if (isSupabaseConfigured && supabase) {
      await supabase.from('contest_taf_requirements').update(updated).eq('id', id);
    }

    const updatedList = current.map((r) => (r.id === id ? updated : r));
    this.set('contest_taf_requirements', updatedList);
    return updated;
  }

  static async deleteContestTafRequirement(id: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      await supabase.from('contest_taf_requirements').delete().eq('id', id);
    }
    const current = await this.getContestTafRequirements();
    const updated = current.filter((r) => r.id !== id);
    this.set('contest_taf_requirements', updated);
  }

  static async importContestFromGemini(
    parsedData: GeminiParseEditalResponse
  ): Promise<{ contest: Contest; subjectsCount: number; tafCount: number }> {
    // 1. Create Contest
    const newContest = await this.addContest({
      title: parsedData.contest_title || 'Novo Concurso Importado',
      institution: parsedData.institution || 'Banca Examinadora',
      target_date: parsedData.target_date || new Date(Date.now() + 90 * 86400 * 1000).toISOString().split('T')[0],
      is_active: true,
      color_tag: '#06b6d4',
    });

    await this.setActiveContest(newContest.id);

    // 2. Add Syllabus Subjects & Topics
    let subjectsCount = 0;
    if (parsedData.syllabus && parsedData.syllabus.length > 0) {
      for (const subj of parsedData.syllabus) {
        for (const topicStr of subj.topics) {
          await this.addContestSubject({
            contest_id: newContest.id,
            subject_name: subj.subject_name,
            topic_name: topicStr,
          });
          subjectsCount++;
        }
      }
    }

    // 3. Add TAF Requirements
    let tafCount = 0;
    if (parsedData.taf_requirements && parsedData.taf_requirements.length > 0) {
      for (const taf of parsedData.taf_requirements) {
        await this.addContestTafRequirement({
          contest_id: newContest.id,
          modality: taf.modality,
          target_value: Number(taf.target_value),
          unit: taf.unit,
          current_best: 0,
          is_passed: false,
        });
        tafCount++;
      }
    }

    return { contest: newContest, subjectsCount, tafCount };
  }

  static async getTafBenchmarks(): Promise<TafBenchmark[]> {
    return this.get('taf_benchmarks', defaultTafBenchmarks);
  }

  static async addTafBenchmark(benchInput: any): Promise<TafBenchmark> {
    const val = benchInput.score_value ?? benchInput.score ?? 0;
    const newBench: TafBenchmark = {
      id: `taf_${Date.now()}`,
      user_id: DEMO_USER_ID,
      modality: benchInput.modality,
      score: val,
      score_value: val,
      passed: Boolean(benchInput.passed),
      logged_at: new Date().toISOString(),
    };
    const current = await this.getTafBenchmarks();
    const updated = [newBench, ...current];
    this.set('taf_benchmarks', updated);
    return newBench;
  }

  // Physique Assessments (Gemini Vision IA)
  static async getPhysiqueAssessments(): Promise<PhysiqueAssessment[]> {
    if (isSupabaseConfigured && supabase) {
      const { data } = await supabase
        .from('physique_assessments')
        .select('*')
        .order('created_at', { ascending: false });
      if (data && data.length > 0) return data as PhysiqueAssessment[];
    }
    return this.get('physique_assessments', defaultPhysiqueAssessments);
  }

  static async addPhysiqueAssessment(
    assessmentInput: Omit<PhysiqueAssessment, 'id' | 'user_id' | 'created_at'>
  ): Promise<PhysiqueAssessment> {
    const nowIso = new Date().toISOString();
    const newAssessment: PhysiqueAssessment = {
      ...assessmentInput,
      id: `pa_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      user_id: DEMO_USER_ID,
      assessment_date: assessmentInput.assessment_date || nowIso.split('T')[0],
      created_at: nowIso,
    };

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('physique_assessments')
        .insert(newAssessment)
        .select()
        .single();
      if (data && !error) return data as PhysiqueAssessment;
    }

    const current = await this.getPhysiqueAssessments();
    const updated = [newAssessment, ...current];
    this.set('physique_assessments', updated);
    return newAssessment;
  }

  static async deletePhysiqueAssessment(id: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      await supabase.from('physique_assessments').delete().eq('id', id);
    }
    const current = await this.getPhysiqueAssessments();
    const updated = current.filter((pa) => pa.id !== id);
    this.set('physique_assessments', updated);
  }

  // ----------------------------------------------------
  // SIMULADOS, CADERNO DE ERROS & REVISÃO ESPAÇADA (SRS)
  // ----------------------------------------------------

  // 1. Motor de Simulados
  static async getMockExams(contestId?: string): Promise<MockExam[]> {
    if (isSupabaseConfigured && supabase) {
      let query = supabase.from('mock_exams').select('*, questions:mock_exam_questions(*)').order('created_at', { ascending: false });
      if (contestId) query = query.eq('contest_id', contestId);
      const { data } = await query;
      if (data && data.length > 0) return data as MockExam[];
    }

    const all = this.get('mock_exams', defaultMockExams);
    if (contestId) {
      return all.filter((m) => m.contest_id === contestId);
    }
    return all;
  }

  static async getMockExamById(id: string): Promise<MockExam | null> {
    const all = await this.getMockExams();
    return all.find((m) => m.id === id) || null;
  }

  static async createMockExam(
    examInput: Omit<MockExam, 'id' | 'user_id' | 'created_at' | 'status' | 'score_achieved' | 'percentage_score' | 'duration_taken_seconds'>,
    questionsInput: Omit<MockExamQuestion, 'id' | 'exam_id'>[]
  ): Promise<MockExam> {
    const nowIso = new Date().toISOString();
    const examId = `me_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;

    const questions: MockExamQuestion[] = questionsInput.map((q, idx) => ({
      ...q,
      id: `q_${Date.now()}_${idx}_${Math.random().toString(36).substr(2, 4)}`,
      exam_id: examId,
    }));

    const newExam: MockExam = {
      ...examInput,
      id: examId,
      user_id: DEMO_USER_ID,
      duration_taken_seconds: 0,
      score_achieved: 0,
      percentage_score: 0,
      status: 'in_progress',
      created_at: nowIso,
      questions,
    };

    if (isSupabaseConfigured && supabase) {
      const { data: insertedExam } = await supabase.from('mock_exams').insert({
        id: newExam.id,
        user_id: newExam.user_id,
        contest_id: newExam.contest_id,
        title: newExam.title,
        scoring_system: newExam.scoring_system,
        total_questions: questions.length,
        time_limit_minutes: newExam.time_limit_minutes,
        status: 'in_progress',
      }).select().single();

      if (insertedExam) {
        await supabase.from('mock_exam_questions').insert(questions);
      }
    }

    const current = await this.getMockExams();
    const updated = [newExam, ...current];
    this.set('mock_exams', updated);
    return newExam;
  }

  static async finishMockExam(
    examId: string,
    userAnswers: Record<string, string>,
    durationTakenSeconds: number,
    contestId: string
  ): Promise<MockExam> {
    const exam = await this.getMockExamById(examId);
    if (!exam) throw new Error('Simulado não encontrado');

    const questions = exam.questions || [];
    let score = 0;
    let correctCount = 0;

    const evaluatedQuestions = questions.map((q) => {
      const ans = userAnswers[q.id] || '';
      const isCorrect = ans.trim().toUpperCase() === q.correct_answer.trim().toUpperCase();

      if (ans) {
        if (isCorrect) {
          correctCount++;
          score += 1;
        } else {
          if (exam.scoring_system === 'cebraspe_penalty') {
            score -= 1; // Cebraspe rule: wrong answer deducts 1 point
          }
        }
      }

      return {
        ...q,
        user_answer: ans,
        is_correct: isCorrect,
      };
    });

    const totalQuestions = questions.length || 1;
    const percentage = Math.max(0, Math.round((score / totalQuestions) * 100));

    const updatedExam: MockExam = {
      ...exam,
      duration_taken_seconds: durationTakenSeconds,
      score_achieved: score,
      percentage_score: percentage,
      status: 'completed',
      questions: evaluatedQuestions,
    };

    if (isSupabaseConfigured && supabase) {
      await supabase.from('mock_exams').update({
        duration_taken_seconds: durationTakenSeconds,
        score_achieved: score,
        percentage_score: percentage,
        status: 'completed',
      }).eq('id', examId);

      for (const eq of evaluatedQuestions) {
        await supabase.from('mock_exam_questions').update({
          user_answer: eq.user_answer,
          is_correct: eq.is_correct,
        }).eq('id', eq.id);
      }
    }

    // Automatically add incorrect questions to Caderno de Erros
    for (const eq of evaluatedQuestions) {
      if (eq.user_answer && !eq.is_correct) {
        await this.addOrUpdateErrorNotebook({
          contest_id: contestId,
          question_id: eq.id,
          subject_name: eq.subject_name,
          topic_name: eq.topic_name,
          error_reason: 'Não sabia o conteúdo',
          ai_clarification: eq.explanation || `O gabarito correto é "${eq.correct_answer}". Sua resposta foi "${eq.user_answer}".`,
          is_mastered: false,
          question: eq,
        });
      }
    }

    const currentExams = await this.getMockExams();
    const updatedExamsList = currentExams.map((m) => (m.id === examId ? updatedExam : m));
    this.set('mock_exams', updatedExamsList);

    return updatedExam;
  }

  static async deleteMockExam(id: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      await supabase.from('mock_exams').delete().eq('id', id);
    }
    const current = await this.getMockExams();
    const updated = current.filter((m) => m.id !== id);
    this.set('mock_exams', updated);
  }

  // 2. Caderno de Erros Inteligente
  static async getErrorNotebook(contestId?: string): Promise<ErrorNotebookItem[]> {
    if (isSupabaseConfigured && supabase) {
      let query = supabase.from('error_notebook').select('*, question:mock_exam_questions(*)').order('created_at', { ascending: false });
      if (contestId) query = query.eq('contest_id', contestId);
      const { data } = await query;
      if (data && data.length > 0) return data as ErrorNotebookItem[];
    }

    const all = this.get('error_notebook', defaultErrorNotebook);
    if (contestId) {
      return all.filter((e) => e.contest_id === contestId);
    }
    return all;
  }

  static async addOrUpdateErrorNotebook(
    itemInput: Omit<ErrorNotebookItem, 'id' | 'user_id' | 'created_at'>
  ): Promise<ErrorNotebookItem> {
    const current = await this.getErrorNotebook();
    const existing = itemInput.question_id
      ? current.find((e) => e.question_id === itemInput.question_id)
      : null;

    if (existing) {
      const updatedItem: ErrorNotebookItem = {
        ...existing,
        ...itemInput,
      };
      if (isSupabaseConfigured && supabase) {
        await supabase.from('error_notebook').update(updatedItem).eq('id', existing.id);
      }
      const updatedList = current.map((e) => (e.id === existing.id ? updatedItem : e));
      this.set('error_notebook', updatedList);
      return updatedItem;
    } else {
      const nowIso = new Date().toISOString();
      const newItem: ErrorNotebookItem = {
        ...itemInput,
        id: `en_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        user_id: DEMO_USER_ID,
        created_at: nowIso,
      };
      if (isSupabaseConfigured && supabase) {
        await supabase.from('error_notebook').insert(newItem);
      }
      const updatedList = [newItem, ...current];
      this.set('error_notebook', updatedList);
      return newItem;
    }
  }

  static async updateErrorReason(errorId: string, errorReason: string): Promise<ErrorNotebookItem> {
    const current = await this.getErrorNotebook();
    const item = current.find((e) => e.id === errorId);
    if (!item) throw new Error('Item do Caderno de Erros não encontrado');

    const updated = { ...item, error_reason: errorReason };
    if (isSupabaseConfigured && supabase) {
      await supabase.from('error_notebook').update({ error_reason: errorReason }).eq('id', errorId);
    }

    const updatedList = current.map((e) => (e.id === errorId ? updated : e));
    this.set('error_notebook', updatedList);
    return updated;
  }

  static async updateErrorClarification(errorId: string, aiClarification: string): Promise<ErrorNotebookItem> {
    const current = await this.getErrorNotebook();
    const item = current.find((e) => e.id === errorId);
    if (!item) throw new Error('Item do Caderno de Erros não encontrado');

    const updated = { ...item, ai_clarification: aiClarification };
    if (isSupabaseConfigured && supabase) {
      await supabase.from('error_notebook').update({ ai_clarification: aiClarification }).eq('id', errorId);
    }

    const updatedList = current.map((e) => (e.id === errorId ? updated : e));
    this.set('error_notebook', updatedList);
    return updated;
  }

  static async markErrorAsMastered(errorId: string, isMastered: boolean): Promise<ErrorNotebookItem> {
    const current = await this.getErrorNotebook();
    const item = current.find((e) => e.id === errorId);
    if (!item) throw new Error('Item do Caderno de Erros não encontrado');

    const updated = { ...item, is_mastered: isMastered };
    if (isSupabaseConfigured && supabase) {
      await supabase.from('error_notebook').update({ is_mastered: isMastered }).eq('id', errorId);
    }

    const updatedList = current.map((e) => (e.id === errorId ? updated : e));
    this.set('error_notebook', updatedList);
    return updated;
  }

  static async deleteErrorNotebookItem(id: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      await supabase.from('error_notebook').delete().eq('id', id);
    }
    const current = await this.getErrorNotebook();
    const updated = current.filter((e) => e.id !== id);
    this.set('error_notebook', updated);
  }

  // 3. Sistema de Revisão Espaçada (Curva de Esquecimento / SRS)
  static async getScheduledReviews(contestId?: string): Promise<ScheduledReview[]> {
    if (isSupabaseConfigured && supabase) {
      const { data } = await supabase.from('scheduled_reviews').select('*, subject:contest_subjects(*)').order('scheduled_for', { ascending: true });
      if (data && data.length > 0) return data as ScheduledReview[];
    }

    const all = this.get('scheduled_reviews', defaultScheduledReviews);
    if (contestId) {
      const subjects = await this.getContestSubjects(contestId);
      const subjectIds = new Set(subjects.map((s) => s.id));
      return all.filter((r) => subjectIds.has(r.subject_id));
    }
    return all;
  }

  static async createScheduledReview(
    subjectId: string,
    reviewStage: number = 1,
    scheduledFor?: string,
    subjectName?: string,
    topicName?: string
  ): Promise<ScheduledReview> {
    const nowIso = new Date().toISOString();
    let targetDateStr = scheduledFor;

    if (!targetDateStr) {
      const daysToAdd = reviewStage === 1 ? 1 : reviewStage === 2 ? 7 : 30;
      targetDateStr = new Date(Date.now() + daysToAdd * 86400 * 1000).toISOString().split('T')[0];
    }

    const newReview: ScheduledReview = {
      id: `sr_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      user_id: DEMO_USER_ID,
      subject_id: subjectId,
      subject_name: subjectName,
      topic_name: topicName,
      review_stage: reviewStage,
      scheduled_for: targetDateStr,
      is_completed: false,
      created_at: nowIso,
    };

    if (isSupabaseConfigured && supabase) {
      await supabase.from('scheduled_reviews').insert({
        id: newReview.id,
        user_id: newReview.user_id,
        subject_id: newReview.subject_id,
        review_stage: newReview.review_stage,
        scheduled_for: newReview.scheduled_for,
        is_completed: false,
      });
    }

    const current = await this.getScheduledReviews();
    const updated = [...current, newReview];
    this.set('scheduled_reviews', updated);
    return newReview;
  }

  static async completeScheduledReview(reviewId: string): Promise<ScheduledReview> {
    const current = await this.getScheduledReviews();
    const existing = current.find((r) => r.id === reviewId);
    if (!existing) throw new Error('Revisão agendada não encontrada');

    // Advance Stage or Complete
    const currentStage = existing.review_stage;
    let nextStage = currentStage + 1;
    let isFullyCompleted = false;

    if (currentStage >= 3) {
      isFullyCompleted = true;
      nextStage = 3;
    }

    const daysToAdd = nextStage === 2 ? 7 : 30;
    const nextScheduledFor = new Date(Date.now() + daysToAdd * 86400 * 1000).toISOString().split('T')[0];

    const updated: ScheduledReview = {
      ...existing,
      review_stage: isFullyCompleted ? 3 : nextStage,
      scheduled_for: isFullyCompleted ? existing.scheduled_for : nextScheduledFor,
      is_completed: isFullyCompleted,
    };

    if (isSupabaseConfigured && supabase) {
      await supabase.from('scheduled_reviews').update({
        review_stage: updated.review_stage,
        scheduled_for: updated.scheduled_for,
        is_completed: updated.is_completed,
      }).eq('id', reviewId);
    }

    // Also increment reviews_count on contest_subjects
    if (existing.subject_id) {
      await this.incrementSubjectReviewCount(existing.subject_id);
    }

    const updatedList = current.map((r) => (r.id === reviewId ? updated : r));
    this.set('scheduled_reviews', updatedList);
    return updated;
  }

  static async incrementSubjectReviewCount(subjectId: string): Promise<void> {
    const allSubjects = await this.getContestSubjects();
    const subj = allSubjects.find((s) => s.id === subjectId);
    if (subj) {
      const updatedCount = (subj.reviews_count || 0) + 1;
      if (isSupabaseConfigured && supabase) {
        await supabase.from('contest_subjects').update({ reviews_count: updatedCount }).eq('id', subjectId);
      }
      const updatedSubjects = allSubjects.map((s) => (s.id === subjectId ? { ...s, reviews_count: updatedCount } : s));
      this.set('contest_subjects', updatedSubjects);
    }
  }
}

const defaultMockExams: MockExam[] = [];
const defaultErrorNotebook: ErrorNotebookItem[] = [];
const defaultScheduledReviews: ScheduledReview[] = [];


