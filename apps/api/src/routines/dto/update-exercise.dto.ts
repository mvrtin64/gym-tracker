import { IsInt, Max, Min } from 'class-validator';

/** Series de un ejercicio en la rutina: el usuario siempre puede sumar o sacar. */
export class UpdateRoutineExerciseDto {
  @IsInt() @Min(1) @Max(10)
  sets: number;
}
