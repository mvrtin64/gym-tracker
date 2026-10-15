import type { RepRange } from '../types';
import type { Muscle } from './muscles';

export const LEVELS = ['beginner', 'intermediate', 'advanced'] as const;
export type Level = (typeof LEVELS)[number];

/** general · tren inferior · tren superior · músculos específicos (docs/dominio.md §2). */
export const FOCUSES = ['general', 'lower', 'upper', 'specific'] as const;
export type Focus = (typeof FOCUSES)[number];

/** En orden: el domingo y el lunes también cuentan como días seguidos. */
export const WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
export type Weekday = (typeof WEEKDAYS)[number];

export const MAX_TRAINING_DAYS = 6;

/** Lo que se le pregunta al usuario en el onboarding. */
export interface TrainingProfile {
  level: Level;
  /** Qué días entrena (de 1 a 6). */
  trainingDays: Weekday[];
  focus: Focus;
  /** Músculos rezagados o a priorizar: van con frecuencia 3. */
  priorityMuscles: Muscle[];
  /** Rango con el que se siente cómodo (no se le pregunta al principiante). */
  preferredRepRange?: RepRange;
  /** Series semanales por músculo con las que dice manejarse (intermedio/avanzado). */
  reportedVolume?: Partial<Record<Muscle, number>>;
}

export function validateProfile(profile: TrainingProfile): void {
  const { trainingDays, focus, priorityMuscles, preferredRepRange } = profile;
  if (trainingDays.length < 1 || trainingDays.length > MAX_TRAINING_DAYS) {
    throw new Error(`hay que elegir entre 1 y ${MAX_TRAINING_DAYS} días`);
  }
  if (new Set(trainingDays).size !== trainingDays.length) throw new Error('hay días repetidos');
  if (profile.level !== 'beginner' && focus === 'specific' && priorityMuscles.length === 0) {
    throw new Error('el enfoque en músculos específicos necesita al menos un músculo');
  }
  if (preferredRepRange && (preferredRepRange.min < 1 || preferredRepRange.max < preferredRepRange.min)) {
    throw new Error('rango de repeticiones inválido');
  }
}

/**
 * Valida el perfil y le aplica las reglas por nivel.
 * El principiante no prioriza: trabaja todo por igual, con enfoque general y los rangos por defecto.
 */
export function normalizeProfile(profile: TrainingProfile): TrainingProfile {
  validateProfile(profile);
  if (profile.level !== 'beginner') return profile;
  return { ...profile, focus: 'general', priorityMuscles: [], preferredRepRange: undefined };
}
