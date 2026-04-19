import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AuthenticatedRequest } from '../auth/types/authenticated-request.interface';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { FeedbackService } from './feedback.service';

@Controller('feedback')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Post()
  async create(
    @Body() createFeedbackDto: CreateFeedbackDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.feedbackService.create(createFeedbackDto, req.user.sub);
  }

  @Get()
  @Roles(UserRole.ADMIN)
  async findAll() {
    return this.feedbackService.findAll();
  }

  @Get('my')
  async findMyFeedback(@Request() req: AuthenticatedRequest) {
    return this.feedbackService.findByUser(req.user.sub);
  }

  @Get('stats')
  @Roles(UserRole.ADMIN)
  async getStats() {
    return this.feedbackService.getFeedbackStats();
  }

  @Get('stats/my')
  async getMyStats(@Request() req: AuthenticatedRequest) {
    return this.feedbackService.getFeedbackStats(req.user.sub);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    const feedback = await this.feedbackService.findOne(id);

    // Only allow access if user owns the feedback or is admin
    if (feedback.userId !== req.user.sub && req.user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Unauthorized');
    }

    return feedback;
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.feedbackService.remove(id, req.user.sub);
  }
}
