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
import { CallStatus } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  CreateVideoCallDto,
  JoinCallDto,
  UpdateVideoCallDto,
  VideoCallsService,
} from './video-calls.service';

interface AuthenticatedRequest extends Request {
  user: {
    sub: string;
    email: string;
    name: string;
    role: string;
  };
}

interface VideoCallQuery {
  status?: string;
  caseId?: string;
  startDate?: string;
  endDate?: string;
  days?: string;
}

interface VideoCallFilters {
  status?: CallStatus;
  caseId?: string;
  startDate?: Date;
  endDate?: Date;
}

@Controller('video-calls')
@UseGuards(JwtAuthGuard)
export class VideoCallsController {
  constructor(private readonly videoCallsService: VideoCallsService) {}

  @Post()
  create(
    @Body() createVideoCallDto: CreateVideoCallDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.videoCallsService.createVideoCall(
      createVideoCallDto,
      req.user.sub,
    );
  }

  @Post('instant')
  startInstantCall(
    @Body() createVideoCallDto: CreateVideoCallDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.videoCallsService.startInstantCall(
      createVideoCallDto,
      req.user.sub,
    );
  }

  @Get()
  findAll(
    @Request() req: AuthenticatedRequest,
    @Query() query: VideoCallQuery,
  ) {
    const filters: VideoCallFilters = {};

    if (query.startDate) filters.startDate = new Date(query.startDate);
    if (query.endDate) filters.endDate = new Date(query.endDate);
    if (query.status) filters.status = query.status as CallStatus;
    if (query.caseId) filters.caseId = query.caseId;

    return this.videoCallsService.findAll(req.user.sub, filters);
  }

  @Get('upcoming')
  getUpcomingCalls(
    @Request() req: AuthenticatedRequest,
    @Query('days') days?: string,
  ) {
    const daysNumber = days ? parseInt(days, 10) : 7;
    return this.videoCallsService.getUpcomingCalls(req.user.sub, daysNumber);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.videoCallsService.findOne(id, req.user.sub);
  }

  @Get('meeting/:meetingId')
  findByMeetingId(
    @Param('meetingId') meetingId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.videoCallsService.findByMeetingId(meetingId, req.user.sub);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateVideoCallDto: UpdateVideoCallDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.videoCallsService.update(id, updateVideoCallDto, req.user.sub);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.videoCallsService.remove(id, req.user.sub);
  }

  @Post(':id/notify')
  notifyParticipants(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.videoCallsService.notifyParticipants(id, req.user.sub);
  }

  @Post('join')
  joinCall(
    @Body() joinCallDto: JoinCallDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.videoCallsService.joinCall(joinCallDto.meetingId, req.user.sub);
  }

  @Patch('leave/:meetingId')
  leaveCall(
    @Param('meetingId') meetingId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.videoCallsService.leaveCall(meetingId, req.user.sub);
  }

  @Post(':id/end')
  endCall(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.videoCallsService.endCall(id, req.user.sub);
  }
}
