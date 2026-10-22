import {
  decideBeginnerGrowth, decideMuscleVolume, decideSoreness, DELOAD_DAYS, detectGeneralStagnation, GROWTH_EXERCISE_SETS,
  growthExercise, MAX_EXERCISES_PER_MUSCLE, muscleHistories, musclesWorked, placeGrowth, type GrowthSlot, type Muscle,
  type Soreness,
} from '@gym/domain';
import { Injectable } from '@nestjs/common';
import { toSetLog } from '../common/set-log';
import { defaultPrescription, visibleTo } from '../exercises/exercise.mapper';
import type { AdjustMode, Deload, VolumeChange } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { VolumeService } from './volume.service';

const DAY_MS = 24 * 60 * 60 * 1000;
/** Lo más que baja un músculo en un cambio (§5.3), aunque se sumen estancamiento y agujetas. */
const MAX_REDUCTION = -2;

/** Respuestas de agujetas de un músculo desde `after`, de la más reciente a la más vieja. */
function sorenessHistory(
  sessions: { performedAt: Date; soreness: { muscle: Muscle; soreness: Soreness }[] }[],
  muscle: Muscle,
  after: number,
): Soreness[] {
  return sessions
    .filter((s) => s.performedAt.getTime() > after)
    .sort((a, b) => b.performedAt.getTime() - a.performedAt.getTime())
    .flatMap((s) => s.soreness.filter((x) => x.muscle === muscle).map((x) => x.soreness));
}
/** Cuánta historia se mira: sobra para las últimas sesiones de cada músculo y la ventana de 2 semanas. */
const HISTORY_DAYS = 42;

/** La serie por semana que se le sumó a un músculo del principiante que viene progresando (§5.4). */
export interface GrowthItem {
  muscle: Muscle;
  /** La rutina (el día) donde quedó. */
  routineId: string;
  routineName: string;
  /** `add_set`: una serie más en `exerciseName`. `add_exercise`: entró `exerciseName` y `from` le pasó una serie. */
  kind: 'add_set' | 'add_exercise';
  exerciseName: string;
  /** Series de `exerciseName` después del cambio. */
  sets: number;
  from?: { exerciseName: string; sets: number };
  reason: string;
}

export interface SessionReview {
  /** Cambios de volumen que salieron de esta sesión: sugeridos o, en modo automático, ya aplicados. */
  volumeChanges: VolumeChange[];
  /** Músculos estancados con RIR alto: no se baja volumen, se pide apretar más. */
  pushHarder: { muscle: Muscle; reason: string }[];
  /** Descarga general sugerida o, en modo automático, ya arrancada. */
  deload: Deload | null;
  /** Series o ejercicios que se le sumaron al principiante. */
  growth: GrowthItem[];
}

