import { IsInt, Max, Min } from 'class-validator';

export class SetVolumeDto {
  @IsInt() @Min(0) @Max(40)
  weeklySets: number;
}
