import { Injectable } from '@nestjs/common';
import { NotificationType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationEmitterService } from './notification-emitter.service';

interface CreateNotificationDto {
  title: string;
  message: string;
  type: NotificationType;
  userId: string;
}

@Injectable()
export class NotificationsService {
  constructor(
    private prisma: PrismaService,
    private notificationEmitter: NotificationEmitterService,
  ) {}

  async create(data: CreateNotificationDto) {
    return this.prisma.notification.create({
      data: {
        title: data.title,
        message: data.message,
        type: data.type,
        userId: data.userId,
      },
    });
  }

  async findAll(userId: string, filters?: { isRead?: boolean; type?: string }) {
    const where: Prisma.NotificationWhereInput = { userId };

    if (filters?.isRead !== undefined) {
      where.isRead = filters.isRead;
    }

    if (filters?.type) {
      where.type = filters.type as NotificationType;
    }

    return this.prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, userId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: {
        id,
        userId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!notification) {
      throw new Error('Notification not found');
    }

    return notification;
  }

  async markAsRead(id: string, userId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!notification) {
      throw new Error('Notification not found');
    }

    return this.prisma.notification.update({
      where: { id },
      data: { isRead: true },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  async markAllAsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: {
        userId,
        isRead: false,
      },
      data: {
        isRead: true,
      },
    });
  }

  async remove(id: string, userId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!notification) {
      throw new Error('Notification not found');
    }

    return this.prisma.notification.delete({
      where: { id },
    });
  }

  async getUnreadCount(userId: string) {
    return this.prisma.notification.count({
      where: {
        userId,
        isRead: false,
      },
    });
  }

  // Automatic notification creation methods
  async createTaskAssignedNotification(taskId: string, assignedToId: string) {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: {
        case: true,
        createdBy: true,
      },
    });

    if (!task) return;

    let message = `${task.createdBy.name} assigned you a task: ${task.title}`;
    if (task.case) {
      message += ` for case ${task.case.caseNumber}`;
    }

    return this.create({
      title: 'New Task Assigned',
      message,
      type: NotificationType.CASE_UPDATE,
      userId: assignedToId,
    });
  }

  async createEventReminderNotification(
    eventId: string,
    participantId: string,
  ) {
    const event = await this.prisma.calendarEvent.findUnique({
      where: { id: eventId },
      include: {
        case: true,
        createdBy: true,
      },
    });

    if (!event) return;

    let message = `Reminder: ${event.title} starts in 1 hour`;
    if (event.case) {
      message += ` (Case: ${event.case.caseNumber})`;
    }

    return this.create({
      title: 'Event Reminder',
      message,
      type: NotificationType.HEARING_REMINDER,
      userId: participantId,
    });
  }

  async createDocumentUploadedNotification(
    documentId: string,
    uploadedById: string,
  ) {
    const document = await this.prisma.legalDocument.findUnique({
      where: { id: documentId },
      include: {
        case: {
          include: {
            assignedLawyer: true,
            client: true,
          },
        },
        uploadedBy: true,
      },
    });

    if (!document || !document.case) return;

    const title = 'Document Uploaded';
    const message = `${document.uploadedBy.name} uploaded '${document.title}' to case ${document.case.caseNumber}`;

    // Notify the assigned lawyer
    if (document.case.assignedLawyerId !== uploadedById) {
      await this.create({
        title,
        message,
        type: NotificationType.DOCUMENT_UPLOAD,
        userId: document.case.assignedLawyerId,
      });
    }

    // Notify the client
    if (document.case.clientId !== uploadedById) {
      await this.create({
        title,
        message,
        type: NotificationType.DOCUMENT_UPLOAD,
        userId: document.case.clientId,
      });
    }
  }

  async createBillingNotification(billId: string, clientId: string) {
    const bill = await this.prisma.billingRecord.findUnique({
      where: { id: billId },
      include: {
        case: true,
      },
    });

    if (!bill || !bill.case) return;

    const title = 'New Billing Record';
    const message = `New ${bill.billType.toLowerCase()} bill of $${bill.amount} for case ${bill.case.caseNumber}`;

    return this.create({
      title,
      message,
      type: NotificationType.BILLING,
      userId: clientId,
    });
  }

  async createVideoCallScheduledNotification(
    callId: string,
    participantId: string,
  ) {
    const call = await this.prisma.videoCall.findUnique({
      where: { id: callId },
      include: {
        case: true,
        host: true,
      },
    });

    if (!call) return;

    let message = `${call.host.name} scheduled a video call: ${call.title}`;
    if (call.case) {
      message += ` (Case: ${call.case.caseNumber})`;
    }
    message += `\n\nMeeting ID: ${call.meetingId}`;
    message += `\nMeeting URL: ${call.meetingUrl}`;
    message += `\nStart Time: ${new Date(call.startTime).toLocaleString()}`;

    return this.create({
      title: 'Video Call Scheduled',
      message,
      type: NotificationType.SYSTEM,
      userId: participantId,
    });
  }

  async createVideoCallInstantNotification(
    callId: string,
    participantId: string,
  ) {
    const call = await this.prisma.videoCall.findUnique({
      where: { id: callId },
      include: {
        case: true,
        host: true,
      },
    });

    if (!call) return;

    let message = `${call.host.name} created an instant video call: ${call.title}`;
    if (call.case) {
      message += ` (Case: ${call.case.caseNumber})`;
    }
    message += `\n\nMeeting ID: ${call.meetingId}`;
    message += `\nMeeting URL: ${call.meetingUrl}`;
    message += `\n\nClick the link above to join immediately!`;

    const notification = await this.create({
      title: 'Instant Video Call Created',
      message,
      type: NotificationType.SYSTEM,
      userId: participantId,
    });

    // Emit socket event for real-time notification
    this.notificationEmitter.emitVideoCallNotification(participantId, {
      type: 'VIDEO_CALL_INSTANT',
      title: notification.title,
      message: notification.message,
      meetingId: call.meetingId,
      meetingUrl: call.meetingUrl,
      callId: call.id,
      hostName: call.host.name,
      callTitle: call.title,
    });

    return notification;
  }

  async createVideoCallStartedNotification(
    callId: string,
    participantId: string,
  ) {
    const call = await this.prisma.videoCall.findUnique({
      where: { id: callId },
      include: {
        case: true,
        host: true,
      },
    });

    if (!call) return;

    let message = `${call.host.name} has started the video call: ${call.title}`;
    if (call.case) {
      message += ` (Case: ${call.case.caseNumber})`;
    }
    message += `\n\nMeeting ID: ${call.meetingId}`;
    message += `\nMeeting URL: ${call.meetingUrl}`;
    message += `\n\nClick the link above to join now!`;

    const notification = await this.create({
      title: 'Video Call Started',
      message,
      type: NotificationType.SYSTEM,
      userId: participantId,
    });

    // Emit socket event for real-time notification
    this.notificationEmitter.emitVideoCallNotification(participantId, {
      type: 'VIDEO_CALL_STARTED',
      title: notification.title,
      message: notification.message,
      meetingId: call.meetingId,
      meetingUrl: call.meetingUrl,
      callId: call.id,
      hostName: call.host.name,
      callTitle: call.title,
    });

    return notification;
  }
}
