import { Type } from 'class-transformer';
import {
  ArrayMinSize, IsBoolean, IsDateString, IsInt, IsNumber, IsOptional, IsString, IsUUID, Max, Min, ValidateNested,
} from 'class-validator';

export class SetDto {
  @IsNumber() @Min(0)
  weightKg: number;

  @IsInt() @Min(0) @Max(100)
  reps: number;

  @IsOptional() @IsNumber() @Min(1) @Max(10)
  rpe?: number;

  @IsOptional() @IsBoolean()
  warmup?: boolean;
}

export class EntryDto {
  @IsUUID()
  exerciseId: string;

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

  @ValidateNested({ each: true })
  @Type(() => EntryDto)
  @ArrayMinSize(1)
  entries: EntryDto[];
}
