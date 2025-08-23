import {
  BadRequestException,
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

  // Method to set online status - will be called by ChatGateway
  private onlineUsers = new Set<string>();

  setUserOnline(userId: string) {
    this.onlineUsers.add(userId);
  }

  setUserOffline(userId: string) {
    this.onlineUsers.delete(userId);
  }

  isUserOnline(userId: string): boolean {
    return this.onlineUsers.has(userId);
  }

  async getUserChats(userId: string): Promise<Chat[]> {
    // Get all messages where user is sender or receiver
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

    // Group messages by chat (other participant)
    const chatMap = new Map<string, typeof userMessages>();
    userMessages.forEach((message) => {
      const otherUserId =
        message.senderId === userId ? message.receiverId : message.senderId;
      const otherUserName =
        message.senderId === userId
          ? message.receiver.name
          : message.sender.name;
      const otherUserRole =
        message.senderId === userId
          ? message.receiver.role
          : message.sender.role;

      if (!chatMap.has(otherUserId)) {
        chatMap.set(otherUserId, []);
      }
      chatMap.get(otherUserId).push(message);
    });

    // Convert to chat objects
    const chats: Chat[] = [];
    for (const [otherUserId, messages] of chatMap) {
      if (messages.length === 0) continue;

      const latestMessage = messages[0];
      const otherUserIdFromMessage =
        latestMessage.senderId === userId
          ? latestMessage.receiverId
          : latestMessage.senderId;
      const otherUserName =
        latestMessage.senderId === userId
          ? latestMessage.receiver.name
          : latestMessage.sender.name;
      const otherUserRole =
        latestMessage.senderId === userId
          ? latestMessage.receiver.role
          : latestMessage.sender.role;

      // Get real online status
      const isOnline = this.isUserOnline(otherUserIdFromMessage);

      chats.push({
        id: `${userId}-${otherUserIdFromMessage}`,
        participants: [
          {
            id: otherUserIdFromMessage,
            name: otherUserName,
            role: otherUserRole,
            isOnline,
          },
        ],
        lastMessage: {
          id: latestMessage.id,
          content: latestMessage.content,
          senderId: latestMessage.senderId,
          senderName: latestMessage.sender.name,
          type: latestMessage.messageType,
          isRead: latestMessage.isRead,
          createdAt: latestMessage.createdAt,
        },
        unreadCount: messages.filter(
          (m) => m.receiverId === userId && !m.isRead,
        ).length,
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

    // Get real online status
    const isOnline = this.isUserOnline(otherUserId);

    return {
      messages: messages.map((m) => ({
        id: m.id,
        content: m.content,
        senderId: m.senderId,
        senderName: m.sender.name,
        type: m.messageType,
        isRead: m.isRead,
        createdAt: m.createdAt,
      })),
      participants: [
        {
          id: otherUser.id,
          name: otherUser.name,
          role: otherUser.role,
          isOnline,
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

    // Get real online status
    const isOnline = this.isUserOnline(participantId);

    return {
      id: `${userId}-${participantId}`,
      participants: [
        {
          id: participant.id,
          name: participant.name,
          role: participant.role,
          isOnline,
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
    // Parse chatId to get participant IDs
    const [user1Id, user2Id] = chatId.split('-');

    if (
      !user1Id ||
      !user2Id ||
      (user1Id !== senderId && user2Id !== senderId)
    ) {
      throw new ForbiddenException('Access denied to this chat');
    }

    const receiverId = user1Id === senderId ? user2Id : user1Id;

    // Get user's primary practice ID
    const user = await this.prisma.user.findUnique({
      where: { id: senderId },
      select: { primaryPracticeId: true },
    });

    if (!user?.primaryPracticeId) {
      throw new BadRequestException('User has no primary practice');
    }

    // Create the message
    const message = await this.prisma.chatMessage.create({
      data: {
        content,
        messageType: type as any,
        senderId,
        receiverId,
        isRead: false,
        practiceId: user.primaryPracticeId,
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

    // Fetch the message with sender details
    const messageWithSender = await this.prisma.chatMessage.findUnique({
      where: { id: message.id },
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
      id: messageWithSender.id,
      content: messageWithSender.content,
      senderId: messageWithSender.senderId,
      senderName: messageWithSender.sender.name,
      type: messageWithSender.messageType,
      isRead: messageWithSender.isRead,
      createdAt: messageWithSender.createdAt,
    };
  }

  async markAsRead(messageId: string, userId: string): Promise<void> {
    const message = await this.prisma.chatMessage.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    if (message.receiverId !== userId) {
      throw new ForbiddenException('Cannot mark message as read');
    }

    await this.prisma.chatMessage.update({
      where: { id: messageId },
      data: { isRead: true },
    });
  }

  async markChatAsRead(chatId: string, userId: string): Promise<void> {
    try {
      // Parse chatId to get participant IDs
      const [user1Id, user2Id] = chatId.split('-');

      if (!user1Id || !user2Id || (user1Id !== userId && user2Id !== userId)) {
        throw new ForbiddenException('Access denied to this chat');
      }

      // Mark all unread messages in this chat as read for the current user
      const result = await this.prisma.chatMessage.updateMany({
        where: {
          receiverId: userId,
          isRead: false,
          OR: [{ senderId: user1Id }, { senderId: user2Id }],
        },
        data: { isRead: true },
      });

      console.log(
        `Marked ${result.count} messages as read for chat ${chatId} and user ${userId}`,
      );
    } catch (error) {
      console.error(
        `Error marking chat ${chatId} as read for user ${userId}:`,
        error,
      );
      throw error;
    }
  }

  async deleteChat(chatId: string, userId: string): Promise<void> {
    // Parse chatId to get participant IDs
    const [user1Id, user2Id] = chatId.split('-');

    if (!user1Id || !user2Id || (user1Id !== userId && user2Id !== userId)) {
      throw new ForbiddenException('Access denied to this chat');
    }

    // Delete all messages in the chat
    await this.prisma.chatMessage.deleteMany({
      where: {
        OR: [
          { AND: [{ senderId: user1Id }, { receiverId: user2Id }] },
          { AND: [{ senderId: user2Id }, { receiverId: user1Id }] },
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
        email: true,
        phone: true,
      },
    });
  }

  async getAssociatedUsers(userId: string): Promise<ChatParticipant[]> {
    // Get user's role to determine associated users
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    let associatedUsers: any[] = [];

    if (
      user.role === 'LAWYER' ||
      user.role === 'ASSOCIATE' ||
      user.role === 'PARALEGAL'
    ) {
      // Lawyers can see clients
      associatedUsers = await this.prisma.user.findMany({
        where: { role: 'CLIENT' },
        select: {
          id: true,
          name: true,
          role: true,
        },
      });
    } else if (user.role === 'CLIENT') {
      // Clients can see lawyers
      associatedUsers = await this.prisma.user.findMany({
        where: {
          role: {
            in: ['LAWYER', 'ASSOCIATE', 'PARALEGAL'],
          },
        },
        select: {
          id: true,
          name: true,
          role: true,
        },
      });
    }

    // Get real online status for all associated users
    return associatedUsers.map((user) => ({
      id: user.id,
      name: user.name,
      role: user.role,
      isOnline: this.isUserOnline(user.id),
    }));
  }

  async createChatWithAssociatedUser(
    userId: string,
    associatedUserId: string,
  ): Promise<Chat> {
    // Check if user exists and is associated
    const associatedUser = await this.prisma.user.findUnique({
      where: { id: associatedUserId },
      select: {
        id: true,
        name: true,
        role: true,
      },
    });

    if (!associatedUser) {
      throw new NotFoundException('Associated user not found');
    }

    // Get real online status
    const isOnline = this.isUserOnline(associatedUserId);

    return {
      id: `${userId}-${associatedUserId}`,
      participants: [
        {
          id: associatedUser.id,
          name: associatedUser.name,
          role: associatedUser.role,
          isOnline,
        },
      ],
      unreadCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }
}
