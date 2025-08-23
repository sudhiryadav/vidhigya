import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ClientPortalService {
  constructor(private prisma: PrismaService) {}

  // Get client's own cases
  async getClientCases(clientId: string) {
    return await this.prisma.legalCase.findMany({
      where: {
        clientId: clientId,
      },
      include: {
        assignedLawyer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        documents: {
          select: {
            id: true,
            title: true,
            description: true,
            fileType: true,
            fileSize: true,
            category: true,
            status: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        billingRecords: {
          select: {
            id: true,
            description: true,
            amount: true,
            billType: true,
            status: true,
            dueDate: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });
  }

  // Get specific case details (client can only access their own cases)
  async getClientCase(caseId: string, clientId: string) {
    const legalCase = await this.prisma.legalCase.findFirst({
      where: {
        id: caseId,
        clientId: clientId,
      },
      include: {
        assignedLawyer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        documents: {
          select: {
            id: true,
            title: true,
            description: true,
            fileType: true,
            fileSize: true,
            category: true,
            status: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        billingRecords: {
          select: {
            id: true,
            description: true,
            amount: true,
            billType: true,
            status: true,
            dueDate: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        events: {
          select: {
            id: true,
            title: true,
            description: true,
            startTime: true,
            endTime: true,
            location: true,
            eventType: true,
            isAllDay: true,
          },
          orderBy: {
            startTime: 'asc',
          },
        },
        videoCalls: {
          select: {
            id: true,
            title: true,
            description: true,
            startTime: true,
            endTime: true,
            meetingUrl: true,
            meetingId: true,
            status: true,
            host: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          orderBy: {
            startTime: 'desc',
          },
        },
      },
    });

    if (!legalCase) {
      throw new NotFoundException('Case not found');
    }

    return legalCase;
  }

  // Get client's own documents
  async getClientDocuments(clientId: string) {
    return await this.prisma.legalDocument.findMany({
      where: {
        case: {
          clientId: clientId,
        },
      },
      include: {
        case: {
          select: {
            id: true,
            caseNumber: true,
            title: true,
          },
        },
        uploadedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  // Get specific document (client can only access documents from their cases)
  async getClientDocument(documentId: string, clientId: string) {
    const document = await this.prisma.legalDocument.findFirst({
      where: {
        id: documentId,
        case: {
          clientId: clientId,
        },
      },
      include: {
        case: {
          select: {
            id: true,
            caseNumber: true,
            title: true,
          },
        },
        uploadedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    return document;
  }

  // Get client's own billing records
  async getClientBillingRecords(clientId: string) {
    return this.prisma.billingRecord.findMany({
      where: {
        case: { clientId },
      },
      include: {
        case: {
          select: {
            id: true,
            caseNumber: true,
            title: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async getClientBills(clientId: string) {
    return this.getClientBillingRecords(clientId);
  }

  // Get specific billing record (client can only access their own bills)
  async getClientBillingRecord(billId: string, clientId: string) {
    const billingRecord = await this.prisma.billingRecord.findFirst({
      where: {
        id: billId,
        case: {
          clientId: clientId,
        },
      },
      include: {
        case: {
          select: {
            id: true,
            caseNumber: true,
            title: true,
          },
        },
      },
    });

    if (!billingRecord) {
      throw new NotFoundException('Billing record not found');
    }

    return billingRecord;
  }

  // Get client's own calendar events
  async getClientEvents(clientId: string) {
    return await this.prisma.calendarEvent.findMany({
      where: {
        OR: [
          {
            case: {
              clientId: clientId,
            },
          },
          {
            participants: {
              some: {
                userId: clientId,
              },
            },
          },
        ],
      },
      include: {
        case: {
          select: {
            id: true,
            caseNumber: true,
            title: true,
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
      orderBy: {
        startTime: 'asc',
      },
    });
  }

  // Get client's own video calls
  async getClientVideoCalls(clientId: string) {
    return await this.prisma.videoCall.findMany({
      where: {
        OR: [
          {
            case: {
              clientId: clientId,
            },
          },
          {
            participants: {
              some: {
                userId: clientId,
              },
            },
          },
        ],
      },
      include: {
        case: {
          select: {
            id: true,
            caseNumber: true,
            title: true,
          },
        },
        host: {
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
      orderBy: {
        startTime: 'desc',
      },
    });
  }

  // Get client's own notifications
  async getClientNotifications(clientId: string) {
    return await this.prisma.notification.findMany({
      where: {
        userId: clientId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  // Get client's own profile
  async getClientProfile(clientId: string) {
    try {
      const client = await this.prisma.user.findFirst({
        where: {
          id: clientId,
          role: 'CLIENT',
        },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          createdAt: true,
          updatedAt: true,
          clientCases: {
            select: {
              id: true,
              caseNumber: true,
              title: true,
              status: true,
              category: true,
              assignedLawyer: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
            orderBy: {
              updatedAt: 'desc',
            },
          },
        },
      });

      if (!client) {
        throw new NotFoundException('Client profile not found');
      }

      return client;
    } catch (error) {
      console.error('Error in getClientProfile:', error);
      throw error;
    }
  }

  // Update client's own profile
  async updateClientProfile(
    clientId: string,
    updateData: {
      name?: string;
      phone?: string;
    },
  ) {
    return await this.prisma.user
      .updateMany({
        where: {
          id: clientId,
          role: 'CLIENT',
        },
        data: updateData,
      })
      .then(async () => {
        return await this.prisma.user.findFirst({
          where: {
            id: clientId,
            role: 'CLIENT',
          },
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            updatedAt: true,
          },
        });
      });
  }

  // Get client dashboard statistics
  async getClientDashboardStats(clientId: string) {
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalCases,
      activeCases,
      totalDocuments,
      totalBills,
      unpaidBills,
      upcomingEvents,
      // This month's activity
      newCasesThisMonth,
      newDocumentsThisMonth,
      newBillsThisMonth,
    ] = await Promise.all([
      this.prisma.legalCase.count({
        where: { clientId },
      }),
      this.prisma.legalCase.count({
        where: {
          clientId,
          status: {
            in: ['OPEN', 'IN_PROGRESS', 'PENDING'],
          },
        },
      }),
      this.prisma.legalDocument.count({
        where: {
          case: { clientId },
        },
      }),
      this.prisma.billingRecord.count({
        where: {
          case: { clientId },
        },
      }),
      this.prisma.billingRecord.count({
        where: {
          case: { clientId },
          status: 'PENDING',
        },
      }),
      (async () => {
        try {
          return await this.prisma.calendarEvent.count({
            where: {
              OR: [
                { case: { clientId } },
                { participants: { some: { userId: clientId } } },
              ],
              startTime: {
                gte: new Date(),
              },
            },
          });
        } catch (error) {
          console.error('Error counting upcoming events:', error);
          return 0;
        }
      })(),
      // New cases this month
      this.prisma.legalCase.count({
        where: {
          clientId,
          createdAt: {
            gte: thisMonth,
          },
        },
      }),
      // New documents this month
      this.prisma.legalDocument.count({
        where: {
          case: { clientId },
          createdAt: {
            gte: thisMonth,
          },
        },
      }),
      // New bills this month
      this.prisma.billingRecord.count({
        where: {
          case: { clientId },
          createdAt: {
            gte: thisMonth,
          },
        },
      }),
    ]);

    return {
      totalCases,
      activeCases,
      totalDocuments,
      totalBills,
      unpaidBills,
      upcomingEvents,
      newCasesThisMonth,
      newDocumentsThisMonth,
      newBillsThisMonth,
    };
  }
}
