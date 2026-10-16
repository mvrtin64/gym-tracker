import { comparePerformance, type ComparisonStatus } from '../progression/comparison';
import { workingSets } from '../progression/math';
import type { Muscle } from '../training/muscles';
import type { SetLog } from '../types';
import { averageRir, muscleSessionStatus, type MuscleSession } from './adjustment';

/** Una sesión registrada, con lo justo para evaluar el volumen. */
export interface LoggedSession {
  performedAt: Date;
  isDeload?: boolean;
  entries: { exerciseId: string; targetMuscle: Muscle; sets: SetLog[] }[];
}

/**
 * Historial de cada músculo para `decideMuscleVolume` y `detectGeneralStagnation`: en cada sesión,
 * sus ejercicios se comparan con la vez anterior que se hizo cada uno (en cualquier rutina).
 * Las sesiones de descarga no cuentan ni sirven de referencia: ahí el peso baja a propósito.
 */
export function muscleHistories(sessions: LoggedSession[]): Partial<Record<Muscle, MuscleSession[]>> {
  const last = new Map<string, SetLog[]>();
  const result: Partial<Record<Muscle, MuscleSession[]>> = {};
  const ordered = sessions
    .filter((s) => !s.isDeload)
    .sort((a, b) => a.performedAt.getTime() - b.performedAt.getTime());

  for (const session of ordered) {
    const entries = session.entries.filter((e) => workingSets(e.sets).length > 0);
    const byMuscle = new Map<Muscle, { statuses: ComparisonStatus[]; sets: SetLog[] }>();
    for (const entry of entries) {
      const group = byMuscle.get(entry.targetMuscle) ?? { statuses: [], sets: [] };
      group.statuses.push(comparePerformance(entry.sets, last.get(entry.exerciseId) ?? null).status);
      group.sets.push(...entry.sets);
      byMuscle.set(entry.targetMuscle, group);
    }
    for (const entry of entries) last.set(entry.exerciseId, entry.sets);

    for (const [muscle, group] of byMuscle) {
      const status = muscleSessionStatus(group.statuses);
      if (status === null) continue;
      (result[muscle] ??= []).push({ performedAt: session.performedAt, status, averageRir: averageRir(group.sets) });
    }
  }
  return result;
}
