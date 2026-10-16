import { Module } from '@nestjs/common';
import { ExercisesModule } from '../exercises/exercises.module';
import { ProgressionModule } from '../progression/progression.module';
import { VolumeModule } from '../volume/volume.module';
import { RoutinesController } from './routines.controller';
import { RoutinesService } from './routines.service';

@Module({
  imports: [ExercisesModule, ProgressionModule, VolumeModule],
  controllers: [RoutinesController],
  providers: [RoutinesService],
})
export class RoutinesModule {}
