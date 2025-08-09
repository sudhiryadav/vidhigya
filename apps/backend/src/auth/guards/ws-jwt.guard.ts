import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';

@Injectable()
export class WsJwtGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    try {
      const client: Socket = context.switchToWs().getClient();
      const token = client.handshake.auth.token as string;

      if (!token) {
        throw new WsException('Token not provided');
      }

      const payload = this.jwtService.verify(token);
      const user = {
        sub: payload.sub,
        role: payload.role,
      };

      (client.data as { user: { sub: string; role: string } }).user = user;
      return true;
    } catch {
      throw new WsException('Invalid token');
    }
  }
}
