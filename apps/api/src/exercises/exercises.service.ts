import { validateScheme } from '@gym/domain';
import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateExerciseDto } from './dto/create-exercise.dto';
import { defaultsFor, toProgressionScheme } from './exercise.mapper';

@Injectable()
export class ExercisesService {
  constructor(private readonly prisma: PrismaService) {}

  list(userId: string) {
    return this.prisma.exercise.findMany({ where: { userId }, orderBy: { name: 'asc' } });
  }

  async get(userId: string, id: string) {
    const exercise = await this.prisma.exercise.findFirst({ where: { id, userId } });
    if (!exercise) throw new NotFoundException('Ejercicio no encontrado');
    return exercise;
  }

  async create(userId: string, dto: CreateExerciseDto) {
    const type = dto.type ?? 'compound';
    // Los campos opcionales no enviados llegan como undefined: no deben pisar los defaults del tipo.
    const sent = Object.fromEntries(Object.entries(dto).filter(([, v]) => v !== undefined));
    const data = { ...defaultsFor(type), ...sent, name: dto.name, muscleGroup: dto.muscleGroup, type };
    try {
      // Las reglas de negocio viven en el dominio: se validan antes de persistir.
      validateScheme(toProgressionScheme(data));
    } catch (e) {
      throw new BadRequestException((e as Error).message);
    }
    try {
      return await this.prisma.exercise.create({ data: { ...data, userId } });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException(`Ya existe un ejercicio llamado "${dto.name}"`);
      }
      throw e;
    }
  }

  /** Últimas sesiones de un ejercicio con sus series, de la más reciente a la más vieja. */
  async history(userId: string, id: string, take = 20) {
    await this.get(userId, id);
    const entries = await this.prisma.exerciseEntry.findMany({
      where: { exerciseId: id },
      include: { session: true, sets: { orderBy: { position: 'asc' } } },
      orderBy: { session: { performedAt: 'desc' } },
      take,
    });
    return entries.map((e) => ({
      sessionId: e.sessionId,
      performedAt: e.session.performedAt,
      sets: e.sets.map(({ weightKg, reps, rpe, warmup }) => ({ weightKg, reps, rpe: rpe ?? undefined, warmup })),
    }));
  }
}
