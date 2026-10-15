import { TARGET_RIR_MAX } from '../feedback/rir';
import type { ComparisonStatus } from '../progression/comparison';
import { roundToStep, workingSets } from '../progression/math';
import { MUSCLES, type Muscle } from '../training/muscles';
import type { SetLog } from '../types';
import type { WeeklyVolume } from './volume';

/** Cómo le fue a un músculo en una sesión, respecto de la vez anterior. */
export type MuscleSessionStatus = 'improved' | 'same' | 'regressed';

export interface MuscleSession {
  performedAt: Date;
  status: MuscleSessionStatus;
  /** RIR promedio de las series efectivas; `null` si no se registró. */
  averageRir: number | null;
}

/**
 * Resume los ejercicios de un músculo en una sesión. Progresó si mejoró en algo y no retrocedió en
 * nada; retrocedió si empeoró en algo sin mejorar en nada; si no, se mantuvo. `null` si ningún
 * ejercicio tenía con qué compararse.
 */
export function muscleSessionStatus(statuses: ComparisonStatus[]): MuscleSessionStatus | null {
  const known = statuses.filter((s) => s !== 'new');
  if (known.length === 0) return null;
  const improved = known.includes('improved');
  const regressed = known.includes('regressed');
  if (improved && !regressed) return 'improved';
  if (regressed && !improved) return 'regressed';
  return 'same';
}

export function averageRir(sets: SetLog[]): number | null {
  const rirs = workingSets(sets)
    .map((s) => s.rir)
    .filter((r): r is number => r !== undefined);
  if (rirs.length === 0) return null;
  return Number((rirs.reduce((a, b) => a + b, 0) / rirs.length).toFixed(1));
}

/** Sesiones seguidas sin progresar para tocar el volumen de un músculo (§5.3). */
export const STALL_SESSIONS = 2;

export type VolumeDecision =
  | { kind: 'keep'; reason: string }
  | { kind: 'reduce'; delta: number; reason: string }
  | { kind: 'push_harder'; reason: string };

/**
 * Decide el volumen de un músculo mirando sus últimas sesiones (§5.3):
 * - Progresó en alguna → no se toca.
 * - Se estancó o retrocedió con RIR alto → no es el volumen: hay que apretar más.
 * - Se estancó con RIR 0–2 (o sin RIR registrado) → −1 serie; −2 si además retrocedió.
 * La app nunca suma series por su cuenta.
 */
export function decideMuscleVolume(history: MuscleSession[]): VolumeDecision {
  const recent = [...history]
    .sort((a, b) => b.performedAt.getTime() - a.performedAt.getTime())
    .slice(0, STALL_SESSIONS);

  if (recent.length < STALL_SESSIONS) return { kind: 'keep', reason: 'Todavía no hay sesiones suficientes para evaluar.' };
  if (recent.some((s) => s.status === 'improved')) return { kind: 'keep', reason: 'Está progresando: el volumen está bien.' };

  if (recent.some((s) => s.averageRir !== null && s.averageRir > TARGET_RIR_MAX)) {
    return {
      kind: 'push_harder',
      reason: 'No progresa, pero le está quedando resto: primero hay que apretar más cerca del fallo.',
    };
  }

  const delta = recent.some((s) => s.status === 'regressed') ? -2 : -1;
  return {
    kind: 'reduce',
    delta,
    reason: `${STALL_SESSIONS} sesiones sin progresar: bajá ${-delta} ${delta === -1 ? 'serie' : 'series'} y revisá que estés llegando a un esfuerzo alto con buena técnica.`,
  };
}

/** Ventana y proporción para considerar el estancamiento "general" (§5.3): 3 de cada 4 grupos en 2 semanas. */
export const GENERAL_STALL_WINDOW_DAYS = 14;
export const GENERAL_STALL_RATIO = 0.75;
/** Con menos grupos evaluados no se decide una descarga general. */
export const GENERAL_STALL_MIN_MUSCLES = 4;

export interface GeneralStagnation {
  deload: boolean;
  /** Músculos con al menos 2 sesiones en la ventana. */
  evaluated: Muscle[];
  /** De esos, los que no progresaron en ninguna. */
  stalled: Muscle[];
}

export function detectGeneralStagnation(
  sessionsByMuscle: Partial<Record<Muscle, MuscleSession[]>>,
  now: Date,
): GeneralStagnation {
  const from = new Date(now.getTime() - GENERAL_STALL_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const evaluated: Muscle[] = [];
  const stalled: Muscle[] = [];

  for (const muscle of MUSCLES) {
    const inWindow = (sessionsByMuscle[muscle] ?? []).filter((s) => s.performedAt > from && s.performedAt <= now);
    if (inWindow.length < STALL_SESSIONS) continue;
    evaluated.push(muscle);
    if (!inWindow.some((s) => s.status === 'improved')) stalled.push(muscle);
  }

  const deload =
    evaluated.length >= GENERAL_STALL_MIN_MUSCLES && stalled.length / evaluated.length >= GENERAL_STALL_RATIO;
  return { deload, evaluated, stalled };
}

/** Semana de descarga: mitad de series, mitad de peso, RIR 4–5. */
export const DELOAD_WEEK = {
  setsFactor: 0.5,
  weightFactor: 0.5,
  rir: { min: 4, max: 5 },
} as const;

/** Volumen de la semana de descarga. Redondea hacia arriba para no dejar en 0 a un músculo que se entrena. */
export function deloadVolume(volume: WeeklyVolume): WeeklyVolume {
  const result = { ...volume };
  for (const m of MUSCLES) result[m] = Math.ceil(volume[m] * DELOAD_WEEK.setsFactor);
  return result;
}

export function deloadWeight(weightKg: number, stepKg: number): number {
  return roundToStep(weightKg * DELOAD_WEEK.weightFactor, stepKg);
}

/** Series que se recuperan por semana y por grupo después de la descarga: de a poco, no todo de una. */
export const RETURN_SETS_PER_WEEK = 2;

/** Volumen de la semana siguiente en la vuelta: suma de a poco hasta llegar al que tenía antes de la descarga. */
export function returnFromDeload(
  current: WeeklyVolume,
  target: WeeklyVolume,
  step: number = RETURN_SETS_PER_WEEK,
): WeeklyVolume {
  const next = { ...current };
  for (const m of MUSCLES) next[m] = Math.min(target[m], current[m] + step);
  return next;
}
