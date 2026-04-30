import { Injectable } from '@nestjs/common';
import { NotificationType, Prisma } from '@prisma/client';
import { EmailService } from '../email/email.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationEmitterService } from './notification-emitter.service';

interface CreateNotificationDto {
  title: string;
  message: string;
  type: NotificationType;
  userId: string;
  practiceId: string;
}

@Injectable()
export class NotificationsService {
  constructor(
    private prisma: PrismaService,
    private notificationEmitter: NotificationEmitterService,
    private emailService: EmailService,
  ) {}

  private async emitUnreadCountForUser(userId: string, practiceId: string) {
    const unreadCount = await this.getUnreadCount(userId, practiceId);
    this.notificationEmitter.emitUnreadNotificationCount(userId, unreadCount);
  }

  private async getBrandingContext(practiceId: string) {
    const practice = await this.prisma.practice.findUnique({
      where: { id: practiceId },
      select: { name: true },
    });
    return {
      brandName: practice?.name || 'Vidhigya',
    };
  }

  private async shouldSendCaseEmail(userId: string): Promise<boolean> {
    const settings = await this.prisma.userSettings.findUnique({
      where: { userId },
      select: { emailNotifications: true, caseUpdates: true },
    });

    if (!settings) {
      return true;
    }

    return Boolean(settings.emailNotifications && settings.caseUpdates);
  }

  async create(data: CreateNotificationDto) {
    const notification = await this.prisma.notification.create({
      data: {
        title: data.title,
        message: data.message,
        type: data.type,
        userId: data.userId,
        practiceId: data.practiceId,
      },
    });

    await this.emitUnreadCountForUser(data.userId, data.practiceId);
    return notification;
  }

