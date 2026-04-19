import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseFilePipe,
  Patch,
  Post,
  Request,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FileInterceptor } from '@nestjs/platform-express';
import { UserRole } from '@prisma/client';
import { Response } from 'express';
import sharp from 'sharp';
import { RedactingLogger } from '../common/logging';
import { MaxFileSizeValidator } from '../common/validators/max-file-size.validator';
import { S3Service } from '../config/s3.config';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';
import { Roles } from './decorators/roles.decorator';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { AuthenticatedRequest } from './types/authenticated-request.interface';

@Controller('auth')
export class AuthController {
  private readonly logger = new RedactingLogger(AuthController.name);

  constructor(
    private readonly authService: AuthService,
    private readonly prisma: PrismaService,
    private readonly s3Service: S3Service,
    private readonly configService: ConfigService,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: { email: string; password: string }) {
    return this.authService.login(loginDto);
  }

  @Post('register')
  async register(
    @Body()
    registerDto: {
      email: string;
      password: string;
      name: string;
      role: UserRole;
    },
  ) {
    return this.authService.register(registerDto);
  }

  @Post('forgot-password')
  async forgotPassword(@Body() data: { email: string }) {
    return this.authService.forgotPassword(data.email);
  }

  @Post('reset-password')
  async resetPassword(@Body() data: { token: string; newPassword: string }) {
    return this.authService.resetPassword(data.token, data.newPassword);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() data: { refreshToken: string }) {
    if (!data?.refreshToken) {
      throw new BadRequestException('Refresh token is required');
    }

    return this.authService.refreshAccessToken(data.refreshToken);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Get('users')
  async getAllUsers() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Get('users/:id')
  async getUser(@Param('id') id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        phone: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    return user;
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Patch('users/:id')
  async updateUser(
    @Param('id') id: string,
    @Body()
    data: {
      name?: string;
      email?: string;
      phone?: string;
      isActive?: boolean;
    },
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    return this.prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        phone: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Delete('users/:id')
  async deleteUser(@Param('id') id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    await this.prisma.user.delete({
      where: { id },
    });

    return { message: 'User deleted successfully' };
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  async getProfile(@Request() req: AuthenticatedRequest) {
    const user = await this.prisma.user.findUnique({
      where: { id: req.user.sub },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        phone: true,
        address: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    return user;
  }

  @UseGuards(JwtAuthGuard)
  @Get('avatar/:userId')
  async getAvatar(@Param('userId') userId: string, @Res() res: Response) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true },
      });

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      const userWithAvatar = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, avatarS3Key: true },
      });

      if (!userWithAvatar?.avatarS3Key) {
        return res.status(404).json({
          message: 'Avatar not found',
          error: 'NO_AVATAR',
          userId: userId,
        });
      }

      const s3Key = userWithAvatar.avatarS3Key;

