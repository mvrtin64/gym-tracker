import { planWeek } from '@gym/domain';
import { Controller, Get } from '@nestjs/common';
import { CurrentUserId } from '../common/current-user.decorator';
import { ProfileService } from '../profile/profile.service';
import { VolumeService } from '../volume/volume.service';

@Controller('plan')
export class PlanController {
  constructor(
    private readonly profile: ProfileService,
    private readonly volume: VolumeService,
  ) {}

  /**
   * Vista previa de la semana: músculos y series de cada día según el perfil y el volumen actual.
   * Los ejercicios los elige `POST /routines/generate` (docs/dominio.md §3.4).
   */
  @Get()
  async preview(@CurrentUserId() userId: string) {
    const [profile, volume] = await Promise.all([this.profile.getDomain(userId), this.volume.effective(userId)]);
    return planWeek(profile, volume);
  }
}
