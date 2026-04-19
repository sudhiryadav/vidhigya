import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Page } from 'puppeteer';
import {
  Court,
  CourtType,
  ScrapingResult,
} from '../interfaces/ecourts.interface';
import { BaseScraperService } from './base-scraper.service';

@Injectable()
export class CourtScraperService extends BaseScraperService<Court[]> {
  constructor(configService: ConfigService) {
    super(configService);
  }

  async scrape(
    state?: string,
    district?: string,
    courtType?: CourtType,
  ): Promise<ScrapingResult<Court[]>> {
    const cacheKey = this.generateCacheKey(
      'courts',
      state || 'all',
      district || 'all',
      courtType || 'all',
    );

    return this.retryOperation(async () => {
      const page = await this.createPage();

      try {
        // Navigate to court directory page
        const directoryUrl = `${this.config.baseUrl}/ecourts_home/court_directory/`;
        await this.navigateToPage(page, directoryUrl);

        // Filter courts if parameters provided
        if (state || district || courtType) {
          await this.filterCourts(page, state, district, courtType);
        }

        // Parse court data
        const courts = await this.parseData(page);

        // Validate data
        if (!this.validateData(courts)) {
          throw new Error('Invalid court data received');
        }

        return this.createScrapingResult(courts, directoryUrl, cacheKey);
      } finally {
        await page.close();
      }
    });
  }

  private async filterCourts(
    page: Page,
    state?: string,
    district?: string,
    courtType?: CourtType,
  ): Promise<void> {
    try {
      // Select state if provided
      if (state) {
        await page.select('select[name="state"]', state);
        await page.waitForTimeout(1000); // Wait for district dropdown to populate
      }

      // Select district if provided
      if (district) {
        await page.select('select[name="district"]', district);
        await page.waitForTimeout(1000); // Wait for court type dropdown to populate
      }

      // Select court type if provided
      if (courtType) {
        await page.select('select[name="court_type"]', courtType);
      }

      // Click search button
      await page.click('input[type="submit"][value="Search"]');

      // Wait for results to load
      await this.waitForElement(page, '.court-list, .no-results', 15000);
    } catch (error) {
      throw new Error(`Failed to filter courts: ${error}`);
    }
  }

  protected async parseData(page: Page): Promise<Court[]> {
    try {
      // Check if courts were found
      const noResults = await page.$('.no-results');
      if (noResults) {
        return [];
      }

      // Extract court list
      const courtElements = await page.$$('.court-item');
      const courts: Court[] = [];

      for (const element of courtElements) {
        try {
          const court = await this.parseCourtElement(page, element);
          if (court) {
            courts.push(court);
          }
        } catch (error) {
          this.logger.warn('Failed to parse court element:', error);
        }
      }

      return courts;
    } catch (error) {
      throw new Error(`Failed to parse court data: ${error}`);
    }
  }

  private async parseCourtElement(
    page: Page,
    element: any,
  ): Promise<Court | null> {
    try {
      const id = await page.evaluate(
        (el) => el.getAttribute('data-court-id') || '',
        element,
      );
      const name = await page.evaluate(
        (el) => el.querySelector('.court-name')?.textContent?.trim() || '',
        element,
      );
      const state = await page.evaluate(
        (el) => el.querySelector('.court-state')?.textContent?.trim() || '',
        element,
      );
      const district = await page.evaluate(
        (el) => el.querySelector('.court-district')?.textContent?.trim() || '',
        element,
      );
      const type = await page.evaluate(
        (el) => el.querySelector('.court-type')?.textContent?.trim() || '',
        element,
      );
      const address = await page.evaluate(
        (el) => el.querySelector('.court-address')?.textContent?.trim() || '',
        element,
      );
      const phone = await page.evaluate(
        (el) => el.querySelector('.court-phone')?.textContent?.trim() || '',
        element,
      );
      const email = await page.evaluate(
        (el) => el.querySelector('.court-email')?.textContent?.trim() || '',
        element,
      );
      const website = await page.evaluate(
        (el) => el.querySelector('.court-website')?.getAttribute('href') || '',
        element,
      );

      if (!name) return null;

      return {
        id: id || this.generateCourtId(name, state, district),
        name: this.cleanText(name),
        state: this.cleanText(state),
        district: this.cleanText(district),
        type: this.parseCourtType(type),
        address: this.cleanText(address),
        phone: phone ? this.cleanText(phone) : undefined,
        email: email ? this.cleanText(email) : undefined,
        website: website ? this.cleanText(website) : undefined,
      };
    } catch (error) {
      this.logger.warn('Failed to parse court element:', error);
      return null;
    }
  }

  private generateCourtId(
    name: string,
    state: string,
    district: string,
  ): string {
    const cleanName = name.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const cleanState = state.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const cleanDistrict = district.toLowerCase().replace(/[^a-z0-9]/g, '_');
    return `${cleanState}_${cleanDistrict}_${cleanName}`;
  }

  private parseCourtType(type: string): CourtType {
    const typeLower = type.toLowerCase();

    if (typeLower.includes('supreme')) return CourtType.SUPREME_COURT;
    if (typeLower.includes('high court')) return CourtType.HIGH_COURT;
    if (typeLower.includes('district')) return CourtType.DISTRICT_COURT;
    if (typeLower.includes('sessions')) return CourtType.SESSIONS_COURT;
    if (typeLower.includes('civil')) return CourtType.CIVIL_COURT;
    if (typeLower.includes('family')) return CourtType.FAMILY_COURT;
    if (typeLower.includes('consumer')) return CourtType.CONSUMER_COURT;
    if (typeLower.includes('labour')) return CourtType.LABOUR_COURT;
    if (typeLower.includes('revenue')) return CourtType.REVENUE_COURT;

    return CourtType.OTHER;
  }

  protected validateData(data: Court[]): boolean {
    return (
      Array.isArray(data) &&
      data.every(
        (court) => court.name && court.state && court.district && court.type,
      )
    );
  }
}
