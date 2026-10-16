import { MUSCLES } from '../training/muscles';
import { deloadVolume, RETURN_SETS_PER_WEEK } from './adjustment';
import type { WeeklyVolume } from './volume';

const DAY_MS = 24 * 60 * 60 * 1000;

/** La semana de descarga dura 7 días desde que arranca. */
export const DELOAD_DAYS = 7;

/** `deload`: la semana de descarga. `returning`: recuperando el volumen de a poco. `done`: volvió al de antes. */
export type DeloadPhase = 'deload' | 'returning' | 'done';

export interface DeloadState {
  phase: DeloadPhase;
  /** Volumen que corresponde hoy. */
  volume: WeeklyVolume;
  /** Fin de la semana de descarga. */
  endsAt: Date;
  /** Desde cuándo vuelve a tener el volumen de antes. */
  doneAt: Date;
}

/**
 * Dónde está una descarga que arrancó en `startedAt` (§5.3): la primera semana, mitad de series;
 * desde la siguiente suma `RETURN_SETS_PER_WEEK` por semana y por grupo hasta volver a `base`.
 * Se calcula a partir de las fechas: no hace falta guardar el volumen de cada semana.
 */
export function deloadState(base: WeeklyVolume, startedAt: Date, now: Date): DeloadState {
  const endsAt = new Date(startedAt.getTime() + DELOAD_DAYS * DAY_MS);
  const reduced = deloadVolume(base);
  const gap = Math.max(0, ...MUSCLES.map((m) => base[m] - reduced[m]));
  const weeksToReturn = Math.max(1, Math.ceil(gap / RETURN_SETS_PER_WEEK));
  const doneAt = new Date(endsAt.getTime() + (weeksToReturn - 1) * 7 * DAY_MS);

  if (now < endsAt) return { phase: 'deload', volume: reduced, endsAt, doneAt };
  if (now >= doneAt) return { phase: 'done', volume: { ...base }, endsAt, doneAt };

  const week = Math.floor((now.getTime() - endsAt.getTime()) / (7 * DAY_MS)) + 1;
  const volume = { ...base };
  for (const m of MUSCLES) volume[m] = Math.min(base[m], reduced[m] + week * RETURN_SETS_PER_WEEK);
  return { phase: 'returning', volume, endsAt, doneAt };
}

/**
 * Series de un ejercicio cuando el volumen de su músculo está reducido (descarga o vuelta):
 * proporcional al volumen de la semana, redondeando hacia arriba y nunca menos de 1.
 */
export function scaleSets(sets: number, volume: number, base: number): number {
  if (base <= 0 || volume >= base) return sets;
  return Math.max(1, Math.ceil((sets * volume) / base));
}
