import { IsObject, IsOptional, IsString } from 'class-validator';

export class CreateLogDto {
  @IsString()
  level: string;

  @IsString()
  message: string;

  @IsOptional()
  @IsObject()
  meta?: Record<string, any>;

  @IsOptional()
  @IsString()
  userId?: string;
}
