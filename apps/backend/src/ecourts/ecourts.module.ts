import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EcourtsController } from './ecourts.controller';
import { EcourtsService } from './ecourts.service';
import { CacheService } from './services/cache.service';
import { CaseScraperService } from './services/case-scraper.service';
import { CourtScraperService } from './services/court-scraper.service';
import { RateLimiterService } from './services/rate-limiter.service';

@Module({
  imports: [ConfigModule],
  controllers: [EcourtsController],
  providers: [
    EcourtsService,
    CaseScraperService,
    CourtScraperService,
    CacheService,
    RateLimiterService,
  ],
  exports: [EcourtsService],
})
export class EcourtsModule {}
