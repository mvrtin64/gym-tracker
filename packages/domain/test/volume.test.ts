import { describe, expect, it } from 'vitest';
import { beginnerVolume, initialVolume, MUSCLES, muscleRecord, weeklySetsByMuscle, type TrainingProfile } from '../src';

const beginner: TrainingProfile = {
  level: 'beginner',
  trainingDays: ['mon', 'wed', 'fri'],
  focus: 'lower',
  priorityMuscles: ['glutes'],
};

describe('volumen inicial', () => {
  it('principiante: lo que suman sus días, aunque haya pedido priorizar', () => {
    expect(initialVolume(beginner)).toEqual(beginnerVolume(beginner.trainingDays));
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

  it('con `muscles` (principiante), cada serie cuenta completa para todos', () => {
    const v = weeklySetsByMuscle(
      [{ performedAt: from, targetMuscle: 'chest', muscles: ['chest', 'front_delt', 'triceps'], sets: [{ weightKg: 20, reps: 10 }] }],
      from,
      to,
    );
    expect([v.chest, v.front_delt, v.triceps, v.biceps]).toEqual([1, 1, 1, 0]);
  });
});
