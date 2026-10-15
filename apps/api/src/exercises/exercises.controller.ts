import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Put } from '@nestjs/common';
import { CurrentUserId } from '../common/current-user.decorator';
import { CreateExerciseDto } from './dto/create-exercise.dto';
import { UpdateExerciseSettingsDto } from './dto/update-exercise-settings.dto';
import { ExercisesService } from './exercises.service';

@Controller('exercises')
export class ExercisesController {
  constructor(private readonly exercises: ExercisesService) {}

  @Get()
  list(@CurrentUserId() userId: string) {
    return this.exercises.list(userId);
  }

  @Post()
  create(@CurrentUserId() userId: string, @Body() dto: CreateExerciseDto) {
    return this.exercises.create(userId, dto);
  }

  @Get(':id')
  get(@CurrentUserId() userId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.exercises.get(userId, id);
  }

  @Put(':id/settings')
  updateSettings(
    @CurrentUserId() userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateExerciseSettingsDto,
  ) {
    return this.exercises.updateSettings(userId, id, dto);
  }

  @Get(':id/history')
  history(@CurrentUserId() userId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.exercises.history(userId, id);
  }
}
