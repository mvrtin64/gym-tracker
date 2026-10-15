import { EXERCISE_TYPES, MUSCLES, type ExerciseType, type Muscle } from '@gym/domain';
import { ArrayMinSize, ArrayUnique, IsIn, IsNotEmpty, IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

/** Ejercicio propio del usuario, para lo que no está en el catálogo. */
export class CreateExerciseDto {
  @IsString() @IsNotEmpty() @MaxLength(80)
  name: string;

  @IsIn(EXERCISE_TYPES)
  type: ExerciseType;

  /** Músculos a los que puede contar según el enfoque. */
  @IsIn(MUSCLES, { each: true }) @ArrayMinSize(1) @ArrayUnique()
  targetMuscles: Muscle[];

  /** Enfoque por defecto; tiene que estar en targetMuscles. Si no se manda, el primero. */
  @IsOptional() @IsIn(MUSCLES)
  defaultTarget?: Muscle;

  /** GIF o link de YouTube. */
  @IsOptional() @IsUrl()
  demoUrl?: string;
}
