import { MIN_SETS_PER_SESSION, MUSCLE_REGION, MUSCLES, type Muscle, type Region } from '../training/muscles';
import { normalizeProfile, WEEKDAYS, type TrainingProfile, type Weekday } from '../training/profile';
import type { WeeklyVolume } from '../volume/volume';

export type DayKind = Region | 'full' | 'push' | 'pull' | 'legs';

/** Músculos de empuje; el resto del tren superior es tirón y el tren inferior va en piernas. */
const PUSH_MUSCLES: readonly Muscle[] = ['chest', 'front_delt', 'side_delt', 'triceps'];

/** Si un tipo de día es para ese músculo. */
export function dayTrains(kind: DayKind, muscle: Muscle): boolean {
  const region = MUSCLE_REGION[muscle];
  switch (kind) {
    case 'full':
      return true;
    case 'upper':
    case 'lower':
      return region === kind;
    case 'legs':
      return region === 'lower';
    case 'push':
      return PUSH_MUSCLES.includes(muscle);
    case 'pull':
      return region === 'upper' && !PUSH_MUSCLES.includes(muscle);
  }
}

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
/** Ejercicios por músculo en una sesión generada (§3.4): de 1 a 3. */
export const MAX_EXERCISES_PER_MUSCLE = 3;

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
 * Tipo de cada día, en orden (docs/dominio.md §3.2):
 * - 1–3 días: cuerpo completo; los priorizados van más días que el resto.
 * - 4: empuje, tirón, piernas y cuerpo completo. Cada tren tiene al menos dos días; con el inferior
 *   priorizado, piernas va primero.
 * - 5: empuje, tirón, piernas, superior e inferior.
 * - 6: lo mismo más un día que se repite: cuerpo completo, o el del tren priorizado.
 */
export function dayKinds(count: number, priority: Region | null): DayKind[] {
  if (count <= 3) return Array<DayKind>(count).fill('full');
  if (count === 4) return priority === 'lower' ? ['legs', 'push', 'pull', 'full'] : ['push', 'pull', 'legs', 'full'];
  if (count === 5) return ['push', 'pull', 'legs', 'upper', 'lower'];
  // Con 6, los días del tren priorizado quedan intercalados.
  if (priority === 'lower') return ['legs', 'push', 'lower', 'pull', 'legs', 'upper'];
  if (priority === 'upper') return ['push', 'legs', 'pull', 'upper', 'lower', 'upper'];
  return ['push', 'pull', 'legs', 'upper', 'lower', 'full'];
}

/** Divide `total` en `parts` lo más parejo posible; lo que sobra va a los primeros. */
export function splitEvenly(total: number, parts: number): number[] {
  const base = Math.floor(total / parts);
  const rest = total % parts;
  return Array.from({ length: parts }, (_, i) => base + (i < rest ? 1 : 0));
}

/**
 * Las series de un músculo en un día no son un solo ejercicio: se reparten en ejercicios de ~3
 * series (entre 2 y 4). 5 = 3 + 2; 6 = 3 + 3; 7 = 3 + 2 + 2. Nunca más de 3 ejercicios: 10 = 4 + 3 + 3.
 */
export function splitIntoExercises(sets: number): number[] {
  if (sets <= 0) return [];
  return splitEvenly(sets, Math.min(MAX_EXERCISES_PER_MUSCLE, Math.ceil(sets / BASE_SETS_PER_EXERCISE)));
}

/**
 * Ubica la división en los días elegidos: prueba la secuencia empezando por cada tipo de día (sin
 * cambiar el orden) y se queda con la que menos músculos pone en días seguidos. Los priorizados
 * pesan el doble. Si empatan, la secuencia original.
 */
