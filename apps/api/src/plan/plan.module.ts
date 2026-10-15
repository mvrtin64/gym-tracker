import { Module } from '@nestjs/common';
import { ProfileModule } from '../profile/profile.module';
import { VolumeModule } from '../volume/volume.module';
import { PlanController } from './plan.controller';

@Module({
  imports: [ProfileModule, VolumeModule],
  controllers: [PlanController],
})
export class PlanModule {}
