import { describe, expect, it } from 'vitest';
import { decideBeginnerGrowth, growthExercise, placeGrowth, type CatalogExercise, type GrowthSlot, type MuscleSession } from '../src';

const day = (d: number) => new Date(2026, 9, d);
const improved = (d: number, averageRir: number | null = 1): MuscleSession => ({ performedAt: day(d), status: 'improved', averageRir });
const slot = (routineId: string, exerciseId: string, sets: number, routineSets: number, position = 0): GrowthSlot => ({
  routineId,
  exerciseId,
  sets,
  routineSets,
  position,
});

describe('crecimiento del principiante', () => {
  it('dos sesiones seguidas progresando cerca del fallo → +1 serie por semana', () => {
    expect(decideBeginnerGrowth([improved(1), improved(3)]).kind).toBe('grow');
  });

  it('una sola sesión, o una sin progresar entre las dos últimas → nada', () => {
    expect(decideBeginnerGrowth([improved(3)]).kind).toBe('keep');
    expect(decideBeginnerGrowth([improved(1), { ...improved(3), status: 'same' }]).kind).toBe('keep');
    // Lo que pasó antes de las dos últimas no importa.
    expect(decideBeginnerGrowth([{ ...improved(1), status: 'regressed' }, improved(3), improved(5)]).kind).toBe('grow');
  });

  it('progresa pero le sobra (RIR alto o sin registrar) → nada: primero apretar más', () => {
    expect(decideBeginnerGrowth([improved(1, 4), improved(3)]).kind).toBe('keep');
    expect(decideBeginnerGrowth([improved(1, null), improved(3)]).kind).toBe('keep');
  });
});

describe('dónde va la serie que se suma', () => {
  it('al ejercicio del músculo con menos series de la semana', () => {
    const placement = placeGrowth([slot('lun', 'press', 4, 18), slot('vie', 'pec', 3, 20)], new Set());
    expect(placement).toEqual({ kind: 'add_set', slot: expect.objectContaining({ exerciseId: 'pec' }) });
  });

  it('si empatan, en el día más liviano', () => {
    const placement = placeGrowth([slot('lun', 'press', 3, 20), slot('vie', 'barra', 3, 18)], new Set());
    expect(placement).toEqual({ kind: 'add_set', slot: expect.objectContaining({ routineId: 'vie' }) });
  });

  it('todos con 4 → un ejercicio nuevo en el día más liviano que lo admita', () => {
    const slots = [slot('lun', 'press', 4, 17), slot('vie', 'barra', 4, 18)];
    expect(placeGrowth(slots, new Set())).toEqual({ kind: 'add_exercise', from: expect.objectContaining({ routineId: 'lun' }) });
    expect(placeGrowth(slots, new Set(['lun']))).toEqual({ kind: 'add_exercise', from: expect.objectContaining({ routineId: 'vie' }) });
    expect(placeGrowth(slots, new Set(['lun', 'vie']))).toBeNull();
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
