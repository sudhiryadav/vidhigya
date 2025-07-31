import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';

interface AuthenticatedUser {
  sub: string;
  role: string;
  [key: string]: any;
}

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class ChatGateway {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly chatService: ChatService,
    private readonly jwtService: JwtService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth.token;
      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token);
      const user = {
        sub: payload.sub,
        role: payload.role,
      };

      client.data.user = user;
      client.join(`user_${user.sub}`);

      // Join role-based rooms
      if (user.role === 'LAWYER') {
        client.join('lawyers');
      } else if (user.role === 'CLIENT') {
        client.join('clients');
      }

      console.log(`User ${user.sub} connected`);
    } catch (error) {
      console.error('Authentication failed:', error);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const user = client.data.user as AuthenticatedUser;
    if (user) {
      console.log(`User ${user.sub} disconnected`);
    }
  }

  @SubscribeMessage('sendMessage')
  async handleMessage(
    @MessageBody() createMessageDto: any,
    @ConnectedSocket() client: Socket,
  ) {
    const user = client.data.user as AuthenticatedUser;
    if (!user) {
      return { error: 'Unauthorized' };
    }

    try {
      const message = {
        id: 'temp',
        content: createMessageDto.content,
        receiverId: createMessageDto.receiverId,
        senderId: user.sub,
        createdAt: new Date(),
      };

      // Emit to sender
      client.emit('messageSent', message);

      // Emit to receiver
      this.server.to(`user_${message.receiverId}`).emit('newMessage', message);

      return message;
    } catch (error) {
      console.error('Error sending message:', error);
      return { error: 'Failed to send message' };
    }
  }

  @SubscribeMessage('markAsRead')
  async handleMarkAsRead(
    @MessageBody() data: { messageId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const user = client.data.user as AuthenticatedUser;
    if (!user) {
      return { error: 'Unauthorized' };
    }

    try {
      await this.chatService.markAsRead(data.messageId, user.sub);
      return { success: true };
    } catch (error) {
      console.error('Error marking message as read:', error);
      return { error: 'Failed to mark message as read' };
    }
  }

  @SubscribeMessage('getConversation')
  async handleGetConversation(
    @MessageBody() data: { receiverId: string; limit?: number },
    @ConnectedSocket() client: Socket,
  ) {
    const user = client.data.user as AuthenticatedUser;
    if (!user) {
      return { error: 'Unauthorized' };
    }

    try {
      const messages = [];
      return { messages };
    } catch (error) {
      console.error('Error getting conversation:', error);
      return { error: 'Failed to get conversation' };
    }
  }

  @SubscribeMessage('getUnreadCount')
  async handleGetUnreadCount(@ConnectedSocket() client: Socket) {
    const user = client.data.user as AuthenticatedUser;
    if (!user) {
      return { error: 'Unauthorized' };
    }

    try {
      const count = 0;
      return { count };
    } catch (error) {
      console.error('Error getting unread count:', error);
      return { error: 'Failed to get unread count' };
    }
  }

  @SubscribeMessage('typing')
  async handleTyping(
    @MessageBody() data: { receiverId: string; isTyping: boolean },
    @ConnectedSocket() client: Socket,
  ) {
    const user = client.data.user as AuthenticatedUser;
    if (!user) {
      return;
    }

    this.server.to(`user_${data.receiverId}`).emit('userTyping', {
      userId: user.sub,
      isTyping: data.isTyping,
    });
  }

  @SubscribeMessage('stopTyping')
  async handleStopTyping(
    @MessageBody() data: { receiverId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const user = client.data.user as AuthenticatedUser;
    if (!user) {
      return;
    }

    this.server.to(`user_${data.receiverId}`).emit('userStoppedTyping', {
      userId: user.sub,
    });
  }

  // Admin methods
  @SubscribeMessage('getAllMessages')
  async handleGetAllMessages(
    @MessageBody() data: { limit?: number; offset?: number },
    @ConnectedSocket() client: Socket,
  ) {
    const user = client.data.user as AuthenticatedUser;
    if (!user || user.role !== 'ADMIN') {
      return { error: 'Unauthorized' };
    }

    try {
      const messages = [];
      return { messages };
    } catch (error) {
      console.error('Error getting all messages:', error);
      return { error: 'Failed to get messages' };
    }
  }

  @SubscribeMessage('deleteMessage')
  async handleDeleteMessage(
    @MessageBody() data: { messageId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const user = client.data.user as AuthenticatedUser;
    if (!user || user.role !== 'ADMIN') {
      return { error: 'Unauthorized' };
    }

    try {
      // await this.chatService.remove(data.messageId);
      this.server.emit('messageDeleted', { messageId: data.messageId });
      return { success: true };
    } catch (error) {
      console.error('Error deleting message:', error);
      return { error: 'Failed to delete message' };
    }
  }
}
