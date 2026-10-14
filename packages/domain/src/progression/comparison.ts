import type { SetLog } from '../types';
import { totalVolume, workingSets } from './math';

/** Cómo le fue respecto de la última vez. `new` = no hay con qué comparar. */
export type ComparisonStatus = 'improved' | 'same' | 'regressed' | 'new';

export interface SetComparison {
  current: SetLog;
  previous: SetLog | null;
  weightDeltaKg: number | null;
  repsDelta: number | null;
  status: ComparisonStatus;
}

export interface PerformanceComparison {
  status: ComparisonStatus;
  /** Series efectivas emparejadas por orden (serie 1 con serie 1, etc.). */
  sets: SetComparison[];
  topWeightDeltaKg: number | null;
  volumeDeltaKg: number | null;
  summary: string;
}

const round = (n: number) => Number(n.toFixed(2));
const signed = (n: number) => (n > 0 ? `+${n}` : `${n}`);
const sign = (n: number): ComparisonStatus => (n > 0 ? 'improved' : n < 0 ? 'regressed' : 'same');

/** Una serie contra la misma serie de la vez anterior: primero manda el peso, después las reps. */
export function compareSet(current: SetLog, previous: SetLog | null): SetComparison {
  if (!previous) return { current, previous, weightDeltaKg: null, repsDelta: null, status: 'new' };
  const weightDeltaKg = round(current.weightKg - previous.weightKg);
  const repsDelta = current.reps - previous.reps;
  return { current, previous, weightDeltaKg, repsDelta, status: sign(weightDeltaKg || repsDelta) };
}

function top(sets: SetLog[]) {
  const weightKg = Math.max(...sets.map((s) => s.weightKg));
  const reps = sets.filter((s) => s.weightKg === weightKg).reduce((sum, s) => sum + s.reps, 0);
  return { weightKg, reps };
}

/**
 * Compara lo que se hizo de un ejercicio con la última vez (sin calentamientos).
 * Progresó si subió el peso máximo, o si con el mismo peso hizo más repeticiones en total.
 */
export function comparePerformance(current: SetLog[], previous: SetLog[] | null): PerformanceComparison {
  const cur = workingSets(current);
  const prev = previous ? workingSets(previous) : [];
  const sets = cur.map((s, i) => compareSet(s, prev[i] ?? null));

  if (cur.length === 0 || prev.length === 0) {
    return {
      status: 'new',
      sets,
      topWeightDeltaKg: null,
      volumeDeltaKg: null,
      summary: prev.length === 0 ? 'Primera vez: no hay con qué comparar.' : 'Sin series para comparar.',
    };
  }

  const a = top(cur);
  const b = top(prev);
  const topWeightDeltaKg = round(a.weightKg - b.weightKg);
  const volumeDeltaKg = round(totalVolume(cur) - totalVolume(prev));

  if (topWeightDeltaKg !== 0) {
    return {
      status: sign(topWeightDeltaKg),
      sets,
      topWeightDeltaKg,
      volumeDeltaKg,
      summary: `${signed(topWeightDeltaKg)} kg en el peso máximo (${b.weightKg} → ${a.weightKg} kg).`,
    };
  }
  const repsDelta = a.reps - b.reps;
  return {
    status: sign(repsDelta),
    sets,
    topWeightDeltaKg,
    volumeDeltaKg,
    summary:
      repsDelta === 0
        ? `Igual que la última vez: ${a.reps} reps con ${a.weightKg} kg.`
        : `${signed(repsDelta)} reps con ${a.weightKg} kg (${b.reps} → ${a.reps}).`,
  };
}