@Injectable()
export class AdjustmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly volume: VolumeService,
  ) {}

  /**
   * Revisa el volumen después de registrar una sesión (docs/dominio.md §5.3). Con `auto` los ajustes
   * se aplican solos; con `suggest` quedan pendientes hasta que el usuario los acepte o descarte.
   * Acá nunca se suman series: solo baja volumen, pide apretar más o propone una descarga. Sumar es
   * solo para el principiante (`growBeginner`).
   */
  async afterSession(userId: string, trained: Muscle[], mode: AdjustMode, now = new Date()): Promise<SessionReview> {
    const review: SessionReview = { volumeChanges: [], pushHarder: [], deload: null, growth: [] };
    const active = await this.volume.activeDeload(userId, now);
    // En la semana de descarga se entrena liviano a propósito: no hay nada que evaluar.
    if (active?.phase === 'deload') return review;

    const sessions = await this.recentSessions(userId, now);
    const histories = muscleHistories(sessions);

    // Estancamiento general → descarga. No se evalúa si ya hay una propuesta o en curso (vuelta gradual).
    const pendingDeload = await this.prisma.deload.findFirst({ where: { userId, status: 'suggested' } });
    if (!active && !pendingDeload) {
      const dismissed = await this.prisma.deload.findFirst({
        where: { userId, status: 'dismissed' },
        orderBy: { decidedAt: 'desc' },
      });
      // Si la descartó, se vuelve a evaluar con lo que entrene desde ese momento.
      const from = dismissed?.decidedAt;
      const window = from
        ? Object.fromEntries(Object.entries(histories).map(([m, h]) => [m, h.filter((s) => s.performedAt > from)]))
        : histories;
      const general = detectGeneralStagnation(window, now);
      if (general.deload) {
        review.deload = await this.prisma.deload.create({
          data: {
            userId,
            reason: `${general.stalled.length} de ${general.evaluated.length} grupos sin avance en las últimas 2 semanas: toca una semana de descarga.`,
            ...(mode === 'auto' ? { status: 'started', startedAt: now, decidedAt: now } : { status: 'suggested' }),
          },
        });
      }
    }
    // Si el estancamiento es general, lo resuelve la descarga: no se baja volumen músculo por músculo.
    const generalStall = review.deload !== null || pendingDeload !== null;

    const changes = await this.prisma.volumeChange.findMany({ where: { userId, muscle: { in: trained } } });
    for (const muscle of new Set(trained)) {
      const own = changes.filter((c) => c.muscle === muscle);
      if (own.some((c) => c.status === 'suggested')) continue;
      // Después de un cambio de volumen se evalúa de nuevo: las sesiones de antes eran con otro volumen.
      const lastDecision = Math.max(0, ...own.map((c) => (c.decidedAt ?? c.createdAt).getTime()));
      const history = (histories[muscle] ?? []).filter((s) => s.performedAt.getTime() > lastDecision);

      const decision = decideMuscleVolume(history);
      if (decision.kind === 'push_harder') review.pushHarder.push({ muscle, reason: decision.reason });

      // Las agujetas (§6.5) se suman al estancamiento en un solo cambio, con el mismo máximo.
      const soreness = decideSoreness(sorenessHistory(sessions, muscle, lastDecision));
      const reductions = [decision, soreness].filter((d) => d.kind === 'reduce');
      if (reductions.length > 0 && !generalStall) {
        const delta = Math.max(MAX_REDUCTION, reductions.reduce((sum, d) => sum + d.delta, 0));
        const total = reductions.length > 1 ? ` En total: −${-delta} series.` : '';
        const reason = reductions.map((d) => d.reason).join(' ') + total;
        review.volumeChanges.push(await this.reduce(userId, muscle, delta, reason, mode, now));
      }
    }
    return review;
  }

  /**
   * Principiante (§5.4): a cada músculo que entrenó y viene progresando cerca del fallo se le suma
   * +1 serie por semana. La serie va al ejercicio de ese músculo con menos series de toda la semana
   * (en sus rutinas automáticas), para no cargar una sola sesión; si todos tienen 4, entra un analítico
   * en el día más liviano. El objetivo semanal sube con la rutina. Después de cualquier cambio en el
   * músculo, se vuelve a contar desde cero.
   */
  async growBeginner(userId: string, trained: Muscle[], now = new Date()): Promise<GrowthItem[]> {
    const [routines, sessions, changes, catalog] = await Promise.all([
      this.prisma.routine.findMany({
        where: { userId, adjustMode: 'auto' },
        include: { exercises: { orderBy: { position: 'asc' }, include: { exercise: true } } },
      }),
      this.recentSessions(userId, now),
      this.prisma.volumeChange.findMany({ where: { userId } }),
      this.prisma.exercise.findMany({ where: visibleTo(userId) }),
    ]);
    const histories = muscleHistories(sessions);
    const routineSets = (r: (typeof routines)[number]) => r.exercises.reduce((sum, e) => sum + e.sets, 0);

    const result: GrowthItem[] = [];
    for (const muscle of new Set(trained)) {
      const lastChange = Math.max(0, ...changes.filter((c) => c.muscle === muscle).map((c) => (c.decidedAt ?? c.createdAt).getTime()));
      const history = (histories[muscle] ?? []).filter((s) => s.performedAt.getTime() > lastChange);
      const decision = decideBeginnerGrowth(history);
      if (decision.kind === 'keep') continue;

      const slots: GrowthSlot[] = routines.flatMap((r) =>
        r.exercises
          .filter((e) => e.targetMuscle === muscle)
          .map((e) => ({ routineId: r.id, exerciseId: e.exerciseId, position: e.position, sets: e.sets, routineSets: routineSets(r) })),
      );
      const full = new Set(
        routines.filter((r) => r.exercises.filter((e) => e.targetMuscle === muscle).length >= MAX_EXERCISES_PER_MUSCLE).map((r) => r.id),
      );
      const placement = placeGrowth(slots, full);
      if (!placement) continue;

      const target = placement.kind === 'add_set' ? placement.slot : placement.from;
      const routine = routines.find((r) => r.id === target.routineId)!;
      const current = routine.exercises.find((e) => e.exerciseId === target.exerciseId)!;
      const deltas = new Map<Muscle, number>();
      const addDelta = (muscles: Muscle[], sets: number) => muscles.forEach((m) => deltas.set(m, (deltas.get(m) ?? 0) + sets));

      if (placement.kind === 'add_set') {
        await this.prisma.routineExercise.update({
          where: { routineId_exerciseId: { routineId: routine.id, exerciseId: current.exerciseId } },
          data: { sets: current.sets + 1 },
        });
        // Los que crecen después en esta misma sesión ven el cambio.
        current.sets += 1;
        addDelta(musclesWorked(current.exercise.name, muscle), 1);
        result.push({
          muscle,
          routineId: routine.id,
          routineName: routine.name,
          kind: 'add_set',
          exerciseName: current.exercise.name,
          sets: current.sets,
          reason: decision.reason,
        });
      } else {
        const added = growthExercise(muscle, catalog, new Set(routine.exercises.map((e) => e.exerciseId)));
        if (!added) continue;
        // Entra justo después del de 4, que le pasa una serie: la semana sube de a una.
        await this.prisma.$transaction([
          this.prisma.routineExercise.update({
            where: { routineId_exerciseId: { routineId: routine.id, exerciseId: current.exerciseId } },
            data: { sets: current.sets - 1 },
          }),
          this.prisma.routineExercise.updateMany({
            where: { routineId: routine.id, position: { gt: current.position } },
            data: { position: { increment: 1 } },
          }),
          this.prisma.routineExercise.create({
            data: {
              routineId: routine.id,
              exerciseId: added.id,
              position: current.position + 1,
              targetMuscle: muscle,
              ...defaultPrescription(added.type),
              sets: GROWTH_EXERCISE_SETS,
            },
          }),
        ]);
        current.sets -= 1;
        for (const e of routine.exercises) if (e.position > current.position) e.position += 1;
        routine.exercises.push({
          ...current,
          exerciseId: added.id,
          exercise: added,
          position: current.position + 1,
          targetMuscle: muscle,
          sets: GROWTH_EXERCISE_SETS,
        });
        addDelta(musclesWorked(current.exercise.name, muscle), -1);
        addDelta(musclesWorked(added.name, muscle), GROWTH_EXERCISE_SETS);
        result.push({
          muscle,
          routineId: routine.id,
          routineName: routine.name,
          kind: 'add_exercise',
          exerciseName: added.name,
          sets: GROWTH_EXERCISE_SETS,
          from: { exerciseName: current.exercise.name, sets: current.sets },
          reason: decision.reason,
        });
      }
      for (const [m, delta] of deltas) if (delta !== 0) await this.volume.applyDelta(userId, m, delta);
      await this.prisma.volumeChange.create({ data: { userId, muscle, delta: 1, reason: decision.reason, status: 'applied', decidedAt: now } });
    }
    return result;
  }

  /** Sesiones normales (sin descarga) desde la última descarga: después de una se arranca de cero. */
  private async recentSessions(userId: string, now: Date) {
    const lastDeload = await this.prisma.deload.findFirst({
      where: { userId, status: 'started' },
      orderBy: { startedAt: 'desc' },
    });
    const deloadEnd = lastDeload?.startedAt ? lastDeload.startedAt.getTime() + DELOAD_DAYS * DAY_MS : 0;
    const since = new Date(Math.max(now.getTime() - HISTORY_DAYS * DAY_MS, deloadEnd));
    const sessions = await this.prisma.workoutSession.findMany({
      where: { userId, isDeload: false, performedAt: { gt: since, lte: now } },
      include: { entries: { include: { sets: { orderBy: { position: 'asc' } } } }, soreness: true },
    });
    return sessions.map((s) => ({
      performedAt: s.performedAt,
      soreness: s.soreness,
      entries: s.entries.map((e) => ({ exerciseId: e.exerciseId, targetMuscle: e.targetMuscle, sets: e.sets.map(toSetLog) })),
    }));
  }

  private async reduce(userId: string, muscle: Muscle, delta: number, reason: string, mode: AdjustMode, now: Date) {
    if (mode === 'suggest') {
      return this.prisma.volumeChange.create({ data: { userId, muscle, delta, reason, status: 'suggested' } });
    }
    await this.volume.applyDelta(userId, muscle, delta);
    return this.prisma.volumeChange.create({ data: { userId, muscle, delta, reason, status: 'applied', decidedAt: now } });
  }
}
