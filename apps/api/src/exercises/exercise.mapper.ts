import { SCHEME_PRESETS, type ExerciseType, type ProgressionScheme } from '@gym/domain';
import type { Exercise } from '../generated/prisma/client';

type SchemeFields = Pick<
  Exercise,
  'sets' | 'repMin' | 'repMax' | 'weightIncrementKg' | 'deloadFactor' | 'failuresBeforeDeload' | 'startingWeightKg'
>;

/** Mismos valores por defecto que el schema de Prisma. */
export const SCHEME_DEFAULTS: SchemeFields = {
  sets: 3,
  repMin: 8,
  repMax: 12,
  weightIncrementKg: 2.5,
  deloadFactor: 0.9,
  failuresBeforeDeload: 2,
  startingWeightKg: 20,
};

/** Defaults de un ejercicio nuevo según su tipo (multiarticular: pocas reps; monoarticular: más). */
export function defaultsFor(type: ExerciseType): SchemeFields {
  const p = SCHEME_PRESETS[type];
  return { ...SCHEME_DEFAULTS, sets: p.sets, repMin: p.repRange.min, repMax: p.repRange.max, weightIncrementKg: p.weightIncrementKg };
}

export function toProgressionScheme(e: SchemeFields): ProgressionScheme {
  return {
    sets: e.sets,
    repRange: { min: e.repMin, max: e.repMax },
    weightIncrementKg: e.weightIncrementKg,
    deloadFactor: e.deloadFactor,
    failuresBeforeDeload: e.failuresBeforeDeload,
    startingWeightKg: e.startingWeightKg,
  };
}
