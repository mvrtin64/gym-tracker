import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { CurrentUserId } from '../common/current-user.decorator';
import { CreateRoutineDto, RoutineExerciseDto } from './dto/create-routine.dto';
import { ReplaceExerciseDto } from './dto/replace-exercise.dto';
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

  /** Arma las rutinas de la semana desde el plan (reemplaza las generadas antes). */
  @Post('generate')
  generate(@CurrentUserId() userId: string) {
    return this.routines.generate(userId);
  }

  @Post(':id/exercises')
  addExercise(@CurrentUserId() userId: string, @Param('id', ParseUUIDPipe) id: string, @Body() dto: RoutineExerciseDto) {
    return this.routines.addExercise(userId, id, dto);
  }

  @Get(':id/exercises/:exerciseId/alternatives')
  alternatives(
    @CurrentUserId() userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('exerciseId', ParseUUIDPipe) exerciseId: string,
  ) {
    return this.routines.alternatives(userId, id, exerciseId);
  }

  @Post(':id/exercises/:exerciseId/replace')
  replaceExercise(
    @CurrentUserId() userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('exerciseId', ParseUUIDPipe) exerciseId: string,
    @Body() dto: ReplaceExerciseDto,
  ) {
    return this.routines.replaceExercise(userId, id, exerciseId, dto.exerciseId);
  }

  @Get(':id/workout')
  workout(@CurrentUserId() userId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.routines.workout(userId, id);
  }
}
