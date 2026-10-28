import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { useApi, type Call } from './helpers';

const api = useApi();
const DAY_MS = 24 * 60 * 60 * 1000;
const daysAgo = (n: number) => new Date(Date.now() - n * DAY_MS).toISOString();

async function setup(): Promise<{ call: Call; routine: any }> {
  const { call } = await api.user();
  await call('PUT', '/profile', { level: 'beginner', trainingDays: ['mon'] });
  const [routine] = (await call('POST', '/routines/generate')).body;
  return { call, routine };
}

/** Lo que la app propone para el primer ejercicio de la rutina. */
async function firstExercise(call: Call, routineId: string) {
  return (await call('GET', `/routines/${routineId}/workout`)).body.exercises[0];
}

/** Registra solo el primer ejercicio, con las reps de cada serie. */
async function log(call: Call, routine: any, weightKg: number, reps: number[], when: string) {
  const res = await call('POST', '/sessions', {
    routineId: routine.id,
    performedAt: when,
    entries: [{ exerciseId: routine.exercises[0].exercise.id, sets: reps.map((r) => ({ weightKg, reps: r, feel: 'one_two_left' })) }],
  });
  assert.equal(res.status, 201);
  return res.body;
}

describe('sobrecarga progresiva (§6.1)', () => {
  it('todas las series al tope del rango: sube el mínimo de peso y vuelve al mínimo de reps', async () => {
    const { call, routine } = await setup();
    const { prescription } = await firstExercise(call, routine.id);
    await log(call, routine, 40, Array(prescription.sets).fill(prescription.repMax), daysAgo(2));

    const { target } = await firstExercise(call, routine.id);
    assert.equal(target.decision, 'increase_weight');
    assert.equal(target.weightKg, 42.5);
    assert.equal(target.reps, prescription.repMin);
  });

  it('si una serie no llega al tope, no sube el peso: suma reps', async () => {
    const { call, routine } = await setup();
    const { prescription } = await firstExercise(call, routine.id);
    const reps = Array(prescription.sets).fill(prescription.repMax);
    reps[reps.length - 1] = prescription.repMax - 1;
    await log(call, routine, 40, reps, daysAgo(2));

    const { target } = await firstExercise(call, routine.id);
    assert.equal(target.decision, 'increase_reps');
    assert.equal(target.weightKg, 40);
  });

  it('progresar no le suma series ni ejercicios a la rutina', async () => {
    const { call, routine } = await setup();
    const { prescription } = await firstExercise(call, routine.id);
    for (const [i, kg] of [40, 42.5, 45].entries()) {
      const { review } = await log(call, routine, kg, Array(prescription.sets).fill(prescription.repMax), daysAgo(6 - i * 2));
      assert.equal(review.growth, undefined);
    }
    const after = (await call('GET', '/routines')).body.find((r: any) => r.id === routine.id);
    assert.deepEqual(
      after.exercises.map((e: any) => `${e.exercise.id}×${e.sets}`),
      routine.exercises.map((e: any) => `${e.exercise.id}×${e.sets}`),
    );
  });
});

describe('sugerencia de pasar a intermedio (§5.5)', () => {
  it('a los 3 meses de la primera sesión se sugiere; "ahora no" la pospone', async () => {
    const { call, routine } = await setup();
    assert.equal((await call('GET', '/profile')).body.levelUpSuggested, false);

    await log(call, routine, 40, [8], daysAgo(100));
    assert.equal((await call('GET', '/profile')).body.levelUpSuggested, true);

    assert.equal((await call('POST', '/profile/level-up/dismiss')).status, 204);
    assert.equal((await call('GET', '/profile')).body.levelUpSuggested, false);
  });
});
