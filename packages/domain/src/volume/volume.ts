import { workingSets } from '../progression/math';
import { MUSCLES, muscleRecord, type Muscle } from '../training/muscles';
import { beginnerVolume } from '../planning/beginner';
import { normalizeProfile, type TrainingProfile } from '../training/profile';
import type { SetLog } from '../types';

/** Series semanales objetivo por músculo. */
export type WeeklyVolume = Record<Muscle, number>;

/**
 * Punto de partida del volumen semanal (§5.2).
 * - Principiante: lo que suman sus días (`beginnerVolume`), con los multiarticulares contando para
 *   todos los músculos que trabajan.
 * - Intermedio/avanzado: no se impone nada; se parte del volumen con el que dice manejarse.
 */
export function initialVolume(profile: TrainingProfile): WeeklyVolume {
  const p = normalizeProfile(profile);
  if (p.level === 'beginner') return beginnerVolume(p.trainingDays);

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
  /** Si cuenta para más de un músculo (multiarticulares del principiante); si no, solo `targetMuscle`. */
  muscles?: Muscle[];
  sets: SetLog[];
}

/**
 * Series efectivas por músculo en [from, to) (§5.1). Cuenta el músculo objetivo de cada ejercicio
 * (o sus `muscles`, en el principiante) y no cuentan los calentamientos. Las series con RIR alto
 * cuentan igual.
 */
export function weeklySetsByMuscle(work: MuscleWork[], from: Date, to: Date): WeeklyVolume {
  const volume = muscleRecord(0);
  for (const w of work) {
    if (w.performedAt < from || w.performedAt >= to) continue;
    const sets = workingSets(w.sets).length;
    for (const m of w.muscles ?? [w.targetMuscle]) volume[m] += sets;
  }
  return volume;
}
