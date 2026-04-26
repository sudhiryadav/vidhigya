import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PracticeType, UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import {
  DEFAULT_PLAN_BY_PRACTICE_TYPE,
  DEFAULT_SEAT_LIMIT_BY_PLAN,
  getPracticePlanKey,
  getPracticeSeatLimitKey,
  isInternalOnlyRole,
  isPublicSignupRole,
} from '../common/policies/account-policy';
import { PrismaService } from '../prisma/prisma.service';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  role: UserRole;
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
    private configService: ConfigService,
  ) {}

  private createAccessToken(user: {
    id: string;
    email: string;
    role: string;
  }): string {
    return this.jwtService.sign({
      email: user.email,
      sub: user.id,
      role: user.role,
      type: 'access',
    });
  }

  private createRefreshToken(user: {
    id: string;
    email: string;
    role: string;
  }): string {
    return this.jwtService.sign(
      {
        email: user.email,
        sub: user.id,
        role: user.role,
        type: 'refresh',
      },
      { expiresIn: '30d' },
    );
  }

  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (user && (await bcrypt.compare(password, user.password))) {
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

    const token = this.createAccessToken(user);
    const refreshToken = this.createRefreshToken(user);

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
    if (isInternalOnlyRole(registerRequest.role)) {
      throw new BadRequestException(
        'This role cannot be created via public registration',
      );
    }

    if (!isPublicSignupRole(registerRequest.role)) {
      throw new BadRequestException(
        'Public registration is only available for individual lawyers and firm admins',
      );
    }

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
    if (
      registerRequest.role === UserRole.LAWYER ||
      registerRequest.role === UserRole.ADMIN
    ) {
      const practiceName =
        registerRequest.practiceName || `${user.name}'s Practice`;
      const practiceType =
        registerRequest.businessType === 'firm' ? 'FIRM' : 'INDIVIDUAL';

      const practice = await this.prisma.practice.create({
        data: {
          name: practiceName,
          description: `${practiceType.toLowerCase()} practice for ${user.name}`,
          practiceType: practiceType as PracticeType,
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

      const defaultPlan =
        DEFAULT_PLAN_BY_PRACTICE_TYPE[practiceType as PracticeType];
      const defaultSeatLimit = DEFAULT_SEAT_LIMIT_BY_PLAN[defaultPlan];
      await this.prisma.systemSettings.upsert({
        where: { key: getPracticePlanKey(practice.id) },
        create: {
          key: getPracticePlanKey(practice.id),
          value: defaultPlan,
          description: `Subscription plan for practice ${practice.id}`,
          category: 'subscription',
          isActive: true,
        },
        update: { value: defaultPlan, isActive: true },
      });
      await this.prisma.systemSettings.upsert({
        where: { key: getPracticeSeatLimitKey(practice.id) },
        create: {
          key: getPracticeSeatLimitKey(practice.id),
          value: String(defaultSeatLimit),
          description: `Seat limit for practice ${practice.id}`,
          category: 'subscription',
          isActive: true,
        },
        update: { value: String(defaultSeatLimit), isActive: true },
      });
    }

    const token = this.createAccessToken(user);
    const refreshToken = this.createRefreshToken(user);

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

  async refreshAccessToken(
    refreshToken: string,
  ): Promise<{ token: string; refreshToken: string }> {
    const payload = this.jwtService.verify<{
      sub: string;
      type?: string;
      email: string;
      role: string;
    }>(refreshToken);

    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid user');
    }

    return {
      token: this.createAccessToken(user),
      refreshToken: this.createRefreshToken(user),
    };
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Don't reveal if user exists or not for security
      return {
        message:
          'If an account with that email exists, a password reset link has been sent.',
      };
    }

    if (!user.isActive) {
      throw new BadRequestException('Account is deactivated');
    }

    // Generate reset token (valid for 1 hour)
    const resetToken = this.jwtService.sign(
      { email: user.email, sub: user.id, type: 'password_reset' },
      { expiresIn: '1h' },
    );

    // Store reset token in user record (you might want to add a resetToken field to your User model)
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        // For now, we'll use a simple approach
        // In production, you'd want to add a resetToken field to your User model
        // and store the hashed token with an expiration
      },
    });

    const resetLink = `${this.configService.get('FRONTEND_URL', 'http://localhost:3000')}/reset-password?token=${resetToken}`;
    const response: {
      message: 'If an account with that email exists, a password reset link has been sent.';
      resetLink?: string;
    } = {
      message:
        'If an account with that email exists, a password reset link has been sent.',
    };

    if (this.configService.get('EXPOSE_PASSWORD_RESET_LINKS') === 'true') {
      response.resetLink = resetLink;
    }

    return response;
  }

  async resetPassword(token: string, newPassword: string) {
    try {
      const payload = this.jwtService.verify<{
        sub: string;
        type?: string;
      }>(token);

      if (payload.type !== 'password_reset') {
        throw new BadRequestException('Invalid reset token');
      }

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      if (!user.isActive) {
        throw new BadRequestException('Account is deactivated');
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update password
      await this.prisma.user.update({
        where: { id: user.id },
        data: { password: hashedPassword },
      });

      return { message: 'Password reset successfully' };
    } catch (error) {
      if (error instanceof Error && error.name === 'TokenExpiredError') {
        throw new BadRequestException('Reset token has expired');
      }
      if (error instanceof Error && error.name === 'JsonWebTokenError') {
        throw new BadRequestException('Invalid reset token');
      }
      throw error;
    }
  }
}
