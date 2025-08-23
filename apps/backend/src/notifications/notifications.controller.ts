import {
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from './notifications.service';

interface AuthenticatedRequest extends Request {
  user: {
    sub: string;
    email: string;
    name: string;
    role: string;
  };
}

interface NotificationQuery {
  isRead?: string;
  type?: string;
}

interface NotificationFilters {
  isRead?: boolean;
  type?: string;
}

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  async findAll(
    @Request() req: AuthenticatedRequest,
    @Query() query: NotificationQuery,
  ) {
    const filters: NotificationFilters = {};

    if (query.isRead !== undefined) {
      filters.isRead = query.isRead === 'true';
    }
    if (query.type) {
      filters.type = query.type;
    }

    // Get user's primary practice ID
    const user = await this.prisma.user.findUnique({
      where: { id: req.user.sub },
      select: { primaryPracticeId: true },
    });

    if (!user?.primaryPracticeId) {
      // User not associated with any practice, return empty array
      return [];
    }

    return this.notificationsService.findAll(
      req.user.sub,
      user.primaryPracticeId,
      filters,
    );
  }

  @Get('unread-count')
  async getUnreadCount(@Request() req: AuthenticatedRequest) {
    // Get user's primary practice ID
    const user = await this.prisma.user.findUnique({
      where: { id: req.user.sub },
      select: { primaryPracticeId: true },
    });

    if (!user?.primaryPracticeId) {
      // User not associated with any practice, return 0
      return 0;
    }

    return this.notificationsService.getUnreadCount(
      req.user.sub,
      user.primaryPracticeId,
    );
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    // Get user's primary practice ID
    const user = await this.prisma.user.findUnique({
      where: { id: req.user.sub },
      select: { primaryPracticeId: true },
    });

    if (!user?.primaryPracticeId) {
      // User not associated with any practice, throw error
      throw new Error('User not associated with any practice');
    }

    return this.notificationsService.findOne(
      id,
      req.user.sub,
      user.primaryPracticeId,
    );
  }

  @Patch(':id/read')
  async markAsRead(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    // Get user's primary practice ID
    const user = await this.prisma.user.findUnique({
      where: { id: req.user.sub },
      select: { primaryPracticeId: true },
    });

    if (!user?.primaryPracticeId) {
      // User not associated with any practice, throw error
      throw new Error('User not associated with any practice');
    }

    return this.notificationsService.markAsRead(
      id,
      req.user.sub,
      user.primaryPracticeId,
    );
  }

  @Patch('mark-all-read')
  async markAllAsRead(@Request() req: AuthenticatedRequest) {
    // Get user's primary practice ID
    const user = await this.prisma.user.findUnique({
      where: { id: req.user.sub },
      select: { primaryPracticeId: true },
    });

    if (!user?.primaryPracticeId) {
      // User not associated with any practice, return success (no notifications to mark)
      return { success: true, message: 'No notifications to mark as read' };
    }

    return this.notificationsService.markAllAsRead(
      req.user.sub,
      user.primaryPracticeId,
    );
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    // Get user's primary practice ID
    const user = await this.prisma.user.findUnique({
      where: { id: req.user.sub },
      select: { primaryPracticeId: true },
    });

    if (!user?.primaryPracticeId) {
      // User not associated with any practice, throw error
      throw new Error('User not associated with any practice');
    }

    return this.notificationsService.remove(
      id,
      req.user.sub,
      user.primaryPracticeId,
    );
  }
}
