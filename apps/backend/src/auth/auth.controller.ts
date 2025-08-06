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
import { MaxFileSizeValidator } from '../common/validators/max-file-size.validator';
import { S3Service } from '../config/s3.config';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';
import { Roles } from './decorators/roles.decorator';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';

interface AuthenticatedRequest extends Request {
  user: {
    sub: string;
    email: string;
    role: UserRole;
  };
}

@Controller('auth')
export class AuthController {
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
      console.log(`Fetching avatar for user: ${userId}`);

      // Check if user exists
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true },
      });

      if (!user) {
        console.log(`User not found: ${userId}`);
        return res.status(404).json({ message: 'User not found' });
      }

      console.log(`User found: ${userId}`);

      // Get the S3 key from the database
      const userWithAvatar = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, avatarS3Key: true },
      });

      if (!userWithAvatar?.avatarS3Key) {
        console.log(`No avatar S3 key found for user ${userId}`);
        return res.status(404).json({
          message: 'Avatar not found',
          error: 'NO_AVATAR',
          userId: userId,
        });
      }

      const s3Key = userWithAvatar.avatarS3Key;
      console.log(`Found S3 key in database: ${s3Key}`);

      try {
        // Get avatar as buffer using the stored S3 key
        console.log(`Fetching avatar from S3 with key: ${s3Key}`);
        const avatarBuffer = await this.s3Service.getAvatarAsBuffer(s3Key);

        console.log(
          `Retrieved avatar buffer, size: ${avatarBuffer.length} bytes`,
        );

        // Determine content type from file extension
        const extension = s3Key.split('.').pop()?.toLowerCase();
        const contentType =
          extension === 'png'
            ? 'image/png'
            : extension === 'gif'
              ? 'image/gif'
              : 'image/jpeg';

        // Set appropriate headers for image response
        res.set({
          'Content-Type': contentType,
          'Content-Length': avatarBuffer.length.toString(),
          'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
        });

        // Send the buffer as response
        return res.send(avatarBuffer);
      } catch (error) {
        console.log(`S3 Error for user ${userId}:`, error);
        if (
          error &&
          typeof error === 'object' &&
          'name' in error &&
          error.name === 'NoSuchKey'
        ) {
          console.log(`Avatar file not found in S3 for user ${userId}`);
          return res.status(404).json({
            message: 'Avatar not found',
            error: 'NO_AVATAR',
            userId: userId,
          });
        }
        console.error(`Unexpected S3 error for user ${userId}:`, error);
        return res.status(500).json({ message: 'Error accessing avatar' });
      }
    } catch (error) {
      console.error('Error fetching avatar:', error);
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
      console.log(`Starting avatar upload for user: ${req.user.sub}`);

      // Check if user exists
      const currentUser = await this.prisma.user.findUnique({
        where: { id: req.user.sub },
        select: { id: true },
      });

      if (!currentUser) {
        throw new BadRequestException('User not found');
      }

      // Optimize and resize the image
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

      console.log(
        `Image optimized, size: ${optimizedImageBuffer.length} bytes`,
      );

      // Get the old avatar S3 key from database before updating
      const currentUserWithAvatar = await this.prisma.user.findUnique({
        where: { id: req.user.sub },
        select: { id: true, avatarS3Key: true },
      });

      // Generate S3 key based on user ID with original extension
      const originalExtension =
        file.originalname.split('.').pop()?.toLowerCase() || 'jpg';
      const s3Key = `avatars/${req.user.sub}.${originalExtension}`;

      // Upload new avatar to S3
      await this.s3Service.uploadAvatar(
        optimizedImageBuffer,
        s3Key,
        'image/jpeg',
      );

      console.log(`Uploaded to S3, avatar key: ${s3Key}`);

      // Store the S3 key in the database
      await this.prisma.user.update({
        where: { id: req.user.sub },
        data: { avatarS3Key: s3Key },
      });

      console.log(`Stored S3 key in database: ${s3Key}`);

      // Delete old avatar from S3 if it exists and is different from the new one
      if (
        currentUserWithAvatar?.avatarS3Key &&
        currentUserWithAvatar.avatarS3Key !== s3Key
      ) {
        try {
          await this.s3Service.deleteAvatar(currentUserWithAvatar.avatarS3Key);
          console.log(
            `Deleted old avatar: ${currentUserWithAvatar.avatarS3Key}`,
          );
        } catch {
          // Ignore error if old avatar doesn't exist
          console.log('No old avatar to delete');
        }
      }

      return {
        message: 'Avatar uploaded successfully',
        avatar: s3Key,
        size: optimizedImageBuffer.length,
        originalSize: file.size,
      };
    } catch (error) {
      console.error('Error processing avatar:', error);
      throw new BadRequestException('Failed to process avatar image');
    }
  }

  @UseGuards(JwtAuthGuard)
  @Delete('avatar')
  async removeAvatar(@Request() req: AuthenticatedRequest) {
    try {
      console.log(`Removing avatar for user: ${req.user.sub}`);

      // Get current user with avatar S3 key
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

      // Delete avatar from S3
      try {
        await this.s3Service.deleteAvatar(currentUser.avatarS3Key);
        console.log(`Deleted avatar from S3: ${currentUser.avatarS3Key}`);
      } catch (error) {
        console.log(`Avatar not found in S3: ${currentUser.avatarS3Key}`);
        // Continue even if S3 deletion fails
      }

      // Remove S3 key from database
      await this.prisma.user.update({
        where: { id: req.user.sub },
        data: { avatarS3Key: null },
      });

      console.log(
        `Removed avatar S3 key from database for user: ${req.user.sub}`,
      );

      return { message: 'Avatar removed successfully' };
    } catch (error) {
      console.error('Error removing avatar:', error);
      throw new BadRequestException('Failed to remove avatar');
    }
  }
}
