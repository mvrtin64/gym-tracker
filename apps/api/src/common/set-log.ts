import type { SetLog } from '@gym/domain';
import type { SetEntry } from '../generated/prisma/client';

/** Serie guardada → serie del dominio (más la sensación, que el dominio no necesita). */
export function toSetLog({ weightKg, reps, warmup, rpe, rir, feel }: SetEntry): SetLog & { feel?: SetEntry['feel'] } {
  return { weightKg, reps, warmup, rpe: rpe ?? undefined, rir: rir ?? undefined, feel: feel ?? undefined };
}
