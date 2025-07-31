import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface ChatParticipant {
  id: string;
  name: string;
  role: string;
  isOnline: boolean;
}

interface ChatMessage {
  id: string;
  content: string;
  senderId: string;
  senderName: string;
  type: string;
  isRead: boolean;
  createdAt: Date;
}

interface Chat {
  id: string;
  participants: ChatParticipant[];
  lastMessage?: ChatMessage;
  unreadCount: number;
  caseId?: string;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class ChatService {
  constructor(private prisma: PrismaService) {}

  async getUserChats(userId: string): Promise<Chat[]> {
    // Get all chat messages where user is sender or receiver
    const userMessages = await this.prisma.chatMessage.findMany({
      where: {
        OR: [{ senderId: userId }, { receiverId: userId }],
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
        receiver: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Group messages by conversation (unique sender-receiver pairs)
    const conversations = new Map<string, typeof userMessages>();

    userMessages.forEach((message) => {
      const otherUserId =
        message.senderId === userId ? message.receiverId : message.senderId;
      const key = [userId, otherUserId].sort().join('-');

      if (!conversations.has(key)) {
        conversations.set(key, []);
      }
      conversations.get(key).push(message);
    });

    // Convert to Chat objects
    const chats: Chat[] = [];

    for (const [key, messages] of conversations) {
      if (messages.length === 0) continue;

      const latestMessage = messages[0];
      const otherUserId =
        latestMessage.senderId === userId
          ? latestMessage.receiverId
          : latestMessage.senderId;

      // Get other participant info
      const otherUser = await this.prisma.user.findUnique({
        where: { id: otherUserId },
        select: {
          id: true,
          name: true,
          role: true,
        },
      });

      if (!otherUser) continue;

      // Count unread messages
      const unreadCount = messages.filter(
        (m) => m.receiverId === userId && !m.isRead,
      ).length;

      chats.push({
        id: key,
        participants: [
          {
            id: otherUser.id,
            name: otherUser.name,
            role: otherUser.role,
            isOnline: Math.random() > 0.5, // Mock online status
          },
        ],
        lastMessage: {
          id: latestMessage.id,
          content: latestMessage.content,
          senderId: latestMessage.senderId,
          senderName: latestMessage.sender.name,
          type: 'TEXT',
          isRead: latestMessage.isRead,
          createdAt: latestMessage.createdAt,
        },
        unreadCount,
        createdAt: latestMessage.createdAt,
        updatedAt: latestMessage.updatedAt,
      });
    }

    return chats.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  async getChat(
    chatId: string,
    userId: string,
  ): Promise<{ messages: ChatMessage[]; participants: ChatParticipant[] }> {
    // Parse chatId to get participant IDs
    const [user1Id, user2Id] = chatId.split('-');

    if (!user1Id || !user2Id || (user1Id !== userId && user2Id !== userId)) {
      throw new ForbiddenException('Access denied to this chat');
    }

    const otherUserId = user1Id === userId ? user2Id : user1Id;

    // Get all messages between these users
    const messages = await this.prisma.chatMessage.findMany({
      where: {
        OR: [
          { AND: [{ senderId: userId }, { receiverId: otherUserId }] },
          { AND: [{ senderId: otherUserId }, { receiverId: userId }] },
        ],
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    // Get participant info
    const otherUser = await this.prisma.user.findUnique({
      where: { id: otherUserId },
      select: {
        id: true,
        name: true,
        role: true,
      },
    });

    if (!otherUser) {
      throw new NotFoundException('Participant not found');
    }

    return {
      messages: messages.map((m) => ({
        id: m.id,
        content: m.content,
        senderId: m.senderId,
        senderName: m.sender.name,
        type: 'TEXT',
        isRead: m.isRead,
        createdAt: m.createdAt,
      })),
      participants: [
        {
          id: otherUser.id,
          name: otherUser.name,
          role: otherUser.role,
          isOnline: Math.random() > 0.5, // Mock online status
        },
      ],
    };
  }

  async createChat(
    userId: string,
    participantId: string,
    caseId?: string,
  ): Promise<Chat> {
    // Check if chat already exists
    const existingMessages = await this.prisma.chatMessage.findMany({
      where: {
        OR: [
          { AND: [{ senderId: userId }, { receiverId: participantId }] },
          { AND: [{ senderId: participantId }, { receiverId: userId }] },
        ],
      },
      take: 1,
    });

    if (existingMessages.length > 0) {
      throw new Error('Chat already exists');
    }

    // Get participant info
    const participant = await this.prisma.user.findUnique({
      where: { id: participantId },
      select: {
        id: true,
        name: true,
        role: true,
      },
    });

    if (!participant) {
      throw new NotFoundException('Participant not found');
    }

    return {
      id: [userId, participantId].sort().join('-'),
      participants: [
        {
          id: participant.id,
          name: participant.name,
          role: participant.role,
          isOnline: Math.random() > 0.5,
        },
      ],
      unreadCount: 0,
      caseId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  async sendMessage(
    chatId: string,
    senderId: string,
    content: string,
    type: string = 'TEXT',
  ): Promise<ChatMessage> {
    // Parse chatId to get receiver ID
    const [user1Id, user2Id] = chatId.split('-');

    if (
      !user1Id ||
      !user2Id ||
      (user1Id !== senderId && user2Id !== senderId)
    ) {
      throw new ForbiddenException('Access denied to this chat');
    }

    const receiverId = user1Id === senderId ? user2Id : user1Id;

    // Create the message
    const message = await this.prisma.chatMessage.create({
      data: {
        content,
        senderId,
        receiverId,
        isRead: false,
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
      },
    });

    return {
      id: message.id,
      content: message.content,
      senderId: message.senderId,
      senderName: message.sender.name,
      type,
      isRead: message.isRead,
      createdAt: message.createdAt,
    };
  }

  async markAsRead(chatId: string, userId: string): Promise<void> {
    // Parse chatId to get participant IDs
    const [user1Id, user2Id] = chatId.split('-');

    if (!user1Id || !user2Id || (user1Id !== userId && user2Id !== userId)) {
      throw new ForbiddenException('Access denied to this chat');
    }

    const otherUserId = user1Id === userId ? user2Id : user1Id;

    // Mark all messages from other user as read
    await this.prisma.chatMessage.updateMany({
      where: {
        senderId: otherUserId,
        receiverId: userId,
        isRead: false,
      },
      data: {
        isRead: true,
      },
    });
  }

  async deleteChat(chatId: string, userId: string): Promise<void> {
    // Parse chatId to get participant IDs
    const [user1Id, user2Id] = chatId.split('-');

    if (!user1Id || !user2Id || (user1Id !== userId && user2Id !== userId)) {
      throw new ForbiddenException('Access denied to this chat');
    }

    // Delete all messages between these users
    await this.prisma.chatMessage.deleteMany({
      where: {
        OR: [
          {
            AND: [
              { senderId: userId },
              { receiverId: user1Id === userId ? user2Id : user1Id },
            ],
          },
          {
            AND: [
              { senderId: user1Id === userId ? user2Id : user1Id },
              { receiverId: userId },
            ],
          },
        ],
      },
    });
  }

  async getUserById(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        role: true,
      },
    });
  }

  async getAssociatedUsers(userId: string): Promise<ChatParticipant[]> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        clientCases: {
          include: {
            assignedLawyer: true,
          },
        },
        assignedCases: {
          include: {
            client: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const associatedUsers: ChatParticipant[] = [];

    if (user.role === 'CLIENT') {
      // For clients, get their assigned lawyers
      const lawyerIds = new Set<string>();

      user.clientCases.forEach((case_) => {
        if (case_.assignedLawyer) {
          lawyerIds.add(case_.assignedLawyer.id);
        }
      });

      if (lawyerIds.size > 0) {
        const lawyers = await this.prisma.user.findMany({
          where: {
            id: { in: Array.from(lawyerIds) },
            role: { in: ['LAWYER', 'ASSOCIATE', 'PARALEGAL'] },
          },
          select: {
            id: true,
            name: true,
            role: true,
          },
        });

        associatedUsers.push(
          ...lawyers.map((lawyer) => ({
            id: lawyer.id,
            name: lawyer.name,
            role: lawyer.role,
            isOnline: Math.random() > 0.5, // Mock online status
          })),
        );
      }
    } else if (['LAWYER', 'ASSOCIATE', 'PARALEGAL'].includes(user.role)) {
      // For lawyers, get their clients
      const clientIds = new Set<string>();

      user.assignedCases.forEach((case_) => {
        if (case_.client) {
          clientIds.add(case_.client.id);
        }
      });

      if (clientIds.size > 0) {
        const clients = await this.prisma.user.findMany({
          where: {
            id: { in: Array.from(clientIds) },
            role: 'CLIENT',
          },
          select: {
            id: true,
            name: true,
            role: true,
          },
        });

        associatedUsers.push(
          ...clients.map((client) => ({
            id: client.id,
            name: client.name,
            role: client.role,
            isOnline: Math.random() > 0.5, // Mock online status
          })),
        );
      }
    }

    return associatedUsers;
  }

  async createChatWithAssociatedUser(
    userId: string,
    associatedUserId: string,
  ): Promise<Chat> {
    // Verify the users are associated
    const associatedUsers = await this.getAssociatedUsers(userId);
    const isAssociated = associatedUsers.some(
      (user) => user.id === associatedUserId,
    );

    if (!isAssociated) {
      throw new ForbiddenException(
        'Cannot create chat with non-associated user',
      );
    }

    // Check if chat already exists
    const existingChat = await this.getUserChats(userId);
    const existingChatWithUser = existingChat.find((chat) =>
      chat.participants.some((p) => p.id === associatedUserId),
    );

    if (existingChatWithUser) {
      return existingChatWithUser;
    }

    // Create a system message to initialize the chat
    await this.prisma.chatMessage.create({
      data: {
        content: 'Chat started',
        senderId: userId,
        receiverId: associatedUserId,
        isRead: true,
      },
    });

    // Return the new chat
    const chats = await this.getUserChats(userId);
    const newChat = chats.find((chat) =>
      chat.participants.some((p) => p.id === associatedUserId),
    );

    return newChat;
  }
}
