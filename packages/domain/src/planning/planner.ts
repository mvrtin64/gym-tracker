import { MIN_SETS_PER_SESSION, MUSCLE_REGION, MUSCLES, type Muscle, type Region } from '../training/muscles';
import { normalizeProfile, WEEKDAYS, type TrainingProfile, type Weekday } from '../training/profile';
import type { WeeklyVolume } from '../volume/volume';

export type DayKind = Region | 'full';

export interface PlannedMuscle {
  muscle: Muscle;
  sets: number;
  /** Series de cada ejercicio: [3, 3] = dos ejercicios de 3 series. */
  exerciseSets: number[];
}

export interface PlannedDay {
  weekday: Weekday;
  kind: DayKind;
  muscles: PlannedMuscle[];
  totalSets: number;
}

/** Músculo que no llegó a su frecuencia ideal, y por qué. */
export interface FrequencyChange {
  muscle: Muscle;
  ideal: number;
  actual: number;
  reason: string;
}

export interface WeekPlan {
  days: PlannedDay[];
  frequencyChanges: FrequencyChange[];
}

export const BASE_FREQUENCY = 2;
export const PRIORITY_FREQUENCY = 3;
export const BASE_SETS_PER_EXERCISE = 3;
export const MIN_SETS_PER_EXERCISE = 2;

const dayIndex = (d: Weekday) => WEEKDAYS.indexOf(d);

/** Días seguidos en la semana; el domingo y el lunes también. */
export function areConsecutive(a: Weekday, b: Weekday): boolean {
  const diff = Math.abs(dayIndex(a) - dayIndex(b));
  return diff === 1 || diff === WEEKDAYS.length - 1;
}

/** Tren a priorizar según el enfoque; con músculos específicos, el tren de la mayoría. */
export function priorityRegion(profile: TrainingProfile): Region | null {
  if (profile.focus === 'lower' || profile.focus === 'upper') return profile.focus;
  if (profile.focus === 'general') return null;
  const lower = profile.priorityMuscles.filter((m) => MUSCLE_REGION[m] === 'lower').length;
  const upper = profile.priorityMuscles.length - lower;
  if (lower === upper) return null;
  return lower > upper ? 'lower' : 'upper';
}

/**
 * Tipo de cada día, en orden. Hasta 3 días sin prioridad (o 1–2 días siempre): cuerpo completo.
 * Si no, alterna inferior/superior empezando por el tren priorizado, que se queda con el día impar.
 */
export function dayKinds(count: number, priority: Region | null): DayKind[] {
  if (count <= 2 || (count === 3 && priority === null)) return Array<DayKind>(count).fill('full');
  const first: Region = priority ?? 'lower';
  const second: Region = first === 'lower' ? 'upper' : 'lower';
  return Array.from({ length: count }, (_, i) => (i % 2 === 0 ? first : second));
}

/** Divide `total` en `parts` lo más parejo posible; lo que sobra va a los primeros. */
export function splitEvenly(total: number, parts: number): number[] {
  const base = Math.floor(total / parts);
  const rest = total % parts;
  return Array.from({ length: parts }, (_, i) => base + (i < rest ? 1 : 0));
}

/**
 * Las series de un músculo en un día no son un solo ejercicio: se reparten en ejercicios de ~3
 * series (entre 2 y 4). 5 = 3 + 2; 6 = 3 + 3; 7 = 3 + 2 + 2.
 */
export function splitIntoExercises(sets: number): number[] {
  if (sets <= 0) return [];
  return splitEvenly(sets, Math.ceil(sets / BASE_SETS_PER_EXERCISE));
}

function combinations(n: number, k: number): number[][] {
  const result: number[][] = [];
  const pick = (start: number, acc: number[]) => {
    if (acc.length === k) return void result.push([...acc]);
    for (let i = start; i < n; i++) pick(i + 1, [...acc, i]);
  };
  pick(0, []);
  return result;
}