export function alignKinds(days: Weekday[], kinds: DayKind[], priority: ReadonlySet<Muscle> = new Set()): DayKind[] {
  let best = kinds;
  let bestConflicts = Infinity;
  for (let shift = 0; shift < kinds.length; shift++) {
    const rotated = [...kinds.slice(shift), ...kinds.slice(0, shift)];
    let conflicts = 0;
    for (let a = 0; a < days.length; a++) {
      for (let b = a + 1; b < days.length; b++) {
        if (!areConsecutive(days[a], days[b])) continue;
        for (const m of MUSCLES) {
          if (dayTrains(rotated[a], m) && dayTrains(rotated[b], m)) conflicts += priority.has(m) ? 2 : 1;
        }
      }
    }
    if (conflicts < bestConflicts) {
      best = rotated;
      bestConflicts = conflicts;
    }
  }
  return best;
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
 * Elige `frequency` días para un músculo sin que haya dos seguidos. Prefiere los días que son para
 * ese músculo (`dayTrains`) y, entre esos, los que vienen más livianos. Con `ownOnly` no usa otros
 * días (nada de pecho el día de tirón). `null` si no hay forma.
 */
function chooseDays(
  days: Weekday[],
  kinds: DayKind[],
  muscle: Muscle,
  frequency: number,
  load: number[],
  ownOnly: boolean,
): number[] | null {
  let best: number[] | null = null;
  let bestScore = -Infinity;
  for (const combo of combinations(days.length, frequency)) {
    const restOk = combo.every((a, i) => combo.slice(i + 1).every((b) => !areConsecutive(days[a], days[b])));
    if (!restOk) continue;
    const own = combo.filter((i) => dayTrains(kinds[i], muscle)).length;
    if (ownOnly && own < combo.length) continue;
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
 * - Cada músculo va en los días de su grupo; solo los priorizados pueden sumar un estímulo extra
 *   en otro día.
 * - Si al repartir quedarían menos series por día que el mínimo, también se baja la frecuencia.
 * - Lo que sobra al dividir va al día de énfasis (el primero de su tren).
 */
export function planWeek(profile: TrainingProfile, volume: WeeklyVolume): WeekPlan {
  const p = normalizeProfile(profile);
  const days = [...p.trainingDays].sort((a, b) => dayIndex(a) - dayIndex(b));
  const priority = new Set(p.priorityMuscles);
  const kinds = alignKinds(days, dayKinds(days.length, priorityRegion(p)), priority);
  const load = days.map(() => 0);
  const planned: PlannedMuscle[][] = days.map(() => []);
  const frequencyChanges: FrequencyChange[] = [];

  // Primero los priorizados y los de más volumen, para que tengan más opciones de días.
  const order = MUSCLES.filter((m) => volume[m] > 0).sort(
    (a, b) => Number(priority.has(b)) - Number(priority.has(a)) || volume[b] - volume[a],
  );

  for (const muscle of order) {
    const weekly = volume[muscle];
    const minPerSession = MIN_SETS_PER_SESSION[muscle] ?? MIN_SETS_PER_EXERCISE;
    const ideal = Math.min(priority.has(muscle) ? PRIORITY_FREQUENCY : BASE_FREQUENCY, days.length);
    const ownOnly = !priority.has(muscle);
    const ownDays = kinds.flatMap((kind, i) => (dayTrains(kind, muscle) ? [i] : []));

    let chosen: number[] | null = null;
    let reason = '';
    for (let frequency = ideal; frequency >= 1; frequency--) {
      if (frequency > 1 && Math.floor(weekly / frequency) < minPerSession) {
        reason ||= `con ${weekly} series no llega al mínimo de ${minPerSession} por día`;
        continue;
      }
      chosen = chooseDays(days, kinds, muscle, frequency, load, ownOnly);
      if (chosen) break;
      reason ||=
        ownOnly && ownDays.length < frequency
          ? 'con los días elegidos no tiene más días de su grupo'
          : 'con los días elegidos tendría que entrenarse en días seguidos';
    }
    // Con frecuencia 1 siempre hay un día posible: todas las divisiones tienen un día para cada músculo.
    chosen ??= [ownDays[0] ?? 0];

    if (chosen.length < ideal) frequencyChanges.push({ muscle, ideal, actual: chosen.length, reason });

    // Día de énfasis: los que son para el músculo primero, en orden de la semana.
    const emphasis = [...chosen].sort((a, b) => {
      const own = (i: number) => (dayTrains(kinds[i], muscle) ? 0 : 1);
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
