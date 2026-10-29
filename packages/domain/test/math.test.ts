import { describe, expect, it } from 'vitest';
import { estimateOneRepMax, roundToStep, totalVolume, workingWeight } from '../src';

describe('math', () => {
  it('redondea al paso de discos', () => {
    expect(roundToStep(54, 2.5)).toBe(55);
    expect(roundToStep(53.6, 1.25)).toBe(53.75);
  });

  it('estima 1RM con Epley', () => {
    expect(estimateOneRepMax(100, 1)).toBe(100);
    expect(estimateOneRepMax(100, 10)).toBe(133.3);
  });

  it('suma volumen sin calentamientos', () => {
    expect(totalVolume([{ weightKg: 20, reps: 10, warmup: true }, { weightKg: 50, reps: 8 }, { weightKg: 50, reps: 6 }])).toBe(700);
  });

  it('el peso de trabajo es el de la serie efectiva más pesada', () => {
    expect(workingWeight([{ weightKg: 60, reps: 3, warmup: true }, { weightKg: 50, reps: 8 }, { weightKg: 52.5, reps: 6 }])).toBe(52.5);
    expect(workingWeight([{ weightKg: 20, reps: 10, warmup: true }])).toBeUndefined();
  });
});
