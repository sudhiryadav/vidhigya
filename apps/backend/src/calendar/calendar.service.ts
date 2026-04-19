import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ParticipantStatus } from '@prisma/client';
import { RedactingLogger } from '../common/logging';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateEventDto {
  title: string;
  description?: string;
  startTime: Date | string;
  endTime: Date | string;
  location?: string;
  eventType:
    | 'HEARING'
    | 'CLIENT_MEETING'
    | 'COURT_APPEARANCE'
    | 'DEADLINE'
    | 'INTERNAL_MEETING'
    | 'OTHER';
  isAllDay?: boolean;
  isRecurring?: boolean;
  recurrenceRule?: string;
  caseId?: string;
  clientId?: string;
  participantIds?: string[];
  practiceId: string;
}

export interface UpdateEventDto {
  title?: string;
  description?: string;
  startTime?: Date | string;
  endTime?: Date | string;
  location?: string;
  eventType?:
    | 'HEARING'
    | 'CLIENT_MEETING'
    | 'COURT_APPEARANCE'
    | 'DEADLINE'
    | 'INTERNAL_MEETING'
    | 'OTHER';
  isAllDay?: boolean;
  isRecurring?: boolean;
  recurrenceRule?: string;
  caseId?: string;
  clientId?: string;
}

export interface UpdateParticipantStatusDto {
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'TENTATIVE';
  response?: string;
}

@Injectable()
export class CalendarService {
  private readonly logger = new RedactingLogger(CalendarService.name);

  constructor(private prisma: PrismaService) {}

  // Helper method to validate practice access
  private async validatePracticeAccess(userId: string, practiceId: string) {
    // Check if user is a super admin (bypass practice check)
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (user?.role === 'SUPER_ADMIN') {
      return true;
    }

    // Check if user is a member of the practice
    const practiceMember = await this.prisma.practiceMember.findFirst({
      where: {
        practiceId,
        userId,
        isActive: true,
      },
    });

    if (!practiceMember) {
      throw new ForbiddenException('Access denied to this practice');
    }

    return true;
  }

