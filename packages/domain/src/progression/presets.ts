import type { ExerciseType, ProgressionScheme } from '../types';

export type SchemePreset = Pick<ProgressionScheme, 'sets' | 'repRange' | 'weightIncrementKg'>;

/**
 * Punto de partida según el tipo de ejercicio. El usuario puede ajustarlo por ejercicio;
 * más adelante se va a individualizar (principio de individualidad).
 */
export const SCHEME_PRESETS: Record<ExerciseType, SchemePreset> = {
  compound: { sets: 3, repRange: { min: 5, max: 8 }, weightIncrementKg: 2.5 },
  isolation: { sets: 3, repRange: { min: 10, max: 15 }, weightIncrementKg: 2 },
};
