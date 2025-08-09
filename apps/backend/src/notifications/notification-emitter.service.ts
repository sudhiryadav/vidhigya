import { Injectable } from '@nestjs/common';
import { Server } from 'socket.io';

@Injectable()
export class NotificationEmitterService {
  private static instance: NotificationEmitterService;
  private socketServer: Server | null = null;

  constructor() {
    NotificationEmitterService.instance = this;
  }

  setSocketServer(server: Server) {
    this.socketServer = server;
  }

  emitVideoCallNotification(
    userId: string,
    notificationData: Record<string, unknown>,
  ) {
    if (this.socketServer) {
      this.socketServer
        .to(`user_${userId}`)
        .emit('video_call_notification', notificationData);
    } else {
      console.log('Socket server not available, notification data:', {
        userId,
        notificationData,
      });
    }
  }

  static getInstance(): NotificationEmitterService {
    return NotificationEmitterService.instance;
  }
}
