import type { NextTarget } from '@gym/domain';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';
import type { ExerciseDto, HistoryItemDto, NewExercise, NewRoutine, NewSession, RoutineDto, WorkoutDto } from './types';

export const keys = {
  exercises: ['exercises'] as const,
  exercise: (id: string) => ['exercises', id] as const,
  history: (id: string) => ['exercises', id, 'history'] as const,
  nextTarget: (id: string) => ['exercises', id, 'next-target'] as const,
  routines: ['routines'] as const,
  workout: (id: string) => ['routines', id, 'workout'] as const,
};

export const useExercises = () =>
  useQuery({ queryKey: keys.exercises, queryFn: () => api<ExerciseDto[]>('/exercises') });

export const useExercise = (id: string) =>
  useQuery({ queryKey: keys.exercise(id), queryFn: () => api<ExerciseDto>(`/exercises/${id}`) });

export const useHistory = (id: string) =>
  useQuery({ queryKey: keys.history(id), queryFn: () => api<HistoryItemDto[]>(`/exercises/${id}/history`) });

export const useNextTarget = (id: string) =>
  useQuery({ queryKey: keys.nextTarget(id), queryFn: () => api<NextTarget>(`/exercises/${id}/next-target`) });

export const useRoutines = () =>
  useQuery({ queryKey: keys.routines, queryFn: () => api<RoutineDto[]>('/routines') });

export const useWorkout = (id: string) =>
  useQuery({ queryKey: keys.workout(id), queryFn: () => api<WorkoutDto>(`/routines/${id}/workout`) });

export function useCreateExercise() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: NewExercise) => api<ExerciseDto>('/exercises', { method: 'POST', body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.exercises }),
  });
}

export function useCreateRoutine() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: NewRoutine) => api<RoutineDto>('/routines', { method: 'POST', body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.routines }),
  });
}

export function useLogSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: NewSession) => api('/sessions', { method: 'POST', body }),
    // Al registrar, el objetivo de la próxima sesión cambia: se recalcula desde la API.
    onSuccess: (_, body) =>
      Promise.all([
        ...body.entries.map((e) => qc.invalidateQueries({ queryKey: keys.exercise(e.exerciseId) })),
        qc.invalidateQueries({ queryKey: keys.routines }),
      ]),
  });
}
