import { MUSCLES, WEEKDAYS, type Muscle, type Weekday } from '@gym/domain';
import { Type } from 'class-transformer';
import {
  ArrayMinSize, ArrayUnique, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Max, Min, ValidateNested,
} from 'class-validator';

export const ADJUST_MODES = ['suggest', 'auto'] as const;
export type AdjustMode = (typeof ADJUST_MODES)[number];

/** Un ejercicio de la rutina con su prescripción. Lo que no se manda sale del tipo de ejercicio. */
export class RoutineExerciseDto {
  @IsUUID()
  exerciseId: string;

  /** Enfoque: a qué músculo cuenta (ej. búlgara → glúteo o cuádriceps). Por defecto, el del ejercicio. */
  @IsOptional() @IsIn(MUSCLES)
  targetMuscle?: Muscle;

  @IsOptional() @IsInt() @Min(1) @Max(10)
  sets?: number;

  @IsOptional() @IsInt() @Min(1) @Max(50)
  repMin?: number;

  @IsOptional() @IsInt() @Min(1) @Max(50)
  repMax?: number;
}

export class CreateRoutineDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional() @IsIn(WEEKDAYS)
  weekday?: Weekday;

  /** Rutina propia: por defecto la app solo sugiere. */
  @IsOptional() @IsIn(ADJUST_MODES)
  adjustMode?: AdjustMode;

  /** Ejercicios en el orden en que se hacen. */
  @ValidateNested({ each: true })
  @Type(() => RoutineExerciseDto)
  @ArrayMinSize(1)
  @ArrayUnique((e: RoutineExerciseDto) => e.exerciseId)
  exercises: RoutineExerciseDto[];
}
