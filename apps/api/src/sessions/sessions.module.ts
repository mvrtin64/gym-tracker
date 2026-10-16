import { Module } from '@nestjs/common';
import { VolumeModule } from '../volume/volume.module';
import { SessionsController } from './sessions.controller';
import { SessionsService } from './sessions.service';

@Module({
  imports: [VolumeModule],
  controllers: [SessionsController],
  providers: [SessionsService],
})
export class SessionsModule {}
