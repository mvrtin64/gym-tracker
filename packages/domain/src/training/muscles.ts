/** Músculos con los que se cuenta el volumen semanal (docs/dominio.md §4.1). */
export const MUSCLES = [
  'front_delt',
  'side_delt',
  'rear_delt',
  'chest',
  'upper_back',
  'lats',
  'biceps',
  'triceps',
  'abs',
  'quads',
  'hamstrings',
  'glutes',
  'calves',
] as const;
export type Muscle = (typeof MUSCLES)[number];

export type Region = 'upper' | 'lower';

/** Tren de cada músculo, para repartir la semana. Los abdominales van con el tren inferior. */
export const MUSCLE_REGION: Record<Muscle, Region> = {
  front_delt: 'upper',
  side_delt: 'upper',
  rear_delt: 'upper',
  chest: 'upper',
  upper_back: 'upper',
  lats: 'upper',
  biceps: 'upper',
  triceps: 'upper',
  abs: 'lower',
  quads: 'lower',
  hamstrings: 'lower',
  glutes: 'lower',
  calves: 'lower',
};

/**
 * Series directas mínimas cada vez que se entrena el músculo, cuando difiere del mínimo general.
 * El deltoides anterior ya recibe trabajo indirecto del press (que no cuenta), pero lleva al menos 3.
 */
export const MIN_SETS_PER_SESSION: Partial<Record<Muscle, number>> = { front_delt: 3 };

/** Un registro por músculo, todos con el mismo valor. */
export function muscleRecord<T>(value: T): Record<Muscle, T> {
  return Object.fromEntries(MUSCLES.map((m) => [m, value])) as Record<Muscle, T>;
}
