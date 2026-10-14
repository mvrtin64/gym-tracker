import { Body, Controller, Get, Post } from '@nestjs/common';
import { CurrentUserId } from '../common/current-user.decorator';
import { CreateSessionDto } from './dto/create-session.dto';
import { SessionsService } from './sessions.service';

@Controller('sessions')
export class SessionsController {
  constructor(private readonly sessions: SessionsService) {}

  @Get()
  list(@CurrentUserId() userId: string) {
    return this.sessions.list(userId);
  }

  @Post()
  create(@CurrentUserId() userId: string, @Body() dto: CreateSessionDto) {
    return this.sessions.create(userId, dto);
  }
}
