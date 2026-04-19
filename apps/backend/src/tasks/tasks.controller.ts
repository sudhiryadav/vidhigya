import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Request,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AuthenticatedRequest } from '../auth/types/authenticated-request.interface';
import { AssignTaskDto, CreateTaskDto, UpdateTaskDto } from './dto/task.dto';
import { TasksService } from './tasks.service';

@Controller('tasks')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  async getAllTasks(@Request() req: AuthenticatedRequest) {
    return this.tasksService.getAllTasks(req.user.sub);
  }

  @Post()
  @Roles(
    UserRole.LAWYER,
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.ASSOCIATE,
  )
  async createTask(
    @Request() req: AuthenticatedRequest,
    @Body() createTaskDto: CreateTaskDto,
  ) {
    return this.tasksService.createTask(req.user.sub, createTaskDto);
  }

  @Get('practice/:practiceId')
  async getTasksByPractice(
    @Param('practiceId') practiceId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.tasksService.getTasksByPractice(practiceId, req.user.sub);
  }

  @Get('my-tasks')
  async getMyTasks(@Request() req: AuthenticatedRequest) {
    return this.tasksService.getMyTasks(req.user.sub);
  }

  @Get(':id')
  async getTaskById(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.tasksService.getTaskById(id, req.user.sub);
  }

  @Put(':id')
  @Roles(
    UserRole.LAWYER,
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.ASSOCIATE,
  )
  async updateTask(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
    @Body() updateTaskDto: UpdateTaskDto,
  ) {
    return this.tasksService.updateTask(id, req.user.sub, updateTaskDto);
  }

  @Delete(':id')
  @Roles(UserRole.LAWYER, UserRole.SUPER_ADMIN, UserRole.ADMIN)
  async deleteTask(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.tasksService.deleteTask(id, req.user.sub);
  }

  @Put(':id/assign')
  @Roles(
    UserRole.LAWYER,
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.ASSOCIATE,
  )
  async assignTask(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
    @Body() assignTaskDto: AssignTaskDto,
  ) {
    return this.tasksService.assignTask(id, req.user.sub, assignTaskDto);
  }
}