  async findAll(
    userId: string,
    practiceId: string,
    filters?: { isRead?: boolean; type?: string },
  ) {
    const where: Prisma.NotificationWhereInput = { userId, practiceId };

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

  async findOne(id: string, userId: string, practiceId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: {
        id,
        userId,
        practiceId,
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

  async markAsRead(id: string, userId: string, practiceId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: {
        id,
        userId,
        practiceId,
      },
    });

    if (!notification) {
      throw new Error('Notification not found');
    }

    const updated = await this.prisma.notification.update({
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

    await this.emitUnreadCountForUser(userId, practiceId);
    return updated;
  }

  async markAllAsRead(userId: string, practiceId: string) {
    const result = await this.prisma.notification.updateMany({
      where: {
        userId,
        practiceId,
        isRead: false,
      },
      data: {
        isRead: true,
      },
    });

    await this.emitUnreadCountForUser(userId, practiceId);
    return result;
  }

  async remove(id: string, userId: string, practiceId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: {
        id,
        userId,
        practiceId,
      },
    });

    if (!notification) {
      throw new Error('Notification not found');
    }

    const deleted = await this.prisma.notification.delete({
      where: { id },
    });

    await this.emitUnreadCountForUser(userId, practiceId);
    return deleted;
  }

  async getUnreadCount(userId: string, practiceId: string) {
    return this.prisma.notification.count({
      where: {
        userId,
        practiceId,
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

    const notification = await this.create({
      title: 'New Task Assigned',
      message,
      type: NotificationType.CASE_UPDATE,
      userId: assignedToId,
      practiceId: task.practiceId,
    });

    const assignee = await this.prisma.user.findUnique({
      where: { id: assignedToId },
      select: { name: true, email: true },
    });

    if (
      assignee?.email &&
      this.emailService.isEnabled() &&
      (await this.shouldSendCaseEmail(assignedToId))
    ) {
      const branding = await this.getBrandingContext(task.practiceId);
      await this.emailService.sendTemplateEmail({
        to: assignee.email,
        subject: `Task Assigned: ${task.title}`,
        templateName: 'task-assigned',
        context: {
          ...branding,
          recipientName: assignee.name,
          taskTitle: task.title,
          taskDescription: task.description || '',
          assignedBy: task.createdBy.name,
          caseNumber: task.case?.caseNumber || 'N/A',
          caseTitle: task.case?.title || 'No linked case',
        },
      });
    }

    return notification;
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
      practiceId: event.practiceId,
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
    const branding = await this.getBrandingContext(document.practiceId);

    // Notify the assigned lawyer
    if (document.case.assignedLawyerId !== uploadedById) {
      await this.create({
        title,
        message,
        type: NotificationType.DOCUMENT_UPLOAD,
        userId: document.case.assignedLawyerId,
        practiceId: document.practiceId,
      });

      if (
        document.case.assignedLawyer.email &&
        this.emailService.isEnabled() &&
        (await this.shouldSendCaseEmail(document.case.assignedLawyerId))
      ) {
        await this.emailService.sendTemplateEmail({
          to: document.case.assignedLawyer.email,
          subject: `Document Uploaded: ${document.title}`,
          templateName: 'document-uploaded',
          context: {
            ...branding,
            recipientName: document.case.assignedLawyer.name,
            documentTitle: document.title,
            uploadedBy: document.uploadedBy.name,
            caseNumber: document.case.caseNumber,
            caseTitle: document.case.title,
          },
        });
      }
    }

    // Notify the client
    if (document.case.clientId !== uploadedById) {
      await this.create({
        title,
        message,
        type: NotificationType.DOCUMENT_UPLOAD,
        userId: document.case.clientId,
        practiceId: document.practiceId,
      });

      if (
        document.case.client.email &&
        this.emailService.isEnabled() &&
        document.case.client.userId &&
        (await this.shouldSendCaseEmail(document.case.client.userId))
      ) {
        await this.emailService.sendTemplateEmail({
          to: document.case.client.email,
          subject: `Document Uploaded: ${document.title}`,
          templateName: 'document-uploaded',
          context: {
            ...branding,
            recipientName: document.case.client.name,
            documentTitle: document.title,
            uploadedBy: document.uploadedBy.name,
            caseNumber: document.case.caseNumber,
            caseTitle: document.case.title,
          },
        });
      }
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
    const notification = await this.create({
      title,
      message,
      type: NotificationType.BILLING,
      userId: clientId,
      practiceId: bill.practiceId,
    });

    const clientUser = await this.prisma.user.findUnique({
      where: { id: clientId },
      select: { name: true, email: true },
    });

    if (
      clientUser?.email &&
      this.emailService.isEnabled() &&
      (await this.shouldSendCaseEmail(clientId))
    ) {
      const branding = await this.getBrandingContext(bill.practiceId);
      await this.emailService.sendTemplateEmail({
        to: clientUser.email,
        subject: `Billing Update: ${bill.case.caseNumber}`,
        templateName: 'billing-notification',
        context: {
          ...branding,
          recipientName: clientUser.name,
          caseNumber: bill.case.caseNumber,
          caseTitle: bill.case.title,
          billType: bill.billType,
          amount: bill.amount.toFixed(2),
          currency: bill.currency,
          dueDate: bill.dueDate
            ? new Date(bill.dueDate).toLocaleDateString()
            : 'N/A',
          description: bill.description,
        },
      });
    }

    return notification;
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
      practiceId: call.practiceId,
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
      practiceId: call.practiceId,
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
      practiceId: call.practiceId,
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

  async sendTestEmail(userId: string, practiceId: string, to?: string) {
    if (!this.emailService.isEnabled()) {
      return { success: false, reason: 'Email service is not configured' };
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    });

    const recipientEmail = to || user?.email;
    if (!recipientEmail) {
      return { success: false, reason: 'Recipient email not available' };
    }

    const branding = await this.getBrandingContext(practiceId);
    const sent = await this.emailService.sendTemplateEmail({
      to: recipientEmail,
      subject: 'Test Email from Vidhigya',
      templateName: 'test-email',
      context: {
        ...branding,
        recipientName: user?.name || 'User',
        sentAt: new Date().toLocaleString(),
      },
    });

    return { success: sent, to: recipientEmail };
  }
}
