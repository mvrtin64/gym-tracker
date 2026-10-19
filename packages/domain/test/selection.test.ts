import { describe, expect, it } from 'vitest';
import { generateRoutines, selectExercises, splitIntoExercises, type CatalogExercise, type WeekPlan } from '../src';

const ex = (name: string, type: CatalogExercise['type'], ...targetMuscles: CatalogExercise['targetMuscles']): CatalogExercise => ({
  id: name,
  name,
  type,
  targetMuscles,
});

const CATALOG: CatalogExercise[] = [
  ex('Press banca', 'compound', 'chest'),
  ex('Press inclinado con mancuernas', 'compound', 'chest'),
  ex('Press inclinado con barra', 'compound', 'chest'),
  ex('Fondos en paralelas', 'compound', 'chest', 'triceps'),
  ex('Aperturas en polea', 'isolation', 'chest'),
  ex('Pec deck', 'isolation', 'chest'),
  ex('Face pull', 'isolation', 'rear_delt', 'upper_back'),
  ex('Pájaros con mancuernas', 'isolation', 'rear_delt'),
  ex('Remo con barra', 'compound', 'upper_back', 'lats'),
  ex('Remo sentado en polea', 'compound', 'upper_back', 'lats'),
  ex('Extensión de tríceps en polea', 'isolation', 'triceps'),
];

const names = (picked: { exerciseId: string; sets: number }[]) => picked.map((p) => `${p.exerciseId} ×${p.sets}`);

describe('selección de ejercicios', () => {
  it('nunca más de 3 ejercicios por músculo', () => {
    expect(splitIntoExercises(10)).toEqual([4, 3, 3]);
    expect(splitIntoExercises(13)).toEqual([5, 4, 4]);
  });

  it('pocas series → un solo ejercicio, el multiarticular recomendado', () => {
    expect(names(selectExercises('chest', [3], CATALOG, new Set()))).toEqual(['Press inclinado con mancuernas ×3']);
  });

  it('pecho: press inclinado + pec fly; con 3, dos multiarticulares y un aislamiento', () => {
    expect(names(selectExercises('chest', [3, 3], CATALOG, new Set()))).toEqual([
      'Press inclinado con mancuernas ×3',
      'Pec deck ×3',
    ]);
    expect(names(selectExercises('chest', [3, 2, 2], CATALOG, new Set()))).toEqual([
      'Press inclinado con mancuernas ×3',
      'Press inclinado con barra ×2',
      'Pec deck ×2',
    ]);
  });

  it('sin multiarticulares para el músculo, todo aislamiento', () => {
    expect(names(selectExercises('rear_delt', [2, 2], CATALOG, new Set()))).toEqual([
      'Pájaros con mancuernas ×2',
      'Face pull ×2',
    ]);
  });

  it('no repite un ejercicio en el mismo día y reparte las series si faltan ejercicios', () => {
    const used = new Set<string>();
    selectExercises('rear_delt', [2, 2], CATALOG, used);
    // Face pull ya se usó: a espalda alta le quedan los dos remos.
    expect(names(selectExercises('upper_back', [3, 2, 2], CATALOG, used))).toEqual([
      'Remo con barra ×4',
      'Remo sentado en polea ×3',
    ]);
  });

  it('genera una rutina por día con series', () => {
    const plan: WeekPlan = {
      frequencyChanges: [],
      days: [
        { weekday: 'mon', kind: 'upper', totalSets: 9, muscles: [
          { muscle: 'chest', sets: 6, exerciseSets: [3, 3] },
          { muscle: 'triceps', sets: 3, exerciseSets: [3] },
        ] },
        { weekday: 'wed', kind: 'lower', totalSets: 0, muscles: [] },
      ],
    };
    const routines = generateRoutines(plan, CATALOG);
    expect(routines).toHaveLength(1);
    expect(routines[0].exercises.map((e) => `${e.muscle}: ${e.exerciseId}`)).toEqual([
      'chest: Press inclinado con mancuernas',
      'chest: Pec deck',
      'triceps: Extensión de tríceps en polea',
    ]);
  });
});
