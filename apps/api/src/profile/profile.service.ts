import { initialVolume, MUSCLES, normalizeProfile, type TrainingProfile, type WeeklyVolume } from '@gym/domain';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { TrainingProfile as ProfileRow } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpsertProfileDto } from './dto/upsert-profile.dto';

export function toDomainProfile(row: ProfileRow): TrainingProfile {
  return {
    level: row.level,
    trainingDays: row.trainingDays,
    focus: row.focus,
    priorityMuscles: row.priorityMuscles,
    preferredRepRange:
      row.preferredRepMin !== null && row.preferredRepMax !== null
        ? { min: row.preferredRepMin, max: row.preferredRepMax }
        : undefined,
  };
}

/** Las reglas de negocio viven en el dominio: sus errores de validación son errores del cliente. */
function domain<T>(fn: () => T): T {
  try {
    return fn();
  } catch (e) {
    throw new BadRequestException((e as Error).message);
  }
}

@Injectable()
export class ProfileService {
  constructor(private readonly prisma: PrismaService) {}

  async get(userId: string) {
    const row = await this.prisma.trainingProfile.findUnique({ where: { userId } });
    if (!row) throw new NotFoundException('Todavía no completaste el onboarding');
    return row;
  }

  async getDomain(userId: string): Promise<TrainingProfile> {
    return toDomainProfile(await this.get(userId));
  }

  /**
   * Guarda las respuestas del onboarding. La primera vez también fija el volumen inicial por
   * músculo; después, cambiar el perfil no toca el volumen (ese se ajusta aparte).
   */
  async upsert(userId: string, dto: UpsertProfileDto) {
    if ((dto.preferredRepMin === undefined) !== (dto.preferredRepMax === undefined)) {
      throw new BadRequestException('El rango de repeticiones necesita mínimo y máximo');
    }
    const profile = domain(() =>
      normalizeProfile({
        level: dto.level,
        trainingDays: dto.trainingDays,
        focus: dto.focus ?? 'general',
        priorityMuscles: dto.priorityMuscles ?? [],
        preferredRepRange:
          dto.preferredRepMin !== undefined ? { min: dto.preferredRepMin, max: dto.preferredRepMax! } : undefined,
        reportedVolume: dto.reportedVolume && Object.fromEntries(dto.reportedVolume.map((v) => [v.muscle, v.weeklySets])),
      }),
    );

    const hasVolume = (await this.prisma.muscleVolume.count({ where: { userId } })) > 0;
    const volume: WeeklyVolume | null = hasVolume ? null : domain(() => initialVolume(profile));

    const data = {
      level: profile.level,
      trainingDays: profile.trainingDays,
      focus: profile.focus,
      priorityMuscles: profile.priorityMuscles,
      preferredRepMin: profile.preferredRepRange?.min ?? null,
      preferredRepMax: profile.preferredRepRange?.max ?? null,
    };
    await this.prisma.$transaction([
      this.prisma.trainingProfile.upsert({ where: { userId }, create: { ...data, userId }, update: data }),
      ...(volume
        ? [this.prisma.muscleVolume.createMany({ data: MUSCLES.map((muscle) => ({ userId, muscle, weeklySets: volume[muscle] })) })]
        : []),
    ]);
    return this.get(userId);
  }
}
