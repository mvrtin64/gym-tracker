import { describe, expect, it } from 'vitest';
import { comparePerformance, compareSet, type SetLog } from '../src';

const sets = (weightKg: number, reps: number[]): SetLog[] => reps.map((r) => ({ weightKg, reps: r }));

describe('comparePerformance', () => {
  it('sin sesión anterior es "new"', () => {
    expect(comparePerformance(sets(40, [8, 8]), null).status).toBe('new');
  });

  it('progresa si sube el peso máximo, aunque baje las reps', () => {
    const c = comparePerformance(sets(42.5, [8, 8, 7]), sets(40, [12, 12, 12]));
    expect(c).toMatchObject({ status: 'improved', topWeightDeltaKg: 2.5 });
    expect(c.summary).toContain('+2.5 kg');
  });

  it('con el mismo peso compara el total de reps', () => {
    expect(comparePerformance(sets(40, [10, 9, 9]), sets(40, [9, 9, 8])).status).toBe('improved');
    expect(comparePerformance(sets(40, [9, 9, 8]), sets(40, [9, 9, 8])).status).toBe('same');
    expect(comparePerformance(sets(40, [9, 8, 6]), sets(40, [9, 9, 8])).status).toBe('regressed');
  });

  it('una descarga cuenta como retroceso', () => {
    expect(comparePerformance(sets(55, [8, 8, 8]), sets(60, [7, 7, 6])).status).toBe('regressed');
  });

  it('ignora calentamientos y empareja serie por serie', () => {
    const c = comparePerformance(
      [{ weightKg: 20, reps: 10, warmup: true }, ...sets(40, [10, 8])],
      sets(40, [9, 9, 9]),
    );
    expect(c.sets.map((s) => s.repsDelta)).toEqual([1, -1]);
    expect(c.volumeDeltaKg).toBe(40 * 18 - 40 * 27);
  });
});

describe('compareSet', () => {
  it('manda el peso sobre las reps', () => {
    expect(compareSet({ weightKg: 42.5, reps: 6 }, { weightKg: 40, reps: 10 }).status).toBe('improved');
    expect(compareSet({ weightKg: 40, reps: 10 }, { weightKg: 40, reps: 10 }).status).toBe('same');
    expect(compareSet({ weightKg: 40, reps: 7 }, null).status).toBe('new');
  });
});
