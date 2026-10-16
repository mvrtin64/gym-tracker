import { Module } from '@nestjs/common';
import { AdjustmentsService } from './adjustments.service';
import { VolumeController } from './volume.controller';
import { VolumeService } from './volume.service';

@Module({
  controllers: [VolumeController],
  providers: [VolumeService, AdjustmentsService],
  exports: [VolumeService, AdjustmentsService],
})
export class VolumeModule {}
