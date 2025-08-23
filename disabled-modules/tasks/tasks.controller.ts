import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { TaskPriority, TaskStatus } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateTaskDto, TasksService, UpdateTaskDto } from './tasks.service';

interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
}

interface TaskQuery {
  status?: string;
  priority?: string;
  caseId?: string;
  assignedToId?: string;
  dueDate?: string;
}

interface TaskFilters {
  status?: TaskStatus;
  priority?: TaskPriority;
  caseId?: string;
  assignedToId?: string;
  dueDate?: Date;
}

@Controller('tasks')
@UseGuards(JwtAuthGuard)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  create(
    @Body() createTaskDto: CreateTaskDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.tasksService.createTask(createTaskDto, req.user.id);
  }

  @Get()
  findAll(@Request() req: AuthenticatedRequest, @Query() query: TaskQuery) {
    const filters: TaskFilters = {};

    if (query.status) filters.status = query.status as TaskStatus;
    if (query.priority) filters.priority = query.priority as TaskPriority;
    if (query.caseId) filters.caseId = query.caseId;
    if (query.assignedToId) filters.assignedToId = query.assignedToId;
    if (query.dueDate) filters.dueDate = new Date(query.dueDate);

    return this.tasksService.findAll(req.user.id, filters);
  }

  @Get('my-tasks')
  getMyTasks(@Request() req: AuthenticatedRequest) {
    return this.tasksService.getMyTasks(req.user.id);
  }

  @Get('overdue')
  getOverdueTasks(@Request() req: AuthenticatedRequest) {
    return this.tasksService.getOverdueTasks(req.user.id);
  }

  @Get('stats')
  getTaskStats(@Request() req: AuthenticatedRequest) {
    return this.tasksService.getTaskStats(req.user.id);
  }

  @Get('case/:caseId')
  getTasksByCase(
    @Param('caseId') caseId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.tasksService.getTasksByCase(caseId, req.user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.tasksService.findOne(id, req.user.id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateTaskDto: UpdateTaskDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.tasksService.update(id, updateTaskDto, req.user.id);
  }

  @Patch(':id/complete')
  markAsComplete(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.tasksService.markAsComplete(id, req.user.id);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.tasksService.remove(id, req.user.id);
  }
}
