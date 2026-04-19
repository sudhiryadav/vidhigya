import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { RedactingLogger } from '../common/logging';
import { ChatService } from './chat.service';
import { ChatDto, ChatParticipantDto, ChatResponseDto } from './dto/chat.dto';

interface AuthenticatedRequest {
  user: {
    sub: string;
    email: string;
    role: string;
  };
}

@Controller('chats')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ChatController {
  private readonly logger = new RedactingLogger(ChatController.name);

  constructor(private readonly chatService: ChatService) {}

  @Get('associated-users')
  @Roles('LAWYER', 'ASSOCIATE', 'PARALEGAL', 'CLIENT')
  async getAssociatedUsers(
    @Request() req: AuthenticatedRequest,
  ): Promise<ChatParticipantDto[]> {
    return this.chatService.getAssociatedUsers(req.user.sub);
  }

  @Get()
  @Roles('LAWYER', 'ASSOCIATE', 'PARALEGAL', 'CLIENT')
  async getChats(@Request() req: AuthenticatedRequest): Promise<ChatDto[]> {
    return this.chatService.getUserChats(req.user.sub);
  }

  @Get(':id')
  @Roles('LAWYER', 'ASSOCIATE', 'PARALEGAL', 'CLIENT')
  async getChat(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<ChatResponseDto> {
    return this.chatService.getChat(id, req.user.sub);
  }

  @Post()
  @Roles('LAWYER', 'ASSOCIATE', 'PARALEGAL', 'CLIENT')
  async createChat(
    @Body() data: { participantId: string; caseId?: string },
    @Request() req: AuthenticatedRequest,
  ): Promise<ChatDto> {
    return this.chatService.createChat(
      req.user.sub,
      data.participantId,
      data.caseId,
    );
  }

  @Post(':id/messages')
  @Roles('LAWYER', 'ASSOCIATE', 'PARALEGAL', 'CLIENT')
  async sendMessage(
    @Param('id') chatId: string,
    @Body() data: { content: string; type?: string },
    @Request() req: AuthenticatedRequest,
  ): Promise<any> {
    return this.chatService.sendMessage(
      chatId,
      req.user.sub,
      data.content,
      data.type,
    );
  }

  @Patch(':id/read')
  @Roles('LAWYER', 'ASSOCIATE', 'PARALEGAL', 'CLIENT')
  async markAsRead(
    @Param('id') chatId: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<{ success: boolean; message: string }> {
    try {
      await this.chatService.markChatAsRead(chatId, req.user.sub);
      return { success: true, message: 'Chat marked as read successfully' };
    } catch (error) {
      this.logger.error(`Error marking chat ${chatId} as read:`, error);
      throw error;
    }
  }

  @Delete(':id')
  @Roles('LAWYER', 'ASSOCIATE', 'PARALEGAL', 'CLIENT')
  async deleteChat(
    @Param('id') chatId: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<void> {
    return this.chatService.deleteChat(chatId, req.user.sub);
  }

  @Post('start-chat/:userId')
  @Roles('LAWYER', 'ASSOCIATE', 'PARALEGAL', 'CLIENT')
  async startChatWithUser(
    @Param('userId') associatedUserId: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<ChatDto> {
    return this.chatService.createChatWithAssociatedUser(
      req.user.sub,
      associatedUserId,
    );
  }
}
