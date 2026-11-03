import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { CurrentUserId } from '../common/current-user.decorator';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto, ResendCodeDto, VerifyEmailDto } from './dto/auth.dto';
import { Public } from './public.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Public()
  @Post('login')
  @HttpCode(200)
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Public()
  @Post('verify')
  @HttpCode(200)
  verify(@Body() dto: VerifyEmailDto) {
    return this.auth.verify(dto);
  }

  @Public()
  @Post('resend')
  @HttpCode(204)
  resend(@Body() dto: ResendCodeDto) {
    return this.auth.resend(dto);
  }

  @Get('me')
  me(@CurrentUserId() userId: string) {
    return this.auth.me(userId);
  }
}
