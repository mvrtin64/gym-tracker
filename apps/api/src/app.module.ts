import { Module } from '@nestjs/common';
import { ExercisesModule } from './exercises/exercises.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProgressionModule } from './progression/progression.module';
import { RoutinesModule } from './routines/routines.module';
import { SessionsModule } from './sessions/sessions.module';

@Module({
  imports: [PrismaModule, ExercisesModule, SessionsModule, ProgressionModule, RoutinesModule],
})
export class AppModule {}