/**
 * Elige `frequency` días para un músculo sin que haya dos seguidos. Prefiere los días de su tren
 * (o de cuerpo completo) y, entre esos, los que vienen más livianos. `null` si no hay forma.
 */
function chooseDays(
  days: Weekday[],
  kinds: DayKind[],
  region: Region,
  frequency: number,
  load: number[],
): number[] | null {
  let best: number[] | null = null;
  let bestScore = -Infinity;
  for (const combo of combinations(days.length, frequency)) {
    const restOk = combo.every((a, i) => combo.slice(i + 1).every((b) => !areConsecutive(days[a], days[b])));
    if (!restOk) continue;
    const own = combo.filter((i) => kinds[i] === region || kinds[i] === 'full').length;
    const score = own * 1000 - combo.reduce((sum, i) => sum + load[i], 0);
    if (score > bestScore) {
      best = combo;
      bestScore = score;
    }
  }
  return best;
}

/**
 * Arma la semana (docs/dominio.md §3.2–3.3): reparte el volumen semanal de cada músculo en los días
 * que entrena el usuario.
 * - Frecuencia 2; 3 para los músculos priorizados.
 * - Un mismo músculo nunca va en días seguidos: si no se puede, se baja la frecuencia y se
 *   mantiene el volumen semanal.
 * - Si al repartir quedarían menos series por día que el mínimo, también se baja la frecuencia.
 * - Lo que sobra al dividir va al día de énfasis (el primero de su tren).
 */
export function planWeek(profile: TrainingProfile, volume: WeeklyVolume): WeekPlan {
  const p = normalizeProfile(profile);
  const days = [...p.trainingDays].sort((a, b) => dayIndex(a) - dayIndex(b));
  const kinds = dayKinds(days.length, priorityRegion(p));
  const priority = new Set(p.priorityMuscles);
  const load = days.map(() => 0);
  const planned: PlannedMuscle[][] = days.map(() => []);
  const frequencyChanges: FrequencyChange[] = [];

  // Primero los priorizados y los de más volumen, para que tengan más opciones de días.
  const order = MUSCLES.filter((m) => volume[m] > 0).sort(
    (a, b) => Number(priority.has(b)) - Number(priority.has(a)) || volume[b] - volume[a],
  );

  for (const muscle of order) {
    const weekly = volume[muscle];
    const region = MUSCLE_REGION[muscle];
    const minPerSession = MIN_SETS_PER_SESSION[muscle] ?? MIN_SETS_PER_EXERCISE;
    const ideal = Math.min(priority.has(muscle) ? PRIORITY_FREQUENCY : BASE_FREQUENCY, days.length);

    let chosen: number[] | null = null;
    let reason = '';
    for (let frequency = ideal; frequency >= 1; frequency--) {
      if (frequency > 1 && Math.floor(weekly / frequency) < minPerSession) {
        reason ||= `con ${weekly} series no llega al mínimo de ${minPerSession} por día`;
        continue;
      }
      chosen = chooseDays(days, kinds, region, frequency, load);
      if (chosen) break;
      reason ||= 'con los días elegidos tendría que entrenarse en días seguidos';
    }
    chosen ??= [0]; // con frecuencia 1 siempre hay un día posible

    if (chosen.length < ideal) frequencyChanges.push({ muscle, ideal, actual: chosen.length, reason });

    // Día de énfasis: los de su tren primero, en orden de la semana.
    const emphasis = [...chosen].sort((a, b) => {
      const own = (i: number) => (kinds[i] === region || kinds[i] === 'full' ? 0 : 1);
      return own(a) - own(b) || a - b;
    });
    splitEvenly(weekly, emphasis.length).forEach((sets, i) => {
      const day = emphasis[i];
      planned[day].push({ muscle, sets, exerciseSets: splitIntoExercises(sets) });
      load[day] += sets;
    });
  }

  return {
    days: days.map((weekday, i) => ({ weekday, kind: kinds[i], muscles: planned[i], totalSets: load[i] })),
    frequencyChanges,
  };
}
