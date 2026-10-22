import { describe, expect, it } from 'vitest';
import {
  BEGINNER_DAYS,
  beginnerDays,
  beginnerPlan,
  beginnerVolume,
  COMPOUND_MUSCLES,
  generateBeginnerRoutines,
  musclesWorked,
  type CatalogExercise,
} from '../src';

describe('principiante', () => {
  it('3 días: cuerpo completo A, B y C', () => {
    expect(beginnerDays(['mon', 'wed', 'fri']).map((d) => d.day)).toEqual(['full_a', 'full_b', 'full_c']);
  });

  it('4 días: empuje, tirón, piernas y cuerpo completo; 5–6 suman superior e inferior', () => {
    expect(beginnerDays(['mon', 'tue', 'thu', 'sat']).map((d) => d.kind).sort()).toEqual(['full', 'legs', 'pull', 'push']);
    expect(beginnerDays(['mon', 'tue', 'wed', 'thu', 'fri']).map((d) => d.kind)).toEqual(['push', 'pull', 'legs', 'upper', 'lower']);
    expect(beginnerDays(['mon', 'tue', 'wed', 'thu', 'fri', 'sat']).map((d) => d.kind).sort()).toEqual(
      ['full', 'legs', 'lower', 'pull', 'push', 'upper'],
    );
  });

  it('cada día: pocos ejercicios de 3–4 series y como mucho un aislamiento por músculo', () => {
    for (const exercises of Object.values(BEGINNER_DAYS)) {
      expect(exercises.length).toBeLessThanOrEqual(5);
      for (const e of exercises) expect(e.sets).toBeGreaterThanOrEqual(3);
      for (const e of exercises) expect(e.sets).toBeLessThanOrEqual(4);
      const isolations = exercises.filter((e) => !(e.name in COMPOUND_MUSCLES)).map((e) => e.muscle);
      expect(new Set(isolations).size).toBe(isolations.length);
    }
  });

  it('el multiarticular cuenta para todos los músculos que trabaja', () => {
    expect(musclesWorked('Press inclinado con mancuernas', 'chest')).toEqual(['chest', 'front_delt', 'triceps']);
    expect(musclesWorked('Elevaciones laterales', 'side_delt')).toEqual(['side_delt']);
    // Día A con 1 día: press 4 + extensión 3 = 7 de tríceps.
    expect(beginnerVolume(['mon']).triceps).toBe(7);
  });

  it('con 3 días se tocan todos los músculos en la semana', () => {
    const volume = beginnerVolume(['mon', 'wed', 'fri']);
    for (const sets of Object.values(volume)) expect(sets).toBeGreaterThan(0);
  });

  it('la vista previa suma las series de cada día', () => {
    const plan = beginnerPlan(['fri', 'mon', 'wed']);
    expect(plan.days.map((d) => `${d.weekday}:${d.totalSets}`)).toEqual(['mon:18', 'wed:18', 'fri:18']);
  });

  it('las rutinas usan los ejercicios del catálogo y saltean los que no estén', () => {
    const catalog: CatalogExercise[] = BEGINNER_DAYS.full_a
      .filter((e) => e.name !== 'Elevaciones laterales')
      .map((e) => ({ id: `id-${e.name}`, name: e.name, type: 'compound', targetMuscles: [e.muscle] }));
    const [routine] = generateBeginnerRoutines(['tue'], catalog);
    expect(routine.weekday).toBe('tue');
    expect(routine.exercises.map((e) => `${e.exerciseId} ×${e.sets}`)).toEqual([
      'id-Sentadilla ×4',
      'id-Press inclinado con mancuernas ×4',
      'id-Jalón al pecho ×4',
      'id-Extensión de tríceps en polea ×3',
    ]);
  });
});
