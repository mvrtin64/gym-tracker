import { describe, expect, it } from 'vitest';
import { effortCue, FEEL_RIR, isInTargetZone, rirFromFeedback, rirFromRpe } from '../src';

describe('RIR', () => {
  it('estima el RIR del principiante a partir de la sensación', () => {
    expect(FEEL_RIR).toEqual({ failure: 0, one_two_left: 1, several_left: 3, very_easy: 5 });
    expect(rirFromFeedback({ feel: 'several_left' })).toBe(3);
  });

  it('calcula RIR = 10 − RPE para intermedio/avanzado', () => {
    expect(rirFromRpe(8)).toBe(2);
    expect(rirFromRpe(9.5)).toBe(0.5);
    expect(rirFromFeedback({ rpe: 10 })).toBe(0);
  });

  it('rechaza RPE fuera de 1–10', () => {
    expect(() => rirFromRpe(0)).toThrow();
    expect(() => rirFromRpe(11)).toThrow();
  });

  it('sin respuesta no hay RIR', () => {
    expect(rirFromFeedback({})).toBeNull();
  });

  it('la zona objetivo es RIR 0–2', () => {
    expect(isInTargetZone(0)).toBe(true);
    expect(isInTargetZone(2)).toBe(true);
    expect(isInTargetZone(3)).toBe(false);
  });

  it('exige apretar más solo cuando le quedó resto', () => {
    expect(effortCue(1)).toBeNull();
    expect(effortCue(4)).toMatch(/apretá/);
  });
});
