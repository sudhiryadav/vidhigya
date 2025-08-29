import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import {
  PermissionAction,
  PermissionGuard,
  PermissionResource,
  RequireCreate,
  RequireDelete,
  RequireOwnResource,
  RequireRead,
  RequireUpdate,
} from '../common/permissions';
import { PrismaService } from '../prisma/prisma.service';
import {
  CalendarService,
  CreateEventDto,
  UpdateEventDto,
  UpdateParticipantStatusDto,
} from './calendar.service';
import { GoogleCalendarService } from './google-calendar.service';

interface AuthenticatedRequest extends Request {
  user: {
    sub: string;
    email: string;
    name: string;
    role: string;
  };
}

interface CalendarQuery {
  startDate?: string;
  endDate?: string;
  eventType?: string;
  caseId?: string;
  days?: string;
}

interface CalendarFilters {
  startDate?: Date;
  endDate?: Date;
  eventType?: string;
  caseId?: string;
  [key: string]: unknown;
}

@Controller('calendar')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionGuard)
export class CalendarController {
  constructor(
    private readonly calendarService: CalendarService,
    private readonly googleCalendarService: GoogleCalendarService,
    private readonly prisma: PrismaService,
  ) {}

  @Post()
  @RequireCreate(PermissionResource.CALENDAR)
  async create(
    @Body() createEventDto: CreateEventDto,
    @Request() req: AuthenticatedRequest,
  ) {
    // Get user's practice information
    const user = await this.prisma.user.findUnique({
      where: { id: req.user.sub },
      select: {
        primaryPracticeId: true,
        practices: {
          where: { isActive: true },
          select: { practiceId: true },
          take: 1,
        },
      },
    });

    if (!user) {
      throw new ForbiddenException('User not found');
    }

    // Set the practiceId - use primary practice or first active practice
    const practiceId = user.primaryPracticeId || user.practices[0]?.practiceId;
    if (!practiceId) {
      throw new BadRequestException(
        'User must be associated with a practice to create calendar events',
      );
    }

    createEventDto.practiceId = practiceId;

    return this.calendarService.createEvent(createEventDto, req.user.sub);
  }

  @Get()
  @RequireRead(PermissionResource.CALENDAR)
  findAll(@Request() req: AuthenticatedRequest, @Query() query: CalendarQuery) {
    const filters: CalendarFilters = {};

    if (query.startDate) filters.startDate = new Date(query.startDate);
    if (query.endDate) filters.endDate = new Date(query.endDate);
    if (query.eventType) filters.eventType = query.eventType;
    if (query.caseId) filters.caseId = query.caseId;

    return this.calendarService.findAll(req.user.sub, filters);
  }

  @Get('upcoming')
  getUpcomingEvents(
    @Request() req: AuthenticatedRequest,
    @Query('days') days?: string,
  ) {
    const daysNumber = days ? parseInt(days, 10) : 7;
    return this.calendarService.getUpcomingEvents(req.user.sub, daysNumber);
  }

  @Get('users')
  async getUsersForEvents(@Request() req: AuthenticatedRequest) {
    // Get users that can be invited to calendar events
    // This includes lawyers, associates, paralegals, and clients
    return this.calendarService.getUsersForEvents(req.user.sub);
  }

  @Get(':id')
  @RequireRead(PermissionResource.CALENDAR)
  findOne(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.calendarService.findOne(id, req.user.sub);
  }

  @Patch(':id')
  @RequireOwnResource(PermissionAction.UPDATE, PermissionResource.CALENDAR)
  update(
    @Param('id') id: string,
    @Body() updateEventDto: UpdateEventDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.calendarService.update(id, updateEventDto, req.user.sub);
  }

  @Delete(':id')
  @RequireDelete(PermissionResource.CALENDAR)
  remove(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.calendarService.remove(id, req.user.sub);
  }

  @Patch(':eventId/participants/:participantId/status')
  @RequireUpdate(PermissionResource.CALENDAR)
  updateParticipantStatus(
    @Param('eventId') eventId: string,
    @Param('participantId') participantId: string,
    @Body() updateStatusDto: UpdateParticipantStatusDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.calendarService.updateParticipantStatus(
      eventId,
      participantId,
      updateStatusDto,
      req.user.sub,
    );
  }

  @Post(':eventId/participants')
  @RequireUpdate(PermissionResource.CALENDAR)
  addParticipants(
    @Param('eventId') eventId: string,
    @Body() body: { participantIds: string[] },
    @Request() req: AuthenticatedRequest,
  ) {
    // TODO: Get practiceId from user's current practice context
    const practiceId = 'temp-practice-id'; // This should come from user context
    return this.calendarService.addParticipants(
      eventId,
      body.participantIds,
      req.user.sub,
      practiceId,
    );
  }

  @Delete(':eventId/participants/:participantId')
  @RequireUpdate(PermissionResource.CALENDAR)
  removeParticipant(
    @Param('eventId') eventId: string,
    @Param('participantId') participantId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.calendarService.removeParticipant(
      eventId,
      participantId,
      req.user.sub,
    );
  }

  // Google Calendar Integration
  @Get('google/auth-url')
  getGoogleAuthUrl() {
    return this.googleCalendarService.getAuthUrl();
  }

  @Post('google/connect')
  async connectGoogleCalendar(
    @Body() body: { code: string },
    @Request() req: AuthenticatedRequest,
  ) {
    try {
      const tokens = await this.googleCalendarService.exchangeCodeForToken(
        body.code,
      );
      // Store tokens in user settings or database
      // For now, return success message
      return {
        message: 'Google Calendar connected successfully',
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
      };
    } catch (error) {
      throw new Error('Failed to connect Google Calendar: ' + error.message);
    }
  }

  @Post('google/sync')
  async syncWithGoogleCalendar(@Request() req: AuthenticatedRequest) {
    try {
      // This would require storing the user's access token
      // For now, return a message indicating the feature is available
      return {
        message:
          'Google Calendar sync available. Please connect your account first.',
      };
    } catch (error) {
      throw new Error('Failed to sync with Google Calendar: ' + error.message);
    }
  }
}
