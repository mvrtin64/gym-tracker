import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ExercisesService } from '../exercises/exercises.service';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ProgressionService } from '../progression/progression.service';
import { CreateRoutineDto } from './dto/create-routine.dto';

const withExercises = { exercises: { orderBy: { position: 'asc' }, include: { exercise: true } } } as const;

@Injectable()
export class RoutinesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly exercises: ExercisesService,
    private readonly progression: ProgressionService,
  ) {}

  async list(userId: string) {
    const routines = await this.prisma.routine.findMany({
      where: { userId },
      orderBy: { name: 'asc' },
      include: { ...withExercises, sessions: { orderBy: { performedAt: 'desc' }, take: 1, select: { performedAt: true } } },
    });
    return routines.map(({ exercises, sessions, ...r }) => ({
      ...r,
      exercises: exercises.map((e) => e.exercise),
      lastPerformedAt: sessions[0]?.performedAt ?? null,
    }));
  }

  async create(userId: string, dto: CreateRoutineDto) {
    const owned = await this.prisma.exercise.count({ where: { userId, id: { in: dto.exerciseIds } } });
    if (owned !== dto.exerciseIds.length) throw new BadRequestException('Algún ejercicio no existe');
    try {
      return await this.prisma.routine.create({
        data: {
          userId,
          name: dto.name.trim(),
          exercises: { create: dto.exerciseIds.map((exerciseId, position) => ({ exerciseId, position })) },
        },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException(`Ya existe una rutina llamada "${dto.name}"`);
      }
      throw e;
    }
  }

  /**
   * Arma el entrenamiento del día: para cada ejercicio, el objetivo de hoy y lo que hizo
   * la última vez que entrenó esta rutina (o, si el ejercicio es nuevo en la rutina,
   * la última vez que lo hizo en cualquier sesión).
   */
  async workout(userId: string, id: string) {
    const routine = await this.prisma.routine.findFirst({ where: { id, userId }, include: withExercises });
    if (!routine) throw new NotFoundException('Rutina no encontrada');

    const lastSession = await this.prisma.workoutSession.findFirst({
      where: { routineId: id },
      orderBy: { performedAt: 'desc' },
      include: { entries: { include: { sets: { orderBy: { position: 'asc' } } } } },
    });

    const exercises = await Promise.all(
      routine.exercises.map(async ({ exercise }) => {
        const entry = lastSession?.entries.find((e) => e.exerciseId === exercise.id);
        const previous =
          lastSession && entry
            ? {
                performedAt: lastSession.performedAt,
                fromRoutine: true,
                sets: entry.sets.map(({ weightKg, reps, rpe, warmup }) => ({ weightKg, reps, rpe: rpe ?? undefined, warmup })),
              }
            : await this.exercises.history(userId, exercise.id, 1).then((h) => (h[0] ? { ...h[0], fromRoutine: false } : null));
        const target = await this.progression.nextTarget(userId, exercise.id);
        return { exercise, target, previous };
      }),
    );

    return { id: routine.id, name: routine.name, lastPerformedAt: lastSession?.performedAt ?? null, exercises };
  }
}
