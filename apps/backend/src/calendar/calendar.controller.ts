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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
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
@UseGuards(JwtAuthGuard)
export class CalendarController {
  constructor(
    private readonly calendarService: CalendarService,
    private readonly googleCalendarService: GoogleCalendarService,
  ) {}

  @Post()
  create(
    @Body() createEventDto: CreateEventDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.calendarService.createEvent(createEventDto, req.user.sub);
  }

  @Get()
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
  findOne(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.calendarService.findOne(id, req.user.sub);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateEventDto: UpdateEventDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.calendarService.update(id, updateEventDto, req.user.sub);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.calendarService.remove(id, req.user.sub);
  }

  @Patch(':eventId/participants/:participantId/status')
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
  addParticipants(
    @Param('eventId') eventId: string,
    @Body() body: { participantIds: string[] },
    @Request() req: AuthenticatedRequest,
  ) {
    return this.calendarService.addParticipants(
      eventId,
      body.participantIds,
      req.user.sub,
    );
  }

  @Delete(':eventId/participants/:participantId')
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
  async connectGoogleCalendar(@Body() body: { code: string }, @Request() req: AuthenticatedRequest) {
    try {
      const tokens = await this.googleCalendarService.exchangeCodeForToken(body.code);
      // Store tokens in user settings or database
      // For now, return success message
      return { 
        message: 'Google Calendar connected successfully',
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token
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
      return { message: 'Google Calendar sync available. Please connect your account first.' };
    } catch (error) {
      throw new Error('Failed to sync with Google Calendar: ' + error.message);
    }
  }
}
