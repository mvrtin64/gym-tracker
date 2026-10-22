import { TARGET_RIR_MAX } from '../feedback/rir';
import { comparePerformance, type ComparisonStatus } from '../progression/comparison';
import { workingSets } from '../progression/math';
import type { SetLog } from '../types';
import { averageRir } from './adjustment';
import type { LoggedSession } from './history';

/** Sesiones seguidas progresando para que el principiante sume volumen (docs/dominio.md §5.4). */
export const GROWTH_SESSIONS = 2;
/** Series de un ejercicio del principiante a partir de las que, en vez de otra serie, se suma un ejercicio. */
export const BEGINNER_MAX_SETS = 4;
/** Series con las que entra el ejercicio nuevo. */
export const GROWTH_EXERCISE_SETS = 3;

/** Cómo le fue a un ejercicio en una sesión, respecto de la vez anterior que lo hizo. */
export interface ExerciseSession {
  performedAt: Date;
  status: Exclude<ComparisonStatus, 'new'>;
  /** RIR promedio de las series efectivas; `null` si no se registró. */
  averageRir: number | null;
}

/**
 * Historia de un ejercicio: cada vez que se hizo, comparada con la anterior. Las sesiones de descarga
 * no cuentan ni sirven de referencia; la primera vez no tiene con qué compararse.
 */
export function exerciseHistory(sessions: LoggedSession[], exerciseId: string): ExerciseSession[] {
  let previous: SetLog[] | null = null;
  const result: ExerciseSession[] = [];
  const ordered = sessions
    .filter((s) => !s.isDeload)
    .sort((a, b) => a.performedAt.getTime() - b.performedAt.getTime());
  for (const session of ordered) {
    const entry = session.entries.find((e) => e.exerciseId === exerciseId && workingSets(e.sets).length > 0);
    if (!entry) continue;
    const { status } = comparePerformance(entry.sets, previous);
    if (status !== 'new') result.push({ performedAt: session.performedAt, status, averageRir: averageRir(entry.sets) });
    previous = entry.sets;
  }
  return result;
}

export type GrowthDecision =
  | { kind: 'keep' }
  | { kind: 'add_set'; reason: string }
  | { kind: 'add_exercise'; reason: string };

/**
 * Cuándo sumarle volumen a un ejercicio del principiante (§5.4): si progresó (peso y/o reps) las
 * últimas dos sesiones seguidas llegando cerca del fallo, se suma una serie; si ya tiene 4, se suma
 * otro ejercicio para el mismo músculo. Si progresa con RIR alto no se suma: primero, apretar más.
 */
export function decideBeginnerGrowth(history: ExerciseSession[], sets: number): GrowthDecision {
  const recent = [...history]
    .sort((a, b) => b.performedAt.getTime() - a.performedAt.getTime())
    .slice(0, GROWTH_SESSIONS);
  if (recent.length < GROWTH_SESSIONS || recent.some((s) => s.status !== 'improved')) return { kind: 'keep' };
  const nearFailure = recent.every((s) => s.averageRir !== null && s.averageRir <= TARGET_RIR_MAX);
  if (!nearFailure) return { kind: 'keep' };

  const why = `${GROWTH_SESSIONS} sesiones seguidas progresando cerca del fallo: se recupera bien.`;
  return sets < BEGINNER_MAX_SETS
    ? { kind: 'add_set', reason: `${why} Se suma una serie.` }
    : { kind: 'add_exercise', reason: `${why} Ya tiene ${BEGINNER_MAX_SETS} series: se suma otro ejercicio para el mismo músculo.` };
}
