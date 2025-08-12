import { Module } from '@nestjs/common';
import { ConversationContextService } from './services/conversation-context.service';

@Module({
  providers: [ConversationContextService],
  exports: [ConversationContextService],
})
export class CommonModule {}