      try {
        const avatarBuffer = await this.s3Service.getAvatarAsBuffer(s3Key);

        const extension = s3Key.split('.').pop()?.toLowerCase();
        const contentType =
          extension === 'png'
            ? 'image/png'
            : extension === 'gif'
              ? 'image/gif'
              : 'image/jpeg';

        res.set({
          'Content-Type': contentType,
          'Content-Length': avatarBuffer.length.toString(),
          'Cache-Control': 'public, max-age=3600',
        });

        return res.send(avatarBuffer);
      } catch (error) {
        if (
          error &&
          typeof error === 'object' &&
          'name' in error &&
          (error as { name: string }).name === 'NoSuchKey'
        ) {
          return res.status(404).json({
            message: 'Avatar not found',
            error: 'NO_AVATAR',
            userId: userId,
          });
        }
        this.logger.error('Unexpected avatar storage error', error);
        return res.status(500).json({ message: 'Error accessing avatar' });
      }
    } catch (error) {
      this.logger.error('Error fetching avatar:', error);
      return res.status(500).json({ message: 'Error accessing avatar' });
    }
  }

  @UseGuards(JwtAuthGuard)
  @Post('upload-avatar')
  @UseInterceptors(
    FileInterceptor('avatar', {
      storage: undefined, // No disk storage, we'll handle the file in memory
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
      },
    }),
  )
  async uploadAvatar(
    @Request() req: AuthenticatedRequest,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({
            maxSize: 5 * 1024 * 1024, // 5MB limit
          }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    // Custom file type validation
    const allowedMimeTypes = ['image/png', 'image/jpeg', 'image/jpg'];
    const allowedExtensions = ['.png', '.jpeg', '.jpg'];

    const isValidMimeType = allowedMimeTypes.includes(file.mimetype);
    const isValidExtension = allowedExtensions.some((ext) =>
      file.originalname.toLowerCase().endsWith(ext),
    );

    if (!isValidMimeType && !isValidExtension) {
      throw new BadRequestException(
        `Invalid file type. Allowed types: ${allowedMimeTypes.join(', ')}`,
      );
    }

    // Validate file size using environment variable
    const maxSize = parseInt(
      this.configService.get<string>('MAX_AVATAR_SIZE') || '5242880',
    );
    if (file.size > maxSize) {
      throw new BadRequestException(
        `File size ${file.size} bytes exceeds maximum allowed size of ${maxSize} bytes (${Math.round(maxSize / 1024 / 1024)}MB)`,
      );
    }

    try {
      const currentUser = await this.prisma.user.findUnique({
        where: { id: req.user.sub },
        select: { id: true },
      });

      if (!currentUser) {
        throw new BadRequestException('User not found');
      }

      const optimizedImageBuffer = await sharp(file.buffer)
        .resize(200, 200, {
          fit: 'cover',
          position: 'center',
        })
        .jpeg({
          quality: 80,
          progressive: true,
        })
        .toBuffer();

      const currentUserWithAvatar = await this.prisma.user.findUnique({
        where: { id: req.user.sub },
        select: { id: true, avatarS3Key: true },
      });

      const originalExtension =
        file.originalname.split('.').pop()?.toLowerCase() || 'jpg';
      const s3Key = `avatars/${req.user.sub}.${originalExtension}`;

      await this.s3Service.uploadAvatar(
        optimizedImageBuffer,
        s3Key,
        'image/jpeg',
      );

      await this.prisma.user.update({
        where: { id: req.user.sub },
        data: { avatarS3Key: s3Key },
      });

      if (
        currentUserWithAvatar?.avatarS3Key &&
        currentUserWithAvatar.avatarS3Key !== s3Key
      ) {
        try {
          await this.s3Service.deleteAvatar(currentUserWithAvatar.avatarS3Key);
        } catch {
          // Ignore error if old avatar doesn't exist.
        }
      }

      return {
        message: 'Avatar uploaded successfully',
        avatar: s3Key,
        size: optimizedImageBuffer.length,
        originalSize: file.size,
      };
    } catch (error) {
      this.logger.error('Error processing avatar:', error);
      throw new BadRequestException('Failed to process avatar image');
    }
  }

  @UseGuards(JwtAuthGuard)
  @Delete('avatar')
  async removeAvatar(@Request() req: AuthenticatedRequest) {
    try {
      const currentUser = await this.prisma.user.findUnique({
        where: { id: req.user.sub },
        select: { id: true, avatarS3Key: true },
      });

      if (!currentUser) {
        throw new BadRequestException('User not found');
      }

      if (!currentUser.avatarS3Key) {
        return { message: 'No avatar to remove' };
      }

      try {
        await this.s3Service.deleteAvatar(currentUser.avatarS3Key);
      } catch {
        // Continue even if S3 deletion fails.
      }

      await this.prisma.user.update({
        where: { id: req.user.sub },
        data: { avatarS3Key: null },
      });

      return { message: 'Avatar removed successfully' };
    } catch {
      this.logger.error('Error removing avatar');
      throw new BadRequestException('Failed to remove avatar');
    }
  }
}
