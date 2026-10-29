import type { SetLog } from '../types';

/** Redondea al múltiplo de `step` más cercano (ej. discos de 2.5 kg). */
export function roundToStep(value: number, step: number): number {
  if (step <= 0) return value;
  return Number((Math.round(value / step) * step).toFixed(3));
}

/** 1RM estimado con la fórmula de Epley. */
export function estimateOneRepMax(weightKg: number, reps: number): number {
  if (reps <= 0) return 0;
  if (reps === 1) return weightKg;
  return Number((weightKg * (1 + reps / 30)).toFixed(1));
}

/** Volumen total (kg × reps) de las series efectivas. */
export function totalVolume(sets: SetLog[]): number {
  return workingSets(sets).reduce((sum, s) => sum + s.weightKg * s.reps, 0);
}

export function workingSets(sets: SetLog[]): SetLog[] {
  return sets.filter((s) => !s.warmup);
}

/** Peso de trabajo de una sesión: el de la serie efectiva más pesada (undefined si no hubo series efectivas). */
export function workingWeight(sets: SetLog[]): number | undefined {
  const working = workingSets(sets);
  return working.length ? Math.max(...working.map((s) => s.weightKg)) : undefined;
}
