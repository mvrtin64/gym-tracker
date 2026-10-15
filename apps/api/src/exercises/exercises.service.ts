import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { definedOnly } from '../common/objects';
import { toSetLog } from '../common/set-log';
import { Prisma, type Exercise, type UserExercise } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateExerciseDto } from './dto/create-exercise.dto';
import { UpdateExerciseSettingsDto } from './dto/update-exercise-settings.dto';
import { defaultSettings, pickSettings, visibleTo } from './exercise.mapper';

const withUserData = (userId: string) => ({ userData: { where: { userId } } });

/** Ejercicio del catálogo con lo que el usuario configuró (o los valores por defecto). */
function withSettings({ userData, ...exercise }: Exercise & { userData: UserExercise[] }) {
  return {
    ...exercise,
    isOwn: exercise.ownerId !== null,
    settings: userData[0] ? pickSettings(userData[0]) : defaultSettings(exercise.type),
  };
}

@Injectable()
export class ExercisesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string) {
    const rows = await this.prisma.exercise.findMany({
      where: visibleTo(userId),
      orderBy: { name: 'asc' },
      include: withUserData(userId),
    });
    return rows.map(withSettings);
  }

  async get(userId: string, id: string) {
    const row = await this.prisma.exercise.findFirst({ where: { id, ...visibleTo(userId) }, include: withUserData(userId) });
    if (!row) throw new NotFoundException('Ejercicio no encontrado');
    return withSettings(row);
  }

  async create(userId: string, dto: CreateExerciseDto) {
    const defaultTarget = dto.defaultTarget ?? dto.targetMuscles[0];
    if (!dto.targetMuscles.includes(defaultTarget)) {
      throw new BadRequestException('El enfoque por defecto tiene que estar entre los músculos del ejercicio');
    }
    try {
      const row = await this.prisma.exercise.create({
        data: { ...dto, name: dto.name.trim(), defaultTarget, ownerId: userId },
        include: withUserData(userId),
      });
      return withSettings(row);
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException(`Ya tenés un ejercicio llamado "${dto.name}"`);
      }
      throw e;
    }
  }

  /** Anotación y reglas de progresión del usuario para un ejercicio. */
  async updateSettings(userId: string, id: string, dto: UpdateExerciseSettingsDto) {
    const exercise = await this.get(userId, id);
    const sent = definedOnly(dto);
    const data = { ...sent, ...(sent.note !== undefined && { note: sent.note.trim() || null }) };
    const row = await this.prisma.userExercise.upsert({
      where: { userId_exerciseId: { userId, exerciseId: id } },
      create: { ...defaultSettings(exercise.type), ...data, userId, exerciseId: id },
      update: data,
    });
    return pickSettings(row);
  }

  /** Últimas sesiones del usuario con este ejercicio, de la más reciente a la más vieja. */
  async history(userId: string, id: string, take = 20) {
    await this.get(userId, id);
    const entries = await this.prisma.exerciseEntry.findMany({
      where: { exerciseId: id, session: { userId } },
      include: { session: true, sets: { orderBy: { position: 'asc' } } },
      orderBy: { session: { performedAt: 'desc' } },
      take,
    });
    return entries.map((e) => ({
      sessionId: e.sessionId,
      performedAt: e.session.performedAt,
      targetMuscle: e.targetMuscle,
      sets: e.sets.map(toSetLog),
    }));
  }
}
