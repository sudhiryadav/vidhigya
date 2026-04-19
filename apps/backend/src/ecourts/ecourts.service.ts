import { BadRequestException, Injectable } from '@nestjs/common';
import { RedactingLogger } from '../common/logging';
import {
  APIResponse,
  GetCaseDetailsRequest,
  GetCaseDetailsResponse,
  SearchCasesRequest,
  SearchCasesResponse,
  SearchCourtsRequest,
  SearchCourtsResponse,
} from './interfaces/ecourts.interface';
import { CacheService } from './services/cache.service';
import { CaseScraperService } from './services/case-scraper.service';
import { CourtScraperService } from './services/court-scraper.service';
import { RateLimiterService } from './services/rate-limiter.service';

@Injectable()
export class EcourtsService {
  private readonly logger = new RedactingLogger(EcourtsService.name);

  constructor(
    private caseScraperService: CaseScraperService,
    private courtScraperService: CourtScraperService,
    private cacheService: CacheService,
    private rateLimiterService: RateLimiterService,
  ) {}

  async searchCases(
    request: SearchCasesRequest,
    clientIp: string,
  ): Promise<APIResponse<SearchCasesResponse>> {
    // Rate limiting
    const rateLimitResult = await this.rateLimiterService.checkLimit(clientIp);
    if (!rateLimitResult.allowed) {
      throw new BadRequestException(
        'Rate limit exceeded. Please try again later.',
      );
    }

    // Check cache first
    const cacheKey = this.cacheService.generateSearchKey(
      'cases',
      JSON.stringify(request),
      request,
    );
    const cachedResult =
      await this.cacheService.get<SearchCasesResponse>(cacheKey);
    if (cachedResult) {
      return {
        success: true,
        data: cachedResult,
        timestamp: new Date().toISOString(),
      };
    }

    // Search cases using scraper
    const results: any[] = [];

    // If case number is provided, search for specific case
    if (request.caseNumber) {
      try {
        const result = await this.caseScraperService.scrape(
          request.caseNumber,
          request.courtId,
        );
        results.push(result.data);
      } catch (_error) {
        // If specific case not found, continue with empty results
        this.logger.warn('Case not found:', request.caseNumber);
      }
    } else {
      // For other search criteria, we would need to implement a different scraping approach
      // This is a placeholder for future implementation
      throw new BadRequestException(
        'Search by party name, advocate name, or other criteria not yet implemented',
      );
    }

    // Apply pagination
    const total = results.length;
    const paginatedResults = results.slice(
      request.offset || 0,
      (request.offset || 0) + (request.limit || 20),
    );

    const response: SearchCasesResponse = {
      cases: paginatedResults,
      total,
      page: Math.floor((request.offset || 0) / (request.limit || 20)) + 1,
      limit: request.limit || 20,
      hasMore: (request.offset || 0) + (request.limit || 20) < total,
    };

    // Cache the result
    await this.cacheService.set(cacheKey, response, 1800); // 30 minutes

    return {
      success: true,
      data: response,
      timestamp: new Date().toISOString(),
    };
  }

  async getCaseDetails(
    request: GetCaseDetailsRequest,
    clientIp: string,
  ): Promise<APIResponse<GetCaseDetailsResponse>> {
    // Rate limiting
    const rateLimitResult = await this.rateLimiterService.checkLimit(clientIp);
    if (!rateLimitResult.allowed) {
      throw new BadRequestException(
        'Rate limit exceeded. Please try again later.',
      );
    }

    // Check cache first
    const cacheKey = this.cacheService.generateCaseKey(
      request.caseNumber,
      request.courtId,
    );
    const cachedResult =
      await this.cacheService.get<GetCaseDetailsResponse>(cacheKey);
    if (cachedResult) {
      return {
        success: true,
        data: cachedResult,
        timestamp: new Date().toISOString(),
      };
    }

    // Scrape case details
    const result = await this.caseScraperService.scrape(
      request.caseNumber,
      request.courtId,
    );

    // For now, we'll return basic case data
    // In a full implementation, we would also scrape hearings and orders
    const response: GetCaseDetailsResponse = {
      case: result.data,
      hearings: [], // TODO: Implement hearing scraper
      orders: [], // TODO: Implement order scraper
    };

    // Cache the result
    await this.cacheService.set(cacheKey, response, 1800); // 30 minutes

    return {
      success: true,
      data: response,
      timestamp: new Date().toISOString(),
    };
  }

