import { Body, Controller, Get, HttpCode, Post, Put } from '@nestjs/common';
import { CurrentUserId } from '../common/current-user.decorator';
import { UpsertProfileDto } from './dto/upsert-profile.dto';
import { ProfileService } from './profile.service';

@Controller('profile')
export class ProfileController {
  constructor(private readonly profile: ProfileService) {}

  @Get()
  get(@CurrentUserId() userId: string) {
    return this.profile.getWithSuggestion(userId);
  }

  /** "Ahora no" a la sugerencia de pasar a intermedio: se vuelve a sugerir más adelante. */
  @Post('level-up/dismiss')
  @HttpCode(204)
  dismissLevelUp(@CurrentUserId() userId: string) {
    return this.profile.dismissLevelUp(userId);
  }

  @Put()
  upsert(@CurrentUserId() userId: string, @Body() dto: UpsertProfileDto) {
    return this.profile.upsert(userId, dto);
  }
}
