import { IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class UpdateExerciseSettingsDto {
  /** Anotación fija del usuario (ej. "banco a 30°"). Vacía la borra. */
  @IsOptional() @IsString() @MaxLength(500)
  note?: string;

  @IsOptional() @IsNumber() @Min(0.25)
  weightIncrementKg?: number;

  @IsOptional() @IsNumber() @Min(0)
  startingWeightKg?: number;

  @IsOptional() @IsNumber() @Min(0.5) @Max(0.99)
  deloadFactor?: number;

  @IsOptional() @IsInt() @Min(1) @Max(10)
  failuresBeforeDeload?: number;
}
