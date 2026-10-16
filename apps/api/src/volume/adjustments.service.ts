import { decideMuscleVolume, DELOAD_DAYS, detectGeneralStagnation, muscleHistories, type Muscle } from '@gym/domain';
import { Injectable } from '@nestjs/common';
import { toSetLog } from '../common/set-log';
import type { AdjustMode, Deload, VolumeChange } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { VolumeService } from './volume.service';

const DAY_MS = 24 * 60 * 60 * 1000;
/** Cuánta historia se mira: sobra para las últimas sesiones de cada músculo y la ventana de 2 semanas. */
const HISTORY_DAYS = 42;

export interface SessionReview {
  /** Cambios de volumen que salieron de esta sesión: sugeridos o, en modo automático, ya aplicados. */
  volumeChanges: VolumeChange[];
  /** Músculos estancados con RIR alto: no se baja volumen, se pide apretar más. */
  pushHarder: { muscle: Muscle; reason: string }[];
  /** Descarga general sugerida o, en modo automático, ya arrancada. */
  deload: Deload | null;
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
   * La app nunca suma series: solo baja volumen, pide apretar más o propone una descarga.
   */
  async afterSession(userId: string, trained: Muscle[], mode: AdjustMode, now = new Date()): Promise<SessionReview> {
    const review: SessionReview = { volumeChanges: [], pushHarder: [], deload: null };
    const active = await this.volume.activeDeload(userId, now);
    // En la semana de descarga se entrena liviano a propósito: no hay nada que evaluar.
    if (active?.phase === 'deload') return review;

    const histories = muscleHistories(await this.recentSessions(userId, now));

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
      if (decision.kind === 'reduce' && !generalStall) {
        review.volumeChanges.push(await this.reduce(userId, muscle, decision.delta, decision.reason, mode, now));
      }
    }
    return review;
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
      include: { entries: { include: { sets: { orderBy: { position: 'asc' } } } } },
    });
    return sessions.map((s) => ({
      performedAt: s.performedAt,
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
