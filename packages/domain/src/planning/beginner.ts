import { muscleRecord, type Muscle } from '../training/muscles';
import { WEEKDAYS, type Weekday } from '../training/profile';
import type { WeeklyVolume } from '../volume/volume';
import { alignKinds, dayKinds, type DayKind, type PlannedMuscle, type WeekPlan } from './planner';
import type { CatalogExercise, GeneratedRoutine } from './selection';

/**
 * Músculos a los que cuenta cada multiarticular en el principiante (docs/dominio.md §5.1): hace un
 * multiarticular y lo siente en todos los músculos involucrados. Cada serie cuenta completa para
 * cada uno. Lo que no está acá cuenta solo para su músculo objetivo.
 */
export const COMPOUND_MUSCLES: Record<string, Muscle[]> = {
  'Press inclinado con mancuernas': ['chest', 'front_delt', 'triceps'],
  'Press inclinado con barra': ['chest', 'front_delt', 'triceps'],
  'Press militar': ['front_delt', 'side_delt', 'triceps'],
  'Jalón al pecho': ['lats', 'biceps'],
  Dominadas: ['lats', 'biceps'],
  'Remo con barra': ['upper_back', 'lats', 'biceps', 'rear_delt'],
  'Remo sentado en polea': ['upper_back', 'lats', 'biceps', 'rear_delt'],
  Sentadilla: ['quads', 'glutes'],
  Prensa: ['quads', 'glutes'],
  'Peso muerto rumano': ['hamstrings', 'glutes'],
  'Hip thrust': ['glutes', 'hamstrings'],
};

/** Músculos a los que suma un ejercicio del principiante. */
export function musclesWorked(exerciseName: string, targetMuscle: Muscle): Muscle[] {
  return COMPOUND_MUSCLES[exerciseName] ?? [targetMuscle];
}

export interface TemplateExercise {
  /** Nombre en el catálogo global. */
  name: string;
  /** Músculo objetivo con el que queda en la rutina. */
  muscle: Muscle;
  sets: number;
}

export type BeginnerDay = 'full_a' | 'full_b' | 'full_c' | 'push' | 'pull' | 'legs' | 'upper' | 'lower';

const ex = (name: string, muscle: Muscle, sets: number): TemplateExercise => ({ name, muscle, sets });

/**
 * Días del principiante (§3.5): pocos ejercicios de 3–4 series, multiarticulares primero y como mucho
 * un aislamiento por músculo. Los de cuerpo completo rotan A → B → C para tocar todo en la semana.
 */
export const BEGINNER_DAYS: Record<BeginnerDay, TemplateExercise[]> = {
  full_a: [
    ex('Sentadilla', 'quads', 4),
    ex('Press inclinado con mancuernas', 'chest', 4),
    ex('Jalón al pecho', 'lats', 4),
    ex('Elevaciones laterales', 'side_delt', 3),
    ex('Extensión de tríceps en polea', 'triceps', 3),
  ],
  full_b: [
    ex('Peso muerto rumano', 'hamstrings', 4),
    ex('Press militar', 'front_delt', 4),
    ex('Remo con barra', 'upper_back', 4),
    ex('Curl con barra', 'biceps', 3),
    ex('Elevación de talones de pie', 'calves', 3),
  ],
  full_c: [
    ex('Prensa', 'quads', 4),
    ex('Press inclinado con barra', 'chest', 4),
    ex('Remo sentado en polea', 'upper_back', 4),
    ex('Hip thrust', 'glutes', 3),
    ex('Crunch en polea', 'abs', 3),
  ],
  push: [
    ex('Press inclinado con mancuernas', 'chest', 4),
    ex('Press militar', 'front_delt', 4),
    ex('Pec deck', 'chest', 3),
    ex('Elevaciones laterales', 'side_delt', 3),
    ex('Extensión de tríceps en polea', 'triceps', 3),
  ],
  pull: [
    ex('Jalón al pecho', 'lats', 4),
    ex('Remo con barra', 'upper_back', 4),
    ex('Remo sentado en polea', 'upper_back', 3),
    ex('Face pull', 'rear_delt', 3),
    ex('Curl con barra', 'biceps', 3),
  ],
  legs: [
    ex('Sentadilla', 'quads', 4),
    ex('Peso muerto rumano', 'hamstrings', 4),
    ex('Hip thrust', 'glutes', 3),
    ex('Elevación de talones de pie', 'calves', 3),
    ex('Crunch en polea', 'abs', 3),
  ],
  upper: [
    ex('Press inclinado con barra', 'chest', 4),
    ex('Remo sentado en polea', 'upper_back', 4),
    ex('Press militar', 'front_delt', 3),
    ex('Jalón al pecho', 'lats', 3),
    ex('Curl con mancuernas', 'biceps', 3),
  ],
  lower: [
    ex('Prensa', 'quads', 4),
    ex('Hip thrust', 'glutes', 4),
    ex('Curl femoral sentado', 'hamstrings', 3),
    ex('Elevación de talones sentado', 'calves', 3),
    ex('Elevación de piernas colgado', 'abs', 3),
  ],
};

