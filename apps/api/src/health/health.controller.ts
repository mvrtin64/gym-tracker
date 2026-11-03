import { Controller, Get } from '@nestjs/common';
import { Public } from '../auth/public.decorator';

/** Para el chequeo de salud de Render (y para despertar el servidor gratuito). No toca la base. */
@Controller('health')
export class HealthController {
  @Public()
  @Get()
  check() {
    return { ok: true };
  }
}
