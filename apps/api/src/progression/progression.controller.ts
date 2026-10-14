import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { CurrentUserId } from '../common/current-user.decorator';
import { ProgressionService } from './progression.service';

@Controller('exercises/:id/next-target')
export class ProgressionController {
  constructor(private readonly progression: ProgressionService) {}

  @Get()
  nextTarget(@CurrentUserId() userId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.progression.nextTarget(userId, id);
  }
}
