export interface ChatParticipantDto {
  id: string;
  name: string;
  role: string;
  isOnline: boolean;
}

export interface ChatMessageDto {
  id: string;
  content: string;
  senderId: string;
  senderName: string;
  type: string;
  isRead: boolean;
  createdAt: Date;
}

export interface ChatDto {
  id: string;
  participants: ChatParticipantDto[];
  lastMessage?: ChatMessageDto;
  unreadCount: number;
  caseId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatResponseDto {
  messages: ChatMessageDto[];
  participants: ChatParticipantDto[];
}
