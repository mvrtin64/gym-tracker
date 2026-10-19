import { DELOAD_WEEK, deloadWeight, painWeight, scaleSets, workingSets } from '@gym/domain';
import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { definedOnly } from '../common/objects';
import { toSetLog } from '../common/set-log';
import { defaultPrescription, defaultSettings, pickSettings, visibleTo } from '../exercises/exercise.mapper';
import { ExercisesService } from '../exercises/exercises.service';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ProgressionService } from '../progression/progression.service';
import { VolumeService } from '../volume/volume.service';
import { CreateRoutineDto } from './dto/create-routine.dto';

const withExercises = (userId: string) =>
  ({
    exercises: {
      orderBy: { position: 'asc' },
      include: { exercise: { include: { userData: { where: { userId } } } } },
    },
  }) as const;

@Injectable()
export class RoutinesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly exercises: ExercisesService,
    private readonly progression: ProgressionService,
    private readonly volume: VolumeService,
  ) {}

  async list(userId: string) {
    const routines = await this.prisma.routine.findMany({
      where: { userId },
      orderBy: { name: 'asc' },
      include: {
        exercises: { orderBy: { position: 'asc' }, include: { exercise: true } },
        sessions: { orderBy: { performedAt: 'desc' }, take: 1, select: { performedAt: true } },
      },
    });
    return routines.map(({ exercises, sessions, ...r }) => ({
      ...r,
      exercises: exercises.map(({ exercise, targetMuscle, sets, repMin, repMax }) => ({ exercise, targetMuscle, sets, repMin, repMax })),
      lastPerformedAt: sessions[0]?.performedAt ?? null,
    }));
  }

  async create(userId: string, dto: CreateRoutineDto) {
    const ids = dto.exercises.map((e) => e.exerciseId);
    const found = await this.prisma.exercise.findMany({ where: { id: { in: ids }, ...visibleTo(userId) } });
    if (found.length !== ids.length) throw new BadRequestException('Algún ejercicio no existe');
    const byId = new Map(found.map((e) => [e.id, e]));

    const rows = dto.exercises.map((item, position) => {
      const exercise = byId.get(item.exerciseId)!;
      const targetMuscle = item.targetMuscle ?? exercise.defaultTarget;
      if (!exercise.targetMuscles.includes(targetMuscle)) {
        throw new BadRequestException(`"${exercise.name}" no puede contar para ${targetMuscle}`);
      }
      const prescription = {
        ...defaultPrescription(exercise.type),
        ...definedOnly({ sets: item.sets, repMin: item.repMin, repMax: item.repMax }),
      };
      if (prescription.repMax < prescription.repMin) {
        throw new BadRequestException(`Rango de repeticiones inválido en "${exercise.name}"`);
      }
      return { exerciseId: exercise.id, position, targetMuscle, ...prescription };
    });

    try {
      return await this.prisma.routine.create({
        data: {
          userId,
          name: dto.name.trim(),
          weekday: dto.weekday,
          adjustMode: dto.adjustMode,
          exercises: { create: rows },
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
   * Cambia un ejercicio de la rutina por otro que cuente para el mismo músculo, con la misma
   * prescripción y en el mismo lugar.
   */
  async replaceExercise(userId: string, id: string, exerciseId: string, newExerciseId: string) {
    const routine = await this.prisma.routine.findFirst({ where: { id, userId }, include: { exercises: true } });
    const current = routine?.exercises.find((e) => e.exerciseId === exerciseId);
    if (!routine || !current) throw new NotFoundException('El ejercicio no está en la rutina');
    if (routine.exercises.some((e) => e.exerciseId === newExerciseId)) {
      throw new ConflictException('Ese ejercicio ya está en la rutina');
    }
    const replacement = await this.prisma.exercise.findFirst({ where: { id: newExerciseId, ...visibleTo(userId) } });
    if (!replacement) throw new BadRequestException('El ejercicio no existe');
    if (!replacement.targetMuscles.includes(current.targetMuscle)) {
      throw new BadRequestException(`"${replacement.name}" no puede contar para ${current.targetMuscle}`);
    }
    return this.prisma.routineExercise.update({
      where: { routineId_exerciseId: { routineId: id, exerciseId } },
      data: { exerciseId: newExerciseId },
      include: { exercise: true },
    });
  }

  /**
   * Arma el entrenamiento del día: para cada ejercicio, su prescripción, el objetivo de hoy, la
   * anotación del usuario y lo que hizo la última vez que entrenó esta rutina (o, si el ejercicio
   * es nuevo en la rutina, la última vez que lo hizo en cualquier sesión). Las sesiones de descarga
   * no sirven de referencia.
   *
   * Con una descarga en curso las series se reducen en proporción al volumen de la semana; en la
   * semana de descarga, además, el peso va a la mitad y se apunta a RIR 4–5 (§5.3).
   */
  async workout(userId: string, id: string) {
    const routine = await this.prisma.routine.findFirst({ where: { id, userId }, include: withExercises(userId) });
    if (!routine) throw new NotFoundException('Rutina no encontrada');

    const [lastSession, deload] = await Promise.all([
      this.prisma.workoutSession.findFirst({
        where: { routineId: id, isDeload: false },
        orderBy: { performedAt: 'desc' },
        include: { entries: { include: { sets: { orderBy: { position: 'asc' } } } } },
      }),
      this.volume.activeDeload(userId),
    ]);

    const exercises = await Promise.all(
      routine.exercises.map(async ({ exercise: { userData, ...exercise }, targetMuscle, sets, repMin, repMax }) => {
        const settings = userData[0] ? pickSettings(userData[0]) : defaultSettings(exercise.type);
        const prescription = { sets, repMin, repMax };
        const entry = lastSession?.entries.find((e) => e.exerciseId === exercise.id);
        const previous =
          lastSession && entry
            ? { performedAt: lastSession.performedAt, fromRoutine: true, sets: entry.sets.map(toSetLog) }
            : await this.exercises
                .history(userId, exercise.id, 5)
                .then((h) => h.find((x) => !x.isDeload))
                .then((h) => (h ? { ...h, fromRoutine: false } : null));
        let target = await this.progression.nextTarget(userId, exercise.id, prescription, settings);
        if (deload) {
          target = { ...target, sets: scaleSets(target.sets, deload.volume[targetMuscle], deload.base[targetMuscle]) };
        }
        if (deload?.phase === 'deload') {
          target = {
            ...target,
            weightKg: deloadWeight(target.weightKg, settings.weightIncrementKg),
            reason: `Semana de descarga: mitad de series y de peso. Dejá ${DELOAD_WEEK.rir.min}–${DELOAD_WEEK.rir.max} reps en reserva.`,
          };
        }
        // Dolor articular repetido (§6.5): moderado baja el peso; mucho pide cambiar el ejercicio.
        const decision = await this.exercises.jointPain(userId, exercise.id);
        const pain = decision.kind === 'none' ? null : decision;
        if (decision.kind === 'lower_weight' && deload?.phase !== 'deload') {
          const last = await this.exercises.history(userId, exercise.id, 1);
          const top = Math.max(0, ...workingSets(last[0]?.sets ?? []).map((s) => s.weightKg));
          target = { ...target, weightKg: Math.min(target.weightKg, painWeight(top, settings.weightIncrementKg)), reason: decision.reason };
        }
        return { exercise, targetMuscle, prescription, note: settings.note, target, previous, pain };
      }),
    );

    return {
      id: routine.id,
      name: routine.name,
      weekday: routine.weekday,
      adjustMode: routine.adjustMode,
      lastPerformedAt: lastSession?.performedAt ?? null,
      deload: deload && { phase: deload.phase, endsAt: deload.endsAt, doneAt: deload.doneAt, rir: DELOAD_WEEK.rir },
      exercises,
    };
  }
}
