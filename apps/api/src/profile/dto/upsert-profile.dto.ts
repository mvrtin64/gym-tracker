import { FOCUSES, LEVELS, MUSCLES, WEEKDAYS, type Focus, type Level, type Muscle, type Weekday } from '@gym/domain';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize, ArrayMinSize, ArrayUnique, IsIn, IsInt, IsOptional, Max, Min, ValidateNested,
} from 'class-validator';

export class ReportedVolumeDto {
  @IsIn(MUSCLES)
  muscle: Muscle;

  @IsInt() @Min(0) @Max(40)
  weeklySets: number;
}

/** Respuestas del onboarding (docs/dominio.md §2). */
export class UpsertProfileDto {
  @IsIn(LEVELS)
  level: Level;

  /** Qué días entrena (de 1 a 6). */
  @IsIn(WEEKDAYS, { each: true }) @ArrayMinSize(1) @ArrayMaxSize(6) @ArrayUnique()
  trainingDays: Weekday[];

  /** No se le pregunta al principiante. */
  @IsOptional() @IsIn(FOCUSES)
  focus?: Focus;

  @IsOptional() @IsIn(MUSCLES, { each: true }) @ArrayUnique()
  priorityMuscles?: Muscle[];

  /** Rango con el que se siente cómodo (se mandan los dos o ninguno). */
  @IsOptional() @IsInt() @Min(1) @Max(50)
  preferredRepMin?: number;

  @IsOptional() @IsInt() @Min(1) @Max(50)
  preferredRepMax?: number;

  /** Volumen con el que se maneja (intermedio/avanzado): uno por músculo. */
  @IsOptional() @ValidateNested({ each: true }) @Type(() => ReportedVolumeDto) @ArrayUnique((v: ReportedVolumeDto) => v.muscle)
  reportedVolume?: ReportedVolumeDto[];
}
