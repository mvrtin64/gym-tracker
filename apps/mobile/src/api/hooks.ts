import type { Muscle } from '@gym/domain';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from './client';
import type {
  ExerciseDto, ExerciseSettingsDto, HistoryItemDto, LoggedSessionDto, NewExercise, NewRoutine, NewSession, PlanDto,
  ProfileDto, ProfileInput, RoutineDto, VolumeSummaryDto, WorkoutDto,
} from './types';

export const keys = {
  profile: ['profile'] as const,
  volume: ['volume'] as const,
  plan: ['plan'] as const,
  exercises: ['exercises'] as const,
  exercise: (id: string) => ['exercises', id] as const,
  history: (id: string) => ['exercises', id, 'history'] as const,
  routines: ['routines'] as const,
  workout: (id: string) => ['routines', id, 'workout'] as const,
};

/** Perfil del usuario; `null` si todavía no hizo el onboarding. */
export const useProfile = () =>
  useQuery({
    queryKey: keys.profile,
    queryFn: () =>
      api<ProfileDto>('/profile').catch((e) => {
        if (e instanceof ApiError && e.status === 404) return null;
        throw e;
      }),
  });

export const useVolume = () =>
  useQuery({ queryKey: keys.volume, queryFn: () => api<VolumeSummaryDto>('/volume') });

export const usePlan = () => useQuery({ queryKey: keys.plan, queryFn: () => api<PlanDto>('/plan') });

export const useExercises = () =>
  useQuery({ queryKey: keys.exercises, queryFn: () => api<ExerciseDto[]>('/exercises') });

export const useExercise = (id: string) =>
  useQuery({ queryKey: keys.exercise(id), queryFn: () => api<ExerciseDto>(`/exercises/${id}`) });

export const useHistory = (id: string) =>
  useQuery({ queryKey: keys.history(id), queryFn: () => api<HistoryItemDto[]>(`/exercises/${id}/history`) });

export const useRoutines = () =>
  useQuery({ queryKey: keys.routines, queryFn: () => api<RoutineDto[]>('/routines') });

export const useWorkout = (id: string) =>
  useQuery({ queryKey: keys.workout(id), queryFn: () => api<WorkoutDto>(`/routines/${id}/workout`) });

export function useSaveProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ProfileInput) => api<ProfileDto>('/profile', { method: 'PUT', body }),
    onSuccess: () =>
      Promise.all([keys.profile, keys.volume, keys.plan].map((queryKey) => qc.invalidateQueries({ queryKey }))),
  });
}

export function useSetVolume() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ muscle, weeklySets }: { muscle: Muscle; weeklySets: number }) =>
      api(`/volume/${muscle}`, { method: 'PUT', body: { weeklySets } }),
    onSuccess: () => Promise.all([keys.volume, keys.plan].map((queryKey) => qc.invalidateQueries({ queryKey }))),
  });
}

export function useCreateExercise() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: NewExercise) => api<ExerciseDto>('/exercises', { method: 'POST', body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.exercises }),
  });
}

/** Anotación e incremento del usuario para un ejercicio. */
export function useUpdateExerciseSettings(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<ExerciseSettingsDto>) =>
      api<ExerciseSettingsDto>(`/exercises/${id}/settings`, { method: 'PUT', body }),
    // La anotación y el objetivo se muestran en el ejercicio, el catálogo y los entrenamientos.
    onSuccess: () => Promise.all([keys.exercises, keys.routines].map((queryKey) => qc.invalidateQueries({ queryKey }))),
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
    mutationFn: (body: NewSession) => api<LoggedSessionDto>('/sessions', { method: 'POST', body }),
    // Al registrar cambian el objetivo de la próxima sesión, el historial, el volumen y quizás el plan (ajustes).
    onSuccess: () =>
      Promise.all(
        [keys.exercises, keys.routines, keys.volume, keys.plan].map((queryKey) => qc.invalidateQueries({ queryKey })),
      ),
  });
}

/** Aceptar o descartar una sugerencia de volumen. */
export function useResolveChange() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'accept' | 'dismiss' }) =>
      api(`/volume/changes/${id}/${action}`, { method: 'POST' }),
    onSuccess: () => Promise.all([keys.volume, keys.plan].map((queryKey) => qc.invalidateQueries({ queryKey }))),
  });
}

/** Arrancar o descartar una semana de descarga propuesta. */
export function useResolveDeload() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'start' | 'dismiss' }) =>
      api(`/volume/deload/${id}/${action}`, { method: 'POST' }),
    // Cambia el volumen de la semana y el objetivo de cada entrenamiento.
    onSuccess: () =>
      Promise.all([keys.volume, keys.plan, keys.routines].map((queryKey) => qc.invalidateQueries({ queryKey }))),
  });
}
