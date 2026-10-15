import { describe, expect, it } from 'vitest';
import {
  areConsecutive,
  dayKinds,
  initialVolume,
  MUSCLES,
  muscleRecord,
  planWeek,
  splitIntoExercises,
  WEEKDAYS,
  type Muscle,
  type TrainingProfile,
  type WeekPlan,
  type Weekday,
} from '../src';

/** El ejemplo de docs/dominio.md: intermedio que prioriza glúteo y pocas series de tren superior. */
const volume = {
  ...muscleRecord(0),
  glutes: 12,
  quads: 9,
  hamstrings: 8,
  calves: 6,
  abs: 4,
  chest: 6,
  lats: 6,
  side_delt: 6,
  upper_back: 4,
  rear_delt: 4,
  biceps: 4,
  triceps: 4,
};

const lowerFocus = (trainingDays: Weekday[]): TrainingProfile => ({
  level: 'intermediate',
  trainingDays,
  focus: 'lower',
  priorityMuscles: ['glutes'],
});

const daysOf = (plan: WeekPlan, muscle: Muscle) =>
  plan.days.filter((d) => d.muscles.some((m) => m.muscle === muscle)).map((d) => d.weekday);
const setsOf = (plan: WeekPlan, muscle: Muscle) =>
  plan.days.flatMap((d) => d.muscles.filter((m) => m.muscle === muscle).map((m) => m.sets));

describe('helpers del planificador', () => {
  it('domingo y lunes son días seguidos', () => {
    expect(areConsecutive('sun', 'mon')).toBe(true);
    expect(areConsecutive('mon', 'wed')).toBe(false);
  });

  it('reparte las series de un día en ejercicios de ~3', () => {
    expect([1, 2, 3, 4, 5, 6, 7, 8].map(splitIntoExercises)).toEqual([[1], [2], [3], [2, 2], [3, 2], [3, 3], [3, 2, 2], [3, 3, 2]]);
  });

  it('tipo de día según cantidad y prioridad', () => {
    expect(dayKinds(3, null)).toEqual(['full', 'full', 'full']);
    expect(dayKinds(3, 'lower')).toEqual(['lower', 'upper', 'lower']);
    expect(dayKinds(4, 'upper')).toEqual(['upper', 'lower', 'upper', 'lower']);
  });
});

describe('planWeek', () => {
  it('caso A (lun, mar, jue, vie): el glúteo no llega a frecuencia 3 sin días seguidos → 6 + 6', () => {
    const plan = planWeek(lowerFocus(['mon', 'tue', 'thu', 'fri']), volume);
    expect(plan.days.map((d) => d.kind)).toEqual(['lower', 'upper', 'lower', 'upper']);
    expect(daysOf(plan, 'glutes')).toEqual(['mon', 'thu']);
    expect(setsOf(plan, 'glutes')).toEqual([6, 6]);
    expect(plan.frequencyChanges).toEqual([
      { muscle: 'glutes', ideal: 3, actual: 2, reason: 'con los días elegidos tendría que entrenarse en días seguidos' },
    ]);
  });

  it('caso B (lun, mié, vie, sáb): glúteo 3 veces, con el estímulo extra en un día de superior', () => {
    const plan = planWeek(lowerFocus(['sat', 'mon', 'fri', 'wed']), volume);
    expect(plan.days.map((d) => `${d.weekday}:${d.kind}`)).toEqual(['mon:lower', 'wed:upper', 'fri:lower', 'sat:upper']);
    expect(daysOf(plan, 'glutes')).toEqual(['mon', 'wed', 'fri']);
    expect(setsOf(plan, 'glutes')).toEqual([4, 4, 4]);
    expect(daysOf(plan, 'chest')).toEqual(['wed', 'sat']);
    expect(plan.frequencyChanges).toEqual([]);
  });

  it('lo que sobra va al día de énfasis y cada día se divide en ejercicios', () => {
    const plan = planWeek(lowerFocus(['mon', 'tue', 'thu', 'fri']), volume);
    expect(setsOf(plan, 'quads')).toEqual([5, 4]);
    const glutesMonday = plan.days[0].muscles.find((m) => m.muscle === 'glutes');
    expect(glutesMonday?.exerciseSets).toEqual([3, 3]);
  });

  it('baja la frecuencia si al repartir no llega al mínimo por día', () => {
    const plan = planWeek(lowerFocus(['mon', 'wed', 'fri']), { ...volume, biceps: 3, front_delt: 4 });
    expect(setsOf(plan, 'biceps')).toEqual([3]);
    expect(setsOf(plan, 'front_delt')).toEqual([4]); // mínimo 3 por sesión
    expect(plan.frequencyChanges.map((c) => c.muscle)).toEqual(['front_delt', 'biceps']);
  });

  it('principiante: cuerpo completo, todo con frecuencia 2 y nada priorizado', () => {
    const profile: TrainingProfile = { level: 'beginner', trainingDays: ['mon', 'wed', 'fri'], focus: 'lower', priorityMuscles: ['glutes'] };
    const plan = planWeek(profile, initialVolume(profile));
    expect(plan.days.every((d) => d.kind === 'full')).toBe(true);
    for (const m of MUSCLES) expect(setsOf(plan, m)).toEqual([7, 7]);
  });

  it('1 día: todo en un full body', () => {
    const plan = planWeek({ ...lowerFocus(['tue']), focus: 'general', priorityMuscles: [] }, volume);
    expect(plan.days).toHaveLength(1);
    expect(plan.days[0].totalSets).toBe(Object.values(volume).reduce((a, b) => a + b, 0));
  });

  describe('invariantes con todas las combinaciones de días', () => {
    const subsets = Array.from({ length: 1 << 7 }, (_, mask) => WEEKDAYS.filter((_, i) => mask & (1 << i))).filter(
      (d) => d.length >= 1 && d.length <= 6,
    );
    const profiles: TrainingProfile[] = subsets.flatMap((trainingDays) => [
      lowerFocus(trainingDays),
      { level: 'advanced', trainingDays, focus: 'upper', priorityMuscles: ['side_delt', 'lats'] },
      { level: 'intermediate', trainingDays, focus: 'general', priorityMuscles: [] },
    ]);

    it('nunca pone un músculo en días seguidos, respeta el volumen semanal y no supera la frecuencia ideal', () => {
      for (const profile of profiles) {
        const plan = planWeek(profile, volume);
        for (const m of MUSCLES) {
          const days = daysOf(plan, m);
          for (let i = 0; i < days.length; i++)
            for (let j = i + 1; j < days.length; j++) expect(areConsecutive(days[i], days[j])).toBe(false);
          expect(setsOf(plan, m).reduce((a, b) => a + b, 0)).toBe(volume[m]);
          expect(days.length).toBeLessThanOrEqual(profile.priorityMuscles.includes(m) ? 3 : 2);
        }
      }
    });
  });
});
