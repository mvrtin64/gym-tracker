import { IsUUID } from 'class-validator';

/** Ejercicio que reemplaza a otro en la rutina (ej. porque duele, §6.5). */
export class ReplaceExerciseDto {
  @IsUUID()
  exerciseId: string;
}
