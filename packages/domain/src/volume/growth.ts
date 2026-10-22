import { TARGET_RIR_MAX } from '../feedback/rir';
import type { MuscleSession } from './adjustment';

/** Sesiones seguidas progresando para que el principiante sume volumen (docs/dominio.md §5.4). */
export const GROWTH_SESSIONS = 2;
/** Series de un ejercicio del principiante a partir de las que, en vez de otra serie, se suma un ejercicio. */
export const BEGINNER_MAX_SETS = 4;
/** Series con las que entra el ejercicio nuevo: la que se suma más una que le pasa el que tenía 4. */
export const GROWTH_EXERCISE_SETS = 2;

export type GrowthDecision = { kind: 'keep' } | { kind: 'grow'; reason: string };

/**
 * Cuándo sube el volumen semanal de un músculo del principiante (§5.4): si progresó (peso y/o reps)
 * las últimas dos sesiones seguidas llegando cerca del fallo, +1 serie por semana. Si progresa con
 * RIR alto no se suma: primero, apretar más.
 */
export function decideBeginnerGrowth(history: MuscleSession[]): GrowthDecision {
  const recent = [...history]
    .sort((a, b) => b.performedAt.getTime() - a.performedAt.getTime())
    .slice(0, GROWTH_SESSIONS);
  if (recent.length < GROWTH_SESSIONS || recent.some((s) => s.status !== 'improved')) return { kind: 'keep' };
  const nearFailure = recent.every((s) => s.averageRir !== null && s.averageRir <= TARGET_RIR_MAX);
  if (!nearFailure) return { kind: 'keep' };
  return { kind: 'grow', reason: `${GROWTH_SESSIONS} sesiones seguidas progresando cerca del fallo: se recupera bien.` };
}

/** Un ejercicio del músculo en alguna rutina de la semana. */
export interface GrowthSlot {
  routineId: string;
  exerciseId: string;
  position: number;
  sets: number;
  /** Series totales de su rutina, para elegir el día más liviano. */
  routineSets: number;
}

export type GrowthPlacement =
  | { kind: 'add_set'; slot: GrowthSlot }
  /** Ejercicio nuevo en la rutina de `from`, justo después; `from` le pasa una serie. */
  | { kind: 'add_exercise'; from: GrowthSlot };

/**
 * Dónde va la serie que se suma en la semana, para no cargar una sola sesión: al ejercicio del
 * músculo con menos series (y menos de 4); si empatan, en el día más liviano. Si todos tienen 4, un
 * ejercicio nuevo en el día más liviano que todavía admita otro (`full` = rutinas que ya tienen el
 * máximo de ejercicios para el músculo). `null` si no hay dónde.
 */
export function placeGrowth(slots: GrowthSlot[], full: ReadonlySet<string>): GrowthPlacement | null {
  const byLoad = (a: GrowthSlot, b: GrowthSlot) => a.routineSets - b.routineSets || a.position - b.position;
  const open = slots.filter((s) => s.sets < BEGINNER_MAX_SETS).sort((a, b) => a.sets - b.sets || byLoad(a, b));
  if (open.length > 0) return { kind: 'add_set', slot: open[0] };
  const from = slots.filter((s) => !full.has(s.routineId)).sort(byLoad)[0];
  return from ? { kind: 'add_exercise', from } : null;
}
