import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';
import { UserRole } from '@prisma/client';
import { Socket } from 'socket.io';

interface WsJwtPayload {
  sub: string;
  role: UserRole;
}

@Injectable()
export class WsJwtGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    try {
      const client = context.switchToWs().getClient<Socket>();
      const token = client.handshake.auth.token as string;

      if (!token) {
        throw new WsException('Token not provided');
      }

      const payload = this.jwtService.verify<WsJwtPayload>(token);
      const socketData = client.data as { user?: WsJwtPayload };
      socketData.user = {
        sub: payload.sub,
        role: payload.role,
      };
      return true;
    } catch {
      throw new WsException('Invalid token');
    }
  }
}
