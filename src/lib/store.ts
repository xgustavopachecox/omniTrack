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
  FinancialTransaction,
  FinancialGoal,
  FinancialGoalContribution,
  FinancialVisionPlan,
} from './types';
import { supabase, isSupabaseConfigured } from './supabase/client';
import { generateUUID } from './finance';
import { processXpGain, triggerGamificationEvent } from './gamification';

const DEMO_USER_ID = '00000000-0000-4000-8000-000000000000';

const defaultProfile: Profile = {
  id: DEMO_USER_ID,
  daily_calorie_target: 2500,
  daily_protein_target: 160,
  daily_carbs_target: 280,
  daily_fats_target: 70,
  daily_water_target: 3000,
  weekly_workout_target: 4,
  current_level: 1,
  current_xp: 0,
  rank_title: 'Iniciante / Recruta',
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
const defaultMockExams: MockExam[] = [];
const defaultErrorNotebook: ErrorNotebookItem[] = [];
const defaultScheduledReviews: ScheduledReview[] = [];
const defaultFinancialTransactions: FinancialTransaction[] = [];
const defaultFinancialGoals: FinancialGoal[] = [];
const defaultFinancialGoalContributions: FinancialGoalContribution[] = [];
const defaultFinancialVisionPlans: FinancialVisionPlan[] = [];

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

  private static async getAuthenticatedUserId(): Promise<string | null> {
    if (!isSupabaseConfigured || !supabase) return null;
    try {
      const { data } = await supabase.auth.getUser();
      return data?.user?.id || null;
    } catch {
      return null;
    }
  }

  // Profile
  static async getProfile(): Promise<Profile> {
    if (isSupabaseConfigured && supabase) {
      try {
        const authUserId = await this.getAuthenticatedUserId();
        if (authUserId) {
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', authUserId)
            .maybeSingle();

          if (!error && data) {
            const prof = data as Profile;
            this.set('profile', prof);
            return prof;
          }

          if (!error && !data) {
            const initialProf: Profile = {
              ...defaultProfile,
              id: authUserId,
              created_at: new Date().toISOString(),
            };
            await supabase.from('profiles').upsert(initialProf);
            this.set('profile', initialProf);
            return initialProf;
          }
        }
      } catch (err) {
        console.error('Erro ao buscar profile no Supabase:', err);
      }
    }
    return this.get('profile', defaultProfile);
  }

  static async updateProfile(profile: Partial<Profile>): Promise<Profile> {
    const current = await this.getProfile();
    const authUserId = await this.getAuthenticatedUserId();
    const updated: Profile = {
      ...current,
      ...profile,
      id: authUserId || current.id || DEMO_USER_ID,
    };
    if (isSupabaseConfigured && supabase && authUserId) {
      await supabase.from('profiles').upsert(updated);
    }
    this.set('profile', updated);
    return updated;
  }

  static async addXp(amount: number, reason: string = 'Atividade Concluída'): Promise<Profile> {
    const current = await this.getProfile();
    const { updatedProfile, reward } = processXpGain(current, amount, reason);
    const saved = await this.updateProfile(updatedProfile);
    triggerGamificationEvent(reward);
    return saved;
  }

  // Nutrition
  static async getNutritionLogs(): Promise<NutritionLog[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('nutrition_logs')
          .select('*')
          .order('logged_at', { ascending: false });
        if (!error && data) {
          this.set('nutrition_logs', data as NutritionLog[]);
          return data as NutritionLog[];
        }
      } catch (err) {
        console.error('Erro ao buscar nutrition_logs:', err);
      }
    }
    return this.get('nutrition_logs', defaultNutritionLogs);
  }

  static async addNutritionLog(
    log: Omit<NutritionLog, 'id' | 'user_id' | 'logged_at'>
  ): Promise<NutritionLog> {
    const nowIso = new Date().toISOString();
    const authUserId = await this.getAuthenticatedUserId();
    const newLog: NutritionLog = {
      ...log,
      id: generateUUID(),
      user_id: authUserId || DEMO_USER_ID,
      meal_type: log.meal_type || 'Refeição',
      log_date: log.log_date || nowIso.split('T')[0],
      logged_at: nowIso,
    };

    if (isSupabaseConfigured && supabase && authUserId) {
      const { data, error } = await supabase
        .from('nutrition_logs')
        .insert(newLog)
        .select()
        .single();
      if (data && !error) {
        const current = this.get('nutrition_logs', defaultNutritionLogs);
        this.set('nutrition_logs', [data as NutritionLog, ...current]);
        return data as NutritionLog;
      }
    }

    const current = await this.getNutritionLogs();
    const updated = [newLog, ...current];
    this.set('nutrition_logs', updated);
    return newLog;
  }

  static async updateNutritionLog(
    id: string,
    logData: Partial<NutritionLog>
  ): Promise<NutritionLog> {
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
    const current = this.get('nutrition_logs', defaultNutritionLogs);
    const updated = current.filter((l) => l.id !== id);
    this.set('nutrition_logs', updated);
  }

  // Workout Sessions & PRs
  static async getWorkoutSessions(): Promise<WorkoutSession[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: sessionsData, error } = await supabase
          .from('workout_sessions')
          .select('*, exercises:workout_session_exercises(*)')
          .order('created_at', { ascending: false });
        if (!error && sessionsData) {
          this.set('workout_sessions', sessionsData as WorkoutSession[]);
          return sessionsData as WorkoutSession[];
        }
      } catch (err) {
        console.error('Erro ao buscar workout_sessions:', err);
      }
    }
    return this.get('workout_sessions', defaultSessions);
  }

  static async getUserPRs(): Promise<UserPR[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('user_prs')
          .select('*')
          .order('weight_kg', { ascending: false });
        if (!error && data) {
          this.set('user_prs', data as UserPR[]);
          return data as UserPR[];
        }
      } catch (err) {
        console.error('Erro ao buscar user_prs:', err);
      }
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
    const sessionId = generateUUID();
    const authUserId = await this.getAuthenticatedUserId();

    const exercisesFormatted: WorkoutSessionExercise[] =
      sessionInput.exercises.map((ex) => ({
        ...ex,
        id: generateUUID(),
        session_id: sessionId,
        created_at: now,
      }));

    const newSession: WorkoutSession = {
      id: sessionId,
      user_id: authUserId || DEMO_USER_ID,
      title: sessionInput.title,
      session_date: sDate,
      total_session_volume_kg: sessionInput.total_session_volume_kg,
      coach_feedback: sessionInput.coach_feedback,
      raw_input: sessionInput.raw_input,
      created_at: now,
      exercises: exercisesFormatted,
    };

    if (isSupabaseConfigured && supabase && authUserId) {
      const { error: sessErr } = await supabase.from('workout_sessions').insert({
        id: newSession.id,
        user_id: authUserId,
        title: newSession.title,
        session_date: newSession.session_date,
        total_session_volume_kg: newSession.total_session_volume_kg,
        coach_feedback: newSession.coach_feedback,
        raw_input: newSession.raw_input,
        created_at: newSession.created_at,
      });

      if (!sessErr && exercisesFormatted.length > 0) {
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
        await supabase
          .from('workout_session_exercises')
          .insert(exercisesToInsert);
      }
    }

    const currentSessions = this.get('workout_sessions', defaultSessions);
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
    const authUserId = await this.getAuthenticatedUserId();
    const exercisesFormatted: WorkoutSessionExercise[] =
      sessionInput.exercises.map((ex) => ({
        ...ex,
        id: generateUUID(),
        session_id: sessionId,
        created_at: now,
      }));

    const currentSessions = await this.getWorkoutSessions();
    const oldSession = currentSessions.find((s) => s.id === sessionId);

    const updatedSession: WorkoutSession = {
      id: sessionId,
      user_id: authUserId || oldSession?.user_id || DEMO_USER_ID,
      title: sessionInput.title,
      session_date: sessionInput.session_date,
      total_session_volume_kg: sessionInput.total_session_volume_kg,
      coach_feedback: sessionInput.coach_feedback || oldSession?.coach_feedback,
      raw_input: oldSession?.raw_input,
      created_at: oldSession?.created_at || now,
      exercises: exercisesFormatted,
    };

    if (isSupabaseConfigured && supabase) {
      await Promise.all([
        supabase
          .from('workout_sessions')
          .update({
            title: updatedSession.title,
            session_date: updatedSession.session_date,
            total_session_volume_kg: updatedSession.total_session_volume_kg,
            coach_feedback: updatedSession.coach_feedback,
          })
          .eq('id', sessionId),
        supabase
          .from('workout_session_exercises')
          .delete()
          .eq('session_id', sessionId),
      ]);

      if (exercisesFormatted.length > 0) {
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
        await supabase
          .from('workout_session_exercises')
          .insert(exercisesToInsert);
      }
    }

    const updatedList = currentSessions.map((s) =>
      s.id === sessionId ? updatedSession : s
    );
    this.set('workout_sessions', updatedList);

    await this.updatePRsFromSession(updatedSession);
    return updatedSession;
  }

  static async deleteWorkoutSession(id: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      await supabase.from('workout_sessions').delete().eq('id', id);
    }
    const currentSessions = this.get('workout_sessions', defaultSessions);
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
    const authUserId = await this.getAuthenticatedUserId();
    const newPR: UserPR = {
      id: generateUUID(),
      user_id: authUserId || DEMO_USER_ID,
      exercise_name: prInput.exercise_name,
      muscle_group: prInput.muscle_group,
      weight_kg: prInput.weight_kg,
      reps: prInput.reps,
      achieved_at: prInput.achieved_at,
      created_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured && supabase && authUserId) {
      await supabase
        .from('user_prs')
        .upsert(newPR, { onConflict: 'user_id, exercise_name' });
    }

    const currentPRs = await this.getUserPRs();
    const existingIndex = currentPRs.findIndex(
      (p) =>
        p.exercise_name.toLowerCase() === prInput.exercise_name.toLowerCase()
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
    const currentPRs = this.get('user_prs', defaultPRs);
    const updated = currentPRs.filter((p) => p.id !== id);
    this.set('user_prs', updated);
  }

  private static async updatePRsFromSession(
    session: WorkoutSession
  ): Promise<void> {
    if (!session.exercises || session.exercises.length === 0) return;

    const currentPRs = await this.getUserPRs();
    const updatedPRs = [...currentPRs];
    const authUserId = await this.getAuthenticatedUserId();
    const recordsToUpsert: UserPR[] = [];

    for (const ex of session.exercises) {
      const bestWeight = ex.best_weight_kg;
      const bestSet =
        ex.sets.find((s) => s.total_weight_kg === bestWeight) ||
        ex.sets[ex.sets.length - 1];
      const repsAchieved = bestSet ? bestSet.reps : 1;

      const existingPrIndex = updatedPRs.findIndex(
        (p) =>
          p.exercise_name.toLowerCase() === ex.exercise_name.toLowerCase()
      );

      if (existingPrIndex >= 0) {
        const existingPR = updatedPRs[existingPrIndex];
        if (bestWeight > existingPR.weight_kg) {
          const newPRRecord: UserPR = {
            id: existingPR.id,
            user_id: authUserId || existingPR.user_id || DEMO_USER_ID,
            exercise_name: ex.exercise_name,
            muscle_group: ex.muscle_group,
            weight_kg: bestWeight,
            reps: repsAchieved,
            achieved_at: session.session_date,
            workout_session_id: session.id,
            created_at: new Date().toISOString(),
          };
          updatedPRs[existingPrIndex] = newPRRecord;
          recordsToUpsert.push(newPRRecord);
        }
      } else {
        const newPRRecord: UserPR = {
          id: generateUUID(),
          user_id: authUserId || DEMO_USER_ID,
          exercise_name: ex.exercise_name,
          muscle_group: ex.muscle_group,
          weight_kg: bestWeight,
          reps: repsAchieved,
          achieved_at: session.session_date,
          workout_session_id: session.id,
          created_at: new Date().toISOString(),
        };
        updatedPRs.push(newPRRecord);
        recordsToUpsert.push(newPRRecord);
      }
    }

    if (
      isSupabaseConfigured &&
      supabase &&
      authUserId &&
      recordsToUpsert.length > 0
    ) {
      await supabase
        .from('user_prs')
        .upsert(recordsToUpsert, { onConflict: 'user_id, exercise_name' });
    }

    this.set('user_prs', updatedPRs);
  }

  // Body Metrics
  static async getBodyMetrics(): Promise<BodyMetric[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('body_metrics')
          .select('*')
          .order('logged_at', { ascending: true });
        if (!error && data) {
          this.set('body_metrics', data as BodyMetric[]);
          return data as BodyMetric[];
        }
      } catch (err) {
        console.error('Erro ao buscar body_metrics:', err);
      }
    }
    return this.get('body_metrics', defaultBodyMetrics);
  }

  static async addBodyMetric(
    metric: Omit<BodyMetric, 'id' | 'user_id' | 'logged_at'>
  ): Promise<BodyMetric> {
    const authUserId = await this.getAuthenticatedUserId();
    const newMetric: BodyMetric = {
      ...metric,
      id: generateUUID(),
      user_id: authUserId || DEMO_USER_ID,
      logged_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured && supabase && authUserId) {
      const { data, error } = await supabase
        .from('body_metrics')
        .insert(newMetric)
        .select()
        .single();
      if (data && !error) {
        const current = this.get('body_metrics', defaultBodyMetrics);
        this.set('body_metrics', [...current, data as BodyMetric]);
        return data as BodyMetric;
      }
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
    const current = this.get('body_metrics', defaultBodyMetrics);
    const updated = current.filter((b) => b.id !== id);
    this.set('body_metrics', updated);
  }

  // Water Logs
  static async getWaterLogs(): Promise<WaterLog[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('water_logs')
          .select('*')
          .order('logged_at', { ascending: false });
        if (!error && data) {
          this.set('water_logs', data as WaterLog[]);
          return data as WaterLog[];
        }
      } catch (err) {
        console.error('Erro ao buscar water_logs:', err);
      }
    }
    return this.get('water_logs', defaultWaterLogs);
  }

  static async addWaterLog(
    amount_ml: number,
    targetDate?: string
  ): Promise<WaterLog> {
    const todayStr = new Date().toISOString().split('T')[0];
    const logged_at =
      targetDate && targetDate !== todayStr
        ? `${targetDate}T12:00:00.000Z`
        : new Date().toISOString();
    const authUserId = await this.getAuthenticatedUserId();

    const newLog: WaterLog = {
      id: generateUUID(),
      user_id: authUserId || DEMO_USER_ID,
      amount_ml,
      logged_at,
    };

    if (isSupabaseConfigured && supabase && authUserId) {
      const { data, error } = await supabase
        .from('water_logs')
        .insert(newLog)
        .select()
        .single();
      if (data && !error) {
        const current = this.get('water_logs', defaultWaterLogs);
        this.set('water_logs', [data as WaterLog, ...current]);
        return data as WaterLog;
      }
    }

    const current = await this.getWaterLogs();
    const updated = [newLog, ...current];
    this.set('water_logs', updated);
    return newLog;
  }

  static async subtractWaterLog(
    amount_ml: number,
    targetDate?: string
  ): Promise<boolean> {
    const dateStr = targetDate || new Date().toISOString().split('T')[0];
    const current = await this.getWaterLogs();

    const dateLogs = current
      .filter((w) => w.logged_at.split('T')[0] === dateStr)
      .sort(
        (a, b) =>
          new Date(b.logged_at).getTime() - new Date(a.logged_at).getTime()
      );

    const currentTotal = dateLogs.reduce((acc, curr) => acc + curr.amount_ml, 0);
    if (currentTotal <= 0) {
      return false;
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
      const ops: PromiseLike<any>[] = [];
      if (logsToDelete.length > 0) {
        ops.push(supabase.from('water_logs').delete().in('id', logsToDelete));
      }
      for (const updateItem of logsToUpdate) {
        ops.push(
          supabase
            .from('water_logs')
            .update({ amount_ml: updateItem.amount_ml })
            .eq('id', updateItem.id)
        );
      }
      if (ops.length > 0) {
        await Promise.all(ops);
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
    const updated = current.filter(
      (w) => w.logged_at.split('T')[0] !== todayStr
    );
    this.set('water_logs', updated);
  }

  // Second Brain Notes
  static async getNotes(): Promise<SecondBrainNote[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('second_brain_notes')
          .select('*')
          .order('created_at', { ascending: false });
        if (!error && data) {
          this.set('second_brain_notes', data as SecondBrainNote[]);
          return data as SecondBrainNote[];
        }
      } catch (err) {
        console.error('Erro ao buscar second_brain_notes:', err);
      }
    }
    return this.get('second_brain_notes', defaultNotes);
  }

  static async addNote(
    note: Omit<SecondBrainNote, 'id' | 'user_id' | 'created_at' | 'updated_at'>
  ): Promise<SecondBrainNote> {
    const now = new Date().toISOString();
    const authUserId = await this.getAuthenticatedUserId();
    const newNote: SecondBrainNote = {
      ...note,
      id: generateUUID(),
      user_id: authUserId || DEMO_USER_ID,
      created_at: now,
      updated_at: now,
    };

    if (isSupabaseConfigured && supabase && authUserId) {
      const { data, error } = await supabase
        .from('second_brain_notes')
        .insert(newNote)
        .select()
        .single();
      if (data && !error) {
        const current = this.get('second_brain_notes', defaultNotes);
        this.set('second_brain_notes', [data as SecondBrainNote, ...current]);
        return data as SecondBrainNote;
      }
    }

    const current = await this.getNotes();
    const updated = [newNote, ...current];
    this.set('second_brain_notes', updated);
    return newNote;
  }

  static async updateNote(
    id: string,
    updates: Partial<
      Omit<SecondBrainNote, 'id' | 'user_id' | 'created_at' | 'updated_at'>
    >
  ): Promise<SecondBrainNote> {
    const current = await this.getNotes();
    const existing = current.find((n) => n.id === id);
    if (!existing) throw new Error('Nota não encontrada');

    const now = new Date().toISOString();
    const updatedNote: SecondBrainNote = {
      ...existing,
      ...updates,
      updated_at: now,
    };

    if (isSupabaseConfigured && supabase) {
      await supabase
        .from('second_brain_notes')
        .update({
          title: updatedNote.title,
          category: updatedNote.category,
          content: updatedNote.content,
          tags: updatedNote.tags,
          updated_at: updatedNote.updated_at,
        })
        .eq('id', id);
    }

    const updatedList = current.map((n) => (n.id === id ? updatedNote : n));
    this.set('second_brain_notes', updatedList);
    return updatedNote;
  }

  static async deleteNote(id: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      await supabase.from('second_brain_notes').delete().eq('id', id);
    }
    const current = this.get('second_brain_notes', defaultNotes);
    const updated = current.filter((n) => n.id !== id);
    this.set('second_brain_notes', updated);
  }

  // Contests & TAF Methods (Multi-Concurso)
  static async getContests(): Promise<Contest[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('contests')
          .select('*')
          .order('created_at', { ascending: false });
        if (!error && data) {
          this.set('contests', data as Contest[]);
          return data as Contest[];
        }
      } catch (err) {
        console.error('Erro ao buscar contests:', err);
      }
    }
    return this.get('contests', defaultContests);
  }

  static async addContest(
    contestInput: Partial<Contest> & { title: string }
  ): Promise<Contest> {
    const nowIso = new Date().toISOString();
    const authUserId = await this.getAuthenticatedUserId();
    const newContest: Contest = {
      id: contestInput.id || generateUUID(),
      user_id: authUserId || DEMO_USER_ID,
      title: contestInput.title,
      institution: contestInput.institution || 'Banca Examinadora',
      target_date:
        contestInput.target_date ||
        new Date(Date.now() + 90 * 86400 * 1000).toISOString().split('T')[0],
      is_active: contestInput.is_active ?? true,
      color_tag: contestInput.color_tag || '#3b82f6',
      created_at: nowIso,
    };

    if (isSupabaseConfigured && supabase && authUserId) {
      const { data, error } = await supabase
        .from('contests')
        .insert(newContest)
        .select()
        .single();
      if (data && !error) {
        const current = this.get('contests', defaultContests);
        const updatedList = newContest.is_active
          ? [data as Contest, ...current.map((c) => ({ ...c, is_active: false }))]
          : [data as Contest, ...current];
        this.set('contests', updatedList);
        return data as Contest;
      }
    }

    const current = await this.getContests();
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
      await Promise.all([
        supabase.from('contests').update({ is_active: false }).neq('id', id),
        supabase.from('contests').update({ is_active: true }).eq('id', id),
      ]);
    }

    this.set('contests', updated);
    return updated;
  }

  static async deleteContest(id: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      await supabase.from('contests').delete().eq('id', id);
    }
    const current = this.get('contests', defaultContests);
    const updated = current.filter((c) => c.id !== id);
    if (updated.length > 0 && !updated.some((c) => c.is_active)) {
      updated[0].is_active = true;
    }
    this.set('contests', updated);
  }

  static async getContestSubjects(
    contestId?: string
  ): Promise<ContestSubject[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        let query = supabase
          .from('contest_subjects')
          .select('*')
          .order('created_at', { ascending: true });
        if (contestId) query = query.eq('contest_id', contestId);
        const { data, error } = await query;
        if (!error && data) {
          if (!contestId) {
            this.set('contest_subjects', data as ContestSubject[]);
          }
          return data as ContestSubject[];
        }
      } catch (err) {
        console.error('Erro ao buscar contest_subjects:', err);
      }
    }

    const all = this.get('contest_subjects', defaultContestSubjects);
    if (contestId) {
      return all.filter((s) => s.contest_id === contestId);
    }
    return all;
  }

  static async addContestSubject(
    input:
      | {
          contest_id?: string;
          subject_name: string;
          topic_name: string;
          contest_name?: string;
        }
      | string
  ): Promise<ContestSubject> {
    const contestId =
      typeof input === 'string' ? '' : input.contest_id || '';
    const subjectName =
      typeof input === 'string' ? 'Geral' : input.subject_name || 'Geral';
    const topicName =
      typeof input === 'string' ? input : input.topic_name || 'Tópico de Estudo';

    const nowIso = new Date().toISOString();
    const authUserId = await this.getAuthenticatedUserId();
    const newSubject: ContestSubject = {
      id: generateUUID(),
      user_id: authUserId || DEMO_USER_ID,
      contest_id: contestId,
      subject_name: subjectName,
      topic_name: topicName,
      is_completed: false,
      reviews_count: 0,
      created_at: nowIso,
    };

    if (isSupabaseConfigured && supabase && authUserId) {
      const { data, error } = await supabase
        .from('contest_subjects')
        .insert(newSubject)
        .select()
        .single();
      if (data && !error) {
        const current = this.get('contest_subjects', defaultContestSubjects);
        this.set('contest_subjects', [...current, data as ContestSubject]);
        return data as ContestSubject;
      }
    }

    const current = this.get('contest_subjects', defaultContestSubjects);
    const updated = [...current, newSubject];
    this.set('contest_subjects', updated);
    return newSubject;
  }

  static async updateContestSubject(
    id: string,
    updates: Partial<ContestSubject>
  ): Promise<ContestSubject> {
    const current = this.get('contest_subjects', defaultContestSubjects);
    const existing = current.find((s) => s.id === id);

    if (isSupabaseConfigured && supabase) {
      await supabase.from('contest_subjects').update(updates).eq('id', id);
    }

    if (!existing) {
      return {
        id,
        contest_id: '',
        subject_name: '',
        topic_name: '',
        is_completed: Boolean(updates.is_completed),
        ...updates,
      };
    }

    const updated: ContestSubject = { ...existing, ...updates };
    const updatedList = current.map((s) => (s.id === id ? updated : s));
    this.set('contest_subjects', updatedList);
    return updated;
  }

  static async toggleContestSubject(id: string): Promise<void> {
    const current = await this.getContestSubjects();
    const target = current.find((s) => s.id === id);
    if (!target) return;

    const newCompleted = !target.is_completed;
    const newReviews = newCompleted
      ? (target.reviews_count || 0) + 1
      : target.reviews_count || 0;

    if (isSupabaseConfigured && supabase) {
      await supabase
        .from('contest_subjects')
        .update({ is_completed: newCompleted, reviews_count: newReviews })
        .eq('id', id);
    }

    const updated = current.map((s) =>
      s.id === id
        ? { ...s, is_completed: newCompleted, reviews_count: newReviews }
        : s
    );
    this.set('contest_subjects', updated);
  }

  static async deleteContestSubject(id: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      await supabase.from('contest_subjects').delete().eq('id', id);
    }
    const current = this.get('contest_subjects', defaultContestSubjects);
    const updated = current.filter((s) => s.id !== id);
    this.set('contest_subjects', updated);
  }

  static async getStudySessions(contestId?: string): Promise<StudySession[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        let query = supabase
          .from('study_sessions')
          .select('*')
          .order('created_at', { ascending: false });
        if (contestId) query = query.eq('contest_id', contestId);
        const { data, error } = await query;
        if (!error && data) {
          if (!contestId) {
            this.set('study_sessions', data as StudySession[]);
          }
          return data as StudySession[];
        }
      } catch (err) {
        console.error('Erro ao buscar study_sessions:', err);
      }
    }

    const all = this.get('study_sessions', defaultStudySessions);
    if (contestId) {
      return all.filter((s) => s.contest_id === contestId);
    }
    return all;
  }

  static async addStudySession(sessionInput: any): Promise<StudySession> {
    const nowIso = new Date().toISOString();
    const duration = Number(
      sessionInput.minutes_studied || sessionInput.duration_minutes || 30
    );
    const subj = sessionInput.subject_name || sessionInput.subject || 'Geral';
    const contestId = sessionInput.contest_id || '';
    const authUserId = await this.getAuthenticatedUserId();

    const newSession: StudySession = {
      id: generateUUID(),
      user_id: authUserId || DEMO_USER_ID,
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

    if (isSupabaseConfigured && supabase && authUserId) {
      const { data, error } = await supabase
        .from('study_sessions')
        .insert(newSession)
        .select()
        .single();
      if (data && !error) {
        const current = this.get('study_sessions', defaultStudySessions);
        this.set('study_sessions', [data as StudySession, ...current]);
        return data as StudySession;
      }
    }

    const current = this.get('study_sessions', defaultStudySessions);
    const updated = [newSession, ...current];
    this.set('study_sessions', updated);
    return newSession;
  }

  static async getContestTafRequirements(
    contestId?: string
  ): Promise<ContestTafRequirement[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        let query = supabase
          .from('contest_taf_requirements')
          .select('*')
          .order('created_at', { ascending: true });
        if (contestId) query = query.eq('contest_id', contestId);
        const { data, error } = await query;
        if (!error && data) {
          if (!contestId) {
            this.set(
              'contest_taf_requirements',
              data as ContestTafRequirement[]
            );
          }
          return data as ContestTafRequirement[];
        }
      } catch (err) {
        console.error('Erro ao buscar contest_taf_requirements:', err);
      }
    }

    const all = this.get(
      'contest_taf_requirements',
      defaultContestTafRequirements
    );
    if (contestId) {
      return all.filter((r) => r.contest_id === contestId);
    }
    return all;
  }

  static async addContestTafRequirement(
    reqInput: any
  ): Promise<ContestTafRequirement> {
    const nowIso = new Date().toISOString();
    const contestId = reqInput.contest_id || '';
    const targetVal = Number(reqInput.target_value || reqInput.targetVal || 0);
    const bestVal = Number(reqInput.current_best || reqInput.currentBest || 0);
    const isPassed = bestVal >= targetVal && targetVal > 0;
    const authUserId = await this.getAuthenticatedUserId();

    const newReq: ContestTafRequirement = {
      id: generateUUID(),
      user_id: authUserId || DEMO_USER_ID,
      contest_id: contestId,
      modality: reqInput.modality,
      target_value: targetVal,
      unit: reqInput.unit || 'reps',
      current_best: bestVal,
      is_passed: isPassed,
      created_at: nowIso,
    };

    if (isSupabaseConfigured && supabase && authUserId) {
      const { data, error } = await supabase
        .from('contest_taf_requirements')
        .insert(newReq)
        .select()
        .single();
      if (data && !error) {
        const current = this.get(
          'contest_taf_requirements',
          defaultContestTafRequirements
        );
        this.set('contest_taf_requirements', [
          ...current,
          data as ContestTafRequirement,
        ]);
        return data as ContestTafRequirement;
      }
    }

    const current = this.get(
      'contest_taf_requirements',
      defaultContestTafRequirements
    );
    const updated = [...current, newReq];
    this.set('contest_taf_requirements', updated);
    return newReq;
  }

  static async updateContestTafRequirement(
    id: string,
    reqData: Partial<ContestTafRequirement>
  ): Promise<ContestTafRequirement> {
    const current = await this.getContestTafRequirements();
    const existing = current.find((r) => r.id === id);
    if (!existing) throw new Error('TAF Requirement not found');

    const updated: ContestTafRequirement = { ...existing, ...reqData };
    if (updated.target_value > 0) {
      updated.is_passed = updated.current_best >= updated.target_value;
    }

    if (isSupabaseConfigured && supabase) {
      await supabase
        .from('contest_taf_requirements')
        .update({
          modality: updated.modality,
          target_value: updated.target_value,
          unit: updated.unit,
          current_best: updated.current_best,
          is_passed: updated.is_passed,
        })
        .eq('id', id);
    }

    const updatedList = current.map((r) => (r.id === id ? updated : r));
    this.set('contest_taf_requirements', updatedList);
    return updated;
  }

  static async deleteContestTafRequirement(id: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      await supabase.from('contest_taf_requirements').delete().eq('id', id);
    }
    const current = this.get(
      'contest_taf_requirements',
      defaultContestTafRequirements
    );
    const updated = current.filter((r) => r.id !== id);
    this.set('contest_taf_requirements', updated);
  }

  static async importContestFromGemini(
    parsedData: GeminiParseEditalResponse
  ): Promise<{ contest: Contest; subjectsCount: number; tafCount: number }> {
    const newContest = await this.addContest({
      title: parsedData.contest_title || 'Novo Concurso Importado',
      institution: parsedData.institution || 'Banca Examinadora',
      target_date:
        parsedData.target_date ||
        new Date(Date.now() + 90 * 86400 * 1000).toISOString().split('T')[0],
      is_active: true,
      color_tag: '#06b6d4',
    });

    await this.setActiveContest(newContest.id);

    const subjectPromises: Promise<ContestSubject>[] = [];
    if (parsedData.syllabus && parsedData.syllabus.length > 0) {
      for (const subj of parsedData.syllabus) {
        for (const topicStr of subj.topics) {
          subjectPromises.push(
            this.addContestSubject({
              contest_id: newContest.id,
              subject_name: subj.subject_name,
              topic_name: topicStr,
            })
          );
        }
      }
    }

    const tafPromises: Promise<ContestTafRequirement>[] = [];
    if (parsedData.taf_requirements && parsedData.taf_requirements.length > 0) {
      for (const taf of parsedData.taf_requirements) {
        tafPromises.push(
          this.addContestTafRequirement({
            contest_id: newContest.id,
            modality: taf.modality,
            target_value: Number(taf.target_value),
            unit: taf.unit,
            current_best: 0,
            is_passed: false,
          })
        );
      }
    }

    await Promise.all([...subjectPromises, ...tafPromises]);

    return {
      contest: newContest,
      subjectsCount: subjectPromises.length,
      tafCount: tafPromises.length,
    };
  }

  static async getTafBenchmarks(): Promise<TafBenchmark[]> {
    return this.get('taf_benchmarks', defaultTafBenchmarks);
  }

  static async addTafBenchmark(benchInput: any): Promise<TafBenchmark> {
    const val = benchInput.score_value ?? benchInput.score ?? 0;
    const authUserId = await this.getAuthenticatedUserId();
    const newBench: TafBenchmark = {
      id: generateUUID(),
      user_id: authUserId || DEMO_USER_ID,
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
      try {
        const { data, error } = await supabase
          .from('physique_assessments')
          .select('*')
          .order('created_at', { ascending: false });
        if (!error && data) {
          this.set('physique_assessments', data as PhysiqueAssessment[]);
          return data as PhysiqueAssessment[];
        }
      } catch (err) {
        console.error('Erro ao buscar physique_assessments:', err);
      }
    }
    return this.get('physique_assessments', defaultPhysiqueAssessments);
  }

  static async addPhysiqueAssessment(
    assessmentInput: Omit<PhysiqueAssessment, 'id' | 'user_id' | 'created_at'>
  ): Promise<PhysiqueAssessment> {
    const nowIso = new Date().toISOString();
    const authUserId = await this.getAuthenticatedUserId();
    const newAssessment: PhysiqueAssessment = {
      ...assessmentInput,
      id: generateUUID(),
      user_id: authUserId || DEMO_USER_ID,
      assessment_date: assessmentInput.assessment_date || nowIso.split('T')[0],
      created_at: nowIso,
    };

    if (isSupabaseConfigured && supabase && authUserId) {
      const { data, error } = await supabase
        .from('physique_assessments')
        .insert(newAssessment)
        .select()
        .single();
      if (data && !error) {
        const current = this.get(
          'physique_assessments',
          defaultPhysiqueAssessments
        );
        this.set('physique_assessments', [
          data as PhysiqueAssessment,
          ...current,
        ]);
        return data as PhysiqueAssessment;
      }
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
    const current = this.get(
      'physique_assessments',
      defaultPhysiqueAssessments
    );
    const updated = current.filter((pa) => pa.id !== id);
    this.set('physique_assessments', updated);
  }

  // ----------------------------------------------------
  // SIMULADOS, CADERNO DE ERROS & REVISÃO ESPAÇADA (SRS)
  // ----------------------------------------------------

  static async getMockExams(contestId?: string): Promise<MockExam[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        let query = supabase
          .from('mock_exams')
          .select('*, questions:mock_exam_questions(*)')
          .order('created_at', { ascending: false });
        if (contestId) query = query.eq('contest_id', contestId);
        const { data, error } = await query;
        if (!error && data) {
          if (!contestId) {
            this.set('mock_exams', data as MockExam[]);
          }
          return data as MockExam[];
        }
      } catch (err) {
        console.error('Erro ao buscar mock_exams:', err);
      }
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
    examInput: Omit<
      MockExam,
      | 'id'
      | 'user_id'
      | 'created_at'
      | 'status'
      | 'score_achieved'
      | 'percentage_score'
      | 'duration_taken_seconds'
    >,
    questionsInput: Omit<MockExamQuestion, 'id' | 'exam_id'>[]
  ): Promise<MockExam> {
    const nowIso = new Date().toISOString();
    const examId = generateUUID();
    const authUserId = await this.getAuthenticatedUserId();

    const questions: MockExamQuestion[] = questionsInput.map((q) => ({
      ...q,
      id: generateUUID(),
      exam_id: examId,
    }));

    const newExam: MockExam = {
      ...examInput,
      id: examId,
      user_id: authUserId || DEMO_USER_ID,
      duration_taken_seconds: 0,
      score_achieved: 0,
      percentage_score: 0,
      status: 'in_progress',
      created_at: nowIso,
      questions,
    };

    if (isSupabaseConfigured && supabase && authUserId) {
      const { data: insertedExam } = await supabase
        .from('mock_exams')
        .insert({
          id: newExam.id,
          user_id: authUserId,
          contest_id: newExam.contest_id,
          title: newExam.title,
          scoring_system: newExam.scoring_system,
          total_questions: questions.length,
          time_limit_minutes: newExam.time_limit_minutes,
          status: 'in_progress',
        })
        .select()
        .single();

      if (insertedExam && questions.length > 0) {
        await supabase.from('mock_exam_questions').insert(questions);
      }
    }

    const current = this.get('mock_exams', defaultMockExams);
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

    const evaluatedQuestions = questions.map((q) => {
      const ans = userAnswers[q.id] || '';
      const isCorrect =
        ans.trim().toUpperCase() === q.correct_answer.trim().toUpperCase();

      if (ans) {
        if (isCorrect) {
          score += 1;
        } else if (exam.scoring_system === 'cebraspe_penalty') {
          score -= 1;
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
      const sb = supabase;
      await Promise.all([
        sb
          .from('mock_exams')
          .update({
            duration_taken_seconds: durationTakenSeconds,
            score_achieved: score,
            percentage_score: percentage,
            status: 'completed',
          })
          .eq('id', examId),
        ...evaluatedQuestions.map((eq) =>
          sb
            .from('mock_exam_questions')
            .update({
              user_answer: eq.user_answer,
              is_correct: eq.is_correct,
            })
            .eq('id', eq.id)
        ),
      ]);
    }

    const wrongQuestions = evaluatedQuestions.filter(
      (eq) => eq.user_answer && !eq.is_correct
    );
    if (wrongQuestions.length > 0) {
      await Promise.all(
        wrongQuestions.map((eq) =>
          this.addOrUpdateErrorNotebook({
            contest_id: contestId,
            question_id: eq.id,
            subject_name: eq.subject_name,
            topic_name: eq.topic_name,
            error_reason: 'Não sabia o conteúdo',
            ai_clarification:
              eq.explanation ||
              `O gabarito correto é "${eq.correct_answer}". Sua resposta foi "${eq.user_answer}".`,
            is_mastered: false,
            question: eq,
          })
        )
      );
    }

    const currentExams = this.get('mock_exams', defaultMockExams);
    const updatedExamsList = currentExams.map((m) =>
      m.id === examId ? updatedExam : m
    );
    this.set('mock_exams', updatedExamsList);

    return updatedExam;
  }

  static async deleteMockExam(id: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      await supabase.from('mock_exams').delete().eq('id', id);
    }
    const current = this.get('mock_exams', defaultMockExams);
    const updated = current.filter((m) => m.id !== id);
    this.set('mock_exams', updated);
  }

  // 2. Caderno de Erros Inteligente
  static async getErrorNotebook(
    contestId?: string
  ): Promise<ErrorNotebookItem[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        let query = supabase
          .from('error_notebook')
          .select('*, question:mock_exam_questions(*)')
          .order('created_at', { ascending: false });
        if (contestId) query = query.eq('contest_id', contestId);
        const { data, error } = await query;
        if (!error && data) {
          if (!contestId) {
            this.set('error_notebook', data as ErrorNotebookItem[]);
          }
          return data as ErrorNotebookItem[];
        }
      } catch (err) {
        console.error('Erro ao buscar error_notebook:', err);
      }
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
        await supabase
          .from('error_notebook')
          .update({
            contest_id: updatedItem.contest_id,
            question_id: updatedItem.question_id,
            subject_name: updatedItem.subject_name,
            topic_name: updatedItem.topic_name,
            error_reason: updatedItem.error_reason,
            ai_clarification: updatedItem.ai_clarification,
            is_mastered: updatedItem.is_mastered,
          })
          .eq('id', existing.id);
      }
      const updatedList = current.map((e) =>
        e.id === existing.id ? updatedItem : e
      );
      this.set('error_notebook', updatedList);
      return updatedItem;
    } else {
      const nowIso = new Date().toISOString();
      const authUserId = await this.getAuthenticatedUserId();
      const newItem: ErrorNotebookItem = {
        ...itemInput,
        id: generateUUID(),
        user_id: authUserId || DEMO_USER_ID,
        created_at: nowIso,
      };
      if (isSupabaseConfigured && supabase && authUserId) {
        await supabase.from('error_notebook').insert({
          id: newItem.id,
          user_id: authUserId,
          contest_id: newItem.contest_id,
          question_id: newItem.question_id,
          subject_name: newItem.subject_name,
          topic_name: newItem.topic_name,
          error_reason: newItem.error_reason,
          ai_clarification: newItem.ai_clarification,
          is_mastered: newItem.is_mastered,
          created_at: newItem.created_at,
        });
      }
      const updatedList = [newItem, ...current];
      this.set('error_notebook', updatedList);
      return newItem;
    }
  }

  static async updateErrorReason(
    errorId: string,
    errorReason: string
  ): Promise<ErrorNotebookItem> {
    const current = await this.getErrorNotebook();
    const item = current.find((e) => e.id === errorId);
    if (!item) throw new Error('Item do Caderno de Erros não encontrado');

    const updated = { ...item, error_reason: errorReason };
    if (isSupabaseConfigured && supabase) {
      await supabase
        .from('error_notebook')
        .update({ error_reason: errorReason })
        .eq('id', errorId);
    }

    const updatedList = current.map((e) => (e.id === errorId ? updated : e));
    this.set('error_notebook', updatedList);
    return updated;
  }

  static async updateErrorClarification(
    errorId: string,
    aiClarification: string
  ): Promise<ErrorNotebookItem> {
    const current = await this.getErrorNotebook();
    const item = current.find((e) => e.id === errorId);
    if (!item) throw new Error('Item do Caderno de Erros não encontrado');

    const updated = { ...item, ai_clarification: aiClarification };
    if (isSupabaseConfigured && supabase) {
      await supabase
        .from('error_notebook')
        .update({ ai_clarification: aiClarification })
        .eq('id', errorId);
    }

    const updatedList = current.map((e) => (e.id === errorId ? updated : e));
    this.set('error_notebook', updatedList);
    return updated;
  }

  static async markErrorAsMastered(
    errorId: string,
    isMastered: boolean
  ): Promise<ErrorNotebookItem> {
    const current = await this.getErrorNotebook();
    const item = current.find((e) => e.id === errorId);
    if (!item) throw new Error('Item do Caderno de Erros não encontrado');

    const updated = { ...item, is_mastered: isMastered };
    if (isSupabaseConfigured && supabase) {
      await supabase
        .from('error_notebook')
        .update({ is_mastered: isMastered })
        .eq('id', errorId);
    }

    const updatedList = current.map((e) => (e.id === errorId ? updated : e));
    this.set('error_notebook', updatedList);
    return updated;
  }

  static async deleteErrorNotebookItem(id: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      await supabase.from('error_notebook').delete().eq('id', id);
    }
    const current = this.get('error_notebook', defaultErrorNotebook);
    const updated = current.filter((e) => e.id !== id);
    this.set('error_notebook', updated);
  }

  // 3. Sistema de Revisão Espaçada (Curva de Esquecimento / SRS)
  static async getScheduledReviews(
    contestId?: string
  ): Promise<ScheduledReview[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('scheduled_reviews')
          .select('*, subject:contest_subjects(*)')
          .order('scheduled_for', { ascending: true });
        if (!error && data) {
          const normalized = data.map((row: any) => ({
            ...row,
            subject_name: row.subject_name || row.subject?.subject_name,
            topic_name: row.topic_name || row.subject?.topic_name,
          })) as ScheduledReview[];

          if (contestId) {
            return normalized.filter(
              (r: any) => !r.subject || r.subject.contest_id === contestId
            );
          }
          this.set('scheduled_reviews', normalized);
          return normalized;
        }
      } catch (err) {
        console.error('Erro ao buscar scheduled_reviews:', err);
      }
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
      targetDateStr = new Date(Date.now() + daysToAdd * 86400 * 1000)
        .toISOString()
        .split('T')[0];
    }

    const authUserId = await this.getAuthenticatedUserId();
    const newReview: ScheduledReview = {
      id: generateUUID(),
      user_id: authUserId || DEMO_USER_ID,
      subject_id: subjectId,
      subject_name: subjectName,
      topic_name: topicName,
      review_stage: reviewStage,
      scheduled_for: targetDateStr,
      is_completed: false,
      created_at: nowIso,
    };

    if (isSupabaseConfigured && supabase && authUserId) {
      await supabase.from('scheduled_reviews').insert({
        id: newReview.id,
        user_id: authUserId,
        subject_id: newReview.subject_id,
        review_stage: newReview.review_stage,
        scheduled_for: newReview.scheduled_for,
        is_completed: false,
      });
    }

    const current = this.get('scheduled_reviews', defaultScheduledReviews);
    const updated = [...current, newReview];
    this.set('scheduled_reviews', updated);
    return newReview;
  }

  static async completeScheduledReview(
    reviewId: string
  ): Promise<ScheduledReview> {
    const current = await this.getScheduledReviews();
    const existing = current.find((r) => r.id === reviewId);
    if (!existing) throw new Error('Revisão agendada não encontrada');

    const currentStage = existing.review_stage;
    let nextStage = currentStage + 1;
    let isFullyCompleted = false;

    if (currentStage >= 3) {
      isFullyCompleted = true;
      nextStage = 3;
    }

    const daysToAdd = nextStage === 2 ? 7 : 30;
    const nextScheduledFor = new Date(Date.now() + daysToAdd * 86400 * 1000)
      .toISOString()
      .split('T')[0];

    const updated: ScheduledReview = {
      ...existing,
      review_stage: isFullyCompleted ? 3 : nextStage,
      scheduled_for: isFullyCompleted
        ? existing.scheduled_for
        : nextScheduledFor,
      is_completed: isFullyCompleted,
    };

    if (isSupabaseConfigured && supabase) {
      await supabase
        .from('scheduled_reviews')
        .update({
          review_stage: updated.review_stage,
          scheduled_for: updated.scheduled_for,
          is_completed: updated.is_completed,
        })
        .eq('id', reviewId);
    }

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
        await supabase
          .from('contest_subjects')
          .update({ reviews_count: updatedCount })
          .eq('id', subjectId);
      }
      const updatedSubjects = allSubjects.map((s) =>
        s.id === subjectId ? { ...s, reviews_count: updatedCount } : s
      );
      this.set('contest_subjects', updatedSubjects);
    }
  }

  // ----------------------------------------------------
  // MÓDULO FINANCEIRO (SUPABASE + FALLBACK LOCAL ZERADO)
  // ----------------------------------------------------

  // 1. Transações Financeiras (financial_transactions)
  static async getFinancialTransactions(): Promise<FinancialTransaction[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('financial_transactions')
          .select('*')
          .order('transaction_date', { ascending: false })
          .order('created_at', { ascending: false });

        if (!error && data) {
          const normalized = data.map((item) => ({
            ...item,
            amount: Number(item.amount || 0),
            is_recurring: Boolean(item.is_recurring),
          })) as FinancialTransaction[];
          this.set('financial_transactions', normalized);
          return normalized;
        }
      } catch (err) {
        console.error('Erro ao buscar financial_transactions no Supabase:', err);
      }
    }
    return this.get<FinancialTransaction[]>(
      'financial_transactions',
      defaultFinancialTransactions
    );
  }

  static async addFinancialTransaction(
    input: Omit<FinancialTransaction, 'id' | 'user_id' | 'created_at'>
  ): Promise<FinancialTransaction> {
    const nowIso = new Date().toISOString();
    const authUserId = await this.getAuthenticatedUserId();

    const newTx: FinancialTransaction = {
      id: generateUUID(),
      user_id: authUserId || DEMO_USER_ID,
      type: input.type,
      amount: Number(input.amount || 0),
      description: input.description.trim(),
      category: input.category,
      place: input.place ? input.place.trim() : null,
      payment_method: input.payment_method || 'Pix',
      transaction_date: input.transaction_date || nowIso.split('T')[0],
      is_recurring: Boolean(input.is_recurring),
      notes: input.notes ? input.notes.trim() : null,
      created_at: nowIso,
    };

    if (isSupabaseConfigured && supabase && authUserId) {
      const payload = {
        id: newTx.id,
        user_id: authUserId,
        type: newTx.type,
        amount: newTx.amount,
        description: newTx.description,
        category: newTx.category,
        place: newTx.place,
        payment_method: newTx.payment_method,
        transaction_date: newTx.transaction_date,
        is_recurring: newTx.is_recurring,
        notes: newTx.notes,
        created_at: newTx.created_at,
      };
      const { data, error } = await supabase
        .from('financial_transactions')
        .insert(payload)
        .select()
        .single();

      if (!error && data) {
        const saved: FinancialTransaction = {
          ...data,
          amount: Number(data.amount || 0),
          is_recurring: Boolean(data.is_recurring),
        };
        const current = this.get<FinancialTransaction[]>(
          'financial_transactions',
          defaultFinancialTransactions
        );
        this.set('financial_transactions', [saved, ...current]);
        return saved;
      }
    }

    const current = await this.getFinancialTransactions();
    const updated = [newTx, ...current].sort((a, b) =>
      b.transaction_date.localeCompare(a.transaction_date)
    );
    this.set('financial_transactions', updated);
    return newTx;
  }

  static async updateFinancialTransaction(
    id: string,
    updates: Partial<
      Omit<FinancialTransaction, 'id' | 'user_id' | 'created_at'>
    >
  ): Promise<FinancialTransaction> {
    const current = await this.getFinancialTransactions();
    const existing = current.find((t) => t.id === id);
    if (!existing) throw new Error('Movimentação não encontrada.');

    const updatedTx: FinancialTransaction = {
      ...existing,
      ...updates,
      amount:
        updates.amount !== undefined ? Number(updates.amount) : existing.amount,
      description:
        updates.description !== undefined
          ? updates.description.trim()
          : existing.description,
      place:
        updates.place !== undefined
          ? updates.place
            ? updates.place.trim()
            : null
          : existing.place,
      notes:
        updates.notes !== undefined
          ? updates.notes
            ? updates.notes.trim()
            : null
          : existing.notes,
    };

    if (isSupabaseConfigured && supabase) {
      await supabase
        .from('financial_transactions')
        .update({
          type: updatedTx.type,
          amount: updatedTx.amount,
          description: updatedTx.description,
          category: updatedTx.category,
          place: updatedTx.place,
          payment_method: updatedTx.payment_method,
          transaction_date: updatedTx.transaction_date,
          is_recurring: updatedTx.is_recurring,
          notes: updatedTx.notes,
        })
        .eq('id', id);
    }

    const updatedList = current
      .map((t) => (t.id === id ? updatedTx : t))
      .sort((a, b) => b.transaction_date.localeCompare(a.transaction_date));
    this.set('financial_transactions', updatedList);
    return updatedTx;
  }

  static async deleteFinancialTransaction(id: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      await supabase.from('financial_transactions').delete().eq('id', id);
    }
    const current = this.get<FinancialTransaction[]>(
      'financial_transactions',
      defaultFinancialTransactions
    );
    const updated = current.filter((t) => t.id !== id);
    this.set('financial_transactions', updated);
  }

  // 2. Cofrinhos / Metas (financial_goals)
  static async getFinancialGoals(): Promise<FinancialGoal[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('financial_goals')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && data) {
          const normalized = data.map((g) => ({
            ...g,
            target_amount: Number(g.target_amount || 0),
            current_amount: Number(g.current_amount || 0),
          })) as FinancialGoal[];
          this.set('financial_goals', normalized);
          return normalized;
        }
      } catch (err) {
        console.error('Erro ao buscar financial_goals no Supabase:', err);
      }
    }
    return this.get<FinancialGoal[]>('financial_goals', defaultFinancialGoals);
  }

  static async addFinancialGoal(
    input: Omit<FinancialGoal, 'id' | 'user_id' | 'created_at'>
  ): Promise<FinancialGoal> {
    const nowIso = new Date().toISOString();
    const authUserId = await this.getAuthenticatedUserId();

    const newGoal: FinancialGoal = {
      id: generateUUID(),
      user_id: authUserId || DEMO_USER_ID,
      name: input.name.trim(),
      target_amount: Number(input.target_amount || 0),
      current_amount: Number(input.current_amount || 0),
      deadline: input.deadline || null,
      category: input.category || 'Reserva de Emergência',
      color: input.color || '#06b6d4',
      notes: input.notes ? input.notes.trim() : null,
      created_at: nowIso,
    };

    if (isSupabaseConfigured && supabase && authUserId) {
      const payload = {
        id: newGoal.id,
        user_id: authUserId,
        name: newGoal.name,
        target_amount: newGoal.target_amount,
        current_amount: newGoal.current_amount,
        deadline: newGoal.deadline,
        category: newGoal.category,
        color: newGoal.color,
        notes: newGoal.notes,
        created_at: newGoal.created_at,
      };
      const { data, error } = await supabase
        .from('financial_goals')
        .insert(payload)
        .select()
        .single();

      if (!error && data) {
        const saved: FinancialGoal = {
          ...data,
          target_amount: Number(data.target_amount || 0),
          current_amount: Number(data.current_amount || 0),
        };
        const current = this.get<FinancialGoal[]>(
          'financial_goals',
          defaultFinancialGoals
        );
        this.set('financial_goals', [saved, ...current]);
        return saved;
      }
    }

    const current = await this.getFinancialGoals();
    const updated = [newGoal, ...current];
    this.set('financial_goals', updated);
    return newGoal;
  }

  static async updateFinancialGoal(
    id: string,
    updates: Partial<Omit<FinancialGoal, 'id' | 'user_id' | 'created_at'>>
  ): Promise<FinancialGoal> {
    const current = await this.getFinancialGoals();
    const existing = current.find((g) => g.id === id);
    if (!existing) throw new Error('Cofrinho não encontrado.');

    const updatedGoal: FinancialGoal = {
      ...existing,
      ...updates,
      name: updates.name !== undefined ? updates.name.trim() : existing.name,
      target_amount:
        updates.target_amount !== undefined
          ? Number(updates.target_amount)
          : existing.target_amount,
      current_amount:
        updates.current_amount !== undefined
          ? Number(updates.current_amount)
          : existing.current_amount,
      deadline:
        updates.deadline !== undefined
          ? updates.deadline || null
          : existing.deadline,
      notes:
        updates.notes !== undefined
          ? updates.notes
            ? updates.notes.trim()
            : null
          : existing.notes,
    };

    if (isSupabaseConfigured && supabase) {
      await supabase
        .from('financial_goals')
        .update({
          name: updatedGoal.name,
          target_amount: updatedGoal.target_amount,
          current_amount: updatedGoal.current_amount,
          deadline: updatedGoal.deadline,
          category: updatedGoal.category,
          color: updatedGoal.color,
          notes: updatedGoal.notes,
        })
        .eq('id', id);
    }

    const updatedList = current.map((g) => (g.id === id ? updatedGoal : g));
    this.set('financial_goals', updatedList);
    return updatedGoal;
  }

  static async deleteFinancialGoal(id: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      await supabase.from('financial_goals').delete().eq('id', id);
    }
    const currentGoals = this.get<FinancialGoal[]>(
      'financial_goals',
      defaultFinancialGoals
    );
    this.set(
      'financial_goals',
      currentGoals.filter((g) => g.id !== id)
    );

    const currentContribs = this.get<FinancialGoalContribution[]>(
      'financial_goal_contributions',
      defaultFinancialGoalContributions
    );
    this.set(
      'financial_goal_contributions',
      currentContribs.filter((c) => c.goal_id !== id)
    );
  }

  // 3. Histórico de Aportes e Resgates (financial_goal_contributions)
  static async getFinancialGoalContributions(
    goalId?: string
  ): Promise<FinancialGoalContribution[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        let query = supabase
          .from('financial_goal_contributions')
          .select('*')
          .order('contribution_date', { ascending: false })
          .order('created_at', { ascending: false });

        if (goalId) {
          query = query.eq('goal_id', goalId);
        }

        const { data, error } = await query;
        if (!error && data) {
          const normalized = data.map((c) => ({
            ...c,
            amount: Number(c.amount || 0),
          })) as FinancialGoalContribution[];

          if (!goalId) {
            this.set('financial_goal_contributions', normalized);
          }
          return normalized;
        }
      } catch (err) {
        console.error(
          'Erro ao buscar financial_goal_contributions no Supabase:',
          err
        );
      }
    }

    const all = this.get<FinancialGoalContribution[]>(
      'financial_goal_contributions',
      defaultFinancialGoalContributions
    );
    return goalId ? all.filter((c) => c.goal_id === goalId) : all;
  }

  static async addFinancialGoalContribution(input: {
    goal_id: string;
    type: 'deposit' | 'withdraw';
    amount: number;
    contribution_date?: string;
    notes?: string | null;
  }): Promise<{
    contribution: FinancialGoalContribution;
    updatedGoal: FinancialGoal;
  }> {
    const nowIso = new Date().toISOString();
    const authUserId = await this.getAuthenticatedUserId();
    const numericAmount = Math.abs(Number(input.amount || 0));

    if (numericAmount <= 0) {
      throw new Error('O valor deve ser maior que zero.');
    }

    const goals = await this.getFinancialGoals();
    const targetGoal = goals.find((g) => g.id === input.goal_id);
    if (!targetGoal) {
      throw new Error('Cofrinho não encontrado.');
    }

    const delta = input.type === 'deposit' ? numericAmount : -numericAmount;
    const newCurrentAmount = Math.max(
      0,
      Number((targetGoal.current_amount + delta).toFixed(2))
    );

    const newContribution: FinancialGoalContribution = {
      id: generateUUID(),
      user_id: authUserId || DEMO_USER_ID,
      goal_id: input.goal_id,
      type: input.type,
      amount: numericAmount,
      contribution_date: input.contribution_date || nowIso.split('T')[0],
      notes: input.notes ? input.notes.trim() : null,
      created_at: nowIso,
    };

    if (isSupabaseConfigured && supabase && authUserId) {
      await supabase.from('financial_goal_contributions').insert({
        id: newContribution.id,
        user_id: authUserId,
        goal_id: newContribution.goal_id,
        type: newContribution.type,
        amount: newContribution.amount,
        contribution_date: newContribution.contribution_date,
        notes: newContribution.notes,
        created_at: newContribution.created_at,
      });
    }

    const allContribs = this.get<FinancialGoalContribution[]>(
      'financial_goal_contributions',
      defaultFinancialGoalContributions
    );
    this.set('financial_goal_contributions', [newContribution, ...allContribs]);

    const updatedGoal = await this.updateFinancialGoal(input.goal_id, {
      current_amount: newCurrentAmount,
    });

    return { contribution: newContribution, updatedGoal };
  }

  static async deleteFinancialGoalContribution(
    contributionId: string
  ): Promise<void> {
    const allContribs = await this.getFinancialGoalContributions();
    const target = allContribs.find((c) => c.id === contributionId);

    if (isSupabaseConfigured && supabase) {
      await supabase
        .from('financial_goal_contributions')
        .delete()
        .eq('id', contributionId);
    }

    if (target) {
      const goals = await this.getFinancialGoals();
      const goal = goals.find((g) => g.id === target.goal_id);
      if (goal) {
        const reverseDelta =
          target.type === 'deposit' ? -target.amount : target.amount;
        const recalculated = Math.max(
          0,
          Number((goal.current_amount + reverseDelta).toFixed(2))
        );
        await this.updateFinancialGoal(goal.id, {
          current_amount: recalculated,
        });
      }
    }

    this.set(
      'financial_goal_contributions',
      allContribs.filter((c) => c.id !== contributionId)
    );
  }

  // 4. Visão de Futuro & Planejamento (financial_vision_plans)
  static async getFinancialVisionPlans(): Promise<FinancialVisionPlan[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('financial_vision_plans')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && data) {
          const normalized = data.map((p) => ({
            ...p,
            target_year: p.target_year ? Number(p.target_year) : null,
            target_amount:
              p.target_amount !== null && p.target_amount !== undefined
                ? Number(p.target_amount)
                : null,
          })) as FinancialVisionPlan[];
          this.set('financial_vision_plans', normalized);
          return normalized;
        }
      } catch (err) {
        console.error('Erro ao buscar financial_vision_plans no Supabase:', err);
      }
    }
    return this.get<FinancialVisionPlan[]>(
      'financial_vision_plans',
      defaultFinancialVisionPlans
    );
  }

  static async addFinancialVisionPlan(
    input: Omit<
      FinancialVisionPlan,
      'id' | 'user_id' | 'created_at' | 'updated_at'
    >
  ): Promise<FinancialVisionPlan> {
    const nowIso = new Date().toISOString();
    const authUserId = await this.getAuthenticatedUserId();

    const newPlan: FinancialVisionPlan = {
      id: generateUUID(),
      user_id: authUserId || DEMO_USER_ID,
      title: input.title.trim(),
      horizon: input.horizon,
      target_year: input.target_year ? Number(input.target_year) : null,
      target_amount:
        input.target_amount !== null &&
        input.target_amount !== undefined &&
        input.target_amount > 0
          ? Number(input.target_amount)
          : null,
      content: input.content.trim(),
      status: input.status || 'planning',
      updated_at: nowIso,
      created_at: nowIso,
    };

    if (isSupabaseConfigured && supabase && authUserId) {
      const payload = {
        id: newPlan.id,
        user_id: authUserId,
        title: newPlan.title,
        horizon: newPlan.horizon,
        target_year: newPlan.target_year,
        target_amount: newPlan.target_amount,
        content: newPlan.content,
        status: newPlan.status,
        updated_at: newPlan.updated_at,
        created_at: newPlan.created_at,
      };
      const { data, error } = await supabase
        .from('financial_vision_plans')
        .insert(payload)
        .select()
        .single();

      if (!error && data) {
        const saved: FinancialVisionPlan = {
          ...data,
          target_year: data.target_year ? Number(data.target_year) : null,
          target_amount:
            data.target_amount !== null && data.target_amount !== undefined
              ? Number(data.target_amount)
              : null,
        };
        const current = this.get<FinancialVisionPlan[]>(
          'financial_vision_plans',
          defaultFinancialVisionPlans
        );
        this.set('financial_vision_plans', [saved, ...current]);
        return saved;
      }
    }

    const current = await this.getFinancialVisionPlans();
    const updated = [newPlan, ...current];
    this.set('financial_vision_plans', updated);
    return newPlan;
  }

  static async updateFinancialVisionPlan(
    id: string,
    updates: Partial<Omit<FinancialVisionPlan, 'id' | 'user_id' | 'created_at'>>
  ): Promise<FinancialVisionPlan> {
    const current = await this.getFinancialVisionPlans();
    const existing = current.find((p) => p.id === id);
    if (!existing) throw new Error('Plano de visão não encontrado.');

    const nowIso = new Date().toISOString();
    const updatedPlan: FinancialVisionPlan = {
      ...existing,
      ...updates,
      title:
        updates.title !== undefined ? updates.title.trim() : existing.title,
      content:
        updates.content !== undefined
          ? updates.content.trim()
          : existing.content,
      target_year:
        updates.target_year !== undefined
          ? updates.target_year
            ? Number(updates.target_year)
            : null
          : existing.target_year,
      target_amount:
        updates.target_amount !== undefined
          ? updates.target_amount && Number(updates.target_amount) > 0
            ? Number(updates.target_amount)
            : null
          : existing.target_amount,
      updated_at: nowIso,
    };

    if (isSupabaseConfigured && supabase) {
      await supabase
        .from('financial_vision_plans')
        .update({
          title: updatedPlan.title,
          horizon: updatedPlan.horizon,
          target_year: updatedPlan.target_year,
          target_amount: updatedPlan.target_amount,
          content: updatedPlan.content,
          status: updatedPlan.status,
          updated_at: updatedPlan.updated_at,
        })
        .eq('id', id);
    }

    const updatedList = current.map((p) => (p.id === id ? updatedPlan : p));
    this.set('financial_vision_plans', updatedList);
    return updatedPlan;
  }

  static async deleteFinancialVisionPlan(id: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      await supabase.from('financial_vision_plans').delete().eq('id', id);
    }
    const current = this.get<FinancialVisionPlan[]>(
      'financial_vision_plans',
      defaultFinancialVisionPlans
    );
    this.set(
      'financial_vision_plans',
      current.filter((p) => p.id !== id)
    );
  }
}
