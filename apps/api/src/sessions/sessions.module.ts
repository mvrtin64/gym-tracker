import { Module } from '@nestjs/common';
import { ExercisesModule } from '../exercises/exercises.module';
import { VolumeModule } from '../volume/volume.module';
import { SessionsController } from './sessions.controller';
import { SessionsService } from './sessions.service';

@Module({
  imports: [ExercisesModule, VolumeModule],
  controllers: [SessionsController],
  providers: [SessionsService],
})
export class SessionsModule {}
