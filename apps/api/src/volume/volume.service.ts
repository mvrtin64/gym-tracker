import { MUSCLES, weeklySetsByMuscle, type Muscle, type WeeklyVolume } from '@gym/domain';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
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

@Injectable()
export class VolumeService {
  constructor(private readonly prisma: PrismaService) {}

  /** Objetivo semanal por músculo; falla si todavía no hizo el onboarding. */
  async current(userId: string): Promise<WeeklyVolume> {
    const rows = await this.prisma.muscleVolume.findMany({ where: { userId } });
    if (rows.length === 0) throw new NotFoundException('Todavía no hay volumen: completá el onboarding');
    return Object.fromEntries(rows.map((r) => [r.muscle, r.weeklySets])) as WeeklyVolume;
  }

  /** Objetivo y series efectivas hechas esta semana por músculo, más las sugerencias pendientes. */
  async summary(userId: string, now = new Date()) {
    const target = await this.current(userId);
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
    const pendingChanges = await this.prisma.volumeChange.findMany({
      where: { userId, status: 'suggested' },
      orderBy: { createdAt: 'desc' },
    });
    return {
      weekStart: from,
      muscles: MUSCLES.map((muscle) => ({ muscle, target: target[muscle], done: done[muscle] })),
      pendingChanges,
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
      this.prisma.volumeChange.create({ data: { userId, muscle, delta, reason: 'Cambio manual', status: 'applied' } }),
    ]);
    return updated;
  }
}
