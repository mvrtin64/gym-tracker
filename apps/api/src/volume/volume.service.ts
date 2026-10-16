import { deloadState, MUSCLES, weeklySetsByMuscle, type Muscle, type WeeklyVolume } from '@gym/domain';
import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { toSetLog } from '../common/set-log';
import { PrismaService } from '../prisma/prisma.service';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Lunes 00:00 de la semana de `date` (hora del servidor). */
export function startOfWeek(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  return new Date(d.getTime() - ((d.getDay() + 6) % 7) * DAY_MS);
}

export function parseMuscle(value: string): Muscle {
  if (!(MUSCLES as readonly string[]).includes(value)) throw new BadRequestException(`Músculo desconocido: ${value}`);
  return value as Muscle;
}

/** Un ajuste nunca deja un músculo en 0: si se entrena, sigue teniendo al menos 1 serie. */
const MIN_ADJUSTED_SETS = 1;

@Injectable()
export class VolumeService {
  constructor(private readonly prisma: PrismaService) {}

  /** Objetivo semanal por músculo (al que se vuelve después de una descarga); falla si todavía no hizo el onboarding. */
  async current(userId: string): Promise<WeeklyVolume> {
    const rows = await this.prisma.muscleVolume.findMany({ where: { userId } });
    if (rows.length === 0) throw new NotFoundException('Todavía no hay volumen: completá el onboarding');
    return Object.fromEntries(rows.map((r) => [r.muscle, r.weeklySets])) as WeeklyVolume;
  }

  /** Descarga en curso (la semana de descarga o la vuelta gradual), o `null` si no hay ninguna. */
  async activeDeload(userId: string, now = new Date()) {
    const deload = await this.prisma.deload.findFirst({
      where: { userId, status: 'started' },
      orderBy: { startedAt: 'desc' },
    });
    if (!deload?.startedAt) return null;
    const base = await this.current(userId);
    const state = deloadState(base, deload.startedAt, now);
    return state.phase === 'done' ? null : { ...deload, ...state, base };
  }

  /** Volumen que corresponde hoy: el objetivo, o el reducido si hay una descarga en curso. */
  async effective(userId: string, now = new Date()): Promise<WeeklyVolume> {
    const active = await this.activeDeload(userId, now);
    return active ? active.volume : this.current(userId);
  }

  /** Objetivo y series efectivas hechas esta semana por músculo, más las sugerencias y la descarga. */
  async summary(userId: string, now = new Date()) {
    const base = await this.current(userId);
    const active = await this.activeDeload(userId, now);
    const target = active?.volume ?? base;
    const from = startOfWeek(now);
    const to = new Date(from.getTime() + 7 * DAY_MS);
    const entries = await this.prisma.exerciseEntry.findMany({
      where: { session: { userId, performedAt: { gte: from, lt: to } } },
      include: { session: { select: { performedAt: true } }, sets: true },
    });
    const done = weeklySetsByMuscle(
      entries.map((e) => ({ performedAt: e.session.performedAt, targetMuscle: e.targetMuscle, sets: e.sets.map(toSetLog) })),
      from,
      to,
    );
    const [pendingChanges, suggestedDeload] = await Promise.all([
      this.prisma.volumeChange.findMany({ where: { userId, status: 'suggested' }, orderBy: { createdAt: 'desc' } }),
      this.prisma.deload.findFirst({ where: { userId, status: 'suggested' }, orderBy: { createdAt: 'desc' } }),
    ]);
    const deload = active
      ? {
          id: active.id,
          status: active.status,
          reason: active.reason,
          phase: active.phase,
          startedAt: active.startedAt,
          endsAt: active.endsAt,
          doneAt: active.doneAt,
        }
      : suggestedDeload && { id: suggestedDeload.id, status: suggestedDeload.status, reason: suggestedDeload.reason };
    return {
      weekStart: from,
      muscles: MUSCLES.map((muscle) => ({ muscle, target: target[muscle], baseTarget: base[muscle], done: done[muscle] })),
      pendingChanges,
      deload: deload ?? null,
    };
  }

  /** Cambio manual: el usuario siempre puede sumar o restar series. Queda en el historial. */
  async setTarget(userId: string, muscle: Muscle, weeklySets: number) {
    const current = await this.prisma.muscleVolume.findUnique({ where: { userId_muscle: { userId, muscle } } });
    if (!current) throw new NotFoundException('Todavía no hay volumen: completá el onboarding');
    const delta = weeklySets - current.weeklySets;
    if (delta === 0) return current;
    const [updated] = await this.prisma.$transaction([
      this.prisma.muscleVolume.update({ where: { userId_muscle: { userId, muscle } }, data: { weeklySets } }),
      this.prisma.volumeChange.create({
        data: { userId, muscle, delta, reason: 'Cambio manual', status: 'applied', decidedAt: new Date() },
      }),
    ]);
    return updated;
  }

  /** Aplica un ajuste (aceptado o automático) sin bajar de `MIN_ADJUSTED_SETS`. */
  async applyDelta(userId: string, muscle: Muscle, delta: number) {
    const current = await this.prisma.muscleVolume.findUnique({ where: { userId_muscle: { userId, muscle } } });
    if (!current) throw new NotFoundException('Todavía no hay volumen: completá el onboarding');
    const weeklySets = Math.max(MIN_ADJUSTED_SETS, current.weeklySets + delta);
    return this.prisma.muscleVolume.update({ where: { userId_muscle: { userId, muscle } }, data: { weeklySets } });
  }

  private async pendingChange(userId: string, id: string) {
    const change = await this.prisma.volumeChange.findFirst({ where: { id, userId } });
    if (!change) throw new NotFoundException('Sugerencia no encontrada');
    if (change.status !== 'suggested') throw new ConflictException('La sugerencia ya se resolvió');
    return change;
  }

  async acceptChange(userId: string, id: string) {
    const change = await this.pendingChange(userId, id);
    await this.applyDelta(userId, change.muscle, change.delta);
    return this.prisma.volumeChange.update({ where: { id }, data: { status: 'applied', decidedAt: new Date() } });
  }

  async dismissChange(userId: string, id: string) {
    await this.pendingChange(userId, id);
    return this.prisma.volumeChange.update({ where: { id }, data: { status: 'dismissed', decidedAt: new Date() } });
  }

  private async suggestedDeload(userId: string, id: string) {
    const deload = await this.prisma.deload.findFirst({ where: { id, userId } });
    if (!deload) throw new NotFoundException('Descarga no encontrada');
    if (deload.status !== 'suggested') throw new ConflictException('La descarga ya se resolvió');
    return deload;
  }

  /** La semana de descarga arranca hoy. */
  async startDeload(userId: string, id: string) {
    await this.suggestedDeload(userId, id);
    const now = new Date();
    return this.prisma.deload.update({ where: { id }, data: { status: 'started', startedAt: now, decidedAt: now } });
  }

  async dismissDeload(userId: string, id: string) {
    await this.suggestedDeload(userId, id);
    return this.prisma.deload.update({ where: { id }, data: { status: 'dismissed', decidedAt: new Date() } });
  }
}
