import { rirFromFeedback, type Muscle } from '@gym/domain';
import { BadRequestException, Injectable } from '@nestjs/common';
import { visibleTo } from '../exercises/exercise.mapper';
import type { AdjustMode } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AdjustmentsService, type SessionReview } from '../volume/adjustments.service';
import { VolumeService } from '../volume/volume.service';
import { CreateSessionDto } from './dto/create-session.dto';

const withSets = { entries: { orderBy: { position: 'asc' }, include: { exercise: true, sets: { orderBy: { position: 'asc' } } } } } as const;

@Injectable()
export class SessionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly volume: VolumeService,
    private readonly adjustments: AdjustmentsService,
  ) {}

  list(userId: string, take = 20) {
    return this.prisma.workoutSession.findMany({
      where: { userId },
      orderBy: { performedAt: 'desc' },
      include: withSets,
      take,
    });
  }

  async create(userId: string, dto: CreateSessionDto) {
    const ids = [...new Set(dto.entries.map((e) => e.exerciseId))];
    const exercises = await this.prisma.exercise.findMany({ where: { id: { in: ids }, ...visibleTo(userId) } });
    if (exercises.length !== ids.length) throw new BadRequestException('Algún ejercicio no existe');
    const byId = new Map(exercises.map((e) => [e.id, e]));

    // El músculo objetivo de cada ejercicio en la rutina, para copiarlo en lo anotado.
    let routineTargets = new Map<string, Muscle>();
    // Fuera de una rutina, los ajustes quedan como sugerencia.
    let adjustMode: AdjustMode = 'suggest';
    if (dto.routineId) {
      const routine = await this.prisma.routine.findFirst({ where: { id: dto.routineId, userId }, include: { exercises: true } });
      if (!routine) throw new BadRequestException('La rutina no existe');
      routineTargets = new Map(routine.exercises.map((e) => [e.exerciseId, e.targetMuscle]));
      adjustMode = routine.adjustMode;
    }

    const entries = dto.entries.map((entry, i) => {
      const exercise = byId.get(entry.exerciseId)!;
      const targetMuscle = entry.targetMuscle ?? routineTargets.get(exercise.id) ?? exercise.defaultTarget;
      if (!exercise.targetMuscles.includes(targetMuscle)) {
        throw new BadRequestException(`"${exercise.name}" no puede contar para ${targetMuscle}`);
      }
      return {
        exerciseId: exercise.id,
        position: i,
        targetMuscle,
        sets: {
          // Se guarda lo que respondió el usuario y el RIR estimado por el dominio.
          create: entry.sets.map((s, j) => ({ ...s, rir: rirFromFeedback(s), position: j })),
        },
      };
    });

    // Lo que se entrena durante la semana de descarga queda marcado como descarga.
    const isDeload = dto.isDeload ?? (await this.volume.activeDeload(userId))?.phase === 'deload';
    const session = await this.prisma.workoutSession.create({
      data: {
        userId,
        performedAt: dto.performedAt ? new Date(dto.performedAt) : undefined,
        notes: dto.notes,
        routineId: dto.routineId,
        isDeload,
        entries: { create: entries },
      },
      include: withSets,
    });

    const review: SessionReview = isDeload
      ? { volumeChanges: [], pushHarder: [], deload: null }
      : await this.adjustments.afterSession(userId, entries.map((e) => e.targetMuscle), adjustMode);
    return { ...session, review };
  }
}
