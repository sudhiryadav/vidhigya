import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  GetCaseDetailsDto,
  SearchCasesDto,
  SearchCourtsDto,
} from './dto/ecourts.dto';
import { EcourtsService } from './ecourts.service';

@Controller('ecourts')
@UseGuards(JwtAuthGuard)
export class EcourtsController {
  constructor(private readonly ecourtsService: EcourtsService) {}

  @Get('cases/search')
  async searchCases(@Query() query: SearchCasesDto, @Req() req: Request) {
    try {
      const clientIp = req.ip || req.headers['x-forwarded-for'] || 'unknown';
      return await this.ecourtsService.searchCases(query, clientIp as string);
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          error: {
            code: 'SEARCH_CASES_ERROR',
            message: error.message || 'Failed to search cases',
            timestamp: new Date().toISOString(),
          },
          timestamp: new Date().toISOString(),
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('cases/search')
  async searchCasesPost(@Body() body: SearchCasesDto, @Req() req: Request) {
    try {
      const clientIp = req.ip || req.headers['x-forwarded-for'] || 'unknown';
      return await this.ecourtsService.searchCases(body, clientIp as string);
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          error: {
            code: 'SEARCH_CASES_ERROR',
            message: error.message || 'Failed to search cases',
            timestamp: new Date().toISOString(),
          },
          timestamp: new Date().toISOString(),
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('cases/:caseNumber')
  async getCaseDetails(
    @Param('caseNumber') caseNumber: string,
    @Query() query: Omit<GetCaseDetailsDto, 'caseNumber'>,
    @Req() req: Request,
  ) {
    try {
      const clientIp = req.ip || req.headers['x-forwarded-for'] || 'unknown';
      const request: GetCaseDetailsDto = {
        caseNumber,
        ...query,
      };
      return await this.ecourtsService.getCaseDetails(
        request,
        clientIp as string,
      );
    } catch (error) {
      if (error.message?.includes('not found')) {
        throw new HttpException(
          {
            success: false,
            error: {
              code: 'CASE_NOT_FOUND',
              message: `Case not found: ${caseNumber}`,
              timestamp: new Date().toISOString(),
            },
            timestamp: new Date().toISOString(),
          },
          HttpStatus.NOT_FOUND,
        );
      }

      throw new HttpException(
        {
          success: false,
          error: {
            code: 'GET_CASE_DETAILS_ERROR',
            message: error.message || 'Failed to get case details',
            timestamp: new Date().toISOString(),
          },
          timestamp: new Date().toISOString(),
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('courts/search')
  async searchCourts(@Query() query: SearchCourtsDto, @Req() req: Request) {
    try {
      const clientIp = req.ip || req.headers['x-forwarded-for'] || 'unknown';
      return await this.ecourtsService.searchCourts(query, clientIp as string);
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          error: {
            code: 'SEARCH_COURTS_ERROR',
            message: error.message || 'Failed to search courts',
            timestamp: new Date().toISOString(),
          },
          timestamp: new Date().toISOString(),
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('courts/search')
  async searchCourtsPost(@Body() body: SearchCourtsDto, @Req() req: Request) {
    try {
      const clientIp = req.ip || req.headers['x-forwarded-for'] || 'unknown';
      return await this.ecourtsService.searchCourts(body, clientIp as string);
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          error: {
            code: 'SEARCH_COURTS_ERROR',
            message: error.message || 'Failed to search courts',
            timestamp: new Date().toISOString(),
          },
          timestamp: new Date().toISOString(),
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('courts/:courtId')
  async getCourtDetails(
    @Param('courtId') courtId: string,
    @Req() req: Request,
  ) {
    try {
      const clientIp = req.ip || req.headers['x-forwarded-for'] || 'unknown';
      return await this.ecourtsService.getCourtDetails(
        courtId,
        clientIp as string,
      );
    } catch (error) {
      if (error.message?.includes('not found')) {
        throw new HttpException(
          {
            success: false,
            error: {
              code: 'COURT_NOT_FOUND',
              message: `Court not found: ${courtId}`,
              timestamp: new Date().toISOString(),
            },
            timestamp: new Date().toISOString(),
          },
          HttpStatus.NOT_FOUND,
        );
      }

      throw new HttpException(
        {
          success: false,
          error: {
            code: 'GET_COURT_DETAILS_ERROR',
            message: error.message || 'Failed to get court details',
            timestamp: new Date().toISOString(),
          },
          timestamp: new Date().toISOString(),
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('health')
  async getHealthStatus() {
    try {
      return await this.ecourtsService.getHealthStatus();
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          error: {
            code: 'HEALTH_CHECK_ERROR',
            message: error.message || 'Health check failed',
            timestamp: new Date().toISOString(),
          },
          timestamp: new Date().toISOString(),
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
