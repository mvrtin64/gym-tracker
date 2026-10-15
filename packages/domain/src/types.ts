/** Modelos de negocio compartidos por la API y la app. Sin dependencias de framework. */

/** @deprecated Modelo viejo de 7 grupos; se reemplaza por `MUSCLES` (training/muscles) al migrar la API. */
export const MUSCLE_GROUPS = ['chest', 'back', 'legs', 'shoulders', 'arms', 'core', 'full_body'] as const;
export type MuscleGroup = (typeof MUSCLE_GROUPS)[number];

/**
 * Multiarticular (sentadilla, press banca, remo…): más demandante a nivel articular y cardiovascular,
 * se trabaja con pocas repeticiones. Monoarticular (curl, extensiones, elevaciones…): más repeticiones.
 */
export const EXERCISE_TYPES = ['compound', 'isolation'] as const;
export type ExerciseType = (typeof EXERCISE_TYPES)[number];

export interface RepRange {
  min: number;
  max: number;
}

/**
 * Reglas de progresión de un ejercicio (doble progresión):
 * se suben repeticiones dentro del rango y, al completar el máximo en todas las series, se sube el peso.
 */
export interface ProgressionScheme {
  /** Series efectivas por sesión. */
  sets: number;
  repRange: RepRange;
  /** Cuánto subir cuando se completa el rango (ej. 2.5 kg). También es el paso de redondeo. */
  weightIncrementKg: number;
  /** Factor aplicado al peso en una descarga (0.9 = -10%). */
  deloadFactor: number;
  /** Sesiones seguidas sin llegar al mínimo de reps antes de descargar. */
  failuresBeforeDeload: number;
  /** Peso para la primera sesión, si no hay historial. */
  startingWeightKg: number;
}

export interface Exercise {
  id: string;
  name: string;
  muscleGroup: MuscleGroup;
  type: ExerciseType;
  progression: ProgressionScheme;
}

export interface SetLog {
  weightKg: number;
  reps: number;
  /** Esfuerzo percibido (1-10), opcional. */
  rpe?: number;
  /** Repeticiones en reserva estimadas (ver feedback/rir). */
  rir?: number;
  warmup?: boolean;
}

/** Lo que se hizo de un ejercicio en una sesión. */
export interface ExercisePerformance {
  performedAt: Date;
  sets: SetLog[];
}

export type ProgressionDecision = 'start' | 'increase_weight' | 'increase_reps' | 'repeat' | 'deload';

export interface NextTarget {
  weightKg: number;
  /** Repeticiones objetivo por serie. */
  reps: number;
  sets: number;
  decision: ProgressionDecision;
  reason: string;
}
