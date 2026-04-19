import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Page } from 'puppeteer';
import {
  Advocate,
  AdvocateType,
  Case,
  CaseDetails,
  CasePriority,
  CaseStatus,
  Party,
  PartyType,
  ScrapingResult,
} from '../interfaces/ecourts.interface';
import { BaseScraperService } from './base-scraper.service';

@Injectable()
export class CaseScraperService extends BaseScraperService<Case> {
  constructor(configService: ConfigService) {
    super(configService);
  }

  async scrape(
    caseNumber: string,
    courtId?: string,
  ): Promise<ScrapingResult<Case>> {
    const cacheKey = this.generateCacheKey(
      'case',
      caseNumber,
      courtId || 'default',
    );

    return this.retryOperation(async () => {
      const page = await this.createPage();

      try {
        // Navigate to the new eCourts v6 website
        const searchUrl = 'https://services.ecourts.gov.in/ecourtindia_v6/';
        await this.navigateToPage(page, searchUrl);
        this.logger.log(`Successfully navigated to: ${searchUrl}`);

        // Fill case number and search
        await this.searchCase(page, caseNumber, courtId);

        // Parse case data
        const caseData = await this.parseData(page, courtId);

        // Validate data
        if (!this.validateData(caseData)) {
          throw new Error('Invalid case data received');
        }

        return this.createScrapingResult(caseData, searchUrl, cacheKey);
      } finally {
        await page.close();
      }
    });
  }

  private async searchCase(
    page: Page,
    caseNumber: string,
    courtId?: string,
  ): Promise<void> {
    try {
      // Wait for page to load completely
      await page.waitForTimeout(5000);

      // Handle CAPTCHA - try to solve it automatically
      await this.handleCaptcha(page);

      // Try multiple possible selectors for CNR number input
      const cnrInputSelectors = [
        'input[name="cnr_number"]',
        'input[name="cnrNumber"]',
        'input[name="cnr"]',
        'input[id="cnr_number"]',
        'input[id="cnrNumber"]',
        'input[id="cnr"]',
        'input[placeholder*="CNR"]',
        'input[placeholder*="cnr"]',
        'input[type="text"]',
        'input[name="case_no"]', // fallback to old selectors
        'input[name="caseNumber"]',
        'input[name="case_number"]',
      ];

      let caseInputFound = false;
      for (const selector of cnrInputSelectors) {
        try {
          await this.waitForElement(page, selector, 2000);
          await page.type(selector, caseNumber);
          caseInputFound = true;
          this.logger.log(`Found case input with selector: ${selector}`);
          break;
        } catch (_e) {
          // Continue to next selector
          continue;
        }
      }

      if (!caseInputFound) {
        // Log page content for debugging
        const pageContent = await page.content();
        this.logger.log(
          'Page content (first 1000 chars):',
          pageContent.substring(0, 1000),
        );

        // Take a screenshot for debugging
        try {
          await page.screenshot({
            path: '/tmp/ecourts-debug.png',
            fullPage: true,
          });
          this.logger.log('Debug screenshot saved to /tmp/ecourts-debug.png');
        } catch (_e) {
          this.logger.log('Could not save debug screenshot:', _e);
        }

        throw new Error(
          'Could not find case number input field with any known selector',
        );
      }

      // Try to select court if provided
      if (courtId) {
        const courtSelectors = [
          'select[name="court_code"]',
          'select[name="courtCode"]',
          'select[name="court"]',
          'select[id="court_code"]',
          'select[id="courtCode"]',
          'select[id="court"]',
        ];

        for (const selector of courtSelectors) {
          try {
            await page.select(selector, courtId);
            this.logger.log(`Selected court with selector: ${selector}`);
            break;
          } catch (_e) {
            // Continue to next selector
            continue;
          }
        }
      }

      // Try multiple possible selectors for search button
      const searchButtonSelectors = [
        'input[type="submit"][value="Search"]',
        'input[type="submit"][value="search"]',
        'button[type="submit"]',
        'input[type="button"][value*="Search"]',
        'button:contains("Search")',
        'input[value*="Search"]',
        'button:contains("search")',
        'input[value*="search"]',
        'button[onclick*="search"]',
        'input[onclick*="search"]',
      ];

      let searchButtonFound = false;
      for (const selector of searchButtonSelectors) {
        try {
          await page.click(selector);
          searchButtonFound = true;
          this.logger.log(`Clicked search button with selector: ${selector}`);
          break;
        } catch (_e) {
          // Continue to next selector
          continue;
        }
      }

      if (!searchButtonFound) {
        // Try pressing Enter as fallback
        await page.keyboard.press('Enter');
        this.logger.log('Used Enter key as fallback for search');
      }

      // Wait for results to load with multiple possible result selectors
      const resultSelectors = [
        '.case-details',
        '.no-results',
        '.result',
        '.case-result',
        '.search-result',
        'table',
        '.data-table',
        '.case-info',
      ];

      let resultFound = false;
      for (const selector of resultSelectors) {
        try {
          await this.waitForElement(page, selector, 5000);
          resultFound = true;
          this.logger.log(`Found results with selector: ${selector}`);
          break;
        } catch (_e) {
          // Continue to next selector
          continue;
        }
      }

      if (!resultFound) {
        // Wait a bit more and check if page has changed
        await page.waitForTimeout(5000);
        const currentUrl = page.url();
        this.logger.log(`Search completed, current URL: ${currentUrl}`);
      }
    } catch (error) {
      throw new Error(`Failed to search case: ${error}`);
    }
  }

