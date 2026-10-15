/**
 * Cómo sintió la serie un principiante (docs/dominio.md §6.2).
 * No sabe estimar repeticiones en reserva, así que elige una sensación y el RIR se estima.
 */
export const FEELS = ['failure', 'one_two_left', 'several_left', 'very_easy'] as const;
export type Feel = (typeof FEELS)[number];

/** RIR estimado para cada sensación (el valor bajo de cada rango, para no sobreestimar el esfuerzo). */
export const FEEL_RIR: Record<Feel, number> = {
  failure: 0,
  one_two_left: 1,
  several_left: 3,
  very_easy: 5,
};

/** Zona objetivo: RIR 0–2. Ahí se incentiva la sobrecarga. */
export const TARGET_RIR_MAX = 2;

/** El intermedio/avanzado escribe el RPE percibido (1–10): RIR = 10 − RPE. */
export function rirFromRpe(rpe: number): number {
  if (!(rpe >= 1 && rpe <= 10)) throw new Error('el RPE tiene que estar entre 1 y 10');
  return Number((10 - rpe).toFixed(1));
}

export interface SetFeedback {
  feel?: Feel;
  rpe?: number;
}

/** RIR de una serie a partir de lo que respondió el usuario; `null` si no respondió. */
export function rirFromFeedback({ feel, rpe }: SetFeedback): number | null {
  if (rpe !== undefined) return rirFromRpe(rpe);
  if (feel !== undefined) return FEEL_RIR[feel];
  return null;
}

export function isInTargetZone(rir: number): boolean {
  return rir <= TARGET_RIR_MAX;
}

/**
 * Exigencia cuando le quedó resto (§6.3). Vale para todos los niveles y la serie cuenta igual
 * como efectiva: el objetivo es que se esfuerce en llegar al fallo y se acerque a un RIR 1.
 */
export function effortCue(rir: number): string | null {
  if (isInTargetZone(rir)) return null;
  return 'Te quedó resto: en la próxima serie apretá hasta que no puedas sacar otra repetición.';
}