const FULL_ROTATION: BeginnerDay[] = ['full_a', 'full_b', 'full_c'];

const byWeekOrder = (days: Weekday[]) => [...days].sort((a, b) => WEEKDAYS.indexOf(a) - WEEKDAYS.indexOf(b));

/**
 * Qué día le toca a cada sesión de la semana, en orden. El principiante no prioriza: la división es
 * la del enfoque general (§3.2), ubicada para no repetir músculos en días seguidos. Los días de
 * cuerpo completo rotan A, B, C.
 */
export function beginnerDays(trainingDays: Weekday[]): { kind: DayKind; day: BeginnerDay }[] {
  const days = byWeekOrder(trainingDays);
  let full = 0;
  return alignKinds(days, dayKinds(days.length, null)).map((kind) => ({
    kind,
    day: kind === 'full' ? FULL_ROTATION[full++ % FULL_ROTATION.length] : kind,
  }));
}

/** Vista previa de la semana del principiante, con la misma forma que `planWeek`. */
export function beginnerPlan(trainingDays: Weekday[]): WeekPlan {
  const days = byWeekOrder(trainingDays);
  const split = beginnerDays(days);
  return {
    frequencyChanges: [],
    days: days.map((weekday, i) => {
      const muscles: PlannedMuscle[] = [];
      for (const e of BEGINNER_DAYS[split[i].day]) {
        const planned = muscles.find((m) => m.muscle === e.muscle);
        if (planned) {
          planned.sets += e.sets;
          planned.exerciseSets.push(e.sets);
        } else muscles.push({ muscle: e.muscle, sets: e.sets, exerciseSets: [e.sets] });
      }
      return { weekday, kind: split[i].kind, muscles, totalSets: muscles.reduce((s, m) => s + m.sets, 0) };
    }),
  };
}

/**
 * Volumen semanal del principiante: lo que suman sus días, contando cada multiarticular para todos
 * los músculos que trabaja (`COMPOUND_MUSCLES`).
 */
export function beginnerVolume(trainingDays: Weekday[]): WeeklyVolume {
  const volume = muscleRecord(0);
  for (const { day } of beginnerDays(trainingDays)) {
    for (const e of BEGINNER_DAYS[day]) for (const m of musclesWorked(e.name, e.muscle)) volume[m] += e.sets;
  }
  return volume;
}

/** Rutinas del principiante: una por día con los ejercicios de su plantilla que estén en el catálogo. */
export function generateBeginnerRoutines(trainingDays: Weekday[], catalog: CatalogExercise[]): GeneratedRoutine[] {
  const days = byWeekOrder(trainingDays);
  const split = beginnerDays(days);
  return days.map((weekday, i) => ({
    weekday,
    kind: split[i].kind,
    exercises: BEGINNER_DAYS[split[i].day].flatMap((e) => {
      const found = catalog.find((c) => c.name === e.name);
      return found ? [{ exerciseId: found.id, muscle: e.muscle, sets: e.sets }] : [];
    }),
  }));
}
