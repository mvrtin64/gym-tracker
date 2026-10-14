import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSessionDto } from './dto/create-session.dto';

const withSets = { entries: { orderBy: { position: 'asc' }, include: { exercise: true, sets: { orderBy: { position: 'asc' } } } } } as const;

@Injectable()
export class SessionsService {
  constructor(private readonly prisma: PrismaService) {}

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
    const owned = await this.prisma.exercise.count({ where: { userId, id: { in: ids } } });
    if (owned !== ids.length) throw new BadRequestException('Algún ejercicio no existe');
    if (dto.routineId && !(await this.prisma.routine.count({ where: { id: dto.routineId, userId } }))) {
      throw new BadRequestException('La rutina no existe');
    }

    return this.prisma.workoutSession.create({
      data: {
        userId,
        performedAt: dto.performedAt ? new Date(dto.performedAt) : undefined,
        notes: dto.notes,
        routineId: dto.routineId,
        entries: {
          create: dto.entries.map((entry, i) => ({
            exerciseId: entry.exerciseId,
            position: i,
            sets: { create: entry.sets.map((s, j) => ({ ...s, position: j })) },
          })),
        },
      },
      include: withSets,
    });
  }
}
