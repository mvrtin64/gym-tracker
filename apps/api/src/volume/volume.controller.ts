import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Put } from '@nestjs/common';
import { CurrentUserId } from '../common/current-user.decorator';
import { SetVolumeDto } from './dto/set-volume.dto';
import { parseMuscle, VolumeService } from './volume.service';

@Controller('volume')
export class VolumeController {
  constructor(private readonly volume: VolumeService) {}

  @Get()
  summary(@CurrentUserId() userId: string) {
    return this.volume.summary(userId);
  }

  @Put(':muscle')
  setTarget(@CurrentUserId() userId: string, @Param('muscle') muscle: string, @Body() dto: SetVolumeDto) {
    return this.volume.setTarget(userId, parseMuscle(muscle), dto.weeklySets);
  }

  @Post('changes/:id/accept')
  acceptChange(@CurrentUserId() userId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.volume.acceptChange(userId, id);
  }

  @Post('changes/:id/dismiss')
  dismissChange(@CurrentUserId() userId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.volume.dismissChange(userId, id);
  }

  @Post('deload/:id/start')
  startDeload(@CurrentUserId() userId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.volume.startDeload(userId, id);
  }

  @Post('deload/:id/dismiss')
  dismissDeload(@CurrentUserId() userId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.volume.dismissDeload(userId, id);
  }
}
