import { FEELS, JOINT_PAINS, MUSCLES, SORENESS, type Feel, type JointPain, type Muscle, type Soreness } from '@gym/domain';
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

  /** Dolor articular que marcó al terminar el músculo (§6.5). */
  @IsOptional() @IsIn(JOINT_PAINS)
  jointPain?: JointPain;

  @ValidateNested({ each: true })
  @Type(() => SetDto)
  @ArrayMinSize(1)
  sets: SetDto[];
}

/** Cómo llegó un músculo a esta sesión desde la anterior (§6.5). */
export class SorenessDto {
  @IsIn(MUSCLES)
  muscle: Muscle;

  @IsIn(SORENESS)
  soreness: Soreness;
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

  @IsOptional() @ValidateNested({ each: true })
  @Type(() => SorenessDto)
  soreness?: SorenessDto[];

  @ValidateNested({ each: true })
  @Type(() => EntryDto)
  @ArrayMinSize(1)
  entries: EntryDto[];
}
