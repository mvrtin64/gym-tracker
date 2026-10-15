import { FEELS, MUSCLES, type Feel, type Muscle } from '@gym/domain';
import { Type } from 'class-transformer';
import {
  ArrayMinSize, IsBoolean, IsDateString, IsIn, IsInt, IsNumber, IsOptional, IsString, IsUUID, Max, Min, ValidateNested,
} from 'class-validator';

export class SetDto {
  @IsNumber() @Min(0)
  weightKg: number;

  @IsInt() @Min(0) @Max(100)
  reps: number;

  @IsOptional() @IsBoolean()
  warmup?: boolean;

  /** Cómo sintió la serie (principiante). */
  @IsOptional() @IsIn(FEELS)
  feel?: Feel;

  /** Esfuerzo percibido (intermedio/avanzado). Si viene junto con `feel`, manda el RPE. */
  @IsOptional() @IsNumber() @Min(1) @Max(10)
  rpe?: number;
}

export class EntryDto {
  @IsUUID()
  exerciseId: string;

  /** A qué músculo cuenta. Por defecto, el de la rutina o el del ejercicio. */
  @IsOptional() @IsIn(MUSCLES)
  targetMuscle?: Muscle;

  @ValidateNested({ each: true })
  @Type(() => SetDto)
  @ArrayMinSize(1)
  sets: SetDto[];
}

export class CreateSessionDto {
  @IsOptional() @IsDateString()
  performedAt?: string;

  @IsOptional() @IsString()
  notes?: string;

  /** Rutina de la que sale la sesión, si sale de una. */
  @IsOptional() @IsUUID()
  routineId?: string;

  /** Semana de descarga. */
  @IsOptional() @IsBoolean()
  isDeload?: boolean;

  @ValidateNested({ each: true })
  @Type(() => EntryDto)
  @ArrayMinSize(1)
  entries: EntryDto[];
}