  private async handleCaptcha(page: Page): Promise<void> {
    try {
      // Wait for CAPTCHA to load
      await page.waitForTimeout(2000);

      // Check if CAPTCHA exists
      const captchaSelectors = [
        'img[src*="captcha"]',
        'img[alt*="captcha"]',
        'img[alt*="CAPTCHA"]',
        '.captcha img',
        '#captcha img',
        'img[src*="captcha"]',
      ];

      let captchaFound = false;
      for (const selector of captchaSelectors) {
        try {
          const captchaElement = await page.$(selector);
          if (captchaElement) {
            captchaFound = true;
            this.logger.log(`Found CAPTCHA with selector: ${selector}`);
            break;
          }
        } catch (_e) {
          continue;
        }
      }

      if (captchaFound) {
        this.logger.log('CAPTCHA detected, attempting to solve...');

        // Try to solve CAPTCHA using OCR or other methods
        // For now, we'll try to refresh the CAPTCHA and wait
        try {
          // Look for refresh button
          const refreshSelectors = [
            'button[onclick*="refresh"]',
            'input[onclick*="refresh"]',
            'a[onclick*="refresh"]',
            'button:contains("Refresh")',
            'input[value*="Refresh"]',
            'a:contains("Refresh")',
          ];

          for (const selector of refreshSelectors) {
            try {
              await page.click(selector);
              this.logger.log(
                `Clicked refresh button with selector: ${selector}`,
              );
              await page.waitForTimeout(2000);
              break;
            } catch (_e) {
              continue;
            }
          }

          // Try to solve CAPTCHA automatically
          const captchaSolved = await this.solveCaptcha(page);
          if (!captchaSolved) {
            this.logger.log(
              'CAPTCHA solving failed, waiting for manual input...',
            );
            await page.waitForTimeout(15000); // Wait 15 seconds for manual solving
          }
        } catch (error) {
          this.logger.log('Could not handle CAPTCHA automatically:', error);
          // Continue anyway - maybe CAPTCHA is not required
        }
      } else {
        this.logger.log('No CAPTCHA detected');
      }
    } catch (error) {
      this.logger.log('Error handling CAPTCHA:', error);
      // Continue anyway
    }
  }

  private async solveCaptcha(page: Page): Promise<boolean> {
    try {
      // Get CAPTCHA image
      const captchaImage = await page.$(
        'img[src*="captcha"], img[alt*="captcha"], .captcha img, #captcha img',
      );

      if (!captchaImage) {
        this.logger.log('No CAPTCHA image found');
        return false;
      }

      // Take screenshot of CAPTCHA (side effect for future OCR / debugging)
      await captchaImage.screenshot();
      this.logger.log('CAPTCHA image captured');

      // For now, we'll use a simple approach
      // In production, you would:
      // 1. Send the image to a CAPTCHA solving service (2captcha, Anti-Captcha, etc.)
      // 2. Use OCR libraries like Tesseract.js
      // 3. Use machine learning models

      // For demonstration, we'll try to find the CAPTCHA input and wait
      const captchaInputSelectors = [
        'input[name="captcha"]',
        'input[name="captcha_code"]',
        'input[id="captcha"]',
        'input[id="captcha_code"]',
        'input[placeholder*="captcha"]',
        'input[placeholder*="CAPTCHA"]',
        'input[type="text"]',
      ];

      for (const selector of captchaInputSelectors) {
        try {
          const input = await page.$(selector);
          if (input) {
            this.logger.log(`Found CAPTCHA input with selector: ${selector}`);
            // In production, you would fill this with the solved CAPTCHA
            // For now, we'll just wait for manual input
            return false;
          }
        } catch (_e) {
          continue;
        }
      }

      return false;
    } catch (error) {
      this.logger.log('Error solving CAPTCHA:', error);
      return false;
    }
  }

