import type { ExerciseType, Feel, Focus, Level, Muscle, NextTarget, SetLog, Weekday, WeekPlan } from '@gym/domain';

/** Respuestas de la API (las fechas llegan como string ISO). */

export interface ExerciseSettingsDto {
  /** Anotación fija del usuario (ej. "banco a 30°"). */
  note: string | null;
  weightIncrementKg: number;
  startingWeightKg: number;
  deloadFactor: number;
  failuresBeforeDeload: number;
}

/** Ejercicio del catálogo (o propio) tal como viene dentro de rutinas y entrenamientos. */
export interface BaseExerciseDto {
  id: string;
  name: string;
  type: ExerciseType;
  /** Músculos a los que puede contar según el enfoque. */
  targetMuscles: Muscle[];
  defaultTarget: Muscle;
  /** GIF o link de YouTube. */
  demoUrl: string | null;
  coachTip: string | null;
  ownerId: string | null;
}

export interface ExerciseDto extends BaseExerciseDto {
  isOwn: boolean;
  settings: ExerciseSettingsDto;
}

export interface NewExercise {
  name: string;
  type: ExerciseType;
  targetMuscles: Muscle[];
  defaultTarget?: Muscle;
  demoUrl?: string;
}

/** Serie registrada: lo del dominio más la sensación que eligió el principiante. */
export type LoggedSet = SetLog & { feel?: Feel };

export interface HistoryItemDto {
  sessionId: string;
  performedAt: string;
  targetMuscle: Muscle;
  sets: LoggedSet[];
}

export interface Prescription {
  sets: number;
  repMin: number;
  repMax: number;
}

export interface RoutineDto {
  id: string;
  name: string;
  origin: 'manual' | 'generated';
  adjustMode: 'suggest' | 'auto';
  weekday: Weekday | null;
  exercises: ({ exercise: BaseExerciseDto; targetMuscle: Muscle } & Prescription)[];
  lastPerformedAt: string | null;
}

export interface NewRoutine {
  name: string;
  weekday?: Weekday;
  exercises: ({ exerciseId: string; targetMuscle?: Muscle } & Partial<Prescription>)[];
}

/** Entrenamiento del día armado desde una rutina. */
export interface WorkoutDto {
  id: string;
  name: string;
  weekday: Weekday | null;
  adjustMode: 'suggest' | 'auto';
  lastPerformedAt: string | null;
  exercises: {
    exercise: BaseExerciseDto;
    targetMuscle: Muscle;
    prescription: Prescription;
    note: string | null;
    target: NextTarget;
    /** Lo que hizo la última vez (de esta rutina si existe; si no, de cualquier sesión). */
    previous: { performedAt: string; fromRoutine: boolean; sets: LoggedSet[] } | null;
  }[];
}

export interface NewSet {
  weightKg: number;
  reps: number;
  warmup?: boolean;
  feel?: Feel;
  rpe?: number;
}

export interface NewSession {
  performedAt?: string;
  notes?: string;
  routineId?: string;
  isDeload?: boolean;
  entries: { exerciseId: string; targetMuscle?: Muscle; sets: NewSet[] }[];
}

export interface ProfileDto {
  userId: string;
  level: Level;
  trainingDays: Weekday[];
  focus: Focus;
  priorityMuscles: Muscle[];
  preferredRepMin: number | null;
  preferredRepMax: number | null;
}

/** Respuestas del onboarding. */
export interface ProfileInput {
  level: Level;
  trainingDays: Weekday[];
  focus?: Focus;
  priorityMuscles?: Muscle[];
  preferredRepMin?: number;
  preferredRepMax?: number;
  /** Volumen con el que se maneja (intermedio/avanzado); solo cuenta la primera vez. */
  reportedVolume?: { muscle: Muscle; weeklySets: number }[];
}

export interface VolumeChangeDto {
  id: string;
  muscle: Muscle;
  delta: number;
  reason: string;
  status: 'suggested' | 'applied' | 'dismissed';
  createdAt: string;
}

export interface VolumeSummaryDto {
  weekStart: string;
  muscles: { muscle: Muscle; target: number; done: number }[];
  pendingChanges: VolumeChangeDto[];
}

export type PlanDto = WeekPlan;
