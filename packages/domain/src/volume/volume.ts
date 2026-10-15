import { workingSets } from '../progression/math';
import { MUSCLES, muscleRecord, type Muscle } from '../training/muscles';
import { normalizeProfile, MAX_TRAINING_DAYS, type TrainingProfile } from '../training/profile';
import type { SetLog } from '../types';

/** Series semanales objetivo por músculo. */
export type WeeklyVolume = Record<Muscle, number>;

/**
 * Volumen del principiante según los días disponibles (§5.2): alto a propósito, igual para todos
 * los músculos y nunca más de 18.
 */
export function beginnerWeeklySets(days: number): number {
  if (!Number.isInteger(days) || days < 1 || days > MAX_TRAINING_DAYS) {
    throw new Error(`los días tienen que ser entre 1 y ${MAX_TRAINING_DAYS}`);
  }
  if (days <= 2) return 12;
  if (days === 3) return 14;
  if (days === 4) return 16;
  return 18;
}

/**
 * Punto de partida del volumen semanal.
 * - Principiante: la tabla de `beginnerWeeklySets`.
 * - Intermedio/avanzado: no se impone nada; se parte del volumen con el que dice manejarse.
 */
export function initialVolume(profile: TrainingProfile): WeeklyVolume {
  const p = normalizeProfile(profile);
  if (p.level === 'beginner') return muscleRecord(beginnerWeeklySets(p.trainingDays.length));

  const reported = p.reportedVolume ?? {};
  const missing = MUSCLES.filter((m) => reported[m] === undefined);
  if (missing.length > 0) throw new Error(`falta el volumen de: ${missing.join(', ')}`);

  const volume = muscleRecord(0);
  for (const m of MUSCLES) {
    const sets = reported[m]!;
    if (!Number.isInteger(sets) || sets < 0) throw new Error(`volumen inválido para ${m}`);
    volume[m] = sets;
  }
  return volume;
}

/** Lo que se hizo de un ejercicio en una sesión, con el músculo al que cuenta. */
export interface MuscleWork {
  performedAt: Date;
  targetMuscle: Muscle;
  sets: SetLog[];
}

/**
 * Series efectivas por músculo en [from, to) (§5.1). Solo cuenta el músculo objetivo de cada
 * ejercicio (no el volumen indirecto) y no cuentan los calentamientos. Las series con RIR alto
 * cuentan igual.
 */
export function weeklySetsByMuscle(work: MuscleWork[], from: Date, to: Date): WeeklyVolume {
  const volume = muscleRecord(0);
  for (const w of work) {
    if (w.performedAt < from || w.performedAt >= to) continue;
    volume[w.targetMuscle] += workingSets(w.sets).length;
  }
  return volume;
}
