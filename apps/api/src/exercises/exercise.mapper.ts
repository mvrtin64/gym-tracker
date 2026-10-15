import { SCHEME_PRESETS, type ExerciseType, type ProgressionScheme } from '@gym/domain';
import type { RoutineExercise, UserExercise } from '../generated/prisma/client';

/** El catálogo global más los ejercicios propios del usuario. */
export const visibleTo = (userId: string) => ({ OR: [{ ownerId: null }, { ownerId: userId }] });

export type ExerciseSettings = Pick<
  UserExercise,
  'note' | 'weightIncrementKg' | 'startingWeightKg' | 'deloadFactor' | 'failuresBeforeDeload'
>;

/** Valores de un ejercicio que el usuario todavía no configuró: el incremento depende del tipo. */
export function defaultSettings(type: ExerciseType): ExerciseSettings {
  return {
    note: null,
    weightIncrementKg: SCHEME_PRESETS[type].weightIncrementKg,
    startingWeightKg: 20,
    deloadFactor: 0.9,
    failuresBeforeDeload: 2,
  };
}

export function pickSettings({ note, weightIncrementKg, startingWeightKg, deloadFactor, failuresBeforeDeload }: ExerciseSettings): ExerciseSettings {
  return { note, weightIncrementKg, startingWeightKg, deloadFactor, failuresBeforeDeload };
}

export type Prescription = Pick<RoutineExercise, 'sets' | 'repMin' | 'repMax'>;

/** Prescripción por defecto al agregar un ejercicio a una rutina (multiarticular: pocas reps; monoarticular: más). */
export function defaultPrescription(type: ExerciseType): Prescription {
  const p = SCHEME_PRESETS[type];
  return { sets: p.sets, repMin: p.repRange.min, repMax: p.repRange.max };
}

/** La prescripción sale de la rutina; el incremento y la descarga, de lo que configuró el usuario. */
export function toProgressionScheme(prescription: Prescription, settings: ExerciseSettings): ProgressionScheme {
  return {
    sets: prescription.sets,
    repRange: { min: prescription.repMin, max: prescription.repMax },
    weightIncrementKg: settings.weightIncrementKg,
    deloadFactor: settings.deloadFactor,
    failuresBeforeDeload: settings.failuresBeforeDeload,
    startingWeightKg: settings.startingWeightKg,
  };
}
