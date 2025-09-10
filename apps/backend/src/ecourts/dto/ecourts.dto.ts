import { Type } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { CaseStatus, CourtType } from '../interfaces/ecourts.interface';

export class SearchCasesDto {
  @IsOptional()
  @IsString()
  caseNumber?: string;

  @IsOptional()
  @IsString()
  partyName?: string;

  @IsOptional()
  @IsString()
  advocateName?: string;

  @IsOptional()
  @IsString()
  courtId?: string;

  @IsOptional()
  @IsString()
  caseType?: string;

  @IsOptional()
  @IsString()
  filingDateFrom?: string;

  @IsOptional()
  @IsString()
  filingDateTo?: string;

  @IsOptional()
  @IsEnum(CaseStatus)
  status?: CaseStatus;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  offset?: number = 0;
}

export class GetCaseDetailsDto {
  @IsString()
  caseNumber: string;

  @IsOptional()
  @IsString()
  courtId?: string;
}

export class SearchCourtsDto {
  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  district?: string;

  @IsOptional()
  @IsEnum(CourtType)
  courtType?: CourtType;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  offset?: number = 0;
}

export class GetCourtDetailsDto {
  @IsString()
  courtId: string;
}

export class SearchJudgesDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  courtId?: string;

  @IsOptional()
  @IsString()
  designation?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  offset?: number = 0;
}

export class GetJudgeDetailsDto {
  @IsString()
  judgeId: string;
}
