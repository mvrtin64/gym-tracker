/**
 * Cómo se recuperó un músculo de la sesión anterior (docs/dominio.md §6.5): se pregunta al terminar
 * el músculo en la sesión siguiente.
 */
export const SORENESS = ['never_sore', 'healed_early', 'healed_just_in_time', 'still_sore'] as const;
export type Soreness = (typeof SORENESS)[number];

/** Veces seguidas con "todavía me duele" para bajar volumen. */
export const SORENESS_STREAK = 2;

export type SorenessDecision = { kind: 'keep' } | { kind: 'reduce'; delta: number; reason: string };

/**
 * Decide mirando las respuestas de un músculo, de la más reciente a la más vieja. "Todavía me duele"
 * dos veces seguidas = no se está recuperando: −1 serie. Cualquier otra respuesta corta la racha, y
 * nunca se suman series.
 */
export function decideSoreness(history: Soreness[]): SorenessDecision {
  const streak = history.slice(0, SORENESS_STREAK);
  if (streak.length < SORENESS_STREAK || streak.some((s) => s !== 'still_sore')) return { kind: 'keep' };
  return {
    kind: 'reduce',
    delta: -1,
    reason: `Llegaste ${SORENESS_STREAK} veces todavía dolorido: no te estás recuperando, bajá 1 serie.`,
  };
}
