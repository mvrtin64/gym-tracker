import { computeNextTarget, type NextTarget } from '@gym/domain';
import { Injectable } from '@nestjs/common';
import { toProgressionScheme, type ExerciseSettings, type Prescription } from '../exercises/exercise.mapper';
import { ExercisesService } from '../exercises/exercises.service';

/** Cuántas sesiones mira el motor (alcanza para detectar rachas de fallos). */
const HISTORY_WINDOW = 10;

@Injectable()
export class ProgressionService {
  constructor(private readonly exercises: ExercisesService) {}

  /** Objetivo de la próxima sesión, con la prescripción de la rutina y la configuración del usuario. */
  async nextTarget(
    userId: string,
    exerciseId: string,
    prescription: Prescription,
    settings: ExerciseSettings,
  ): Promise<NextTarget> {
    const history = await this.exercises.history(userId, exerciseId, HISTORY_WINDOW);
    return computeNextTarget(toProgressionScheme(prescription, settings), history);
  }
}
