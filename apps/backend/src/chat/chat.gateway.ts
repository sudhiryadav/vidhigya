import { JwtService } from '@nestjs/jwt';
import { RedactingLogger } from '../common/logging';
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
  private readonly logger = new RedactingLogger(ChatGateway.name);

  @WebSocketServer()
  server: Server;

  constructor(
    private readonly chatService: ChatService,
    private readonly jwtService: JwtService,
  ) {}

  afterInit() {
    // Socket server initialized
  }

  handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth.token as string;
      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token);
      const user = {
        sub: payload.sub,
        role: payload.role,
      };

      (client.data as { user: AuthenticatedUser }).user = user;
      client.join(`user_${user.sub}`);

      // Join role-based rooms
      if (user.role === 'LAWYER') {
        void client.join('lawyers');
      } else if (user.role === 'CLIENT') {
        void client.join('clients');
      }

      // Track online user in ChatService
      this.chatService.setUserOnline(user.sub);

      // Emit online status to all connected clients
      this.server.emit('userOnline', { userId: user.sub, isOnline: true });

      this.logger.log(`User ${user.sub} connected`);
    } catch (error) {
      this.logger.error('Authentication failed:', error);
      void client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const user = client.data.user as AuthenticatedUser;
    if (user) {
      // Track offline user in ChatService
      this.chatService.setUserOffline(user.sub);

      // Emit offline status to all connected clients
      this.server.emit('userOffline', { userId: user.sub, isOnline: false });

      this.logger.log(`User ${user.sub} disconnected`);
    }
  }

  @SubscribeMessage('sendMessage')
  handleMessage(
    @MessageBody() createMessageDto: { content: string; receiverId: string },
    @ConnectedSocket() client: Socket,
  ) {
    this.logger.log('=== BACKEND: sendMessage event received ===');
    this.logger.log('Socket client ID:', client.id);
    this.logger.log('Socket connected:', client.connected);
    this.logger.log('Message data:', createMessageDto);

    const user = (client.data as { user: AuthenticatedUser }).user;
    if (!user) {
      this.logger.error('ERROR: No user found in socket data');
      this.logger.error('Client data:', client.data);
      return { error: 'Unauthorized' };
    }

    this.logger.log('User authenticated successfully:', {
      userId: user.sub,
      userRole: user.role,
      receiverId: createMessageDto.receiverId,
      content: createMessageDto.content,
      chatId: `${user.sub}-${createMessageDto.receiverId}`,
    });

    try {
      this.logger.log('Calling ChatService.sendMessage with:', {
        chatId: `${user.sub}-${createMessageDto.receiverId}`,
        senderId: user.sub,
        content: createMessageDto.content,
        type: 'TEXT',
      });

      // Create the message using the chat service
      this.chatService
        .sendMessage(
          `${user.sub}-${createMessageDto.receiverId}`,
          user.sub,
          createMessageDto.content,
          'TEXT',
        )
        .then((message) => {
          this.logger.log('=== BACKEND: Message created successfully ===');
          this.logger.log('Created message:', message);

          // Emit to sender
          this.logger.log(
            'Emitting messageSent to sender (client ID:',
            client.id,
            ')',
          );
          void client.emit('messageSent', message);

          // Emit to receiver with additional context
          const receiverRoom = `user_${createMessageDto.receiverId}`;
          this.logger.log(
            'Emitting newMessage to receiver room:',
            receiverRoom,
          );
          this.logger.log('Receiver ID:', createMessageDto.receiverId);

          void this.server.to(receiverRoom).emit('newMessage', {
            ...message,
            receiverId: createMessageDto.receiverId,
            chatId: `${user.sub}-${createMessageDto.receiverId}`,
          });

          this.logger.log('=== BACKEND: Message emission completed ===');
        })
        .catch((error) => {
          this.logger.error(
            '=== BACKEND: Error in ChatService.sendMessage ===',
          );
          this.logger.error('Error details:', error);
          this.logger.error('Error message:', error.message);
          this.logger.error('Error stack:', error.stack);
          void client.emit('messageError', { error: 'Failed to send message' });
        });

      return { success: true };
    } catch (error) {
      this.logger.error('=== BACKEND: Error in handleMessage ===');
      this.logger.error('Error details:', error);
      this.logger.error('Error message:', error.message);
      this.logger.error('Error stack:', error.stack);
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
      this.logger.error('Error marking message as read:', error);
      return { error: 'Failed to mark message as read' };
    }
  }

  @SubscribeMessage('markChatAsRead')
  async handleMarkChatAsRead(
    @MessageBody() data: { chatId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const user = client.data.user as AuthenticatedUser;
    if (!user) {
      return { error: 'Unauthorized' };
    }

    try {
      await this.chatService.markChatAsRead(data.chatId, user.sub);

      // Emit messagesRead event to notify all clients
      this.server.emit('messagesRead', {
        chatId: data.chatId,
        userId: user.sub,
      });

      return { success: true };
    } catch (error) {
      this.logger.error('Error marking chat as read:', error);
      return { error: 'Failed to mark chat as read' };
    }
  }

  @SubscribeMessage('getConversation')
  handleGetConversation(
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
      this.logger.error('Error getting conversation:', error);
      return { error: 'Failed to get conversation' };
    }
  }

  @SubscribeMessage('getUnreadCount')
  handleGetUnreadCount(@ConnectedSocket() client: Socket) {
    const user = client.data.user as AuthenticatedUser;
    if (!user) {
      return { error: 'Unauthorized' };
    }

    try {
      const count = 0;
      return { count };
    } catch (error) {
      this.logger.error('Error getting unread count:', error);
      return { error: 'Failed to get unread count' };
    }
  }

  @SubscribeMessage('typing')
  handleTyping(
    @MessageBody() data: { receiverId: string; isTyping: boolean },
    @ConnectedSocket() client: Socket,
  ) {
    const user = (client.data as { user: AuthenticatedUser }).user;
    if (!user) {
      return;
    }

    void this.server.to(`user_${data.receiverId}`).emit('userTyping', {
      userId: user.sub,
      isTyping: data.isTyping,
    });
  }

  @SubscribeMessage('stopTyping')
  handleStopTyping(
    @MessageBody() data: { receiverId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const user = (client.data as { user: AuthenticatedUser }).user;
    if (!user) {
      return;
    }

    void this.server.to(`user_${data.receiverId}`).emit('userStoppedTyping', {
      userId: user.sub,
    });
  }

  // Admin methods
  @SubscribeMessage('getAllMessages')
  handleGetAllMessages(
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
      this.logger.error('Error getting all messages:', error);
      return { error: 'Failed to get messages' };
    }
  }

  @SubscribeMessage('deleteMessage')
  handleDeleteMessage(
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
      this.logger.error('Error deleting message:', error);
      return { error: 'Failed to delete message' };
    }
  }

  // Method to emit video call notifications to specific users
  emitVideoCallNotification(userId: string, notificationData: any) {
    this.server
      .to(`user_${userId}`)
      .emit('video_call_notification', notificationData);
  }

  @SubscribeMessage('join_personal_room')
  handleJoinPersonalRoom(
    @MessageBody() data: { userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    this.logger.log('=== BACKEND: join_personal_room event received ===');
    this.logger.log('Client ID:', client.id);
    this.logger.log('User ID:', data.userId);

    const user = (client.data as { user: AuthenticatedUser }).user;
    if (!user) {
      this.logger.error(
        'ERROR: No user found in socket data for join_personal_room',
      );
      return;
    }

    this.logger.log('User authenticated for join_personal_room:', {
      userId: user.sub,
      userRole: user.role,
      requestedRoom: data.userId,
    });

    // Join the user's personal room
    const roomName = `user_${data.userId}`;
    client.join(roomName);
    this.logger.log('User joined room:', roomName);
    this.logger.log('Client rooms:', client.rooms);

    // Confirm to the client that they've joined the personal room
    client.emit('personal_room_joined', { userId: data.userId, roomName });

    this.logger.log('=== BACKEND: join_personal_room completed ===');
  }
}
