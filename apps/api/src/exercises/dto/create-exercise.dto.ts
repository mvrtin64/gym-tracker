import { EXERCISE_TYPES, MUSCLE_GROUPS, type ExerciseType, type MuscleGroup } from '@gym/domain';
import { IsIn, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateExerciseDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsIn(MUSCLE_GROUPS)
  muscleGroup: MuscleGroup;

  /** Multiarticular o monoarticular: define series, rango e incremento por defecto. */
  @IsOptional() @IsIn(EXERCISE_TYPES)
  type?: ExerciseType;

  @IsOptional() @IsInt() @Min(1) @Max(10)
  sets?: number;

  @IsOptional() @IsInt() @Min(1) @Max(50)
  repMin?: number;

  @IsOptional() @IsInt() @Min(1) @Max(50)
  repMax?: number;

  @IsOptional() @IsNumber() @Min(0.25)
  weightIncrementKg?: number;

  @IsOptional() @IsNumber() @Min(0.5) @Max(0.99)
  deloadFactor?: number;

  @IsOptional() @IsInt() @Min(1) @Max(10)
  failuresBeforeDeload?: number;

  @IsOptional() @IsNumber() @Min(0)
  startingWeightKg?: number;
}
