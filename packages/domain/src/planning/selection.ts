import type { Muscle } from '../training/muscles';
import type { Weekday } from '../training/profile';
import type { ExerciseType } from '../types';
import { splitEvenly, type DayKind, type WeekPlan } from './planner';

/**
 * Ejercicios recomendados por músculo, en orden de preferencia (docs/dominio.md §3.4). Son nombres
 * del catálogo global; el usuario después cambia cualquiera por otro o por uno propio.
 */
export const RECOMMENDED_EXERCISES: Record<Muscle, string[]> = {
  // Leve inclinación: pecho completo con énfasis en el superior.
  chest: ['Press inclinado con mancuernas', 'Press inclinado con barra', 'Pec deck', 'Aperturas en polea'],
  front_delt: ['Press militar'],
  side_delt: ['Elevaciones laterales', 'Elevaciones laterales en polea'],
  rear_delt: ['Pájaros con mancuernas', 'Face pull'],
  lats: ['Jalón al pecho', 'Remo con mancuerna a una mano', 'Dominadas', 'Pullover en polea'],
  upper_back: ['Remo con barra', 'Remo sentado en polea', 'Face pull'],
  biceps: ['Curl con barra', 'Curl con mancuernas', 'Curl martillo'],
  triceps: ['Extensión de tríceps sobre la cabeza', 'Extensión de tríceps en polea', 'Press francés'],
  quads: ['Sentadilla', 'Prensa', 'Extensión de cuádriceps'],
  hamstrings: ['Peso muerto rumano', 'Curl femoral sentado', 'Curl femoral acostado'],
  glutes: ['Hip thrust', 'Sentadilla búlgara', 'Patada de glúteo en polea', 'Abducción de cadera en máquina'],
  calves: ['Elevación de talones de pie', 'Elevación de talones sentado'],
  abs: ['Crunch en polea', 'Elevación de piernas colgado'],
};

export interface CatalogExercise {
  id: string;
  name: string;
  type: ExerciseType;
  targetMuscles: Muscle[];
}

export interface SelectedExercise {
  exerciseId: string;
  muscle: Muscle;
  sets: number;
}

export interface GeneratedRoutine {
  weekday: Weekday;
  kind: DayKind;
  exercises: SelectedExercise[];
}

/** Cuántos multiarticulares van primero: 1 ejercicio → 1; 2 → 1 + aislamiento; 3 → 2 + aislamiento. */
export function compoundSlots(count: number): number {
  return count <= 1 ? count : count - 1;
}

/** De `pool`, `count` ejercicios: primero multiarticulares y después aislamiento; si no alcanzan los de un tipo, se completa con el otro. */
function pickByType(pool: CatalogExercise[], count: number): CatalogExercise[] {
  const compounds = pool.filter((e) => e.type === 'compound');
  const isolations = pool.filter((e) => e.type === 'isolation');
  const n = Math.min(count, pool.length);
  const c = Math.min(compounds.length, Math.max(compoundSlots(n), n - isolations.length));
  return [...compounds.slice(0, c), ...isolations.slice(0, n - c)];
}

/**
 * Elige los ejercicios de un músculo para un día: primero multiarticulares, después aislamiento, en
 * el orden recomendado. Solo si no alcanzan los recomendados sigue con el resto del catálogo que
 * cuente para el músculo. `used` evita repetir un ejercicio en el mismo día y se actualiza.
 */
export function selectExercises(
  muscle: Muscle,
  exerciseSets: number[],
  catalog: CatalogExercise[],
  used: Set<string>,
): SelectedExercise[] {
  const fits = catalog.filter((e) => e.targetMuscles.includes(muscle) && !used.has(e.id));
  const recommended = RECOMMENDED_EXERCISES[muscle]
    .map((name) => fits.find((e) => e.name === name))
    .filter((e): e is CatalogExercise => e !== undefined);
  const others = fits.filter((e) => !recommended.includes(e)).sort((a, b) => a.name.localeCompare(b.name));

  const picked = pickByType(recommended, exerciseSets.length);
  picked.push(...pickByType(others, exerciseSets.length - picked.length));

  const total = exerciseSets.reduce((a, b) => a + b, 0);
  const sets = picked.length === exerciseSets.length ? exerciseSets : splitEvenly(total, picked.length);
  picked.forEach((e) => used.add(e.id));
  return picked.map((e, i) => ({ exerciseId: e.id, muscle, sets: sets[i] }));
}

/** Una rutina por día del plan, con sus ejercicios elegidos (§3.4). Los días sin series no generan rutina. */
export function generateRoutines(plan: WeekPlan, catalog: CatalogExercise[]): GeneratedRoutine[] {
  return plan.days
    .filter((day) => day.muscles.length > 0)
    .map((day) => {
      const used = new Set<string>();
      return {
        weekday: day.weekday,
        kind: day.kind,
        exercises: day.muscles.flatMap((m) => selectExercises(m.muscle, m.exerciseSets, catalog, used)),
      };
    });
}
