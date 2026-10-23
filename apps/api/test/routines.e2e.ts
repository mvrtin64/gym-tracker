import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { useApi, type Call } from './helpers';

const api = useApi();

const totalSets = (routine: { exercises: { sets: number }[] }) => routine.exercises.reduce((sum, e) => sum + e.sets, 0);

async function beginner(days: string[]): Promise<{ call: Call; routines: any[] }> {
  const { call } = await api.user();
  const profile = await call('PUT', '/profile', { level: 'beginner', trainingDays: days });
  assert.equal(profile.status, 200);
  const res = await call('POST', '/routines/generate');
  assert.equal(res.status, 201);
  return { call, routines: res.body };
}

describe('rutinas del principiante (§3.5)', () => {
  it('3 días: cuerpo completo los tres, con pocas series por día', async () => {
    const { routines } = await beginner(['mon', 'wed', 'fri']);
    assert.deepEqual(routines.map((r) => r.weekday), ['mon', 'wed', 'fri']);
    for (const r of routines) {
      assert.match(r.name, /Cuerpo completo/);
      assert.equal(totalSets(r), 18);
    }
  });

  it('4 días: empuje, tirón, piernas y cuerpo completo', async () => {
    const { routines } = await beginner(['mon', 'tue', 'thu', 'sat']);
    const names = routines.map((r) => r.name).join(' | ');
    for (const kind of ['Empuje', 'Tirón', 'Piernas', 'Cuerpo completo']) assert.match(names, new RegExp(kind));
  });

  it('cambiar los días recalcula el objetivo semanal', async () => {
    const { call } = await beginner(['mon', 'wed', 'fri']);
    const before = (await call('GET', '/volume')).body.muscles;
    await call('PUT', '/profile', { level: 'beginner', trainingDays: ['mon'] });
    const after = (await call('GET', '/volume')).body.muscles;
    const sum = (ms: { target: number }[]) => ms.reduce((s, m) => s + m.target, 0);
    assert.ok(sum(after) < sum(before));
  });
});

describe('editar la rutina a gusto', () => {
  it('cambia las series de un ejercicio, entre 1 y 10', async () => {
    const { call, routines: [routine] } = await beginner(['mon']);
    const exerciseId = routine.exercises[0].exercise.id;
    const ok = await call('PATCH', `/routines/${routine.id}/exercises/${exerciseId}`, { sets: 6 });
    assert.equal(ok.status, 200);
    assert.equal(ok.body.sets, 6);
    const tooMany = await call('PATCH', `/routines/${routine.id}/exercises/${exerciseId}`, { sets: 11 });
    assert.equal(tooMany.status, 400);
  });

  it('quitar un ejercicio corre los demás y no deja la rutina vacía', async () => {
    const { call, routines: [routine] } = await beginner(['mon']);
    const ids: string[] = routine.exercises.map((e: any) => e.exercise.id);
    const removed = await call('DELETE', `/routines/${routine.id}/exercises/${ids[1]}`);
    assert.equal(removed.status, 204);
    const again = await call('DELETE', `/routines/${routine.id}/exercises/${ids[1]}`);
    assert.equal(again.status, 404);

    const left = ids.filter((id) => id !== ids[1]);
    const current = (await call('GET', '/routines')).body.find((r: any) => r.id === routine.id);
    assert.deepEqual(current.exercises.map((e: any) => e.exercise.id), left);

    for (const id of left.slice(1)) await call('DELETE', `/routines/${routine.id}/exercises/${id}`);
    const last = await call('DELETE', `/routines/${routine.id}/exercises/${left[0]}`);
    assert.equal(last.status, 409);
  });

  it('nadie puede editar la rutina de otro', async () => {
    const { routines: [routine] } = await beginner(['mon']);
    const other = await api.user();
    const exerciseId = routine.exercises[0].exercise.id;
    const patch = await other.call('PATCH', `/routines/${routine.id}/exercises/${exerciseId}`, { sets: 2 });
    assert.equal(patch.status, 404);
    const del = await other.call('DELETE', `/routines/${routine.id}/exercises/${exerciseId}`);
    assert.equal(del.status, 404);
  });
});
