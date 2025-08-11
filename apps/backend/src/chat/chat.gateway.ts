import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { NotificationEmitterService } from '../notifications/notification-emitter.service';
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
    private readonly notificationEmitter: NotificationEmitterService,
  ) {}

  afterInit() {
    // Set the socket server in the notification emitter
    this.notificationEmitter.setSocketServer(this.server);
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

      console.log(`User ${user.sub} connected`);
    } catch (error) {
      console.error('Authentication failed:', error);
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

      console.log(`User ${user.sub} disconnected`);
    }
  }

  @SubscribeMessage('sendMessage')
  handleMessage(
    @MessageBody() createMessageDto: { content: string; receiverId: string },
    @ConnectedSocket() client: Socket,
  ) {
    console.log('=== BACKEND: sendMessage event received ===');
    console.log('Socket client ID:', client.id);
    console.log('Socket connected:', client.connected);
    console.log('Message data:', createMessageDto);

    const user = (client.data as { user: AuthenticatedUser }).user;
    if (!user) {
      console.error('ERROR: No user found in socket data');
      console.error('Client data:', client.data);
      return { error: 'Unauthorized' };
    }

    console.log('User authenticated successfully:', {
      userId: user.sub,
      userRole: user.role,
      receiverId: createMessageDto.receiverId,
      content: createMessageDto.content,
      chatId: `${user.sub}-${createMessageDto.receiverId}`,
    });

    try {
      console.log('Calling ChatService.sendMessage with:', {
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
          console.log('=== BACKEND: Message created successfully ===');
          console.log('Created message:', message);

          // Emit to sender
          console.log(
            'Emitting messageSent to sender (client ID:',
            client.id,
            ')',
          );
          void client.emit('messageSent', message);

          // Emit to receiver with additional context
          const receiverRoom = `user_${createMessageDto.receiverId}`;
          console.log('Emitting newMessage to receiver room:', receiverRoom);
          console.log('Receiver ID:', createMessageDto.receiverId);

          void this.server.to(receiverRoom).emit('newMessage', {
            ...message,
            receiverId: createMessageDto.receiverId,
            chatId: `${user.sub}-${createMessageDto.receiverId}`,
          });

          console.log('=== BACKEND: Message emission completed ===');
        })
        .catch((error) => {
          console.error('=== BACKEND: Error in ChatService.sendMessage ===');
          console.error('Error details:', error);
          console.error('Error message:', error.message);
          console.error('Error stack:', error.stack);
          void client.emit('messageError', { error: 'Failed to send message' });
        });

      return { success: true };
    } catch (error) {
      console.error('=== BACKEND: Error in handleMessage ===');
      console.error('Error details:', error);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
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
      console.error('Error getting conversation:', error);
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
      console.error('Error getting unread count:', error);
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
      console.error('Error getting all messages:', error);
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
      console.error('Error deleting message:', error);
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
    console.log('=== BACKEND: join_personal_room event received ===');
    console.log('Client ID:', client.id);
    console.log('User ID:', data.userId);

    const user = (client.data as { user: AuthenticatedUser }).user;
    if (!user) {
      console.error(
        'ERROR: No user found in socket data for join_personal_room',
      );
      return;
    }

    console.log('User authenticated for join_personal_room:', {
      userId: user.sub,
      userRole: user.role,
      requestedRoom: data.userId,
    });

    // Join the user's personal room
    const roomName = `user_${data.userId}`;
    client.join(roomName);
    console.log('User joined room:', roomName);
    console.log('Client rooms:', client.rooms);
    console.log('=== BACKEND: join_personal_room completed ===');
  }
}
