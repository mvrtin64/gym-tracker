import { Module } from '@nestjs/common';
import { ExercisesModule } from './exercises/exercises.module';
import { PlanModule } from './plan/plan.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProfileModule } from './profile/profile.module';
import { ProgressionModule } from './progression/progression.module';
import { RoutinesModule } from './routines/routines.module';
import { SessionsModule } from './sessions/sessions.module';
import { VolumeModule } from './volume/volume.module';

@Module({
  imports: [
    PrismaModule,
    ExercisesModule,
    SessionsModule,
    ProgressionModule,
    RoutinesModule,
    ProfileModule,
    VolumeModule,
    PlanModule,
  ],
})
export class AppModule {}
