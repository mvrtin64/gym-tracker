import { describe, expect, it } from 'vitest';
import { computeNextTarget, type ExercisePerformance, type ProgressionScheme } from '../src';

const scheme: ProgressionScheme = {
  sets: 3,
  repRange: { min: 8, max: 12 },
  weightIncrementKg: 2.5,
  deloadFactor: 0.9,
  failuresBeforeDeload: 2,
  startingWeightKg: 40,
};

let day = 1;
function session(weightKg: number, reps: number[], warmups: number[] = []): ExercisePerformance {
  return {
    performedAt: new Date(2026, 0, day++),
    sets: [
      ...warmups.map((w) => ({ weightKg: w, reps: 10, warmup: true })),
      ...reps.map((r) => ({ weightKg, reps: r })),
    ],
  };
}

describe('computeNextTarget', () => {
  it('sin historial usa el peso inicial y el mínimo de reps', () => {
    const t = computeNextTarget(scheme, []);
    expect(t).toMatchObject({ decision: 'start', weightKg: 40, reps: 8, sets: 3 });
  });

  it('sube el peso al completar el máximo en todas las series', () => {
    const t = computeNextTarget(scheme, [session(40, [12, 12, 12])]);
    expect(t).toMatchObject({ decision: 'increase_weight', weightKg: 42.5, reps: 8 });
  });

  it('sube el peso si supera el máximo en todas las series', () => {
    const t = computeNextTarget(scheme, [session(40, [14, 13, 12])]);
    expect(t).toMatchObject({ decision: 'increase_weight', weightKg: 42.5, reps: 8 });
  });

  it('no sube el peso si una sola serie queda bajo el máximo', () => {
    const t = computeNextTarget(scheme, [session(40, [13, 12, 11])]);
    expect(t).toMatchObject({ decision: 'increase_reps', weightKg: 40, reps: 12 });
  });

  it('busca una rep más cuando está dentro del rango', () => {
    const t = computeNextTarget(scheme, [session(40, [10, 9, 9])]);
    expect(t).toMatchObject({ decision: 'increase_reps', weightKg: 40, reps: 10 });
  });

  it('repite el peso tras un fallo', () => {
    const t = computeNextTarget(scheme, [session(40, [9, 8, 6])]);
    expect(t).toMatchObject({ decision: 'repeat', weightKg: 40, reps: 8 });
  });

  it('descarga tras fallos seguidos con el mismo peso, redondeando al paso', () => {
    const t = computeNextTarget(scheme, [session(60, [8, 7, 6]), session(60, [7, 7, 6])]);
    expect(t).toMatchObject({ decision: 'deload', weightKg: 55, reps: 8 });
  });

  it('no cuenta fallos con otro peso para la descarga', () => {
    const t = computeNextTarget(scheme, [session(57.5, [8, 7, 6]), session(60, [7, 7, 6])]);
    expect(t.decision).toBe('repeat');
  });

  it('usa la sesión más reciente aunque el historial venga desordenado', () => {
    const newer = session(42.5, [12, 12, 12]);
    const older = session(40, [8, 8, 8]);
    older.performedAt = new Date(2025, 0, 1);
    expect(computeNextTarget(scheme, [newer, older]).weightKg).toBe(45);
  });

  it('ignora las series de calentamiento', () => {
    const t = computeNextTarget(scheme, [session(40, [12, 12, 12], [20, 30])]);
    expect(t.decision).toBe('increase_weight');
  });

  it('cuenta como fallo hacer menos series de las previstas', () => {
    const t = computeNextTarget(scheme, [session(40, [12, 12])]);
    expect(t.decision).toBe('repeat');
  });

  it('rechaza esquemas inválidos', () => {
    expect(() => computeNextTarget({ ...scheme, repRange: { min: 10, max: 8 } }, [])).toThrow();
  });
});
