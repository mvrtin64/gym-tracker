import { Module } from '@nestjs/common';
import { ExercisesModule } from '../exercises/exercises.module';
import { ProgressionService } from './progression.service';

@Module({
  imports: [ExercisesModule],
  providers: [ProgressionService],
  exports: [ProgressionService],
})
export class ProgressionModule {}
