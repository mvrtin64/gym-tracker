import { Body, Controller, Get, Param, Put } from '@nestjs/common';
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
}
