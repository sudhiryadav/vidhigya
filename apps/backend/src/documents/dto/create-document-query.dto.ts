import {
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export enum QueryType {
  GENERAL = 'GENERAL',
  CASE_SPECIFIC = 'CASE_SPECIFIC',
  DOCUMENT_ANALYSIS = 'DOCUMENT_ANALYSIS',
  LEGAL_RESEARCH = 'LEGAL_RESEARCH',
  DRAFT_GENERATION = 'DRAFT_GENERATION',
  SUMMARY_REQUEST = 'SUMMARY_REQUEST',
}

export class CreateDocumentQueryDto {
  @IsString()
  question: string;

  @IsString()
  answer: string;

  @IsOptional()
  @IsString()
  caseId?: string;

  @IsOptional()
  @IsArray()
  sources?: any[];

  @IsOptional()
  @IsEnum(QueryType)
  queryType?: QueryType;

  @IsOptional()
  @IsNumber()
  responseTime?: number;

  @IsOptional()
  @IsNumber()
  tokensUsed?: number;
}
