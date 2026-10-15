import { describe, expect, it } from 'vitest';
import { beginnerWeeklySets, initialVolume, MUSCLES, muscleRecord, weeklySetsByMuscle, type TrainingProfile } from '../src';

const beginner: TrainingProfile = {
  level: 'beginner',
  trainingDays: ['mon', 'wed', 'fri'],
  focus: 'lower',
  priorityMuscles: ['glutes'],
};

describe('volumen inicial', () => {
  it('principiante: 12–18 series según los días', () => {
    expect([1, 2, 3, 4, 5, 6].map(beginnerWeeklySets)).toEqual([12, 12, 14, 16, 18, 18]);
    expect(() => beginnerWeeklySets(7)).toThrow();
  });

  it('principiante: el mismo volumen para todos los músculos, aunque haya pedido priorizar', () => {
    const v = initialVolume(beginner);
    expect(new Set(Object.values(v))).toEqual(new Set([14]));
  });

  it('intermedio: parte del volumen con el que dice manejarse', () => {
    const reportedVolume = { ...muscleRecord(6), chest: 8, glutes: 12 };
    const v = initialVolume({ ...beginner, level: 'intermediate', reportedVolume });
    expect(v.chest).toBe(8);
    expect(v.glutes).toBe(12);
    expect(v.biceps).toBe(6);
  });

  it('intermedio: falla si falta algún músculo', () => {
    expect(() => initialVolume({ ...beginner, level: 'intermediate', reportedVolume: { chest: 8 } })).toThrow(/falta/);
  });
});

describe('series efectivas por semana', () => {
  const from = new Date(2026, 9, 12);
  const to = new Date(2026, 9, 19);

  it('cuenta solo el músculo objetivo, sin calentamientos ni sesiones fuera de la semana', () => {
    const v = weeklySetsByMuscle(
      [
        {
          performedAt: new Date(2026, 9, 12),
          targetMuscle: 'chest',
          sets: [{ weightKg: 40, reps: 10, warmup: true }, { weightKg: 60, reps: 8 }, { weightKg: 60, reps: 8 }],
        },
        { performedAt: new Date(2026, 9, 15), targetMuscle: 'chest', sets: [{ weightKg: 60, reps: 8, rir: 4 }] },
        { performedAt: new Date(2026, 9, 19), targetMuscle: 'chest', sets: [{ weightKg: 60, reps: 8 }] },
      ],
      from,
      to,
    );
    expect(v.chest).toBe(3); // la serie con RIR 4 cuenta igual
    expect(v.triceps).toBe(0); // el press no suma volumen indirecto
    expect(Object.keys(v)).toEqual([...MUSCLES]);
  });
});