  async createEvent(createEventDto: CreateEventDto, userId: string) {
    // Validate practice access
    await this.validatePracticeAccess(userId, createEventDto.practiceId);

    // Filter out only the fields that are defined in the DTO interface
    const {
      participantIds,
      practiceId: _practiceId,
      title,
      description,
      startTime: startTimeInput,
      endTime: endTimeInput,
      location,
      eventType,
      isAllDay,
      isRecurring,
      recurrenceRule,
      caseId: _caseId,
      clientId: _clientId,
    } = createEventDto;

    // Create clean event data with only valid fields (excluding relation IDs)
    const eventData = {
      title,
      description,
      startTime: startTimeInput,
      endTime: endTimeInput,
      location,
      eventType,
      isAllDay,
      isRecurring,
      recurrenceRule,
    };

    // Fix date formatting - ensure proper ISO-8601 format
    const startTime = this.formatDateForPrisma(eventData.startTime);
    const endTime = this.formatDateForPrisma(eventData.endTime);

    // Validate dates
    if (startTime >= endTime) {
      throw new BadRequestException('End time must be after start time');
    }

    // Validate eventType
    const validEventTypes = [
      'HEARING',
      'CLIENT_MEETING',
      'COURT_APPEARANCE',
      'DEADLINE',
      'INTERNAL_MEETING',
      'OTHER',
    ];
    if (!validEventTypes.includes(eventData.eventType)) {
      throw new BadRequestException(
        `Invalid event type: ${eventData.eventType}`,
      );
    }

    // Validate recurrence rule if event is recurring
    if (
      eventData.isRecurring &&
      (!eventData.recurrenceRule || eventData.recurrenceRule.trim() === '')
    ) {
      throw new BadRequestException(
        'Recurrence rule is required when event is recurring',
      );
    }

    // Validate practiceId is provided
    if (!createEventDto.practiceId || createEventDto.practiceId.trim() === '') {
      this.logger.error('Practice ID validation failed:', {
        practiceId: createEventDto.practiceId,
        type: typeof createEventDto.practiceId,
        dtoKeys: Object.keys(createEventDto),
      });
      throw new BadRequestException('Practice ID is required');
    }

    // Prepare the data object
    const eventDataToCreate: any = {
      ...eventData,
      startTime,
      endTime,
      createdBy: {
        connect: { id: userId },
      },
      practice: {
        connect: { id: createEventDto.practiceId },
      },
    };

    // Add case connection if caseId is provided and not empty
    if (createEventDto.caseId && createEventDto.caseId.trim() !== '') {
      eventDataToCreate.case = {
        connect: { id: createEventDto.caseId },
      };
    }

    // Add client connection if clientId is provided and not empty
    if (createEventDto.clientId && createEventDto.clientId.trim() !== '') {
      eventDataToCreate.client = {
        connect: { id: createEventDto.clientId },
      };
    }

    // Clean up boolean fields
    if (eventDataToCreate.isAllDay === undefined) {
      eventDataToCreate.isAllDay = false;
    }
    if (eventDataToCreate.isRecurring === undefined) {
      eventDataToCreate.isRecurring = false;
    }

    // Clean up optional string fields
    if (eventDataToCreate.location === '') {
      eventDataToCreate.location = null;
    }
    if (eventDataToCreate.recurrenceRule === '') {
      eventDataToCreate.recurrenceRule = null;
    }

    // Clean up description field
    if (eventDataToCreate.description === '') {
      eventDataToCreate.description = null;
    }

    // Log the cleaned data for debugging
    this.logger.log(
      'Creating calendar event with data:',
      JSON.stringify(eventDataToCreate, null, 2),
    );
    this.logger.log('Practice ID from DTO:', createEventDto.practiceId);
    this.logger.log('Event data keys:', Object.keys(eventDataToCreate));
    this.logger.log('Full DTO:', JSON.stringify(createEventDto, null, 2));
    this.logger.log('Filtered event data:', JSON.stringify(eventData, null, 2));
    this.logger.log('Case ID from DTO:', createEventDto.caseId);
    this.logger.log('Client ID from DTO:', createEventDto.clientId);

    // Create the event
    const event = await this.prisma.calendarEvent.create({
      data: eventDataToCreate,
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        case: {
          select: {
            id: true,
            caseNumber: true,
            title: true,
          },
        },
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    // Add participants if provided
    if (participantIds && participantIds.length > 0) {
      const participants = participantIds.map((participantId) => ({
        eventId: event.id,
        userId: participantId,
        status: 'PENDING' as const,
        practiceId: createEventDto.practiceId,
      }));

      await this.prisma.eventParticipant.createMany({
        data: participants,
      });

      // Fetch updated event with participants
      return this.prisma.calendarEvent.findUnique({
        where: { id: event.id },
        include: {
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          case: {
            select: {
              id: true,
              caseNumber: true,
              title: true,
            },
          },
          participants: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
      });
    }

    return event;
  }

  async findAll(userId: string, query: Record<string, unknown> = {}) {
    // Get user's role and practice information
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        role: true,
        primaryPracticeId: true,
        practices: {
          where: { isActive: true },
          select: { practiceId: true },
        },
      },
    });

    if (!user) {
      throw new ForbiddenException('User not found');
    }

    const where: Record<string, unknown> = {};

    // SUPER_ADMIN can see all events
    if (user.role === 'SUPER_ADMIN') {
      // No additional filters needed
    }
    // ADMIN can see all events from all practices (read-only access)
    else if (user.role === 'ADMIN') {
      // No additional filters needed - admin can see all events
    }
    // LAWYER, ASSOCIATE, and PARALEGAL can see events from their practices
    else if (['LAWYER', 'ASSOCIATE', 'PARALEGAL'].includes(user.role)) {
      const practiceIds = user.practices.map((p) => p.practiceId);
      if (practiceIds.length > 0) {
        where.practiceId = { in: practiceIds };
      } else {
        // If no practices, they can only see their own events
        where.OR = [
          { createdById: userId },
          { participants: { some: { userId } } },
        ];
      }
    }
    // CLIENT can only see their own events
    else {
      where.OR = [
        { createdById: userId },
        { participants: { some: { userId } } },
      ];
    }

    // Add date range filters
    if (query.startDate && query.endDate) {
      where.AND = [
        { startTime: { gte: new Date(query.startDate as string) } },
        { endTime: { lte: new Date(query.endDate as string) } },
      ];
    }

    // Add event type filter
    if (query.eventType) {
      where.eventType = query.eventType;
    }

    // Add case filter
    if (query.caseId) {
      where.caseId = query.caseId;
    }

    const events = await this.prisma.calendarEvent.findMany({
      where,
      include: {
        case: {
          select: {
            id: true,
            title: true,
            caseNumber: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: { startTime: 'asc' },
    });

    return events;
  }

  async findOne(id: string, userId: string) {
    const event = await this.prisma.calendarEvent.findFirst({
      where: {
        id,
        OR: [{ createdById: userId }, { participants: { some: { userId } } }],
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        case: {
          select: {
            id: true,
            caseNumber: true,
            title: true,
          },
        },
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    // Validate practice access
    await this.validatePracticeAccess(userId, event.practiceId);

    return event;
  }

  async update(id: string, updateEventDto: UpdateEventDto, userId: string) {
    // Find the event and check permissions
    const event = await this.prisma.calendarEvent.findFirst({
      where: { id },
      include: {
        createdBy: { select: { id: true } },
        practice: { select: { id: true } },
      },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    // Check if user can edit this event
    // Users can edit if they: created the event, are admin, or have practice access
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!user) {
      throw new ForbiddenException('User not found');
    }

    const canEdit =
      event.createdBy.id === userId ||
      user.role === 'SUPER_ADMIN' ||
      user.role === 'ADMIN';

    if (!canEdit) {
      // Check if user has practice access
      try {
        await this.validatePracticeAccess(userId, event.practice.id);
      } catch {
        throw new ForbiddenException(
          'You do not have permission to edit this event',
        );
      }
    }

    // Validate dates if both are provided
    if (updateEventDto.startTime && updateEventDto.endTime) {
      const startTime = this.formatDateForPrisma(updateEventDto.startTime);
      const endTime = this.formatDateForPrisma(updateEventDto.endTime);

      if (startTime >= endTime) {
        throw new BadRequestException('End time must be after start time');
      }
    }

    // Validate eventType if provided
    if (updateEventDto.eventType) {
      const validEventTypes = [
        'HEARING',
        'CLIENT_MEETING',
        'COURT_APPEARANCE',
        'DEADLINE',
        'INTERNAL_MEETING',
        'OTHER',
      ];
      if (!validEventTypes.includes(updateEventDto.eventType)) {
        throw new BadRequestException(
          `Invalid event type: ${updateEventDto.eventType}`,
        );
      }
    }

    // Validate recurrence rule if event is being made recurring
    if (
      updateEventDto.isRecurring &&
      (!updateEventDto.recurrenceRule ||
        updateEventDto.recurrenceRule.trim() === '')
    ) {
      throw new BadRequestException(
        'Recurrence rule is required when event is recurring',
      );
    }

    // Clean and prepare the update data
    const { caseId, clientId, ...cleanUpdateData } = updateEventDto;

    // Prepare the update data with proper date formatting and relation handling
    const updateData: any = { ...cleanUpdateData };

    // Convert string dates to Date objects if they exist
    if (updateData.startTime) {
      updateData.startTime = this.formatDateForPrisma(updateData.startTime);
    }
    if (updateData.endTime) {
      updateData.endTime = this.formatDateForPrisma(updateData.endTime);
    }

    // Clean up optional string fields
    if (updateData.location === '') {
      updateData.location = null;
    }
    if (updateData.recurrenceRule === '') {
      updateData.recurrenceRule = null;
    }
    if (updateData.description === '') {
      updateData.description = null;
    }

    // Handle case connection if caseId is provided
    if (caseId !== undefined) {
      if (caseId && caseId.trim() !== '') {
        updateData.case = { connect: { id: caseId } };
      } else {
        updateData.case = { disconnect: true };
      }
    }

    // Handle client connection if clientId is provided
    if (clientId !== undefined) {
      if (clientId && clientId.trim() !== '') {
        updateData.client = { connect: { id: clientId } };
      } else {
        updateData.client = { disconnect: true };
      }
    }

    // Log the update data for debugging
    this.logger.log(
      'Updating calendar event with data:',
      JSON.stringify(updateData, null, 2),
    );
    this.logger.log('Case ID from update DTO:', caseId);
    this.logger.log('Client ID from update DTO:', clientId);

    return this.prisma.calendarEvent.update({
      where: { id },
      data: updateData,
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        case: {
          select: {
            id: true,
            caseNumber: true,
            title: true,
          },
        },
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });
  }

  async remove(id: string, userId: string) {
    // Find the event and check permissions
    const event = await this.prisma.calendarEvent.findFirst({
      where: { id },
      include: {
        createdBy: { select: { id: true } },
        practice: { select: { id: true } },
      },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    // Check if user can delete this event
    // Users can delete if they: created the event, are admin, or have practice access
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!user) {
      throw new ForbiddenException('User not found');
    }

    const canDelete =
      event.createdBy.id === userId ||
      user.role === 'SUPER_ADMIN' ||
      user.role === 'ADMIN';

    if (!canDelete) {
      // Check if user has practice access
      try {
        await this.validatePracticeAccess(userId, event.practice.id);
      } catch {
        throw new ForbiddenException(
          'You do not have permission to delete this event',
        );
      }
    }

    // Log the deletion for debugging
    this.logger.log(`Deleting calendar event ${id} by user ${userId}`);

    // Delete the event (Prisma will handle cascading deletes for participants)
    return this.prisma.calendarEvent.delete({
      where: { id },
    });
  }

  async updateParticipantStatus(
    eventId: string,
    participantId: string,
    updateStatusDto: UpdateParticipantStatusDto,
    userId: string,
  ) {
    const participant = await this.prisma.eventParticipant.findFirst({
      where: {
        eventId,
        userId: participantId,
      },
    });

    if (!participant) {
      throw new NotFoundException('Participant not found');
    }

    // Only the participant can update their own status
    if (participant.userId !== userId) {
      throw new BadRequestException(
        'You can only update your own participation status',
      );
    }

    return this.prisma.eventParticipant.update({
      where: {
        eventId_userId: {
          eventId,
          userId: participantId,
        },
      },
      data: updateStatusDto,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        event: {
          select: {
            id: true,
            title: true,
            startTime: true,
            endTime: true,
          },
        },
      },
    });
  }

  async addParticipants(
    eventId: string,
    participantIds: string[],
    userId: string,
    practiceId: string,
  ) {
    const event = await this.prisma.calendarEvent.findFirst({
      where: {
        id: eventId,
        createdById: userId,
      },
    });

    if (!event) {
      throw new NotFoundException(
        'Event not found or you do not have permission to add participants',
      );
    }

    // Validate practice access
    await this.validatePracticeAccess(userId, event.practiceId);

    const participants = participantIds.map((participantId) => ({
      eventId,
      userId: participantId,
      status: 'PENDING' as ParticipantStatus,
      practiceId,
    }));

    return this.prisma.eventParticipant.createMany({
      data: participants,
      skipDuplicates: true,
    });
  }

  async removeParticipant(
    eventId: string,
    participantId: string,
    userId: string,
  ) {
    const event = await this.prisma.calendarEvent.findFirst({
      where: {
        id: eventId,
        createdById: userId,
      },
    });

    if (!event) {
      throw new NotFoundException(
        'Event not found or you do not have permission to remove participants',
      );
    }

    // Validate practice access
    await this.validatePracticeAccess(userId, event.practiceId);

    return this.prisma.eventParticipant.delete({
      where: {
        eventId_userId: {
          eventId,
          userId: participantId,
        },
      },
    });
  }

  async getUpcomingEvents(userId: string, days: number = 7) {
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + days);

    return this.prisma.calendarEvent.findMany({
      where: {
        OR: [
          { createdById: userId },
          {
            participants: {
              some: {
                userId: userId,
              },
            },
          },
        ],
        startTime: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        case: {
          select: {
            id: true,
            caseNumber: true,
            title: true,
          },
        },
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: {
        startTime: 'asc',
      },
    });
  }

  async getUsersForEvents(userId: string) {
    // Get users that can be invited to calendar events
    // This includes lawyers, associates, paralegals, and clients
    return this.prisma.user.findMany({
      where: {
        id: { not: userId }, // Exclude the current user
        isActive: true,
        role: {
          in: ['LAWYER', 'ASSOCIATE', 'PARALEGAL', 'CLIENT'],
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  /**
   * Format date for Prisma - ensures proper ISO-8601 format
   */
  private formatDateForPrisma(date: Date | string): Date {
    if (typeof date === 'string') {
      // Handle incomplete ISO strings like "2025-08-21T18:07"
      // Add seconds if missing
      if (date.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)) {
        date = date + ':00';
      }
      // Add timezone if missing (assume local timezone)
      if (!date.includes('Z') && !date.includes('+') && !date.includes('-')) {
        date = date + 'Z';
      }
      return new Date(date);
    }
    return date;
  }
}
