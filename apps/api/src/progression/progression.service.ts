import { computeNextTarget, type NextTarget } from '@gym/domain';
import { Injectable } from '@nestjs/common';
import { toProgressionScheme } from '../exercises/exercise.mapper';
import { ExercisesService } from '../exercises/exercises.service';

/** Cuántas sesiones mira el motor (alcanza para detectar rachas de fallos). */
const HISTORY_WINDOW = 10;

@Injectable()
export class ProgressionService {
  constructor(private readonly exercises: ExercisesService) {}

  async nextTarget(userId: string, exerciseId: string): Promise<NextTarget> {
    const exercise = await this.exercises.get(userId, exerciseId);
    const history = await this.exercises.history(userId, exerciseId, HISTORY_WINDOW);
    return computeNextTarget(toProgressionScheme(exercise), history);
  }
}
