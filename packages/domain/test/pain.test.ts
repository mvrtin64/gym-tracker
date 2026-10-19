import { describe, expect, it } from 'vitest';
import { decideJointPain, decideSoreness, painWeight } from '../src';

describe('dolor articular', () => {
  it('sin dolor o leve no hace nada', () => {
    expect(decideJointPain([])).toEqual({ kind: 'none' });
    expect(decideJointPain(['none', 'severe'])).toEqual({ kind: 'none' });
    expect(decideJointPain(['mild', 'mild'])).toEqual({ kind: 'none' });
  });

  it('moderado o mucho la primera vez solo avisa', () => {
    expect(decideJointPain(['moderate']).kind).toBe('warn');
    expect(decideJointPain(['severe', 'mild']).kind).toBe('warn');
    expect(decideJointPain(['moderate', null]).kind).toBe('warn');
  });

  it('si se repite, actúa según la última respuesta', () => {
    expect(decideJointPain(['moderate', 'moderate']).kind).toBe('lower_weight');
    expect(decideJointPain(['severe', 'severe']).kind).toBe('swap');
    expect(decideJointPain(['severe', 'moderate']).kind).toBe('swap');
    expect(decideJointPain(['moderate', 'severe']).kind).toBe('lower_weight');
  });

  it('baja el peso un 10% redondeado al incremento', () => {
    expect(painWeight(60, 2.5)).toBe(55);
    expect(painWeight(40, 2.5)).toBe(35);
  });
});

describe('agujetas', () => {
  it('todavía me duele 2 veces seguidas → −1 serie', () => {
    expect(decideSoreness(['still_sore', 'still_sore'])).toMatchObject({ kind: 'reduce', delta: -1 });
  });

  it('una sola vez, o con otra respuesta en el medio, no toca nada', () => {
    expect(decideSoreness(['still_sore'])).toEqual({ kind: 'keep' });
    expect(decideSoreness(['still_sore', 'healed_just_in_time', 'still_sore'])).toEqual({ kind: 'keep' });
    expect(decideSoreness(['never_sore', 'never_sore'])).toEqual({ kind: 'keep' });
  });
});
