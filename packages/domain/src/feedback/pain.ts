import { roundToStep } from '../progression/math';

/** Dolor articular en un ejercicio, preguntado al terminar el músculo (docs/dominio.md §6.5). */
export const JOINT_PAINS = ['none', 'mild', 'moderate', 'severe'] as const;
export type JointPain = (typeof JOINT_PAINS)[number];

/** Desde moderado el dolor pide una acción; leve solo se registra. */
const needsAction = (pain: JointPain | null | undefined) => pain === 'moderate' || pain === 'severe';

export type JointPainDecision =
  | { kind: 'none' }
  | { kind: 'warn'; reason: string }
  | { kind: 'lower_weight'; reason: string }
  | { kind: 'swap'; reason: string };

/**
 * Decide qué hacer con un ejercicio mirando el dolor de sus últimas veces, de la más reciente a la
 * más vieja (`null` si no se respondió):
 * - Moderado o mucho la primera vez → solo un aviso: revisar técnica y propiocepción.
 * - Se repite la vez siguiente → se actúa según la última respuesta: moderado baja el peso, mucho
 *   cambia el ejercicio.
 */
export function decideJointPain(history: (JointPain | null)[]): JointPainDecision {
  const [latest, previous] = history;
  if (!needsAction(latest)) return { kind: 'none' };
  if (!needsAction(previous)) {
    return {
      kind: 'warn',
      reason: 'Te molestó la articulación: revisá la técnica y sentí bien el recorrido. Si se repite, lo ajustamos.',
    };
  }
  if (latest === 'severe') {
    return { kind: 'swap', reason: 'Te dolió la articulación dos veces seguidas: cambialo por otro ejercicio del mismo músculo.' };
  }
  return { kind: 'lower_weight', reason: 'Te dolió la articulación dos veces seguidas: bajá el peso y cuidá la técnica.' };
}

/** Cuánto baja el peso por dolor: lo mismo que la descarga de un ejercicio (§6.1). */
export const PAIN_WEIGHT_FACTOR = 0.9;

export function painWeight(weightKg: number, stepKg: number): number {
  return roundToStep(weightKg * PAIN_WEIGHT_FACTOR, stepKg);
}
