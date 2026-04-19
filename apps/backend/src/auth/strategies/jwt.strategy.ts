import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') || 'fallback-secret',
    });
  }

  async validate(payload: { sub: string; email: string; role: string }) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        primaryPracticeId: true,
      },
    });

    if (!user || !user.isActive) {
      console.log(
        'JWT validation failed:',
        !user ? 'User not found' : 'User not active',
      );
      throw new UnauthorizedException('Invalid token');
    }

    const result = {
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      primaryPracticeId: user.primaryPracticeId ?? undefined,
    };

    return result;
  }
}
