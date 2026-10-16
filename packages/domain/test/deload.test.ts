import { describe, expect, it } from 'vitest';
import { deloadState, muscleHistories, muscleRecord, scaleSets, type LoggedSession } from '../src';

const day = (d: number) => new Date(2026, 9, d, 10);

describe('historial por músculo', () => {
  const session = (d: number, weightKg: number, reps: number, rir = 1, isDeload = false): LoggedSession => ({
    performedAt: day(d),
    isDeload,
    entries: [{ exerciseId: 'hip-thrust', targetMuscle: 'glutes', sets: [{ weightKg, reps, rir }, { weightKg, reps, rir }] }],
  });

  it('compara cada sesión con la vez anterior del ejercicio', () => {
    const h = muscleHistories([session(5, 100, 9), session(1, 100, 8), session(8, 100, 9)]);
    expect(h.glutes?.map((s) => s.status)).toEqual(['improved', 'same']);
    expect(h.glutes?.[0].averageRir).toBe(1);
  });

  it('ignora las sesiones de descarga, también como referencia', () => {
    const h = muscleHistories([session(1, 100, 8), session(5, 50, 8, 4, true), session(12, 100, 7)]);
    expect(h.glutes?.map((s) => s.status)).toEqual(['regressed']);
  });

  it('cuenta cada ejercicio para el músculo de esa sesión', () => {
    const h = muscleHistories([
      { performedAt: day(1), entries: [{ exerciseId: 'bulgara', targetMuscle: 'glutes', sets: [{ weightKg: 20, reps: 10 }] }] },
      { performedAt: day(4), entries: [{ exerciseId: 'bulgara', targetMuscle: 'quads', sets: [{ weightKg: 22, reps: 10 }] }] },
    ]);
    expect(h.glutes).toBeUndefined();
    expect(h.quads?.[0].status).toBe('improved');
  });
});

describe('semana de descarga y vuelta', () => {
  const base = { ...muscleRecord(10), glutes: 16, calves: 0 };
  const start = day(1);

  it('la primera semana es mitad de series', () => {
    const s = deloadState(base, start, day(3));
    expect(s.phase).toBe('deload');
    expect(s.volume.glutes).toBe(8);
    expect(s.volume.chest).toBe(5);
    expect(s.endsAt).toEqual(day(8));
  });

  it('después suma 2 series por semana hasta volver al de antes', () => {
    expect(deloadState(base, start, day(8)).volume).toMatchObject({ glutes: 10, chest: 7 });
    expect(deloadState(base, start, day(15)).volume).toMatchObject({ glutes: 12, chest: 9 });
    expect(deloadState(base, start, day(22)).volume).toMatchObject({ glutes: 14, chest: 10 });
    expect(deloadState(base, start, day(22)).phase).toBe('returning');
    // glúteos: 8 → 16 son 4 semanas de vuelta.
    expect(deloadState(base, start, day(29)).phase).toBe('done');
    expect(deloadState(base, start, day(29)).volume).toEqual(base);
  });

  it('reparte la reducción entre los ejercicios en proporción', () => {
    expect(scaleSets(3, 8, 16)).toBe(2);
    expect(scaleSets(4, 8, 16)).toBe(2);
    expect(scaleSets(3, 14, 16)).toBe(3);
    expect(scaleSets(2, 1, 16)).toBe(1);
    expect(scaleSets(3, 16, 16)).toBe(3);
  });
});
