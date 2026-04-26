import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { NotificationType } from '@prisma/client';
import { RedactingLogger } from '../common/logging';
import { EmailService } from '../email/email.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from './notifications.service';

@Injectable()
export class CaseReminderEmailService {
  private readonly logger = new RedactingLogger(CaseReminderEmailService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly notificationsService: NotificationsService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async sendUpcomingCaseDateReminders() {
    if (!this.emailService.isEnabled()) {
      return;
    }

    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);

    const cases = await this.prisma.legalCase.findMany({
      where: {
        nextHearingDate: {
          gte: now,
          lte: tomorrow,
        },
      },
      include: {
        assignedLawyer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        client: {
          select: {
            id: true,
            name: true,
            email: true,
            userId: true,
          },
        },
        court: {
          select: {
            name: true,
          },
        },
        practice: {
          select: {
            name: true,
          },
        },
      },
    });

    for (const legalCase of cases) {
      if (!legalCase.nextHearingDate) {
        continue;
      }

      const formattedDate = legalCase.nextHearingDate.toLocaleString();
      const context = {
        brandName: legalCase.practice.name,
        caseNumber: legalCase.caseNumber,
        caseTitle: legalCase.title,
        caseStatus: legalCase.status,
        casePriority: legalCase.priority,
        clientName: legalCase.client.name,
        assignedLawyerName: legalCase.assignedLawyer.name,
        courtName: legalCase.court?.name || 'Not specified',
        nextHearingDate: formattedDate,
        judge: legalCase.judge || '',
        opposingParty: legalCase.opposingParty || '',
      };

      await this.sendReminderToLawyer(legalCase, context);
      await this.sendReminderToClient(legalCase, context);
    }
  }

  private async sendReminderToLawyer(
    legalCase: {
      caseNumber: string;
      title: string;
      practiceId: string;
      assignedLawyer: { id: string; name: string; email: string };
      client: { name: string };
    },
    context: Record<string, unknown>,
  ) {
    if (!legalCase.assignedLawyer.email) {
      return;
    }

    const userSettings = await this.prisma.userSettings.findUnique({
      where: { userId: legalCase.assignedLawyer.id },
      select: { emailNotifications: true, caseUpdates: true },
    });

    if (
      userSettings &&
      (!userSettings.emailNotifications || !userSettings.caseUpdates)
    ) {
      return;
    }

    await this.emailService.sendTemplateEmail({
      to: legalCase.assignedLawyer.email,
      subject: `Case Reminder: ${legalCase.caseNumber} hearing is coming up`,
      templateName: 'case-date-reminder',
      context: {
        ...context,
        recipientName: legalCase.assignedLawyer.name,
      },
    });

    await this.notificationsService.create({
      title: 'Upcoming Hearing Reminder',
      message: `${legalCase.caseNumber} - ${legalCase.title} hearing is scheduled soon.`,
      type: NotificationType.HEARING_REMINDER,
      userId: legalCase.assignedLawyer.id,
      practiceId: legalCase.practiceId,
    });
  }

  private async sendReminderToClient(
    legalCase: {
      caseNumber: string;
      title: string;
      practiceId: string;
      client: {
        id: string;
        name: string;
        email: string | null;
        userId: string | null;
      };
    },
    context: Record<string, unknown>,
  ) {
    if (!legalCase.client.email) {
      return;
    }

    if (legalCase.client.userId) {
      const userSettings = await this.prisma.userSettings.findUnique({
        where: { userId: legalCase.client.userId },
        select: { emailNotifications: true, caseUpdates: true },
      });

      if (
        userSettings &&
        (!userSettings.emailNotifications || !userSettings.caseUpdates)
      ) {
        return;
      }
    }

    await this.emailService.sendTemplateEmail({
      to: legalCase.client.email,
      subject: `Case Reminder: ${legalCase.caseNumber} hearing is coming up`,
      templateName: 'case-date-reminder',
      context: {
        ...context,
        recipientName: legalCase.client.name,
      },
    });
  }
}
