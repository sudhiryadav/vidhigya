import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ParticipantStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateEventDto {
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
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
}

export interface UpdateEventDto {
  title?: string;
  description?: string;
  startTime?: Date;
  endTime?: Date;
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

  async createEvent(createEventDto: CreateEventDto, userId: string) {
    const { participantIds, ...eventData } = createEventDto;

    // Validate dates
    if (new Date(eventData.startTime) >= new Date(eventData.endTime)) {
      throw new BadRequestException('End time must be after start time');
    }

    // Create the event
    const event = await this.prisma.calendarEvent.create({
      data: {
        ...eventData,
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

    // Validate dates if both are provided
    if (updateEventDto.startTime && updateEventDto.endTime) {
      if (
        new Date(updateEventDto.startTime) >= new Date(updateEventDto.endTime)
      ) {
        throw new BadRequestException('End time must be after start time');
      }
    }

    // Prepare the update data with proper date formatting
    const updateData: any = { ...updateEventDto };

    // Convert string dates to Date objects if they exist
    if (updateData.startTime) {
      updateData.startTime = new Date(updateData.startTime);
    }
    if (updateData.endTime) {
      updateData.endTime = new Date(updateData.endTime);
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

    const participants = participantIds.map((participantId) => ({
      eventId,
      userId: participantId,
      status: 'PENDING' as ParticipantStatus,
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
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + days);

    return this.prisma.calendarEvent.findMany({
      where: {
        OR: [{ createdById: userId }, { participants: { some: { userId } } }],
        startTime: {
          gte: new Date(),
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
}
