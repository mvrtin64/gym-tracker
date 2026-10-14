import { ArrayMinSize, ArrayUnique, IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class CreateRoutineDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  /** Ejercicios en el orden en que se hacen. */
  @IsUUID('all', { each: true })
  @ArrayMinSize(1)
  @ArrayUnique()
  exerciseIds: string[];
}
