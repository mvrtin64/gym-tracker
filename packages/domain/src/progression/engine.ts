import type { ExercisePerformance, NextTarget, ProgressionScheme } from '../types';
import { roundToStep, workingSets } from './math';

interface SessionResult {
  /** Peso de la serie más pesada. */
  topWeightKg: number;
  /** Repeticiones de cada serie hecha con ese peso. */
  topReps: number[];
}

function summarize(perf: ExercisePerformance): SessionResult | null {
  const sets = workingSets(perf.sets);
  if (sets.length === 0) return null;
  const topWeightKg = Math.max(...sets.map((s) => s.weightKg));
  const topReps = sets.filter((s) => s.weightKg === topWeightKg).map((s) => s.reps);
  return { topWeightKg, topReps };
}

/** Completó todas las series con el máximo del rango. */
function completedRange(r: SessionResult, scheme: ProgressionScheme): boolean {
  return r.topReps.length >= scheme.sets && r.topReps.every((reps) => reps >= scheme.repRange.max);
}

/** No llegó al mínimo del rango en alguna serie, o hizo menos series de las previstas. */
function failed(r: SessionResult, scheme: ProgressionScheme): boolean {
  return r.topReps.length < scheme.sets || r.topReps.some((reps) => reps < scheme.repRange.min);
}

export function validateScheme(scheme: ProgressionScheme): void {
  const { sets, repRange, weightIncrementKg, deloadFactor, failuresBeforeDeload } = scheme;
  if (sets < 1) throw new Error('sets debe ser al menos 1');
  if (repRange.min < 1 || repRange.max < repRange.min) throw new Error('rango de repeticiones inválido');
  if (weightIncrementKg <= 0) throw new Error('el incremento debe ser positivo');
  if (deloadFactor <= 0 || deloadFactor >= 1) throw new Error('deloadFactor debe estar entre 0 y 1');
  if (failuresBeforeDeload < 1) throw new Error('failuresBeforeDeload debe ser al menos 1');
}

/**
 * Calcula el objetivo de la próxima sesión a partir del historial (doble progresión):
 * - Completó el máximo de reps en todas las series → sube el peso y vuelve al mínimo de reps.
 * - Falló el mínimo N sesiones seguidas con el mismo peso → descarga (peso × deloadFactor).
 * - Falló menos veces → repite el peso.
 * - Si no, mantiene el peso y busca una repetición más.
 */
export function computeNextTarget(scheme: ProgressionScheme, history: ExercisePerformance[]): NextTarget {
  validateScheme(scheme);
  const { sets, repRange, weightIncrementKg: step } = scheme;

  const results = [...history]
    .sort((a, b) => b.performedAt.getTime() - a.performedAt.getTime())
    .map(summarize)
    .filter((r): r is SessionResult => r !== null);

  const last = results[0];
  if (!last) {
    return {
      weightKg: roundToStep(scheme.startingWeightKg, step),
      reps: repRange.min,
      sets,
      decision: 'start',
      reason: 'Primera sesión: arrancá con el peso inicial y el mínimo de repeticiones.',
    };
  }

  if (completedRange(last, scheme)) {
    return {
      weightKg: roundToStep(last.topWeightKg + step, step),
      reps: repRange.min,
      sets,
      decision: 'increase_weight',
      reason: `Completaste ${sets}×${repRange.max} con ${last.topWeightKg} kg: subí ${step} kg.`,
    };
  }

  if (failed(last, scheme)) {
    let streak = 0;
    for (const r of results) {
      if (r.topWeightKg !== last.topWeightKg || !failed(r, scheme)) break;
      streak++;
    }
    if (streak >= scheme.failuresBeforeDeload) {
      const pct = Math.round((1 - scheme.deloadFactor) * 100);
      return {
        weightKg: roundToStep(last.topWeightKg * scheme.deloadFactor, step),
        reps: repRange.min,
        sets,
        decision: 'deload',
        reason: `${streak} sesiones sin llegar a ${repRange.min} reps con ${last.topWeightKg} kg: bajá ${pct}% y volvé a construir.`,
      };
    }
    return {
      weightKg: last.topWeightKg,
      reps: repRange.min,
      sets,
      decision: 'repeat',
      reason: `No llegaste a ${sets}×${repRange.min}: repetí ${last.topWeightKg} kg.`,
    };
  }

  const target = Math.min(repRange.max, Math.min(...last.topReps) + 1);
  return {
    weightKg: last.topWeightKg,
    reps: target,
    sets,
    decision: 'increase_reps',
    reason: `Mantené ${last.topWeightKg} kg y buscá ${target} reps en cada serie.`,
  };
}
