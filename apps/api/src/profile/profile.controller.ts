import { Body, Controller, Get, Put } from '@nestjs/common';
import { CurrentUserId } from '../common/current-user.decorator';
import { UpsertProfileDto } from './dto/upsert-profile.dto';
import { ProfileService } from './profile.service';

@Controller('profile')
export class ProfileController {
  constructor(private readonly profile: ProfileService) {}

  @Get()
  get(@CurrentUserId() userId: string) {
    return this.profile.get(userId);
  }

  @Put()
  upsert(@CurrentUserId() userId: string, @Body() dto: UpsertProfileDto) {
    return this.profile.upsert(userId, dto);
  }
}