  protected async parseData(page: Page, courtId?: string): Promise<Case> {
    try {
      // Check if case was found - try multiple selectors for "no results"
      const noResultsSelectors = [
        '.no-results',
        '.no-data',
        '.not-found',
        '.error-message',
        'text="No records found"',
        'text="No data available"',
        'text="Case not found"',
      ];

      let noResultsFound = false;
      for (const selector of noResultsSelectors) {
        try {
          const element = await page.$(selector);
          if (element) {
            noResultsFound = true;
            break;
          }
        } catch (_e) {
          // Continue checking other selectors
          continue;
        }
      }

      if (noResultsFound) {
        throw new Error('Case not found');
      }

      // Extract basic case information with multiple possible selectors
      const caseNumber = await this.extractTextWithFallback(page, [
        '.case-number',
        '.case_no',
        '.caseNumber',
        'td:contains("Case Number")',
        'th:contains("Case Number")',
        'label:contains("Case Number")',
      ]);

      const caseTitle = await this.extractTextWithFallback(page, [
        '.case-title',
        '.case-title',
        '.caseTitle',
        'td:contains("Case Title")',
        'th:contains("Case Title")',
        'label:contains("Case Title")',
      ]);

      const caseType = await this.extractTextWithFallback(page, [
        '.case-type',
        '.caseType',
        'td:contains("Case Type")',
        'th:contains("Case Type")',
        'label:contains("Case Type")',
      ]);

      const filingDate = await this.extractTextWithFallback(page, [
        '.filing-date',
        '.filingDate',
        'td:contains("Filing Date")',
        'th:contains("Filing Date")',
        'label:contains("Filing Date")',
      ]);

      const status = await this.extractTextWithFallback(page, [
        '.case-status',
        '.caseStatus',
        'td:contains("Status")',
        'th:contains("Status")',
        'label:contains("Status")',
      ]);

      const caseStage = await this.extractTextWithFallback(page, [
        '.case-stage',
        '.caseStage',
        'td:contains("Stage")',
        'th:contains("Stage")',
        'label:contains("Stage")',
      ]);

      // Extract court information
      const courtName = await this.extractText(page, '.court-name');
      const courtAddress = await this.extractText(page, '.court-address');

      // Extract parties information
      const petitioners = await this.parseParties(page, '.petitioners');
      const respondents = await this.parseParties(page, '.respondents');

      // Extract advocates information
      const advocates = await this.parseAdvocates(page);

      // Extract case details
      const caseDetails = await this.parseCaseDetails(page);

      // Extract hearing information
      const lastHearingDate = await this.extractText(
        page,
        '.last-hearing-date',
      );
      const nextHearingDate = await this.extractText(
        page,
        '.next-hearing-date',
      );

      return {
        caseNumber: this.cleanText(caseNumber),
        caseTitle: this.cleanText(caseTitle),
        caseType: this.cleanText(caseType),
        filingDate: this.formatDate(filingDate),
        status: this.parseCaseStatus(status),
        court: {
          id: courtId || 'unknown',
          name: this.cleanText(courtName),
          state: 'Unknown',
          district: 'Unknown',
          type: 'DISTRICT_COURT' as any,
          address: this.cleanText(courtAddress),
        },
        petitioner: petitioners,
        respondent: respondents,
        advocate: advocates,
        lastHearingDate: lastHearingDate
          ? this.formatDate(lastHearingDate)
          : undefined,
        nextHearingDate: nextHearingDate
          ? this.formatDate(nextHearingDate)
          : undefined,
        caseStage: this.cleanText(caseStage),
        caseDetails,
      };
    } catch (error) {
      throw new Error(`Failed to parse case data: ${error}`);
    }
  }

  private async parseParties(page: Page, selector: string): Promise<Party[]> {
    try {
      const partyElements = await page.$$(`${selector} .party-item`);
      const parties: Party[] = [];

      for (const element of partyElements) {
        const name = await page.evaluate(
          (el) => el.querySelector('.party-name')?.textContent?.trim() || '',
          element,
        );
        const address = await page.evaluate(
          (el) => el.querySelector('.party-address')?.textContent?.trim() || '',
          element,
        );
        const phone = await page.evaluate(
          (el) => el.querySelector('.party-phone')?.textContent?.trim() || '',
          element,
        );

        if (name) {
          parties.push({
            name: this.cleanText(name),
            type: selector.includes('petitioner')
              ? PartyType.PETITIONER
              : PartyType.RESPONDENT,
            address: address ? this.cleanText(address) : undefined,
            phone: phone ? this.cleanText(phone) : undefined,
          });
        }
      }

      return parties;
    } catch (error) {
      this.logger.warn('Failed to parse parties:', error);
      return [];
    }
  }

