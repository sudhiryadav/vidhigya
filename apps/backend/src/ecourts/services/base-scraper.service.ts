import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import puppeteer, { Browser, Page } from 'puppeteer';
import { RedactingLogger } from '../../common/logging';
import {
  ScrapingConfig,
  ScrapingResult,
} from '../interfaces/ecourts.interface';

@Injectable()
export abstract class BaseScraperService<T> {
  protected readonly logger: RedactingLogger;

  protected browser: Browser | null = null;
  protected config: ScrapingConfig;

  constructor(protected configService: ConfigService) {
    this.logger = new RedactingLogger(
      new.target?.name ?? BaseScraperService.name,
    );
    this.config = {
      baseUrl: this.configService.get<string>(
        'ECOURTS_BASE_URL',
        'https://services.ecourts.gov.in/ecourtindia_v6',
      ),
      timeout: this.configService.get<number>('ECOURTS_TIMEOUT', 30000),
      retryAttempts: this.configService.get<number>(
        'ECOURTS_RETRY_ATTEMPTS',
        3,
      ),
      userAgent: this.configService.get<string>(
        'ECOURTS_USER_AGENT',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      ),
      headers: {
        'User-Agent': this.configService.get<string>(
          'ECOURTS_USER_AGENT',
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        ),
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        Connection: 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      },
    };
  }

  protected async initBrowser(): Promise<void> {
    if (!this.browser) {
      const headless = this.configService.get<boolean>(
        'PUPPETEER_HEADLESS',
        true,
      );
      const timeout = this.configService.get<number>(
        'PUPPETEER_TIMEOUT',
        30000,
      );

      this.browser = await puppeteer.launch({
        headless,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
        ],
        timeout,
      });
    }
  }

  protected async createPage(): Promise<Page> {
    await this.initBrowser();
    if (!this.browser) {
      throw new Error('Browser not initialized');
    }

    const page = await this.browser.newPage();

    // Set user agent and headers
    await page.setUserAgent(this.config.userAgent);
    await page.setExtraHTTPHeaders(this.config.headers);

    // Set viewport
    await page.setViewport({ width: 1920, height: 1080 });

    // Set timeout
    page.setDefaultTimeout(this.config.timeout);

    return page;
  }

  protected async navigateToPage(page: Page, url: string): Promise<void> {
    try {
      await page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: this.config.timeout,
      });
    } catch (error) {
      throw new Error(`Failed to navigate to ${url}: ${error}`);
    }
  }

  protected async waitForElement(
    page: Page,
    selector: string,
    timeout?: number,
  ): Promise<void> {
    try {
      await page.waitForSelector(selector, {
        timeout: timeout || this.config.timeout,
      });
    } catch (_error) {
      throw new Error(`Element not found: ${selector}`);
    }
  }

  protected async retryOperation<T>(
    operation: () => Promise<T>,
    maxAttempts: number = this.config.retryAttempts,
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        this.logger.warn(`Attempt ${attempt} failed:`, error);

        if (attempt < maxAttempts) {
          // Exponential backoff
          const delay = Math.pow(2, attempt) * 1000;
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError;
  }

  protected async closeBrowser(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  protected generateCacheKey(prefix: string, ...parts: string[]): string {
    return `${prefix}:${parts.join(':')}`;
  }

  protected createScrapingResult(
    data: T,
    source: string,
    cacheKey: string,
  ): ScrapingResult<T> {
    return {
      data,
      source,
      scrapedAt: new Date().toISOString(),
      cacheKey,
    };
  }

  // Abstract methods to be implemented by subclasses
  abstract scrape(...args: any[]): Promise<ScrapingResult<T>>;

  protected abstract parseData(page: Page): Promise<T>;

  protected abstract validateData(data: T): boolean;

  // Utility methods
  protected async extractText(page: Page, selector: string): Promise<string> {
    try {
      const element = await page.$(selector);
      if (!element) return '';

      const text = await page.evaluate(
        (el) => el?.textContent?.trim() || '',
        element,
      );
      return text;
    } catch (error) {
      this.logger.warn(`Failed to extract text from ${selector}:`, error);
      return '';
    }
  }

  protected async extractAttribute(
    page: Page,
    selector: string,
    attribute: string,
  ): Promise<string> {
    try {
      const element = await page.$(selector);
      if (!element) return '';

      const value = await page.evaluate(
        (el, attr) => el?.getAttribute(attr) || '',
        element,
        attribute,
      );
      return value;
    } catch (error) {
      this.logger.warn(
        `Failed to extract attribute ${attribute} from ${selector}:`,
        error,
      );
      return '';
    }
  }

  protected async extractMultipleText(
    page: Page,
    selector: string,
  ): Promise<string[]> {
    try {
      const elements = await page.$$(selector);
      const texts: string[] = [];

      for (const element of elements) {
        const text = await page.evaluate(
          (el) => el?.textContent?.trim() || '',
          element,
        );
        if (text) texts.push(text);
      }

      return texts;
    } catch (error) {
      this.logger.warn(
        `Failed to extract multiple text from ${selector}:`,
        error,
      );
      return [];
    }
  }

  protected async extractTextWithFallback(
    page: Page,
    selectors: string[],
  ): Promise<string> {
    for (const selector of selectors) {
      try {
        const text = await this.extractText(page, selector);
        if (text && text.trim()) {
          return text.trim();
        }
      } catch (_error) {
        // Continue to next selector
        continue;
      }
    }
    return '';
  }

  protected async extractTableData(
    page: Page,
    tableSelector: string,
  ): Promise<Record<string, string>[]> {
    try {
      const tableData = await page.evaluate((selector) => {
        const table = document.querySelector(selector);
        if (!table) return [];

        const rows = Array.from(table.querySelectorAll('tr'));
        const headers = Array.from(
          rows[0]?.querySelectorAll('th, td') || [],
        ).map((cell) => cell.textContent?.trim() || '');

        return rows.slice(1).map((row) => {
          const cells = Array.from(row.querySelectorAll('td'));
          const rowData: Record<string, string> = {};

          cells.forEach((cell, index) => {
            const header = headers[index] || `column_${index}`;
            rowData[header] = cell.textContent?.trim() || '';
          });

          return rowData;
        });
      }, tableSelector);

      return tableData;
    } catch (error) {
      this.logger.warn(
        `Failed to extract table data from ${tableSelector}:`,
        error,
      );
      return [];
    }
  }

  protected formatDate(dateString: string): string {
    try {
      // Handle various date formats from eCourts
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return dateString; // Return original if parsing fails
      }
      return date.toISOString().split('T')[0];
    } catch (_error) {
      return dateString;
    }
  }

  protected cleanText(text: string): string {
    return text.replace(/\s+/g, ' ').replace(/\n/g, ' ').trim();
  }
}
