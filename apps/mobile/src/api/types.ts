import type { ExerciseType, MuscleGroup, NextTarget, SetLog } from '@gym/domain';

/** Respuestas de la API (las fechas llegan como string ISO). */
export interface ExerciseDto {
  id: string;
  name: string;
  muscleGroup: MuscleGroup;
  type: ExerciseType;
  sets: number;
  repMin: number;
  repMax: number;
  weightIncrementKg: number;
  deloadFactor: number;
  failuresBeforeDeload: number;
  startingWeightKg: number;
}

export type NewExercise = Pick<ExerciseDto, 'name' | 'muscleGroup' | 'type'> &
  Partial<Pick<ExerciseDto, 'sets' | 'repMin' | 'repMax' | 'weightIncrementKg' | 'startingWeightKg'>>;

export interface HistoryItemDto {
  sessionId: string;
  performedAt: string;
  sets: SetLog[];
}

export interface RoutineDto {
  id: string;
  name: string;
  exercises: ExerciseDto[];
  lastPerformedAt: string | null;
}

export interface NewRoutine {
  name: string;
  exerciseIds: string[];
}

/** Entrenamiento del día armado desde una rutina. */
export interface WorkoutDto {
  id: string;
  name: string;
  lastPerformedAt: string | null;
  exercises: {
    exercise: ExerciseDto;
    target: NextTarget;
    /** Lo que hizo la última vez (de esta rutina si existe; si no, de cualquier sesión). */
    previous: { performedAt: string; fromRoutine: boolean; sets: SetLog[] } | null;
  }[];
}

export interface NewSession {
  performedAt?: string;
  notes?: string;
  routineId?: string;
  entries: { exerciseId: string; sets: SetLog[] }[];
}
