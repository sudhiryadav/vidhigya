import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ParticipantStatus } from '@prisma/client';
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
}

export interface UpdateParticipantStatusDto {
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'TENTATIVE';
  response?: string;
}

@Injectable()
export class CalendarService {
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

    const { participantIds, ...eventData } = createEventDto;

    // Fix date formatting - ensure proper ISO-8601 format
    const startTime = this.formatDateForPrisma(eventData.startTime);
    const endTime = this.formatDateForPrisma(eventData.endTime);

    // Validate dates
    if (startTime >= endTime) {
      throw new BadRequestException('End time must be after start time');
    }

    // Create the event
    const event = await this.prisma.calendarEvent.create({
      data: {
        ...eventData,
        startTime,
        endTime,
        createdById: userId,
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
    const where: Record<string, unknown> = {
      createdById: userId,
    };

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
    const event = await this.prisma.calendarEvent.findFirst({
      where: {
        id,
        createdById: userId,
      },
    });

    if (!event) {
      throw new NotFoundException(
        'Event not found or you do not have permission to edit it',
      );
    }

    // Validate practice access
    await this.validatePracticeAccess(userId, event.practiceId);

    // Validate dates if both are provided
    if (updateEventDto.startTime && updateEventDto.endTime) {
      const startTime = this.formatDateForPrisma(updateEventDto.startTime);
      const endTime = this.formatDateForPrisma(updateEventDto.endTime);

      if (startTime >= endTime) {
        throw new BadRequestException('End time must be after start time');
      }
    }

    // Prepare the update data with proper date formatting
    const updateData: any = { ...updateEventDto };

    // Convert string dates to Date objects if they exist
    if (updateData.startTime) {
      updateData.startTime = this.formatDateForPrisma(updateData.startTime);
    }
    if (updateData.endTime) {
      updateData.endTime = this.formatDateForPrisma(updateData.endTime);
    }

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
    const event = await this.prisma.calendarEvent.findFirst({
      where: {
        id,
        createdById: userId,
      },
    });

    if (!event) {
      throw new NotFoundException(
        'Event not found or you do not have permission to delete it',
      );
    }

    // Validate practice access
    await this.validatePracticeAccess(userId, event.practiceId);

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