  async searchCourts(
    request: SearchCourtsRequest,
    clientIp: string,
  ): Promise<APIResponse<SearchCourtsResponse>> {
    // Rate limiting
    const rateLimitResult = await this.rateLimiterService.checkLimit(clientIp);
    if (!rateLimitResult.allowed) {
      throw new BadRequestException(
        'Rate limit exceeded. Please try again later.',
      );
    }

    // Check cache first
    const cacheKey = this.cacheService.generateSearchKey(
      'courts',
      JSON.stringify(request),
      request,
    );
    const cachedResult =
      await this.cacheService.get<SearchCourtsResponse>(cacheKey);
    if (cachedResult) {
      return {
        success: true,
        data: cachedResult,
        timestamp: new Date().toISOString(),
      };
    }

    // Search courts using scraper
    const result = await this.courtScraperService.scrape(
      request.state,
      request.district,
      request.courtType,
    );

    // Apply pagination
    const total = result.data.length;
    const paginatedResults = result.data.slice(
      request.offset || 0,
      (request.offset || 0) + (request.limit || 20),
    );

    const response: SearchCourtsResponse = {
      courts: paginatedResults,
      total,
      page: Math.floor((request.offset || 0) / (request.limit || 20)) + 1,
      limit: request.limit || 20,
      hasMore: (request.offset || 0) + (request.limit || 20) < total,
    };

    // Cache the result
    await this.cacheService.set(cacheKey, response, 86400); // 24 hours

    return {
      success: true,
      data: response,
      timestamp: new Date().toISOString(),
    };
  }

  async getCourtDetails(
    courtId: string,
    clientIp: string,
  ): Promise<APIResponse<any>> {
    // Rate limiting
    const rateLimitResult = await this.rateLimiterService.checkLimit(clientIp);
    if (!rateLimitResult.allowed) {
      throw new BadRequestException(
        'Rate limit exceeded. Please try again later.',
      );
    }

    // Check cache first
    const cacheKey = this.cacheService.generateCourtKey(courtId);
    const cachedResult = await this.cacheService.get<any>(cacheKey);
    if (cachedResult) {
      return {
        success: true,
        data: cachedResult,
        timestamp: new Date().toISOString(),
      };
    }

    // For now, we'll return a mock court object
    // In a full implementation, we would scrape court details from eCourts
    const mockCourt = {
      id: courtId,
      name: 'Sample Court',
      state: 'Unknown',
      district: 'Unknown',
      type: 'DISTRICT_COURT',
      address: 'Address not available',
      phone: undefined,
      email: undefined,
      website: undefined,
    };

    // Cache the result
    await this.cacheService.set(cacheKey, mockCourt, 86400); // 24 hours

    return {
      success: true,
      data: mockCourt,
      timestamp: new Date().toISOString(),
    };
  }

  async getHealthStatus(): Promise<APIResponse<any>> {
    try {
      // Check cache service
      const cacheStatus = await this.cacheService.exists('health_check');
      await this.cacheService.set('health_check', 'ok', 60);

      // Check rate limiter
      const rateLimitStatus =
        await this.rateLimiterService.getRemainingPoints('health_check');

      const healthData = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: {
          cache: cacheStatus ? 'connected' : 'disconnected',
          rateLimiter: rateLimitStatus > 0 ? 'active' : 'inactive',
        },
        version: '1.0.0',
      };

      return {
        success: true,
        data: healthData,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const healthData = {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        services: {
          cache: 'error',
          rateLimiter: 'error',
        },
        version: '1.0.0',
        error: error instanceof Error ? error.message : 'Unknown error',
      };

      return {
        success: false,
        data: healthData,
        timestamp: new Date().toISOString(),
      };
    }
  }
}
