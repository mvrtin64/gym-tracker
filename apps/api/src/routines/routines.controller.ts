import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { CurrentUserId } from '../common/current-user.decorator';
import { CreateRoutineDto } from './dto/create-routine.dto';
import { RoutinesService } from './routines.service';

@Controller('routines')
export class RoutinesController {
  constructor(private readonly routines: RoutinesService) {}

  @Get()
  list(@CurrentUserId() userId: string) {
    return this.routines.list(userId);
  }

  @Post()
  create(@CurrentUserId() userId: string, @Body() dto: CreateRoutineDto) {
    return this.routines.create(userId, dto);
  }

  @Get(':id/workout')
  workout(@CurrentUserId() userId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.routines.workout(userId, id);
  }
}
