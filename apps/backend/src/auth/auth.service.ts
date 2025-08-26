import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  role:
    | 'SUPER_ADMIN'
    | 'ADMIN'
    | 'LAWYER'
    | 'CLIENT'
    | 'ASSOCIATE'
    | 'PARALEGAL';
  phone?: string;
  currency?: string;
  practiceName?: string;
  businessType?: 'individual' | 'firm';
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    phone?: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  };
  token: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (user && (await bcrypt.compare(password, user.password))) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password: _, ...result } = user;
      return result;
    }
    return null;
  }

  async login(loginRequest: LoginRequest): Promise<AuthResponse> {
    const user = await this.validateUser(
      loginRequest.email,
      loginRequest.password,
    );

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    // For now, return basic user info without practice details
    // Practice information will be fetched separately when needed

    const payload = { email: user.email, sub: user.id, role: user.role };
    const token = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '30d' });

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        phone: user.phone || undefined,
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      token,
      refreshToken,
    };
  }

  async register(registerRequest: RegisterRequest): Promise<AuthResponse> {
    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: registerRequest.email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(registerRequest.password, 10);

    // Create user
    const user = await this.prisma.user.create({
      data: {
        email: registerRequest.email,
        password: hashedPassword,
        name: registerRequest.name,
        role: registerRequest.role,
        phone: registerRequest.phone,
        // Note: userSettings will be created when user joins a practice
      },
    });

    // Create practice for the user if they're a lawyer or admin
    if (registerRequest.role === 'LAWYER' || registerRequest.role === 'ADMIN') {
      const practiceName =
        registerRequest.practiceName || `${user.name}'s Practice`;
      const practiceType =
        registerRequest.businessType === 'firm' ? 'FIRM' : 'INDIVIDUAL';

      const practice = await this.prisma.practice.create({
        data: {
          name: practiceName,
          description: `${practiceType.toLowerCase()} practice for ${user.name}`,
          practiceType: practiceType as any, // Cast to PracticeType enum
          isActive: true,
          members: {
            create: {
              userId: user.id,
              isActive: true,
            },
          },
        },
      });

      // Update user's primary practice
      await this.prisma.user.update({
        where: { id: user.id },
        data: { primaryPracticeId: practice.id },
      });
    }

    const payload = { email: user.email, sub: user.id, role: user.role };
    const token = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '30d' });

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        phone: user.phone || undefined,
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      token,
      refreshToken,
    };
  }

  async refreshToken(userId: string): Promise<{ token: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid user');
    }

    const payload = { email: user.email, sub: user.id, role: user.role };
    const token = this.jwtService.sign(payload);

    return { token };
  }
}
