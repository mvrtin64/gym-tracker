import { describe, expect, it } from 'vitest';
import {
  decideBeginnerGrowth,
  exerciseHistory,
  growthExercise,
  type CatalogExercise,
  type ExerciseSession,
  type LoggedSession,
} from '../src';

const day = (d: number) => new Date(2026, 9, d);
const session = (d: number, weightKg: number, reps: number, rir = 1): LoggedSession => ({
  performedAt: day(d),
  entries: [{ exerciseId: 'press', targetMuscle: 'chest', sets: [{ weightKg, reps, rir }, { weightKg, reps, rir }] }],
});
const improved = (d: number, averageRir: number | null = 1): ExerciseSession => ({ performedAt: day(d), status: 'improved', averageRir });

describe('crecimiento del principiante', () => {
  it('historia del ejercicio: cada vez contra la anterior, sin la primera', () => {
    const history = exerciseHistory([session(5, 40, 8), session(1, 40, 6), session(3, 40, 6)], 'press');
    expect(history.map((h) => h.status)).toEqual(['same', 'improved']);
  });

  it('dos sesiones seguidas progresando cerca del fallo → una serie más', () => {
    expect(decideBeginnerGrowth([improved(1), improved(3)], 3).kind).toBe('add_set');
  });

  it('con 4 series → otro ejercicio para el mismo músculo', () => {
    expect(decideBeginnerGrowth([improved(1), improved(3)], 4).kind).toBe('add_exercise');
  });

  it('una sola sesión, o una sin progresar entre las dos últimas → nada', () => {
    expect(decideBeginnerGrowth([improved(3)], 3).kind).toBe('keep');
    expect(decideBeginnerGrowth([improved(1), { ...improved(3), status: 'same' }], 3).kind).toBe('keep');
    // Lo que pasó antes de las dos últimas no importa.
    expect(decideBeginnerGrowth([{ ...improved(1), status: 'regressed' }, improved(3), improved(5)], 3).kind).toBe('add_set');
  });

  it('progresa pero le sobra (RIR alto o sin registrar) → nada: primero apretar más', () => {
    expect(decideBeginnerGrowth([improved(1, 4), improved(3)], 3).kind).toBe('keep');
    expect(decideBeginnerGrowth([improved(1, null), improved(3)], 3).kind).toBe('keep');
  });

  it('el ejercicio que se suma: un analítico recomendado que no esté en la rutina', () => {
    const catalog: CatalogExercise[] = [
      { id: 'inc', name: 'Press inclinado con mancuernas', type: 'compound', targetMuscles: ['chest'] },
      { id: 'cable', name: 'Aperturas en polea', type: 'isolation', targetMuscles: ['chest'] },
      { id: 'deck', name: 'Pec deck', type: 'isolation', targetMuscles: ['chest'] },
    ];
    expect(growthExercise('chest', catalog, new Set(['inc']))?.name).toBe('Pec deck');
    expect(growthExercise('chest', catalog, new Set(['inc', 'deck']))?.name).toBe('Aperturas en polea');
    expect(growthExercise('chest', catalog, new Set(['cable', 'deck']))?.name).toBe('Press inclinado con mancuernas');
    expect(growthExercise('chest', catalog, new Set(['inc', 'cable', 'deck']))).toBeNull();
  });
});
