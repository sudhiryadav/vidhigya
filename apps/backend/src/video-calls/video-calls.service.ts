import { Injectable, NotFoundException } from '@nestjs/common';
import { CallStatus } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';

// Function to generate short, unique meeting ID (like Google Meet)
function generateShortMeetingId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 3; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  result += '-';
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export interface CreateVideoCallDto {
  title: string;
  description?: string;
  startTime: Date | string;
  endTime?: Date | string;
  caseId?: string;
  participantIds?: string[];
}

export interface UpdateVideoCallDto {
  title?: string;
  description?: string;
  startTime?: Date | string;
  endTime?: Date | string;
  status?: CallStatus;
}

export interface JoinCallDto {
  meetingId: string;
}

@Injectable()
export class VideoCallsService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  async createVideoCall(
    createVideoCallDto: CreateVideoCallDto,
    userId: string,
  ) {
    try {
      const { participantIds, ...callData } = createVideoCallDto;

      // Convert string dates to Date objects
      const processedCallData = {
        ...callData,
        startTime: new Date(callData.startTime),
        endTime: callData.endTime ? new Date(callData.endTime) : undefined,
      };

      // Validate caseId if provided
      if (processedCallData.caseId) {
        const caseExists = await this.prisma.legalCase.findUnique({
          where: { id: processedCallData.caseId },
        });
        if (!caseExists) {
          throw new Error(`Case with ID ${processedCallData.caseId} not found`);
        }
      }

      // Generate unique short meeting ID
      let meetingId: string;
      let isUnique = false;
      let attempts = 0;

      while (!isUnique && attempts < 10) {
        meetingId = generateShortMeetingId();
        const existingCall = await this.prisma.videoCall.findUnique({
          where: { meetingId },
        });
        if (!existingCall) {
          isUnique = true;
        }
        attempts++;
      }

      if (!isUnique) {
        throw new Error('Unable to generate unique meeting ID');
      }

      const meetingUrl = `https://meet.vidhigya.com/${meetingId}`;

      // Create the video call
      const videoCall = await this.prisma.videoCall.create({
        data: {
          ...processedCallData,
          meetingId,
          meetingUrl,
          hostId: userId,
        },
        include: {
          host: {
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
          callId: videoCall.id,
          userId: participantId,
        }));

        await this.prisma.callParticipant.createMany({
          data: participants,
        });

        // Send notifications to participants
        const isInstantMeeting =
          new Date(processedCallData.startTime) <= new Date();

        for (const participantId of participantIds) {
          try {
            if (isInstantMeeting) {
              await this.notificationsService.createVideoCallInstantNotification(
                videoCall.id,
                participantId,
              );
            } else {
              await this.notificationsService.createVideoCallScheduledNotification(
                videoCall.id,
                participantId,
              );
            }
          } catch (error) {
            console.error(
              `Failed to send notification to participant ${participantId}:`,
              error,
            );
          }
        }

        // Fetch updated call with participants
        return this.prisma.videoCall.findUnique({
          where: { id: videoCall.id },
          include: {
            host: {
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

      return videoCall;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      if (errorMessage.includes('Case with ID')) {
        throw new NotFoundException(errorMessage);
      }
      throw new Error(errorMessage);
    }
  }

  async startInstantCall(
    createVideoCallDto: CreateVideoCallDto,
    userId: string,
  ) {
    try {
      const { participantIds, ...callData } = createVideoCallDto;

      // Convert string dates to Date objects
      const processedCallData = {
        ...callData,
        startTime: new Date(), // Start immediately
        endTime: callData.endTime
          ? new Date(callData.endTime)
          : new Date(Date.now() + 60 * 60 * 1000), // Default 1 hour
      };

      // Validate caseId if provided
      if (processedCallData.caseId) {
        const caseExists = await this.prisma.legalCase.findUnique({
          where: { id: processedCallData.caseId },
        });
        if (!caseExists) {
          throw new Error(`Case with ID ${processedCallData.caseId} not found`);
        }
      }

      // Generate unique short meeting ID
      let meetingId: string;
      let isUnique = false;
      let attempts = 0;

      while (!isUnique && attempts < 10) {
        meetingId = generateShortMeetingId();
        const existingCall = await this.prisma.videoCall.findUnique({
          where: { meetingId },
        });
        if (!existingCall) {
          isUnique = true;
        }
        attempts++;
      }

      if (!isUnique) {
        throw new Error('Unable to generate unique meeting ID');
      }

      const meetingUrl = `https://meet.vidhigya.com/${meetingId}`;

      // Create the video call with IN_PROGRESS status
      const videoCall = await this.prisma.videoCall.create({
        data: {
          ...processedCallData,
          meetingId,
          meetingUrl,
          hostId: userId,
          status: 'IN_PROGRESS', // Start immediately
        },
        include: {
          host: {
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
        },
      });

      // Add host as participant
      await this.prisma.callParticipant.create({
        data: {
          callId: videoCall.id,
          userId,
          joinedAt: new Date(),
        },
      });

      // Add participants if provided
      if (participantIds && participantIds.length > 0) {
        const participantData = participantIds.map((participantId) => ({
          callId: videoCall.id,
          userId: participantId,
        }));

        await this.prisma.callParticipant.createMany({
          data: participantData,
        });

        // Send instant notifications to all participants
        for (const participantId of participantIds) {
          try {
            await this.notificationsService.createVideoCallInstantNotification(
              videoCall.id,
              participantId,
            );
          } catch (error) {
            console.error(
              `Failed to send notification to participant ${participantId}:`,
              error,
            );
          }
        }
      }

      return videoCall;
    } catch (error) {
      console.error('Error creating instant video call:', error);
      throw error;
    }
  }

  async findAll(
    userId: string,
    filters?: {
      status?: CallStatus;
      caseId?: string;
      startDate?: Date;
      endDate?: Date;
    },
  ) {
    const where: {
      OR: Array<
        { hostId: string } | { participants: { some: { userId: string } } }
      >;
      status?: CallStatus;
      caseId?: string;
      startTime?: { gte: Date; lte: Date };
      AND?: Array<{ startTime: { gte: Date } } | { startTime: { lte: Date } }>;
    } = {
      OR: [{ hostId: userId }, { participants: { some: { userId } } }],
    };

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.caseId) {
      where.caseId = filters.caseId;
    }

    if (filters?.startDate || filters?.endDate) {
      where.AND = [];
      if (filters.startDate) {
        where.AND.push({ startTime: { gte: filters.startDate } });
      }
      if (filters.endDate) {
        where.AND.push({ startTime: { lte: filters.endDate } });
      }
    }

    return this.prisma.videoCall.findMany({
      where,
      include: {
        host: {
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
        startTime: 'desc',
      },
    });
  }

  async findOne(id: string, userId: string) {
    const videoCall = await this.prisma.videoCall.findFirst({
      where: {
        id,
        OR: [{ hostId: userId }, { participants: { some: { userId } } }],
      },
      include: {
        host: {
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

    if (!videoCall) {
      throw new NotFoundException('Video call not found');
    }

    return videoCall;
  }

  async findByMeetingId(meetingId: string, userId: string) {
    const videoCall = await this.prisma.videoCall.findFirst({
      where: {
        meetingId,
        OR: [{ hostId: userId }, { participants: { some: { userId } } }],
      },
      include: {
        host: {
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

    if (!videoCall) {
      throw new NotFoundException('Video call not found');
    }

    return videoCall;
  }

  async update(
    id: string,
    updateVideoCallDto: UpdateVideoCallDto,
    userId: string,
  ) {
    const videoCall = await this.prisma.videoCall.findFirst({
      where: {
        id,
        hostId: userId,
      },
    });

    if (!videoCall) {
      throw new NotFoundException(
        'Video call not found or you do not have permission to edit it',
      );
    }

    // Convert string dates to Date objects if they are strings
    const processedUpdateData = {
      ...updateVideoCallDto,
      startTime: updateVideoCallDto.startTime
        ? updateVideoCallDto.startTime instanceof Date
          ? updateVideoCallDto.startTime
          : new Date(updateVideoCallDto.startTime)
        : undefined,
      endTime: updateVideoCallDto.endTime
        ? updateVideoCallDto.endTime instanceof Date
          ? updateVideoCallDto.endTime
          : new Date(updateVideoCallDto.endTime)
        : undefined,
    };

    return this.prisma.videoCall.update({
      where: { id },
      data: processedUpdateData,
      include: {
        host: {
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
    const videoCall = await this.prisma.videoCall.findFirst({
      where: {
        id,
        hostId: userId,
      },
    });

    if (!videoCall) {
      throw new NotFoundException(
        'Video call not found or you do not have permission to delete it',
      );
    }

    return this.prisma.videoCall.delete({
      where: { id },
    });
  }

  async joinCall(meetingId: string, userId: string) {
    const videoCall = await this.prisma.videoCall.findFirst({
      where: {
        meetingId,
        OR: [{ hostId: userId }, { participants: { some: { userId } } }],
      },
    });

    if (!videoCall) {
      throw new NotFoundException(
        'Video call not found or you do not have permission to join',
      );
    }

    // Check if user is already a participant
    const existingParticipant = await this.prisma.callParticipant.findFirst({
      where: {
        callId: videoCall.id,
        userId,
      },
    });

    if (!existingParticipant) {
      // Add user as participant
      await this.prisma.callParticipant.create({
        data: {
          callId: videoCall.id,
          userId,
        },
      });
    }

    // Update join time
    await this.prisma.callParticipant.updateMany({
      where: {
        callId: videoCall.id,
        userId,
      },
      data: {
        joinedAt: new Date(),
      },
    });

    // Update call status to IN_PROGRESS if it's SCHEDULED
    if (videoCall.status === 'SCHEDULED') {
      await this.prisma.videoCall.update({
        where: { id: videoCall.id },
        data: { status: 'IN_PROGRESS' },
      });
    }

    return this.findByMeetingId(meetingId, userId);
  }

  async leaveCall(meetingId: string, userId: string) {
    const videoCall = await this.prisma.videoCall.findFirst({
      where: {
        meetingId,
        OR: [{ hostId: userId }, { participants: { some: { userId } } }],
      },
    });

    if (!videoCall) {
      throw new NotFoundException('Video call not found');
    }

    // Update leave time and calculate duration
    const participant = await this.prisma.callParticipant.findFirst({
      where: {
        callId: videoCall.id,
        userId,
      },
    });

    if (participant && participant.joinedAt) {
      const duration = Math.floor(
        (Date.now() - participant.joinedAt.getTime()) / 1000,
      );

      await this.prisma.callParticipant.update({
        where: {
          callId_userId: {
            callId: videoCall.id,
            userId,
          },
        },
        data: {
          leftAt: new Date(),
          duration,
        },
      });
    }

    return { message: 'Successfully left the call' };
  }

  async endCall(id: string, userId: string) {
    const videoCall = await this.prisma.videoCall.findFirst({
      where: {
        id,
        hostId: userId,
      },
    });

    if (!videoCall) {
      throw new NotFoundException(
        'Video call not found or you do not have permission to end it',
      );
    }

    return this.prisma.videoCall.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        endTime: new Date(),
      },
      include: {
        host: {
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

  async getUpcomingCalls(userId: string, days: number = 7) {
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + days);

    return this.prisma.videoCall.findMany({
      where: {
        OR: [{ hostId: userId }, { participants: { some: { userId } } }],
        status: CallStatus.SCHEDULED,
        startTime: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        host: {
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

  async notifyParticipants(callId: string, userId: string) {
    const videoCall = await this.prisma.videoCall.findFirst({
      where: {
        id: callId,
        hostId: userId,
      },
      include: {
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

    if (!videoCall) {
      throw new NotFoundException(
        'Video call not found or you are not the host',
      );
    }

    const isInstantMeeting = new Date(videoCall.startTime) <= new Date();

    // Send notifications to all participants
    for (const participant of videoCall.participants) {
      try {
        if (isInstantMeeting) {
          await this.notificationsService.createVideoCallInstantNotification(
            callId,
            participant.userId,
          );
        } else {
          await this.notificationsService.createVideoCallScheduledNotification(
            callId,
            participant.userId,
          );
        }
      } catch (error) {
        console.error(
          `Failed to send notification to participant ${participant.userId}:`,
          error,
        );
      }
    }

    return {
      message: `Notifications sent to ${videoCall.participants.length} participant(s)`,
      participantsCount: videoCall.participants.length,
    };
  }
}
