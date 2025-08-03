import { IsEnum, IsNotEmpty, IsString } from 'class-validator';

export enum FeedbackType {
  POSITIVE = 'POSITIVE',
  NEGATIVE = 'NEGATIVE',
}

export class CreateFeedbackDto {
  @IsString()
  @IsNotEmpty()
  messageId: string;

  @IsEnum(FeedbackType)
  feedback: FeedbackType;

  @IsString()
  @IsNotEmpty()
  question: string;

  @IsString()
  @IsNotEmpty()
  answer: string;
}
