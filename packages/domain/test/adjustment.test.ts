import { describe, expect, it } from 'vitest';
import {
  averageRir,
  decideMuscleVolume,
  deloadVolume,
  deloadWeight,
  detectGeneralStagnation,
  MUSCLES,
  muscleRecord,
  muscleSessionStatus,
  returnFromDeload,
  type MuscleSession,
} from '../src';

const s = (day: number, status: MuscleSession['status'], averageRir: number | null = 1): MuscleSession => ({
  performedAt: new Date(2026, 9, day),
  status,
  averageRir,
});

describe('estado de un músculo en una sesión', () => {
  it('resume la comparación de sus ejercicios', () => {
    expect(muscleSessionStatus(['improved', 'same'])).toBe('improved');
    expect(muscleSessionStatus(['regressed', 'same'])).toBe('regressed');
    expect(muscleSessionStatus(['improved', 'regressed'])).toBe('same');
    expect(muscleSessionStatus(['new'])).toBeNull();
  });

  it('promedia el RIR de las series efectivas registradas', () => {
    expect(averageRir([{ weightKg: 20, reps: 10, warmup: true, rir: 5 }, { weightKg: 40, reps: 8, rir: 1 }, { weightKg: 40, reps: 8, rir: 2 }])).toBe(1.5);
    expect(averageRir([{ weightKg: 40, reps: 8 }])).toBeNull();
  });
});

describe('ajuste de volumen por músculo', () => {
  it('no toca nada sin sesiones suficientes', () => {
    expect(decideMuscleVolume([s(1, 'same')]).kind).toBe('keep');
  });

  it('no toca nada si progresó en alguna de las últimas 2', () => {
    expect(decideMuscleVolume([s(1, 'same'), s(4, 'improved')]).kind).toBe('keep');
  });

  it('2 sesiones estancado con RIR 0–2: −1 serie y revisar esfuerzo y técnica', () => {
    const d = decideMuscleVolume([s(1, 'same'), s(4, 'same')]);
    expect(d).toMatchObject({ kind: 'reduce', delta: -1 });
    expect(d.reason).toMatch(/técnica/);
  });

  it('si además retrocedió: −2 series', () => {
    expect(decideMuscleVolume([s(1, 'same'), s(4, 'regressed')])).toMatchObject({ kind: 'reduce', delta: -2 });
  });

  it('estancado pero con RIR alto: no baja volumen, exige apretar más', () => {
    expect(decideMuscleVolume([s(1, 'same', 4), s(4, 'same', 1)]).kind).toBe('push_harder');
  });

  it('solo mira las últimas 2 sesiones', () => {
    expect(decideMuscleVolume([s(1, 'improved'), s(4, 'same'), s(8, 'same')]).kind).toBe('reduce');
  });
});

describe('estancamiento general y semana de descarga', () => {
  const now = new Date(2026, 9, 15);

  it('descarga si 3 de cada 4 grupos no avanzan en 2 semanas', () => {
    const byMuscle = { chest: [s(5, 'same'), s(12, 'same')], lats: [s(6, 'same'), s(13, 'regressed')], quads: [s(5, 'same'), s(12, 'same')], glutes: [s(6, 'improved'), s(13, 'same')] };
    const g = detectGeneralStagnation(byMuscle, now);
    expect(g).toMatchObject({ deload: true, evaluated: ['chest', 'lats', 'quads', 'glutes'], stalled: ['chest', 'lats', 'quads'] });
  });

  it('no descarga si avanza la mitad', () => {
    const byMuscle = { chest: [s(5, 'same'), s(12, 'same')], lats: [s(6, 'same'), s(13, 'same')], quads: [s(5, 'improved'), s(12, 'same')], glutes: [s(6, 'improved'), s(13, 'same')] };
    expect(detectGeneralStagnation(byMuscle, now).deload).toBe(false);
  });

  it('no decide con pocos grupos evaluados ni con sesiones fuera de la ventana', () => {
    const byMuscle = { chest: [s(5, 'same'), s(12, 'same')], lats: [s(6, 'same'), s(13, 'same')], quads: [s(1, 'same'), s(12, 'same')] };
    const g = detectGeneralStagnation(byMuscle, now);
    expect(g.evaluated).toEqual(['chest', 'lats']);
    expect(g.deload).toBe(false);
  });

  it('semana de descarga: mitad de series y mitad de peso', () => {
    const v = deloadVolume({ ...muscleRecord(12), biceps: 7, abs: 1 });
    expect(v.chest).toBe(6);
    expect(v.biceps).toBe(4);
    expect(v.abs).toBe(1);
    expect(deloadWeight(62.5, 2.5)).toBe(32.5);
  });

  it('vuelve de a poco: +2 series por semana hasta el volumen anterior', () => {
    const target = { ...muscleRecord(12), biceps: 7 };
    let week = deloadVolume(target);
    const chest: number[] = [];
    for (let i = 0; i < 4; i++) {
      week = returnFromDeload(week, target);
      chest.push(week.chest);
    }
    expect(chest).toEqual([8, 10, 12, 12]);
    expect(week.biceps).toBe(7);
    expect(MUSCLES.every((m) => week[m] === target[m])).toBe(true);
  });
});