  private async parseAdvocates(page: Page): Promise<Advocate[]> {
    try {
      const advocateElements = await page.$$('.advocate-item');
      const advocates: Advocate[] = [];

      for (const element of advocateElements) {
        const name = await page.evaluate(
          (el) => el.querySelector('.advocate-name')?.textContent?.trim() || '',
          element,
        );
        const barCouncilNumber = await page.evaluate(
          (el) =>
            el.querySelector('.bar-council-number')?.textContent?.trim() || '',
          element,
        );
        const phone = await page.evaluate(
          (el) =>
            el.querySelector('.advocate-phone')?.textContent?.trim() || '',
          element,
        );
        const address = await page.evaluate(
          (el) =>
            el.querySelector('.advocate-address')?.textContent?.trim() || '',
          element,
        );
        const type = await page.evaluate(
          (el) => el.querySelector('.advocate-type')?.textContent?.trim() || '',
          element,
        );

        if (name) {
          advocates.push({
            name: this.cleanText(name),
            barCouncilNumber: barCouncilNumber
              ? this.cleanText(barCouncilNumber)
              : undefined,
            phone: phone ? this.cleanText(phone) : undefined,
            address: address ? this.cleanText(address) : undefined,
            type: this.parseAdvocateType(type),
          });
        }
      }

      return advocates;
    } catch (error) {
      this.logger.warn('Failed to parse advocates:', error);
      return [];
    }
  }

  private async parseCaseDetails(page: Page): Promise<CaseDetails> {
    try {
      const description = await this.extractText(page, '.case-description');
      const category = await this.extractText(page, '.case-category');
      const subCategory = await this.extractText(page, '.case-sub-category');
      const value = await this.extractText(page, '.case-value');
      const nature = await this.extractText(page, '.case-nature');
      const subject = await this.extractText(page, '.case-subject');
      const act = await this.extractText(page, '.case-act');
      const section = await this.extractText(page, '.case-section');

      return {
        caseDescription: description ? this.cleanText(description) : undefined,
        caseCategory: category ? this.cleanText(category) : undefined,
        caseSubCategory: subCategory ? this.cleanText(subCategory) : undefined,
        caseValue: value ? parseFloat(value.replace(/[^\d.]/g, '')) : undefined,
        casePriority: this.parseCasePriority(description),
        caseNature: nature ? this.cleanText(nature) : undefined,
        caseSubject: subject ? this.cleanText(subject) : undefined,
        caseAct: act ? this.cleanText(act) : undefined,
        caseSection: section ? this.cleanText(section) : undefined,
      };
    } catch (error) {
      this.logger.warn('Failed to parse case details:', error);
      return {};
    }
  }

  private parseCaseStatus(status: string): CaseStatus {
    const statusLower = status.toLowerCase();

    if (statusLower.includes('pending')) return CaseStatus.PENDING;
    if (statusLower.includes('disposed')) return CaseStatus.DISPOSED;
    if (statusLower.includes('transferred')) return CaseStatus.TRANSFERRED;
    if (statusLower.includes('withdrawn')) return CaseStatus.WITHDRAWN;
    if (statusLower.includes('abated')) return CaseStatus.ABATED;

    return CaseStatus.OTHER;
  }

  private parseAdvocateType(type: string): AdvocateType {
    const typeLower = type.toLowerCase();

    if (typeLower.includes('petitioner'))
      return AdvocateType.PETITIONER_ADVOCATE;
    if (typeLower.includes('respondent'))
      return AdvocateType.RESPONDENT_ADVOCATE;
    if (typeLower.includes('amicus')) return AdvocateType.AMICUS_CURIAE;

    return AdvocateType.OTHER;
  }

  private parseCasePriority(description: string): CasePriority {
    const descLower = description.toLowerCase();

    if (descLower.includes('urgent') || descLower.includes('emergency'))
      return CasePriority.URGENT;
    if (descLower.includes('high') || descLower.includes('important'))
      return CasePriority.HIGH;
    if (descLower.includes('low') || descLower.includes('minor'))
      return CasePriority.LOW;

    return CasePriority.MEDIUM;
  }

  protected validateData(data: Case): boolean {
    return !!(
      data.caseNumber &&
      data.caseTitle &&
      data.court &&
      data.court.name
    );
  }
}
